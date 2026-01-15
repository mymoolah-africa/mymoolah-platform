# EasyPay Cash-out Deployment Guide

**Last Updated**: January 16, 2026  
**Feature**: Cash-out @ EasyPay  
**Status**: ✅ Ready for deployment

---

## 📋 **DEPLOYMENT WORKFLOW**

### **Correct Order of Operations**

1. ✅ **Commit and push code to Git** (migration files, code changes)
2. ✅ **Pull to Codespaces** (for testing)
3. ✅ **Run migration in Codespaces** (after pulling)
4. ✅ **Add environment variables** (manually to CS `.env`)
5. ✅ **Test in Codespaces**
6. ✅ **Deploy to Staging** (with Secret Manager setup)
7. ✅ **Run migration in Staging**
8. ✅ **Deploy to Production** (with Secret Manager setup)
9. ✅ **Run migration in Production**

---

## 🚀 **STEP-BY-STEP DEPLOYMENT**

### **STEP 1: Commit and Push Code to Git**

```bash
# On local machine
cd /Users/andremacbookpro/mymoolah

# Check status
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: implement Cash-out @ EasyPay feature

- Add easypay_cashout voucher types
- Create EasyPay Cash-out Float account (R50,000 initial balance)
- Implement separate cash-out endpoints
- Add frontend CashoutEasyPayOverlay component
- Update VouchersPage for cash-out display
- Add transaction handling for cash-out vouchers"

# Push to GitHub
git push origin main
```

### **STEP 2: Pull to Codespaces**

```bash
# In Codespaces terminal
cd /workspaces/mymoolah-platform

# Pull latest changes
git pull origin main
```

### **STEP 3: Add Environment Variables to Codespaces**

**⚠️ IMPORTANT**: You must manually add these to CS `.env` file (not committed to git):

```bash
# Open .env file
nano .env
# or
code .env
```

Add these lines:

```env
# =============================================================================
# EASYPAY CASH-OUT CONFIGURATION
# =============================================================================
EASYPAY_CASHOUT_USER_FEE=800
EASYPAY_CASHOUT_PROVIDER_FEE=500
EASYPAY_CASHOUT_MM_MARGIN=300
EASYPAY_CASHOUT_VAT_RATE=0.15
EASYPAY_TOPUP_FLOAT_ID=easypay_topup
EASYPAY_CASHOUT_FLOAT_ID=easypay_cashout
```

### **STEP 4: Run Migration in Codespaces**

```bash
# Run migration script
./scripts/run-migrations-master.sh uat

# Or manually
npx sequelize-cli db:migrate --env development
```

**Expected Output:**
```
✅ Added easypay_cashout and easypay_cashout_active to voucherType ENUM
✅ Created EasyPay Cash-out Float Account (EASYPAY_CASHOUT_FLOAT_001)
   - Initial Balance: R50,000.00
   - Current Balance: R50,000.00
✅ EasyPay Cash-out @ EasyPay setup completed successfully!
```

### **STEP 5: Verify Migration**

```bash
# Check if float account was created
node -e "
const db = require('./models');
(async () => {
  const float = await db.SupplierFloat.findOne({ 
    where: { supplierId: 'easypay_cashout' } 
  });
  console.log(float ? '✅ Float account found' : '❌ Float account missing');
  if (float) {
    console.log('Balance:', float.currentBalance);
  }
  await db.sequelize.close();
})();
"
```

### **STEP 6: Restart Backend (if running)**

```bash
# Stop backend (Ctrl+C if running in terminal)
# Then restart
npm run start:cs-ip
# or your usual start command
```

### **STEP 7: Test in Codespaces**

1. **Test Cash-out Voucher Creation:**
   - Navigate to Transact page
   - Click "Cash-out at EasyPay"
   - Create a test voucher (R50-R3000)
   - Verify wallet debit (voucher + R8.00 fee)

2. **Test Settlement (UAT Simulate Button):**
   - Go to Vouchers page
   - Find the cash-out voucher
   - Click "Simulate" button (UAT only)
   - Verify voucher marked as redeemed

3. **Test Cancellation:**
   - Create another cash-out voucher
   - Click "Cancel"
   - Verify wallet refund (voucher + fee)

---

## 🚀 **STAGING DEPLOYMENT**

### **STEP 1: Setup Secret Manager (Staging)**

Follow instructions in `docs/EASYPAY_CASHOUT_ENV_SETUP.md` section **"3. STAGING SETUP (GCP Secret Manager)"**.

### **STEP 2: Deploy Code to Staging**

```bash
# Deploy via your CI/CD pipeline or manually
# (follow your standard deployment process)
```

### **STEP 3: Run Migration in Staging**

```bash
# Connect to staging database
# Run migration
./scripts/run-migrations-master.sh staging

# Or manually
npx sequelize-cli db:migrate --env staging
```

### **STEP 4: Verify Staging Deployment**

1. Check Secret Manager secrets are accessible
2. Verify float account created with R50,000 balance
3. Test cash-out voucher creation via staging API
4. Monitor logs for any errors

---

## 🏭 **PRODUCTION DEPLOYMENT**

### **STEP 1: Setup Secret Manager (Production)**

Follow instructions in `docs/EASYPAY_CASHOUT_ENV_SETUP.md` section **"4. PRODUCTION SETUP"**.

**⚠️ CRITICAL**: Use production project ID and verify all values with business before deployment.

### **STEP 2: Deploy Code to Production**

```bash
# Deploy via your CI/CD pipeline
# (follow your standard production deployment process)
```

### **STEP 3: Run Migration in Production**

```bash
# Connect to production database
# Run migration
./scripts/run-migrations-master.sh production

# Or manually
npx sequelize-cli db:migrate --env production
```

### **STEP 4: Pre-fund Float Account (Production)**

**⚠️ IMPORTANT**: The migration creates the float account with R50,000 (dummy amount). For production, you need to:

1. **Verify initial balance** (should be R50,000 from migration)
2. **Top up to production amount** (as per business requirements)
3. **Set up automated top-up** (if needed)

```bash
# Update float account balance (example)
node -e "
const db = require('./models');
(async () => {
  const float = await db.SupplierFloat.findOne({ 
    where: { supplierId: 'easypay_cashout' } 
  });
  if (float) {
    // Update to production amount (example: R500,000)
    float.currentBalance = 500000.00;
    await float.save();
    console.log('✅ Float account updated to R500,000.00');
  }
  await db.sequelize.close();
})();
"
```

### **STEP 5: Verify Production Deployment**

1. ✅ Secret Manager secrets accessible
2. ✅ Float account created and funded
3. ✅ Cash-out voucher creation works
4. ✅ Settlement callbacks working
5. ✅ Transaction history correct
6. ✅ Ledger entries posting correctly

---

## 📊 **POST-DEPLOYMENT CHECKLIST**

After deployment to each environment:

### **Database**
- [ ] Migration executed successfully
- [ ] Float account created (`easypay_cashout`)
- [ ] Float account has correct initial balance
- [ ] Voucher types added to ENUM

### **Environment Variables**
- [ ] All 6 variables set (Local/CS/Staging/Prod)
- [ ] Values correct (fees, VAT rate, float IDs)
- [ ] Backend can access variables

### **API Endpoints**
- [ ] `POST /api/v1/vouchers/easypay/cashout/issue` - Working
- [ ] `POST /api/v1/vouchers/easypay/cashout/settlement` - Working
- [ ] `DELETE /api/v1/vouchers/easypay/cashout/:voucherId` - Working

### **Frontend**
- [ ] "Cash-out at EasyPay" button visible on Transact page
- [ ] CashoutEasyPayOverlay component loads
- [ ] Voucher creation works
- [ ] PIN display correct (14 digits, formatted)
- [ ] Simulate button works (UAT only)
- [ ] Vouchers page shows cash-out vouchers

### **Transactions**
- [ ] Wallet debit correct (voucher + R8.00 fee)
- [ ] Recent Transactions shows voucher amount only
- [ ] Transaction History shows voucher + fee separately
- [ ] Float account balance updates correctly

### **Business Logic**
- [ ] Amount validation (R50-R3000)
- [ ] Wallet balance check works
- [ ] Float balance check works
- [ ] Cancellation refunds correctly
- [ ] Expiry refunds correctly
- [ ] Settlement marks voucher as redeemed

---

## 🔄 **ROLLBACK PROCEDURE**

If issues occur, rollback steps:

### **1. Rollback Code Deployment**

```bash
# Revert to previous git commit
git revert HEAD
git push origin main
```

### **2. Rollback Database Migration**

```bash
# Rollback migration
npx sequelize-cli db:migrate:undo --env [environment]

# Or manually rollback
# (remove ENUM values, remove float account)
```

### **3. Remove Environment Variables**

- **Local/CS**: Remove from `.env` file
- **Staging/Prod**: Remove from Secret Manager or Cloud Run config

---

## 📝 **NOTES**

- **Migration Timing**: Always run migrations **AFTER** pulling code, not before pushing
- **Environment Variables**: Must be added manually to each environment (not committed to git)
- **Float Account**: Initial balance is R50,000 (dummy amount). Update for production as needed.
- **Testing**: Always test in Codespaces before deploying to Staging/Production

---

## 🔗 **RELATED DOCUMENTATION**

- `docs/EASYPAY_CASHOUT_ENV_SETUP.md` - Environment variables setup
- `docs/AGENT_HANDOVER.md` - Current project status
- `migrations/20260116_add_easypay_cashout.js` - Migration file

---

**Last Updated**: January 16, 2026  
**Maintained By**: MyMoolah Development Team
