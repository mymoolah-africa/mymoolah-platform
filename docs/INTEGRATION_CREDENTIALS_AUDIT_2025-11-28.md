# Integration Credentials Audit - Zapper & MobileMart

**Date**: November 28, 2025  
**Auditor**: Claude (Cursor AI Agent)  
**Purpose**: Verify UAT uses UAT credentials and Staging uses Production credentials  
**Status**: ⚠️ **ACTION REQUIRED**

---

## 🎯 Audit Summary

### Findings:
1. ✅ **Zapper Staging**: Using **Production credentials** (correct)
2. ✅ **Zapper UAT**: Using **TEST/UAT credentials** (correct - Zapper uses same credentials for TEST and UAT)
3. ❌ **MobileMart UAT**: Using **UAT URL but PRODUCTION credentials** (incorrect - needs UAT credentials)
4. ⚠️ **MobileMart Staging**: **NOT CONFIGURED** in Cloud Run deployment

---

## 🔍 Detailed Audit Results

### 1. Zapper Integration

#### **Staging Environment** ✅ **CORRECT**
**Location**: Cloud Run Staging (`mymoolah-backend-staging`)  
**Configuration**: `scripts/deploy-cloud-run-staging.sh` + `scripts/setup-secrets-staging.sh`

**Credentials** (from Google Secret Manager):
```bash
ZAPPER_API_URL=https://api.zapper.com/v1  # Production URL ✅
ZAPPER_ORG_ID=2f053500-c05c-11f0-b818-e12393dd6bc4  # Production Org ID ✅
ZAPPER_API_TOKEN=91446a79-004b-4687-8b37-0e2a5d8ee7ce  # Production Token ✅
ZAPPER_X_API_KEY=u5YVZwClL68S2wOTmuP6i7slhqNvV5Da7a2tysqk  # Production Key ✅
```

**Status**: ✅ **CORRECT** - Staging is using Production Zapper credentials  
**Test Users**: 6 test users (Andre, Leonie, Andre Jr, Hendrik, Neil, Denise)  
**Purpose**: Test with real production API but limited to 6 test users

---

#### **UAT Environment** ✅ **CORRECT**
**Location**: Codespaces/Local (`/workspaces/mymoolah-platform` or `/Users/andremacbookpro/mymoolah`)  
**Configuration**: `.env` file (not in git)

**Current Credentials** (TEST/UAT - Same as Postman collection):
```bash
# Zapper TEST/UAT credentials (confirmed - same credentials for both)
ZAPPER_API_URL=https://api.zapper.com/v1
ZAPPER_ORG_ID=810c1540-6de0-11f0-9286-4f0cdcb898f5  # TEST/UAT Org ID
ZAPPER_API_TOKEN=eb22884a-bc62-4307-ac21-ac9f2ac140f2  # TEST/UAT Token
ZAPPER_X_API_KEY=8h8DDBvlaPoYgefHwqeG3DNZaO6vorxWPsCDtvd0  # TEST/UAT Key
```

**Status**: ✅ **CORRECT** - Zapper uses same credentials for TEST and UAT  
**Note**: Zapper does not have separate UAT environment - TEST credentials are used for UAT testing  
**Test Users**: 6 test users (Andre, Leonie, Andre Jr, Hendrik, Neil, Denise)  
**Purpose**: Local UAT testing with Zapper TEST/UAT credentials before staging deployment

---

### 2. MobileMart Integration

#### **UAT Environment** ❌ **INCORRECT**
**Location**: Codespaces/Local  
**Configuration**: `.env` file

**Current Configuration** (from `env.template`):
```bash
MOBILEMART_LIVE_INTEGRATION=false
MOBILEMART_CLIENT_ID=mymoolah  # PRODUCTION credentials ❌
MOBILEMART_CLIENT_SECRET=c799bf37-934d-4dcf-bfec-42fb421a6407  # PRODUCTION ❌
MOBILEMART_API_URL=https://uat.fulcrumswitch.com  # UAT URL ✅
MOBILEMART_TOKEN_URL=https://uat.fulcrumswitch.com/connect/token  # UAT URL ✅
MOBILEMART_SCOPE=api
```

**Problem**: ❌ **Using PRODUCTION credentials with UAT URL**

**Correct Configuration** (should be):
```bash
MOBILEMART_LIVE_INTEGRATION=false
MOBILEMART_CLIENT_ID=<UAT_CLIENT_ID>  # Request from MobileMart via WhatsApp
MOBILEMART_CLIENT_SECRET=<UAT_SECRET>  # Request from MobileMart via WhatsApp
MOBILEMART_API_URL=https://uat.fulcrumswitch.com  # UAT URL ✅
MOBILEMART_TOKEN_URL=https://uat.fulcrumswitch.com/connect/token  # UAT URL ✅
MOBILEMART_SCOPE=api
```

**Action Required**:
1. ⚠️ **Request UAT credentials from MobileMart** (via WhatsApp - provide cellphone number)
2. ⚠️ **Update `.env` file** with UAT credentials
3. ⚠️ **Test UAT integration** with `scripts/test-mobilemart-uat.js`

**Reference**: `integrations/mobilemart/MOBILEMART_SUPPORT_RESPONSE_ANALYSIS.md`

---

#### **Staging Environment** ❌ **NOT CONFIGURED**
**Location**: Cloud Run Staging  
**Configuration**: `scripts/deploy-cloud-run-staging.sh`

**Current Status**: ❌ **MobileMart credentials NOT included in Cloud Run deployment**

**Missing Configuration**:
```bash
# Should be added to Google Secret Manager:
MOBILEMART_CLIENT_ID=mymoolah  # Production credentials
MOBILEMART_CLIENT_SECRET=c799bf37-934d-4dcf-bfec-42fb421a6407  # Production
MOBILEMART_API_URL=https://fulcrumswitch.com  # Production URL
MOBILEMART_TOKEN_URL=https://fulcrumswitch.com/connect/token  # Production URL
MOBILEMART_SCOPE=api
MOBILEMART_LIVE_INTEGRATION=true  # Enable live integration in staging
```

**Action Required**:
1. ⚠️ **Add MobileMart secrets to Google Secret Manager** (staging)
2. ⚠️ **Update `scripts/setup-secrets-staging.sh`** to include MobileMart secrets
3. ⚠️ **Update `scripts/deploy-cloud-run-staging.sh`** to mount MobileMart secrets
4. ⚠️ **Redeploy Cloud Run staging** with MobileMart configuration

---

## 📋 Action Items

### Immediate Actions (UAT)

#### 1. ~~Verify Zapper UAT Credentials~~ ✅ **CONFIRMED**
**Status**: ✅ **NO ACTION REQUIRED**  
**Reason**: Zapper TEST and UAT credentials are the same (confirmed by user)

**Current Configuration**: ✅ Correct
```bash
ZAPPER_API_URL=https://api.zapper.com/v1
ZAPPER_ORG_ID=810c1540-6de0-11f0-9286-4f0cdcb898f5
ZAPPER_API_TOKEN=eb22884a-bc62-4307-ac21-ac9f2ac140f2
ZAPPER_X_API_KEY=8h8DDBvlaPoYgefHwqeG3DNZaO6vorxWPsCDtvd0
```

---

#### 2. Request MobileMart UAT Credentials ⏱️ 1 hour (waiting time)
**Contact**: MobileMart Support via WhatsApp  
**Information to Provide**: Cellphone number for UAT access  
**Expected Response**: UAT Client ID and Client Secret

**Steps**:
1. Contact MobileMart support via WhatsApp
2. Provide cellphone number for UAT access
3. Request UAT credentials (Client ID + Client Secret)
4. Update `.env` file with UAT credentials
5. Test UAT integration

**Reference**: `integrations/mobilemart/MOBILEMART_UAT_CREDENTIALS_SETUP.md`

---

### Staging Configuration (MobileMart)

#### 3. Add MobileMart to Staging ⏱️ 2 hours

**Step 1: Update Secrets Setup Script**
```bash
# Edit scripts/setup-secrets-staging.sh
# Add MobileMart secrets after Zapper secrets (around line 85)

# Add these lines:
create_or_update_secret "mobilemart-prod-client-id" "mymoolah" "MobileMart Production Client ID"
create_or_update_secret "mobilemart-prod-client-secret" "c799bf37-934d-4dcf-bfec-42fb421a6407" "MobileMart Production Client Secret"
create_or_update_secret "mobilemart-prod-api-url" "https://fulcrumswitch.com" "MobileMart Production API URL"
create_or_update_secret "mobilemart-prod-token-url" "https://fulcrumswitch.com/connect/token" "MobileMart Production Token URL"
create_or_update_secret "mobilemart-prod-scope" "api" "MobileMart Production Scope"
```

**Step 2: Create Secrets in Google Secret Manager**
```bash
cd /workspaces/mymoolah-platform
./scripts/setup-secrets-staging.sh
```

**Step 3: Update Cloud Run Deployment Script**
```bash
# Edit scripts/deploy-cloud-run-staging.sh
# Add MobileMart secrets to --set-secrets line (around line 131)

# Update the --set-secrets line to include:
--set-secrets "...,MOBILEMART_CLIENT_ID=mobilemart-prod-client-id:latest,MOBILEMART_CLIENT_SECRET=mobilemart-prod-client-secret:latest,MOBILEMART_API_URL=mobilemart-prod-api-url:latest,MOBILEMART_TOKEN_URL=mobilemart-prod-token-url:latest,MOBILEMART_SCOPE=mobilemart-prod-scope:latest" \

# Add environment variable:
--set-env-vars "...,MOBILEMART_LIVE_INTEGRATION=true"
```

**Step 4: Redeploy Staging**
```bash
cd /workspaces/mymoolah-platform
./scripts/build-and-push-docker.sh
./scripts/deploy-cloud-run-staging.sh
```

---

## 🔐 Security Considerations

### Credential Separation
- ✅ **UAT**: Should use UAT credentials (isolated test environment)
- ✅ **Staging**: Should use Production credentials (real API, limited test users)
- ✅ **Production**: Will use Production credentials (real API, all users)

### Secret Management
- ✅ **UAT**: Credentials in `.env` file (not in git, local only)
- ✅ **Staging**: Credentials in Google Secret Manager (secure, encrypted)
- ✅ **Production**: Credentials in Google Secret Manager (secure, encrypted)

### Access Control
- ✅ **UAT**: Local development only (6 test users)
- ✅ **Staging**: Cloud Run with IAM (6 test users, production API)
- ✅ **Production**: Cloud Run with IAM (all users, production API)

---

## 📊 Current State vs Desired State

### Zapper Integration

| Environment | Current State | Desired State | Status |
|-------------|---------------|---------------|--------|
| **UAT** | TEST/UAT credentials | TEST/UAT credentials | ✅ Correct |
| **Staging** | Production credentials | Production credentials | ✅ Correct |
| **Production** | Not deployed | Production credentials | ⏳ Future |

### MobileMart Integration

| Environment | Current State | Desired State | Status |
|-------------|---------------|---------------|--------|
| **UAT** | PROD credentials + UAT URL | UAT credentials + UAT URL | ❌ Incorrect |
| **Staging** | Not configured | PROD credentials + PROD URL | ❌ Missing |
| **Production** | Not deployed | PROD credentials + PROD URL | ⏳ Future |

---

## 🧪 Testing Checklist

### UAT Testing (After Credential Updates)

#### Zapper UAT
```bash
cd /workspaces/mymoolah-platform
node scripts/test-zapper-uat-complete.js
```
**Expected**: All tests pass with UAT/TEST credentials

#### MobileMart UAT
```bash
cd /workspaces/mymoolah-platform
node scripts/test-mobilemart-uat.js
```
**Expected**: All tests pass with UAT credentials

---

### Staging Testing (After MobileMart Deployment)

#### Zapper Staging
```bash
# Test via staging frontend
# URL: https://stagingwallet.mymoolah.africa
# Login as one of 6 test users
# Navigate to QR Payment page
# Test QR code scanning
```
**Expected**: QR payment works with production Zapper API

#### MobileMart Staging
```bash
# Test via staging frontend
# URL: https://stagingwallet.mymoolah.africa
# Login as one of 6 test users
# Navigate to Airtime/Data purchase pages
# Test product listing and purchase
```
**Expected**: Products load and purchases work with production MobileMart API

---

## 📚 Reference Documentation

### Zapper
- `docs/ZAPPER_UAT_TEST_REPORT.md` - UAT testing results
- `docs/archive/ZAPPER_POST_CREDENTIALS_CHECKLIST.md` - Post-credentials checklist
- `scripts/test-zapper-uat-complete.js` - UAT test suite

### MobileMart
- `integrations/mobilemart/MOBILEMART_SUPPORT_RESPONSE_ANALYSIS.md` - Support response
- `integrations/mobilemart/PRODUCTION_CREDENTIALS_QUICK_REFERENCE.md` - Credentials reference
- `integrations/mobilemart/MOBILEMART_UAT_CREDENTIALS_SETUP.md` - UAT setup guide
- `scripts/test-mobilemart-uat.js` - UAT test script

---

## ✅ Completion Checklist

### UAT Environment
- [x] Verify Zapper TEST/UAT credentials ✅ (confirmed same as TEST)
- [ ] Request MobileMart UAT credentials via WhatsApp
- [ ] Update `.env` with MobileMart UAT credentials
- [ ] Test Zapper UAT integration (optional - already tested)
- [ ] Test MobileMart UAT integration
- [ ] Document UAT credentials in secure location

### Staging Environment
- [x] Verify Zapper production credentials configured ✅
- [ ] Add MobileMart secrets to Google Secret Manager
- [ ] Update `scripts/setup-secrets-staging.sh`
- [ ] Update `scripts/deploy-cloud-run-staging.sh`
- [ ] Redeploy Cloud Run staging with MobileMart
- [ ] Test Zapper staging integration
- [ ] Test MobileMart staging integration

---

## 🎯 Summary

### Critical Issues
1. ❌ **MobileMart UAT**: Using PRODUCTION credentials with UAT URL (security risk)
2. ❌ **MobileMart Staging**: Not configured in Cloud Run deployment (missing feature)

### Confirmed Correct
1. ✅ **Zapper UAT**: Using TEST/UAT credentials (Zapper uses same credentials for both)
2. ✅ **Zapper Staging**: Using Production credentials with 6 test users

### Recommendations
1. **Immediate**: Request MobileMart UAT credentials from support
2. **Immediate**: Update UAT `.env` with correct UAT credentials
3. **Short-term**: Add MobileMart to staging Cloud Run deployment
4. **Short-term**: Test both integrations in UAT and staging

### Timeline
- **UAT Credential Update**: 1-2 hours (waiting for MobileMart response)
- **Staging MobileMart Deployment**: 2-3 hours (scripting + deployment + testing)
- **Total**: 3-5 hours

---

**Audit Status**: ⚠️ **ACTION REQUIRED**  
**Next Steps**: Request MobileMart UAT credentials and add MobileMart to staging  
**Priority**: **HIGH** - Security and feature completeness

