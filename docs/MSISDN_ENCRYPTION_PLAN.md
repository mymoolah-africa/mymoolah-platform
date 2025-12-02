# MSISDN Encryption at Rest Plan

Last Updated: 2025-12-02

## Objective
Encrypt MSISDN-bearing fields at rest using AES-256-GCM with application-level encryption keys stored in Secret Manager.

## Scope
- users.phoneNumber (E.164)
- users.accountNumber (E.164 mirror)
- beneficiaries.msisdn (E.164 or NON_MSI_*)
- beneficiary_service_accounts.serviceData.msisdn (JSONB field)
- beneficiary_payment_methods.walletMsisdn (if present)

## Approach
1. Key Management
   - Generate 32-byte symmetric key per environment (`MSISDN_ENC_KEY`)
   - Store in secret manager; load to memory on boot; rotate quarterly
2. Encryption Envelope
   - AES-256-GCM with 12-byte random IV and 16-byte auth tag
   - Ciphertext format (base64): `v1:{b64(iv)}:{b64(cipher)}:{b64(tag)}`
3. Field Strategy
   - Add parallel shadow columns for searchable forms (hashed and/or tokenized)
     - `*_hash` (SHA-256 of E.164) for equality searches
     - Preserve `*_display` (masked/local) for UI rendering when needed
   - Migrate cleartext → encrypted; backfill hashes
4. Query Patterns
   - Replace equality queries with `*_hash = sha256(normalizeToE164(input))`
   - Only decrypt when presenting to UI or external services
5. Telemetry
   - Mask MSISDN in logs (`+27****1234`)
   - Audit log all decrypt operations

## Migration Steps
1. Add columns
   - `users.phoneNumber_enc TEXT`, `users.phoneNumber_hash BYTEA`
   - `users.accountNumber_enc TEXT`, `users.accountNumber_hash BYTEA`
   - `beneficiaries.msisdn_enc TEXT`, `beneficiaries.msisdn_hash BYTEA`
   - JSONB fields remain JSONB with encrypted `msisdn_enc` and `msisdn_hash`
2. Backfill data
   - Encrypt E.164 and compute sha256 hashes
3. Swap readers
   - Update models/services to read `*_enc` + decrypt; write both enc + hash
4. Remove plaintext
   - After validation period, drop plaintext columns

## Risks
- Indexes on hashes must exist to preserve performance
- Key rotation requires re-encryption job; plan for rolling rotation

## Next
- Implement utility `utils/crypto.js` with `encrypt`, `decrypt`, `hashE164`
- Author migrations per table with rollbacks
- Update services to use hashed queries and limited decrypts

