# MSISDN Encryption at Rest - Phase 2 Implementation Plan

**Last Updated**: 2025-12-02  
**Status**: Planning (Phase 1 Complete - E.164 Standardization)  
**Timeline**: 2-3 weeks  
**Effort**: Medium  
**Priority**: HIGH (Security Compliance)

## Executive Summary

Implement **AES-256-GCM encryption at rest** for all MSISDN-bearing fields to achieve:
- ✅ **GDPR Article 32 Compliance** (Security of Processing)
- ✅ **POPIA Section 19 Compliance** (Security Safeguards)
- ✅ **Banking-Grade Security** (ISO 27001 ready)
- ✅ **PII Protection** (Eliminate plaintext phone number storage)
- ✅ **Audit Trail** (Complete encryption/decryption logging)

## Objective
Encrypt all MSISDN-bearing fields at rest using AES-256-GCM with application-level encryption keys stored in Google Secret Manager. Maintain query performance with SHA-256 hashes for lookups.

## Scope

### Tables and Fields Requiring Encryption

| Table | Field | Format | Encryption Strategy | Search Strategy |
|-------|-------|--------|-------------------|----------------|
| `users` | `phoneNumber` | E.164 | `phoneNumber_enc` | `phoneNumber_hash` (SHA-256) |
| `users` | `accountNumber` | E.164 | `accountNumber_enc` | `accountNumber_hash` (SHA-256) |
| `beneficiaries` | `msisdn` | E.164 or `NON_MSI_*` | `msisdn_enc` | `msisdn_hash` (SHA-256) |
| `beneficiary_service_accounts` | `serviceData.msisdn` | JSONB | `serviceData.msisdn_enc` | `serviceData.msisdn_hash` |
| `beneficiary_payment_methods` | `walletMsisdn` | E.164 (if present) | `walletMsisdn_enc` | `walletMsisdn_hash` |

### Data Volume Estimates

- **Users**: ~10-1,000 records (low volume, fast migration)
- **Beneficiaries**: ~100-10,000 records (medium volume)
- **Service Accounts**: ~500-50,000 records (high volume, requires batching)

### Out of Scope (Phase 3)

- Wallet IDs (already de-PII'd to `WAL-{userId}` in Phase 1)
- Transaction metadata (review separately)
- Audit logs (review separately)

## Technical Approach

### 1. Key Management (Google Secret Manager)

**Key Generation**:
```bash
# Generate 32-byte (256-bit) AES key per environment
openssl rand -base64 32 > msisdn_encryption_key.txt

# Store in Google Secret Manager
gcloud secrets create msisdn-encryption-key-uat \
  --data-file=msisdn_encryption_key.txt \
  --replication-policy=automatic

gcloud secrets create msisdn-encryption-key-staging \
  --data-file=msisdn_encryption_key.txt \
  --replication-policy=automatic

gcloud secrets create msisdn-encryption-key-production \
  --data-file=msisdn_encryption_key.txt \
  --replication-policy=automatic
```

**Key Rotation Strategy**:
- **Frequency**: Quarterly (90 days)
- **Process**: Blue-green key rotation
  1. Generate new key (`MSISDN_ENC_KEY_V2`)
  2. Re-encrypt all data using new key
  3. Update Secret Manager with new key
  4. Deploy application with new key version
  5. Archive old key (retain for 1 year for disaster recovery)

**Key Loading**:
```javascript
// Load on application boot (server.js)
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function loadEncryptionKey() {
  const client = new SecretManagerServiceClient();
  const environment = process.env.NODE_ENV || 'development';
  const secretName = `msisdn-encryption-key-${environment}`;
  
  const [version] = await client.accessSecretVersion({
    name: `projects/mymoolah-db/secrets/${secretName}/versions/latest`,
  });
  
  const key = Buffer.from(version.payload.data.toString(), 'base64');
  return key;
}
```

### 2. Encryption Envelope (AES-256-GCM)

**Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes) - random per encryption
- **Auth Tag Size**: 128 bits (16 bytes)
- **Additional Authenticated Data (AAD)**: `userId` + `fieldName` (prevents ciphertext substitution)

**Ciphertext Format**:
```
v1:{b64(iv)}:{b64(ciphertext)}:{b64(authTag)}

Example:
v1:Kw3h5T9mPqR2:8j4K3nP9rT5wQ2xM7vB1:5nL8kJ2pR9tY6wQ3
```

**Implementation** (`utils/crypto.js`):
```javascript
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const ENCODING = 'base64';

/**
 * Encrypt MSISDN with AES-256-GCM
 * @param {string} plaintext - E.164 MSISDN to encrypt
 * @param {Buffer} key - 32-byte encryption key
 * @param {string} aad - Additional Authenticated Data (userId + fieldName)
 * @returns {string} Encrypted ciphertext with version prefix
 */
function encryptMsisdn(plaintext, key, aad = '') {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  if (aad) {
    cipher.setAAD(Buffer.from(aad, 'utf8'));
  }
  
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  return `v1:${iv.toString(ENCODING)}:${ciphertext.toString(ENCODING)}:${authTag.toString(ENCODING)}`;
}

/**
 * Decrypt MSISDN with AES-256-GCM
 * @param {string} encrypted - Encrypted ciphertext with version prefix
 * @param {Buffer} key - 32-byte encryption key
 * @param {string} aad - Additional Authenticated Data (userId + fieldName)
 * @returns {string} Decrypted E.164 MSISDN
 */
function decryptMsisdn(encrypted, key, aad = '') {
  const parts = encrypted.split(':');
  
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid ciphertext format');
  }
  
  const iv = Buffer.from(parts[1], ENCODING);
  const ciphertext = Buffer.from(parts[2], ENCODING);
  const authTag = Buffer.from(parts[3], ENCODING);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  if (aad) {
    decipher.setAAD(Buffer.from(aad, 'utf8'));
  }
  
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);
  
  return plaintext.toString('utf8');
}

/**
 * Hash MSISDN for search (SHA-256)
 * @param {string} msisdn - E.164 MSISDN
 * @returns {Buffer} SHA-256 hash (32 bytes)
 */
function hashMsisdnForSearch(msisdn) {
  return crypto.createHash('sha256').update(msisdn).digest();
}

module.exports = {
  encryptMsisdn,
  decryptMsisdn,
  hashMsisdnForSearch,
};
```

### 3. Field Strategy (Shadow Columns)

**Parallel Columns**:
- **Original Column** (`phoneNumber`): Temporarily retained for rollback
- **Encrypted Column** (`phoneNumber_enc`): AES-256-GCM encrypted ciphertext
- **Hash Column** (`phoneNumber_hash`): SHA-256 hash for equality searches
- **Display Column** (`phoneNumber_display`): Masked local format for UI (optional)

**Migration Phases**:
1. **Phase 2.1**: Add shadow columns (`*_enc`, `*_hash`)
2. **Phase 2.2**: Backfill encrypted data and hashes
3. **Phase 2.3**: Update application to read from `*_enc` and search by `*_hash`
4. **Phase 2.4**: Validation period (2 weeks) - dual read/write
5. **Phase 2.5**: Drop plaintext columns (after validation)

### 4. Query Patterns

**Before Encryption** (Plaintext Search):
```javascript
// Find user by phone number
const user = await User.findOne({
  where: { phoneNumber: '+27825571055' }
});
```

**After Encryption** (Hash-Based Search):
```javascript
const { hashMsisdnForSearch } = require('../utils/crypto');
const { normalizeToE164 } = require('../utils/msisdn');

// Find user by phone number (using hash)
const phoneHash = hashMsisdnForSearch(normalizeToE164(input));
const user = await User.findOne({
  where: { phoneNumber_hash: phoneHash }
});

// Decrypt phone number for display
if (user && user.phoneNumber_enc) {
  const { decryptMsisdn } = require('../utils/crypto');
  const aad = `user-${user.id}-phoneNumber`;
  user.phoneNumber = decryptMsisdn(user.phoneNumber_enc, encryptionKey, aad);
}
```

**Query Performance**:
- Hash lookups: O(log n) with B-tree index on `*_hash` columns
- No performance degradation vs plaintext equality searches
- Encryption/decryption: ~0.1-0.5ms per operation (negligible)

### 5. Telemetry & Audit Logging

**Logging Strategy**:
- ✅ **Mask MSISDN in Logs**: Use `maskMsisdn()` utility (already implemented)
- ✅ **Audit Decrypt Operations**: Log all `decryptMsisdn()` calls
- ✅ **Monitor Encryption Failures**: Alert on encryption/decryption errors
- ✅ **Key Access Tracking**: Log all encryption key accesses

**Audit Log Entry**:
```javascript
{
  timestamp: '2025-12-02T14:30:00.000Z',
  action: 'MSISDN_DECRYPT',
  userId: 1,
  field: 'phoneNumber',
  requestedBy: 'authController.login',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  success: true,
  duration: 0.3 // milliseconds
}
```

## Migration Steps (Detailed)

### Phase 2.1: Add Shadow Columns (Week 1, Day 1-2)

**Migration**: `20251203_01_add_encryption_columns.js`

```sql
-- Users table
ALTER TABLE users 
  ADD COLUMN phoneNumber_enc TEXT,
  ADD COLUMN phoneNumber_hash BYTEA,
  ADD COLUMN accountNumber_enc TEXT,
  ADD COLUMN accountNumber_hash BYTEA;

-- Create B-tree indexes for hash lookups
CREATE INDEX idx_users_phoneNumber_hash ON users USING btree(phoneNumber_hash);
CREATE INDEX idx_users_accountNumber_hash ON users USING btree(accountNumber_hash);

-- Beneficiaries table
ALTER TABLE beneficiaries
  ADD COLUMN msisdn_enc TEXT,
  ADD COLUMN msisdn_hash BYTEA;

CREATE INDEX idx_beneficiaries_msisdn_hash ON beneficiaries USING btree(msisdn_hash);

-- Beneficiary Service Accounts (JSONB update)
-- Add encrypted/hashed fields to serviceData JSONB
-- This will be handled in backfill script

-- Add metadata columns for tracking
ALTER TABLE users ADD COLUMN encrypted_at TIMESTAMP;
ALTER TABLE beneficiaries ADD COLUMN encrypted_at TIMESTAMP;
```

**Rollback**:
```sql
ALTER TABLE users 
  DROP COLUMN IF EXISTS phoneNumber_enc,
  DROP COLUMN IF EXISTS phoneNumber_hash,
  DROP COLUMN IF EXISTS accountNumber_enc,
  DROP COLUMN IF EXISTS accountNumber_hash,
  DROP COLUMN IF EXISTS encrypted_at;

ALTER TABLE beneficiaries
  DROP COLUMN IF EXISTS msisdn_enc,
  DROP COLUMN IF EXISTS msisdn_hash,
  DROP COLUMN IF EXISTS encrypted_at;

DROP INDEX IF EXISTS idx_users_phoneNumber_hash;
DROP INDEX IF EXISTS idx_users_accountNumber_hash;
DROP INDEX IF EXISTS idx_beneficiaries_msisdn_hash;
```

### Phase 2.2: Backfill Encrypted Data (Week 1, Day 3-5)

**Script**: `scripts/backfill-encrypt-msisdns.js`

```javascript
const { User, Beneficiary, BeneficiaryServiceAccount } = require('../models');
const { encryptMsisdn, hashMsisdnForSearch } = require('../utils/crypto');
const { normalizeToE164 } = require('../utils/msisdn');

async function backfillUsers(encryptionKey) {
  const users = await User.findAll({ 
    where: { phoneNumber_enc: null },
    attributes: ['id', 'phoneNumber', 'accountNumber']
  });

  console.log(`Encrypting ${users.length} users...`);

  for (const user of users) {
    const phoneE164 = normalizeToE164(user.phoneNumber);
    const accountE164 = normalizeToE164(user.accountNumber);

    const phoneAad = `user-${user.id}-phoneNumber`;
    const accountAad = `user-${user.id}-accountNumber`;

    const phoneEnc = encryptMsisdn(phoneE164, encryptionKey, phoneAad);
    const accountEnc = encryptMsisdn(accountE164, encryptionKey, accountAad);

    const phoneHash = hashMsisdnForSearch(phoneE164);
    const accountHash = hashMsisdnForSearch(accountE164);

    await user.update({
      phoneNumber_enc: phoneEnc,
      phoneNumber_hash: phoneHash,
      accountNumber_enc: accountEnc,
      accountNumber_hash: accountHash,
      encrypted_at: new Date(),
    });

    console.log(`✅ Encrypted user ${user.id}`);
  }

  console.log(`✅ Completed: Encrypted ${users.length} users`);
}

async function backfillBeneficiaries(encryptionKey) {
  const beneficiaries = await Beneficiary.findAll({
    where: { msisdn_enc: null },
    attributes: ['id', 'userId', 'msisdn']
  });

  console.log(`Encrypting ${beneficiaries.length} beneficiaries...`);

  for (const beneficiary of beneficiaries) {
    // Skip NON_MSI_ identifiers (don't encrypt non-MSISDN identifiers)
    if (beneficiary.msisdn.startsWith('NON_MSI_')) {
      console.log(`⏭️  Skipping ${beneficiary.id} (non-MSISDN identifier)`);
      continue;
    }

    const msisdnE164 = normalizeToE164(beneficiary.msisdn);
    const aad = `beneficiary-${beneficiary.id}-msisdn`;

    const msisdnEnc = encryptMsisdn(msisdnE164, encryptionKey, aad);
    const msisdnHash = hashMsisdnForSearch(msisdnE164);

    await beneficiary.update({
      msisdn_enc: msisdnEnc,
      msisdn_hash: msisdnHash,
      encrypted_at: new Date(),
    });

    console.log(`✅ Encrypted beneficiary ${beneficiary.id}`);
  }

  console.log(`✅ Completed: Encrypted ${beneficiaries.length} beneficiaries`);
}

async function backfillServiceAccounts(encryptionKey) {
  const serviceAccounts = await BeneficiaryServiceAccount.findAll({
    attributes: ['id', 'userId', 'serviceData']
  });

  console.log(`Encrypting ${serviceAccounts.length} service accounts...`);

  let encryptedCount = 0;

  for (const account of serviceAccounts) {
    const msisdn = account.serviceData?.msisdn;
    
    if (!msisdn || msisdn.startsWith('NON_MSI_')) {
      continue;
    }

    const msisdnE164 = normalizeToE164(msisdn);
    const aad = `service-account-${account.id}-msisdn`;

    const msisdnEnc = encryptMsisdn(msisdnE164, encryptionKey, aad);
    const msisdnHash = hashMsisdnForSearch(msisdnE164);

    account.serviceData.msisdn_enc = msisdnEnc;
    account.serviceData.msisdn_hash = msisdnHash.toString('base64');

    await account.update({ serviceData: account.serviceData });

    encryptedCount++;
    console.log(`✅ Encrypted service account ${account.id}`);
  }

  console.log(`✅ Completed: Encrypted ${encryptedCount} service accounts`);
}

async function run() {
  const { loadEncryptionKey } = require('../utils/crypto');
  const encryptionKey = await loadEncryptionKey();

  await backfillUsers(encryptionKey);
  await backfillBeneficiaries(encryptionKey);
  await backfillServiceAccounts(encryptionKey);

  console.log('✅ All encryption backfill complete!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Encryption backfill failed:', err);
  process.exit(1);
});
```

**Estimated Duration**:
- Users: ~1-5 seconds (low volume)
- Beneficiaries: ~10-60 seconds (medium volume)
- Service Accounts: ~30-300 seconds (high volume)

### Phase 2.3: Update Application Code (Week 2, Day 1-3)

**Model Updates** (`models/User.js`, `models/Beneficiary.js`):

```javascript
// models/User.js - Add virtual fields for decryption
User.prototype.decryptPhoneNumber = async function() {
  if (!this.phoneNumber_enc) return this.phoneNumber;
  
  const { decryptMsisdn, loadEncryptionKey } = require('../utils/crypto');
  const key = await loadEncryptionKey();
  const aad = `user-${this.id}-phoneNumber`;
  
  return decryptMsisdn(this.phoneNumber_enc, key, aad);
};

// Helper method for hash-based queries
User.findByPhoneNumber = async function(phoneInput) {
  const { normalizeToE164 } = require('../utils/msisdn');
  const { hashMsisdnForSearch } = require('../utils/crypto');
  
  const phoneE164 = normalizeToE164(phoneInput);
  const phoneHash = hashMsisdnForSearch(phoneE164);
  
  return await User.findOne({
    where: { phoneNumber_hash: phoneHash }
  });
};
```

**Controller Updates** (`controllers/authController.js`):

```javascript
// Before (plaintext search)
const user = await User.findOne({ 
  where: { phoneNumber: normalizeToE164(identifier) }
});

// After (hash-based search with decryption)
const user = await User.findByPhoneNumber(identifier);

if (user) {
  // Decrypt phone for session/response (if needed)
  user.phoneNumber = await user.decryptPhoneNumber();
}
```

### Phase 2.4: Validation Period (Week 2, Day 4-5 + Week 3)

**Dual Read/Write**:
- Application reads from `*_enc` columns (with decryption)
- Application writes to BOTH plaintext and encrypted columns
- Monitor for decryption failures and performance impact

**Validation Checklist**:
- [ ] All user logins working with encrypted lookups
- [ ] All beneficiary searches working with encrypted lookups
- [ ] No decryption errors in logs
- [ ] Query performance acceptable (<50ms for hash lookups)
- [ ] Audit logs capturing all decrypt operations

### Phase 2.5: Drop Plaintext Columns (Week 3, Final Day)

**Migration**: `20251220_01_drop_plaintext_msisdn_columns.js`

```sql
-- After 2-week validation period, drop plaintext columns
ALTER TABLE users 
  DROP COLUMN phoneNumber,
  DROP COLUMN accountNumber;

ALTER TABLE beneficiaries
  DROP COLUMN msisdn;

-- Rename encrypted columns to primary columns
ALTER TABLE users 
  RENAME COLUMN phoneNumber_enc TO phoneNumber,
  RENAME COLUMN phoneNumber_hash TO phoneNumber_lookup_hash,
  RENAME COLUMN accountNumber_enc TO accountNumber,
  RENAME COLUMN accountNumber_hash TO accountNumber_lookup_hash;

ALTER TABLE beneficiaries
  RENAME COLUMN msisdn_enc TO msisdn,
  RENAME COLUMN msisdn_hash TO msisdn_lookup_hash;

-- Update models to reflect new column names
```

**Rollback** (Emergency Only):
```sql
-- This requires re-decrypting all data - expensive operation!
-- Only use in case of catastrophic failure
```

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Key Loss** | CRITICAL | Low | Store keys in Secret Manager with IAM controls; maintain offline backup in secure vault |
| **Performance Degradation** | HIGH | Medium | Hash-based lookups with B-tree indexes; cache decrypted values in memory (short TTL) |
| **Decryption Failures** | HIGH | Medium | Dual read/write during validation; maintain plaintext columns for 2-week rollback period |
| **Key Rotation Complexity** | MEDIUM | Medium | Blue-green rotation strategy; automated re-encryption script; test in UAT first |
| **Application Bugs** | MEDIUM | Medium | Comprehensive testing; gradual rollout (UAT → Staging → Production); monitoring |
| **Audit Log Volume** | LOW | High | Sampling (log 1% of decrypt operations); aggregate metrics instead of individual logs |

## Testing Strategy

### Unit Tests

```javascript
// tests/crypto.test.js
describe('MSISDN Encryption', () => {
  it('should encrypt and decrypt MSISDN correctly', () => {
    const msisdn = '+27825571055';
    const key = crypto.randomBytes(32);
    const aad = 'user-1-phoneNumber';
    
    const encrypted = encryptMsisdn(msisdn, key, aad);
    const decrypted = decryptMsisdn(encrypted, key, aad);
    
    expect(decrypted).toBe(msisdn);
  });
  
  it('should fail with wrong AAD', () => {
    const msisdn = '+27825571055';
    const key = crypto.randomBytes(32);
    
    const encrypted = encryptMsisdn(msisdn, key, 'user-1-phoneNumber');
    
    expect(() => {
      decryptMsisdn(encrypted, key, 'user-2-phoneNumber');
    }).toThrow('Unsupported state or unable to authenticate data');
  });
  
  it('should generate consistent hashes', () => {
    const msisdn = '+27825571055';
    
    const hash1 = hashMsisdnForSearch(msisdn);
    const hash2 = hashMsisdnForSearch(msisdn);
    
    expect(hash1.equals(hash2)).toBe(true);
  });
});
```

### Integration Tests

- [ ] User registration with encrypted phone number
- [ ] User login with hash-based phone lookup
- [ ] Beneficiary creation with encrypted MSISDN
- [ ] Beneficiary search with hash-based lookup
- [ ] Service account MSISDN encryption in JSONB
- [ ] Key rotation simulation (generate new key, re-encrypt, validate)

### Performance Tests

- [ ] Hash lookup performance: <50ms per query
- [ ] Encryption overhead: <1ms per operation
- [ ] Decryption overhead: <1ms per operation
- [ ] Bulk encryption (1,000 records): <10 seconds

## Monitoring & Alerts

### Metrics to Track

- **Encryption Operations**: Count, duration, failures
- **Decryption Operations**: Count, duration, failures
- **Hash Lookup Performance**: P50, P95, P99 latencies
- **Key Access Frequency**: Requests/minute to Secret Manager
- **Audit Log Volume**: Decrypt operations/minute

### Alerts

- ❌ **Decryption Failure Rate > 1%**: Page on-call engineer
- ⚠️ **Hash Lookup Latency > 100ms**: Investigate index performance
- ⚠️ **Key Access Rate > 100/min**: Possible key caching issue
- ⚠️ **Encryption Failure Rate > 0.1%**: Investigate application errors

## Compliance Checklist

- [ ] **GDPR Article 32**: Encryption of personal data at rest ✅
- [ ] **POPIA Section 19**: Security safeguards for PII ✅
- [ ] **ISO 27001**: Cryptographic controls implemented ✅
- [ ] **PCI DSS**: Strong cryptography for cardholder data (if applicable) ✅
- [ ] **Key Management**: Documented key lifecycle and rotation procedures ✅
- [ ] **Audit Trail**: Complete logging of encryption/decryption operations ✅
- [ ] **Incident Response**: Documented procedure for key compromise ✅

## Timeline & Deliverables

### Week 1: Foundation & Migration Prep
- **Day 1-2**: 
  - Create `utils/crypto.js` utility
  - Write unit tests for encryption/decryption
  - Generate encryption keys for UAT/Staging/Production
  - Store keys in Google Secret Manager
- **Day 3-4**:
  - Create migration `20251203_01_add_encryption_columns.js`
  - Test migration in local development
  - Create backfill script `scripts/backfill-encrypt-msisdns.js`
  - Test backfill in local development
- **Day 5**:
  - Run migration in UAT environment
  - Run backfill script in UAT environment
  - Validate encrypted data

### Week 2: Application Updates & Testing
- **Day 1-2**:
  - Update models with virtual decryption methods
  - Update controllers to use hash-based queries
  - Update services to decrypt when needed
  - Write integration tests
- **Day 3-4**:
  - Deploy to UAT
  - Run integration tests
  - Monitor for decryption errors
  - Validate query performance
- **Day 5**:
  - Deploy to Staging
  - Run full test suite
  - Begin validation period

### Week 3: Validation & Production
- **Day 1-3**:
  - Monitor Staging environment
  - Validate audit logs
  - Performance testing
  - Load testing
- **Day 4**:
  - Deploy to Production (if validation successful)
  - Monitor closely for 48 hours
- **Day 5**:
  - Drop plaintext columns (after 2-week validation in Production)
  - Update documentation
  - Create session log

## Next Steps (Immediate Actions)

1. **Create `utils/crypto.js`**: Implement `encryptMsisdn`, `decryptMsisdn`, `hashMsisdnForSearch`, `loadEncryptionKey`
2. **Generate Encryption Keys**: Create keys for UAT, Staging, Production environments
3. **Store Keys in Secret Manager**: Upload keys to Google Secret Manager
4. **Write Unit Tests**: Test encryption, decryption, hashing functions
5. **Create Migration**: `20251203_01_add_encryption_columns.js`
6. **Create Backfill Script**: `scripts/backfill-encrypt-msisdns.js`
7. **Test Locally**: Validate entire flow in local development
8. **Deploy to UAT**: Run migration and backfill in UAT
9. **Update Application**: Modify models, controllers, services
10. **Integration Testing**: Full end-to-end testing in UAT

## References

- **NIST SP 800-57**: Key Management Recommendations
- **OWASP Cryptographic Storage Cheat Sheet**: Best practices for encryption at rest
- **Google Secret Manager**: Key storage and access control
- **AES-GCM**: NIST-approved authenticated encryption mode
- **GDPR Article 32**: Security of processing requirements
- **POPIA Section 19**: Security safeguards for personal information

