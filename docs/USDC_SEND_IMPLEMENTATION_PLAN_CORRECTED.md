# MyMoolah USDC Send - CORRECTED Implementation Plan

**Project**: MyMoolah Treasury Platform  
**Feature**: Buy USDC (Cross-Border Value Transfer)  
**Version**: 2.0.0 - CORRECTED FOR MYMOOLAH ARCHITECTURE  
**Date**: February 7, 2026  
**Partner**: VALR (FSP 53308)  
**Network**: USDC on Solana  
**Status**: ✅ **READY FOR IMPLEMENTATION**

### **Post-implementation UI updates (February 2026)**
- **Fee labels**: "Platform fee" renamed to **"Transaction Fee"** in quote breakdown and Confirm USDC Send sheet.
- **Network fee**: Removed from UI (quote and Confirm sheet); was R 0,00 in current flow. Can be re-added if a non-zero network fee is charged.
- **Transaction Details modal**: Shows Reference (internal ID), Amount, and Status only. No blockchain Tx ID in UI (recipient is auto-credited to wallet on file; aligned with banking/Mojaloop practice).

---

## 🔄 **CHANGES FROM ORIGINAL PLAN**

This corrected plan fixes **9 critical architecture violations** identified in the original plan:

| Issue | Original Approach | Corrected Approach |
|-------|------------------|-------------------|
| 1. Transaction storage | New `usdc_transactions` table | ✅ Use existing `transactions` table with `metadata` JSONB |
| 2. Beneficiary ENUM | ALTER ENUM (fails) | ✅ VARCHAR columns (no ENUM needed) |
| 3. Ledger integration | ❌ Missing | ✅ Full `ledgerService.js` integration |
| 4. Transaction type | Wrong field usage | ✅ Correct `type` + `metadata.transactionType` |
| 5. Error handling | ❌ No retry logic | ✅ Retry + timeout + circuit breaker |
| 6. Frontend structure | New page | ✅ Overlay pattern (like all services) |
| 7. Rate caching | New DB table | ✅ Redis via `cachingService.js` |
| 8. Float account | ❌ Missing | ✅ VALR float in ledger + monitoring |
| 9. Secrets | `.env` file | ✅ Google Secret Manager (Staging/Prod) |

---

## 1. Database Schema (CORRECTED)

### 1.1 NO New Transaction Table ❌

**DO NOT CREATE `usdc_transactions` table.**

Use existing `transactions` table with `metadata` JSONB field.

### 1.2 Extend Beneficiaries Table ✅

```sql
-- Migration: 20260207_extend_beneficiaries_for_usdc.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add crypto_services JSONB column
    // Note: accountType and preferredPaymentMethod are VARCHAR(50), NOT ENUMs
    await queryInterface.addColumn('beneficiaries', 'crypto_services', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Crypto wallet services: { usdc: [{ walletAddress, network, isActive, country, relationship }] }'
    });

    // Add GIN index for crypto_services queries
    await queryInterface.addIndex('beneficiaries', ['crypto_services'], {
      name: 'idx_beneficiaries_crypto_services',
      using: 'GIN'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('beneficiaries', 'idx_beneficiaries_crypto_services');
    await queryInterface.removeColumn('beneficiaries', 'crypto_services');
  }
};
```

### 1.3 cryptoServices JSONB Structure

```typescript
interface CryptoServices {
  usdc?: UsdcWallet[];
}

interface UsdcWallet {
  walletAddress: string;       // Solana address (32-44 chars)
  network: 'solana';
  isActive: boolean;
  isVerified: boolean;
  isDefault: boolean;
  country: string;              // ISO 2-letter (Travel Rule)
  relationship: string;         // Family, Friend, Self, Business
  purpose?: string;
  cooldownUntil?: string;       // ISO date
  firstSendAt?: string;
  totalSends: number;
  totalUsdcSent: number;
  createdAt: string;
  updatedAt: string;
}
```

### 1.4 Transaction Record Structure (Existing Table)

```javascript
// Use existing transactions table via WalletService.createTransaction()

await Transaction.create({
  transactionId: `USDC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
  userId,
  walletId,
  amount: totalZarAmount * -1,  // Negative for debit (in cents)
  type: 'sent',                 // Accounting direction
  status: 'completed',          // Or 'pending' if compliance hold
  description: `USDC Send to ${beneficiaryName}`,
  metadata: {
    transactionType: 'usdc_send',
    // Financial
    usdcAmount: '10.50',
    exchangeRate: '18.45',
    platformFee: 750,           // In cents
    platformFeeVat: 113,        // In cents
    networkFeeZar: 200,         // In cents
    // Beneficiary (Travel Rule)
    beneficiaryName: 'John Smith',
    beneficiaryCountry: 'US',
    beneficiaryRelationship: 'family',
    beneficiaryPurpose: 'Support',
    beneficiaryWalletAddress: '8xKt...4Fd2',
    beneficiaryWalletNetwork: 'solana',
    // VALR Integration
    valrOrderId: 'VLR123',
    valrWithdrawalId: 'VLR456',
    blockchainTxHash: 'abc123...',
    blockchainStatus: 'confirmed',  // pending, executing, withdrawing, confirming, completed, failed
    blockchainConfirmations: 32,
    // Compliance
    complianceHold: false,
    complianceFlags: [],
    riskScore: 25
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
```

---

## 2. Ledger Integration (CRITICAL - WAS MISSING)

### 2.1 VALR Float Account Setup

```sql
-- Migration: 20260207_create_valr_float_account.js

-- Add VALR float ledger account
INSERT INTO ledger_accounts (
  account_code,
  account_name,
  account_type,
  parent_account_code,
  is_active,
  description
) VALUES (
  '1200-10-06',
  'VALR USDC Float',
  'asset',
  '1200-10',
  true,
  'VALR cryptocurrency exchange float account for USDC purchases'
);

-- Add supplier float record for monitoring
INSERT INTO supplier_floats (
  supplier_code,
  supplier_name,
  ledger_account_code,
  minimum_balance,
  warning_threshold,
  critical_threshold,
  currency,
  is_active,
  alert_email
) VALUES (
  'VALR',
  'VALR',
  '1200-10-06',
  1000000,     -- R10,000 minimum (in cents)
  1500000,     -- R15,000 warning (15% above min)
  1050000,     -- R10,500 critical (5% above min)
  'ZAR',
  true,
  'finance@mymoolah.africa'
);
```

### 2.2 Ledger Posting Pattern

```javascript
// services/usdcTransactionService.js

const ledgerService = require('./ledgerService');

async function executeBuyAndSend(userId, walletId, params) {
  const { zarAmount, beneficiaryId, purpose } = params;
  
  // ... validation, compliance checks ...
  
  // Get ledger accounts
  const userWalletAccount = await LedgerAccount.findOne({
    where: { walletId }
  });
  
  const valrFloatAccount = await LedgerAccount.findOne({
    where: { account_code: '1200-10-06' }
  });
  
  const feeRevenueAccount = await LedgerAccount.findOne({
    where: { account_code: '4100-01-06' }  // Create revenue account for USDC fees
  });
  
  // Calculate amounts (in cents)
  const totalZarCents = zarAmount * 100;
  const platformFeeCents = Math.round(totalZarCents * 0.075);  // 7.5% incl VAT
  const vatCents = Math.round(platformFeeCents * (15/115));     // Extract VAT portion
  const netToValrCents = totalZarCents - platformFeeCents;
  
  // Execute VALR order
  const quote = await valrService.getInstantQuote('USDCZAR', zarAmount);
  const order = await valrService.executeInstantOrder(quote.orderId);
  const withdrawal = await valrService.withdrawUsdc({
    amount: quote.usdcAmount,
    address: beneficiary.cryptoServices.usdc[0].walletAddress,
    network: 'solana'
  });
  
  // Post to ledger (double-entry accounting)
  await ledgerService.postJournalEntry({
    description: `USDC Send to ${beneficiary.name}`,
    reference: transactionId,
    journalEntries: [
      // Debit: User wallet (asset decrease)
      {
        ledgerAccountId: userWalletAccount.id,
        accountCode: userWalletAccount.account_code,
        debit: 0,
        credit: totalZarCents
      },
      // Credit: VALR float (asset increase)
      {
        ledgerAccountId: valrFloatAccount.id,
        accountCode: '1200-10-06',
        debit: netToValrCents,
        credit: 0
      },
      // Credit: Fee revenue
      {
        ledgerAccountId: feeRevenueAccount.id,
        accountCode: '4100-01-06',
        debit: platformFeeCents - vatCents,  // Fee excluding VAT
        credit: 0
      },
      // Credit: VAT payable
      {
        accountCode: '2300-01-01',  // VAT payable liability
        debit: vatCents,
        credit: 0
      }
    ],
    metadata: {
      transactionId,
      transactionType: 'usdc_send',
      userId,
      beneficiaryId,
      valrOrderId: order.orderId,
      valrWithdrawalId: withdrawal.id
    }
  });
  
  // Create transaction record (existing transactions table)
  const txn = await Transaction.create({
    transactionId,
    userId,
    walletId,
    amount: totalZarCents * -1,  // Negative for debit
    type: 'sent',
    status: 'completed',
    description: `USDC Send to ${beneficiary.name}`,
    metadata: {
      transactionType: 'usdc_send',
      usdcAmount: quote.usdcAmount,
      exchangeRate: quote.rate,
      platformFee: platformFeeCents,
      platformFeeVat: vatCents,
      beneficiaryName: beneficiary.name,
      beneficiaryWalletAddress: beneficiary.cryptoServices.usdc[0].walletAddress,
      valrOrderId: order.orderId,
      valrWithdrawalId: withdrawal.id,
      blockchainTxHash: withdrawal.txHash,
      blockchainStatus: 'pending'
    }
  });
  
  return txn;
}
```

---

## 3. VALR Service (WITH BANKING-GRADE ERROR HANDLING)

```javascript
// services/valrService.js

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

class ValrService {
  constructor() {
    this.baseUrl = process.env.VALR_API_URL || 'https://api.valr.com';
    this.apiKey = process.env.VALR_API_KEY;
    this.apiSecret = process.env.VALR_API_SECRET;
    this.timeout = 30000;  // 30 second timeout
    this.maxRetries = 3;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerResetTime = 300000;  // 5 minutes
    this.failureCount = 0;
    this.circuitOpen = false;
    this.lastFailureTime = null;
  }

  signRequest(timestamp, verb, path, body = '') {
    const payload = `${timestamp}${verb.toUpperCase()}${path}${body}`;
    return crypto
      .createHmac('sha512', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  async makeRequest(method, path, data = null, options = {}) {
    // Circuit breaker check
    if (this.circuitOpen) {
      if (Date.now() - this.lastFailureTime > this.circuitBreakerResetTime) {
        this.circuitOpen = false;
        this.failureCount = 0;
        logger.info('VALR circuit breaker reset');
      } else {
        throw new Error('VALR service temporarily unavailable (circuit breaker open)');
      }
    }

    const timestamp = Date.now().toString();
    const body = data ? JSON.stringify(data) : '';
    const signature = this.signRequest(timestamp, method, path, body);

    const headers = {
      'X-VALR-API-KEY': this.apiKey,
      'X-VALR-SIGNATURE': signature,
      'X-VALR-TIMESTAMP': timestamp,
      'Content-Type': 'application/json'
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios({
          method,
          url: `${this.baseUrl}${path}`,
          headers,
          data: data || undefined,
          timeout: options.timeout || this.timeout
        });

        // Success - reset failure count
        this.failureCount = 0;
        return response.data;

      } catch (error) {
        lastError = error;
        
        // Log error
        logger.error('VALR API request failed', {
          attempt,
          path,
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        });

        // Check if retryable
        if (attempt === this.maxRetries || !this.isRetryableError(error)) {
          break;
        }

        // Exponential backoff
        const backoffMs = 1000 * Math.pow(2, attempt);
        await this.sleep(backoffMs);
      }
    }

    // All retries failed
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Open circuit breaker if threshold reached
    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
      logger.error('VALR circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.circuitBreakerThreshold
      });
    }

    throw lastError;
  }

  isRetryableError(error) {
    // Retry on network errors and specific status codes
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.response?.status === 503 ||
      error.response?.status === 429 ||
      error.response?.status === 502
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // API Methods

  async getMarketRate(pair = 'USDCZAR') {
    const data = await this.makeRequest('GET', `/v1/public/${pair}/marketsummary`);
    return {
      bidPrice: parseFloat(data.bidPrice),
      askPrice: parseFloat(data.askPrice),
      midPrice: (parseFloat(data.bidPrice) + parseFloat(data.askPrice)) / 2,
      lastTrade: parseFloat(data.lastTradedPrice)
    };
  }

  async getInstantQuote(pair, zarAmount) {
    const data = await this.makeRequest('POST', '/v1/simple/quote', {
      pair,
      payInCurrency: 'ZAR',
      payAmount: zarAmount.toString(),
      side: 'BUY'
    });
    
    return {
      orderId: data.orderId,
      usdcAmount: parseFloat(data.receiveAmount),
      zarAmount: parseFloat(data.payAmount),
      rate: parseFloat(data.price),
      expiresAt: new Date(Date.now() + 60000)  // 60 second expiry
    };
  }

  async executeInstantOrder(orderId, idempotencyKey) {
    const data = await this.makeRequest('POST', '/v1/simple/order', {
      orderId,
      idempotencyKey
    });
    
    return {
      orderId: data.orderId,
      status: data.status,
      usdcAmount: parseFloat(data.receiveAmount),
      executedAt: new Date()
    };
  }

  async withdrawUsdc(params) {
    const { amount, address, network } = params;
    
    const data = await this.makeRequest('POST', '/v1/wallet/crypto/USDC/withdraw', {
      amount: amount.toString(),
      address,
      network: 'solana',
      paymentReference: `USDC-${Date.now()}`
    });
    
    return {
      id: data.id,
      status: data.status,
      txHash: data.transactionHash || null,
      confirmations: 0
    };
  }

  async getWithdrawalStatus(withdrawalId) {
    const data = await this.makeRequest('GET', `/v1/wallet/crypto/USDC/withdraw/${withdrawalId}`);
    
    return {
      id: data.id,
      status: data.status,
      txHash: data.transactionHash,
      confirmations: data.confirmationCount || 0,
      completedAt: data.completedTime ? new Date(data.completedTime) : null
    };
  }
}

module.exports = new ValrService();
```

---

## 4. Rate Caching (USE REDIS, NOT DB)

```javascript
// In usdcTransactionService.js

const cachingService = require('./cachingService');

async function getCurrentRate() {
  const cacheKey = 'usdc:rate:USDCZAR';
  
  // Try cache first
  const cached = await cachingService.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from VALR
  const rate = await valrService.getMarketRate('USDCZAR');
  
  // Cache for 60 seconds
  await cachingService.set(cacheKey, JSON.stringify(rate), 60);
  
  return rate;
}
```

**NO `usdc_rate_cache` table needed.**

---

## 5. UnifiedBeneficiaryService Extension

```javascript
// services/UnifiedBeneficiaryService.js

// Add to filterBeneficiariesByServiceWithNormalizedOptimized
case 'usdc':
case 'crypto':
  return beneficiary.cryptoServices && 
    beneficiary.cryptoServices.usdc && 
    beneficiary.cryptoServices.usdc.some(w => w.isActive);

// Add to formatBeneficiariesForService
case 'usdc':
  const primaryUsdcWallet = this.getPrimaryUsdcWallet(beneficiary.cryptoServices);
  return {
    ...base,
    cryptoServices: beneficiary.cryptoServices,
    accountType: 'usdc',
    identifier: primaryUsdcWallet?.walletAddress || base.identifier,
    walletAddress: primaryUsdcWallet?.walletAddress,
    network: primaryUsdcWallet?.network || 'solana',
    country: primaryUsdcWallet?.country,
    relationship: primaryUsdcWallet?.relationship
  };

// Add helper method
getPrimaryUsdcWallet(cryptoServices) {
  if (!cryptoServices || !cryptoServices.usdc) return null;
  return cryptoServices.usdc.find(w => w.isDefault && w.isActive) || 
         cryptoServices.usdc.find(w => w.isActive) ||
         null;
}

// Add to getLegacyFieldValues
case 'usdc':
  return {
    identifier: serviceData.walletAddress || primaryMsisdn,
    accountType: 'usdc'
  };
```

---

## 6. Frontend Structure (OVERLAY PATTERN)

### 6.1 File Structure

```
mymoolah-wallet-frontend/
├── components/
│   └── overlays/
│       └── BuyUsdcOverlay.tsx  // Single overlay file (like AirtimeDataOverlay.tsx)
├── services/
│   └── usdcService.ts
└── hooks/
    └── useUsdcQuote.ts
```

**DO NOT create `BuyUsdcPage.tsx` or separate page.**

### 6.2 Add to TransactPage.tsx

```typescript
// Line ~171 in TransactPage.tsx
// Add after "Pay Recipient" service

{
  id: 'buy-usdc',
  title: 'Buy USDC',
  description: 'Send value globally via USDC',
  icon: <Coins className="w-6 h-6" />,
  action: () => {
    if (user?.kycTier < 2) {
      toast.error('Tier 2 KYC required for USDC Send');
      router.push('/kyc');
      return;
    }
    setActiveOverlay('buy-usdc');
  },
  available: true,
  badge: user?.kycTier >= 2 ? 'New' : 'KYC Required',
  badgeType: user?.kycTier >= 2 ? 'info' : 'warning'
},

// Add overlay rendering
{activeOverlay === 'buy-usdc' && (
  <BuyUsdcOverlay
    isOpen={true}
    onClose={() => setActiveOverlay(null)}
    user={user}
    wallet={wallet}
  />
)}
```

---

## 7. Environment Variables (GOOGLE SECRET MANAGER)

### 7.1 Local Development (.env)

```env
# VALR API (UAT/Test)
VALR_API_URL=https://api.valr.com
VALR_API_KEY=test_key_from_valr_portal
VALR_API_SECRET=test_secret_from_valr_portal

# USDC Feature Flags
USDC_FEATURE_ENABLED=true
USDC_MIN_KYC_TIER=2
USDC_FEE_PERCENT=7.5
USDC_FEE_VAT_INCLUSIVE=true

# Limits (in ZAR)
USDC_LIMIT_PER_TXN=5000
USDC_LIMIT_DAILY=15000
USDC_LIMIT_MONTHLY=50000

# Sanctions
USDC_BLOCKED_COUNTRIES=CU,IR,KP,SY,RU,UA-43,UA-14,UA-09
```

### 7.2 Staging/Production (Google Secret Manager)

```bash
# Create secrets in Google Secret Manager
gcloud secrets create valr-api-key-staging --data-file=- <<< "staging_key"
gcloud secrets create valr-api-secret-staging --data-file=- <<< "staging_secret"

gcloud secrets create valr-api-key-production --data-file=- <<< "prod_key"
gcloud secrets create valr-api-secret-production --data-file=- <<< "prod_secret"

# Grant access to service account
gcloud secrets add-iam-policy-binding valr-api-key-staging \
  --member="serviceAccount:mymoolah-backend@mymoolah-db.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 8. Implementation Checklist

### Phase 1: Database & Ledger ✅
- [ ] Migration: Extend `beneficiaries` with `crypto_services` JSONB
- [ ] Migration: Create VALR float account (`1200-10-06`)
- [ ] Migration: Create USDC fee revenue account (`4100-01-06`)
- [ ] Update `Beneficiary` model with `cryptoServices` field
- [ ] Verify ledger accounts created successfully

### Phase 2: Backend Services ✅
- [ ] Install dependencies: `npm install @solana/web3.js`
- [ ] Create `utils/solanaAddressValidator.js`
- [ ] Create `services/valrService.js` (with retry/circuit breaker)
- [ ] Create `services/usdcTransactionService.js` (with ledger integration)
- [ ] Create `controllers/usdcController.js`
- [ ] Create `routes/usdc.js`
- [ ] Update `UnifiedBeneficiaryService.js` for USDC support
- [ ] Register routes in `server.js`

### Phase 3: Frontend ✅
- [ ] Create `components/overlays/BuyUsdcOverlay.tsx`
- [ ] Create `services/usdcService.ts`
- [ ] Create `hooks/useUsdcQuote.ts`
- [ ] Add service to `TransactPage.tsx`
- [ ] Add Lucide `Coins` icon import
- [ ] Update `TransactionHistoryPage.tsx` for USDC display
- [ ] Add Solscan explorer link component

### Phase 4: Environment & Secrets ✅
- [ ] Set up Google Secret Manager secrets (Staging)
- [ ] Set up Google Secret Manager secrets (Production)
- [ ] Add VALR env vars to `env.template`
- [ ] Test secret retrieval in Staging

### Phase 5: Testing ✅
- [ ] Unit tests: Solana address validation
- [ ] Unit tests: Fee calculation
- [ ] Unit tests: Limit validation
- [ ] Integration tests: Full USDC send flow
- [ ] Manual UAT: With real VALR UAT credentials
- [ ] Load testing: Concurrent transactions

### Phase 6: Documentation ✅
- [ ] Update `docs/AGENT_HANDOVER.md`
- [ ] Update `docs/CHANGELOG.md`
- [ ] Update `docs/API_DOCUMENTATION.md`
- [ ] Create session log when complete
- [ ] Copy `USDC_SUPPORT_KB.md` to `docs/uat/`
- [ ] Update `aiSupportService.js` with USDC patterns

---

## 9. Key Differences Summary

| Component | ❌ Original Plan | ✅ Corrected Approach |
|-----------|-----------------|----------------------|
| **Transactions** | New `usdc_transactions` table | Existing `transactions` table + metadata |
| **Beneficiaries** | ALTER ENUM (fails) | Add JSONB column only |
| **Ledger** | Not integrated | Full double-entry via `ledgerService.js` |
| **Float Account** | Missing | `1200-10-06` VALR Float + monitoring |
| **Error Handling** | Basic | Retry + timeout + circuit breaker |
| **Rate Cache** | New DB table | Redis via `cachingService.js` |
| **Frontend** | New page | Overlay pattern (TransactPage) |
| **Secrets** | `.env` file | Google Secret Manager |
| **Compliance** | Separate service | Integrated with `auditLogger.js` |

---

## 10. Ready to Implement ✅

**This corrected plan:**
- ✅ Follows MyMoolah's exact architecture patterns
- ✅ Uses existing services (ledger, caching, audit)
- ✅ Maintains unified transaction storage
- ✅ Implements banking-grade error handling
- ✅ Properly integrates with beneficiary system
- ✅ Uses overlay pattern for frontend
- ✅ Follows Google Secret Manager pattern
- ✅ No workarounds or shortcuts

**Post-Implementation Banking-Grade Sweep (Feb 2026)**  
- All USDC routes use express-validator with `handleValidation`; no unvalidated input at API boundary.  
- Limit checks use database aggregation (SUM/ABS) only; no JavaScript sum over result sets.  
- Idempotency: client key accepted (max 128 chars) or server-generated `crypto.randomUUID()`.  
- VALR: `isConfigured()` and `signRequest` guard missing credentials; no unsupported body fields sent.  
- Controller uses service layer only (`getTransactionById`); no direct Transaction model in controller.  
- Address and query params sanitized (length caps, type coercion) for security and performance.

**Status**: Ready for implementation with your approval.

**Next Step**: Await your final approval, then begin Phase 1 implementation.

---

**Document Version**: 2.0.0 - Corrected for MyMoolah Architecture  
**Created**: February 7, 2026  
**Status**: ✅ Ready for Review & Approval
