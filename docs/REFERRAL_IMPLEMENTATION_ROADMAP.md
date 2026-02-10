# MyMoolah Earnings Network - Implementation Roadmap

**Last Updated**: January 3, 2026  
**Status**: Phase 1 Complete, Phases 2-5 Pending  
**Progress**: Foundation built, ready for integration

---

## ✅ **COMPLETED: Phase 1 - Core Infrastructure**

### **Database Schema (5 tables)**
- ✅ referrals - Invitation tracking
- ✅ referral_chains - 3-level network structure  
- ✅ referral_earnings - Commission records with caps
- ✅ referral_payouts - Daily batch processing
- ✅ user_referral_stats - Real-time statistics

### **Models (5 Sequelize models)**
- ✅ Referral.js - With associations
- ✅ ReferralChain.js - With getEarners() method
- ✅ ReferralEarning.js - With formatting methods
- ✅ ReferralPayout.js - With duration calculation
- ✅ UserReferralStats.js - With reset monthly

### **Services (2 core services)**
- ✅ referralService.js - Chain building, invitation management
- ✅ referralEarningsService.js - Commission calculation with caps

### **Documentation**
- ✅ UI/UX Specifications - Ethical messaging approved
- ✅ Implementation plan - Complete architecture

**Files Created**: 13 files, 2,616 lines of code  
**Commits**: 2 (Phase 1 + UI specs)

---

## 🔄 **PHASE 2: Transaction Integration** (Next Step)

### **Integration Points**

**1. VAS Purchases** (`services/productPurchaseService.js`)

**Where to Hook**: After successful transaction, in the purchase completion flow

**Location**: Around line 200-300 where transaction is created

**Code to Add**:
```javascript
// After transaction created successfully
const referralEarningsService = require('./referralEarningsService');

// Calculate referral earnings
try {
  const earnings = await referralEarningsService.calculateEarnings({
    userId: transaction.userId,
    id: transaction.id,
    netRevenueCents: pricing.commissionCents, // MM's commission from supplier
    type: 'vas_purchase'
  });
  
  if (earnings.length > 0) {
    console.log(`💰 Created ${earnings.length} referral earnings`);
  }
} catch (error) {
  console.error('⚠️ Referral earnings failed (non-blocking):', error);
  // Don't fail transaction if referral calculation fails
}
```

**2. Zapper QR Payments** (`controllers/qrPaymentController.js`)

**Where to Hook**: After payment processed, in success handler

**Location**: Around line 150-200 where payment completes

**Code to Add**:
```javascript
// After payment successful
const referralEarningsService = require('../services/referralEarningsService');

try {
  const earnings = await referralEarningsService.calculateEarnings({
    userId: req.user.id,
    id: transaction.id,
    netRevenueCents: tierFees.mmFeeNetRevenue, // MM's net fee (after VAT)
    type: 'qr_payment'
  });
  
  if (earnings.length > 0) {
    console.log(`💰 QR payment generated ${earnings.length} referral earnings`);
  }
} catch (error) {
  console.error('⚠️ Referral earnings failed:', error);
}
```

**3. First Transaction Activation** (`services/productPurchaseService.js` and `qrPaymentController.js`)

**Where to Hook**: After first successful transaction for new user

**Code to Add**:
```javascript
// Check if this is user's first transaction
const referralService = require('./referralService');
const isFirstTransaction = await this.isFirstTransaction(userId);

if (isFirstTransaction) {
  // Activate referral (if they signed up via referral)
  await referralService.activateReferral(userId);
  console.log(`✅ First transaction - referral activated for user ${userId}`);
}
```

---

## 📱 **PHASE 3: SMS Integration** (MyMobileAPI)

### **Service to Create**: `services/smsService.js`

**Key Features**:
- MyMobileAPI authentication
- Send referral invitations
- Multi-language templates (11 languages!)
- URL shortening support
- Delivery tracking

**Implementation**:
```javascript
class SmsService {
  constructor() {
    this.apiUrl = process.env.MYMOBILEAPI_URL;
    this.username = process.env.MYMOBILEAPI_USERNAME;
    this.password = process.env.MYMOBILEAPI_PASSWORD;
    this.senderId = process.env.MYMOBILEAPI_SENDER_ID || 'MyMoolah';
  }
  
  async sendReferralInvite(referrerName, phoneNumber, referralCode, language) {
    const message = this.getReferralTemplate(referrerName, referralCode, language);
    return await this.sendSms(phoneNumber, message, { type: 'referral' });
  }
  
  getReferralTemplate(referrerName, code, language = 'en') {
    const url = `https://app.mymoolah.africa/signup?ref=${code}`;
    
    const templates = {
      en: `${referrerName} invites you to MyMoolah! Join and earn money. Use code ${code} for R50 bonus. Sign up: ${url}`,
      af: `${referrerName} nooi jou na MyMoolah! Sluit aan en verdien geld. Gebruik kode ${code} vir R50 bonus. Teken aan: ${url}`,
      zu: `${referrerName} ukumema ku-MyMoolah! Joyina ukhokhe imali. Sebenzisa ikhodi ${code} ukuthola i-R50 bonus. Bhalisa: ${url}`
    };
    
    return templates[language] || templates.en;
  }
}
```

**Files to Create/Modify**:
- `services/smsService.js` (NEW)
- `services/referralService.js` (UPDATE: call SMS service)

---

## 💰 **PHASE 4: Daily Payout Engine**

### **Service to Create**: `services/referralPayoutService.js`

**Daily Batch Process (2:00 AM SAST)**:
```javascript
class ReferralPayoutService {
  async processDailyPayouts() {
    const batchId = `PAYOUT-${new Date().toISOString().split('T')[0]}`;
    
    // 1. Create batch record
    const batch = await ReferralPayout.create({
      batchId,
      payoutDate: new Date(),
      status: 'processing',
      startedAt: new Date()
    });
    
    // 2. Get all pending earnings
    const pendingEarnings = await ReferralEarning.findAll({
      where: { status: 'pending' },
      include: [{ model: User, as: 'earner' }]
    });
    
    // 3. Aggregate by user
    const userEarnings = {};
    pendingEarnings.forEach(earning => {
      if (!userEarnings[earning.earnerUserId]) {
        userEarnings[earning.earnerUserId] = [];
      }
      userEarnings[earning.earnerUserId].push(earning);
    });
    
    // 4. Credit each user's wallet
    let totalPaid = 0;
    let userCount = 0;
    
    for (const [userId, earnings] of Object.entries(userEarnings)) {
      const totalCents = earnings.reduce((sum, e) => sum + e.earnedAmountCents, 0);
      
      // Credit wallet
      await walletService.credit(userId, totalCents, 'Referral earnings payout', {
        batchId,
        earningsCount: earnings.length
      });
      
      // Mark as paid
      await ReferralEarning.update(
        { status: 'paid', paidAt: new Date(), payoutBatchId: batchId },
        { where: { id: earnings.map(e => e.id) } }
      });
      
      // Update stats
      await this.updateStats(userId, totalCents);
      
      totalPaid += totalCents;
      userCount++;
    }
    
    // 5. Complete batch
    await batch.update({
      status: 'completed',
      completedAt: new Date(),
      totalUsers: userCount,
      totalAmountCents: totalPaid,
      totalEarningsCount: pendingEarnings.length
    });
    
    console.log(`✅ Payout batch complete: ${userCount} users, R${totalPaid/100}`);
  }
}
```

**Cron Job**: `scripts/process-referral-payouts.js`

---

## 🔌 **PHASE 5: API Endpoints**

### **Controller to Create**: `controllers/referralController.js`

**Endpoints Needed**:
```javascript
// GET /api/v1/referrals/my-code
async getMyReferralCode(req, res) {
  const userId = req.user.id;
  const code = await referralService.generateReferralCode(userId);
  res.json({ success: true, referralCode: code });
}

// POST /api/v1/referrals/send-invite
async sendInvite(req, res) {
  const { phoneNumber, language = 'en' } = req.body;
  const result = await referralService.sendReferralInvite(
    req.user.id, 
    phoneNumber, 
    language
  );
  res.json(result);
}

// GET /api/v1/referrals/stats
async getMyStats(req, res) {
  const stats = await referralService.getUserStats(req.user.id);
  res.json({ success: true, stats });
}

// GET /api/v1/referrals/earnings
async getMyEarnings(req, res) {
  const earnings = await referralEarningsService.getMonthEarnings(req.user.id);
  res.json({ success: true, earnings });
}

// GET /api/v1/referrals/network
async getMyNetwork(req, res) {
  const network = await referralService.getUserNetwork(req.user.id);
  res.json({ success: true, network });
}

// POST /api/v1/auth/signup (modify existing)
// Add referral code parameter
const { referralCode } = req.body;
if (referralCode) {
  await referralService.processSignup(referralCode, newUser.id);
}
```

**Routes to Create**: `routes/referrals.js`

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Immediate Next Steps**:

**Phase 2: Transaction Hooks** (1-2 days)
- [ ] Add referral calculation to productPurchaseService.js (VAS)
- [ ] Add referral calculation to qrPaymentController.js (Zapper)
- [ ] Add first transaction activation check
- [ ] Test with sample transactions

**Phase 3: SMS Integration** (1-2 days)
- [ ] Create smsService.js (MyMobileAPI wrapper)
- [ ] Implement authentication
- [ ] Add multi-language templates
- [ ] Integrate with referralService.js
- [ ] Test SMS sending in sandbox

**Phase 4: Payout Engine** (1-2 days)
- [ ] Create referralPayoutService.js
- [ ] Implement daily batch processing
- [ ] Add wallet crediting logic
- [ ] Create cron script
- [ ] Test payout flow

**Phase 5: APIs** (1-2 days)
- [ ] Create referralController.js
- [ ] Add routes to routes/referrals.js
- [ ] Modify signup flow for referral codes
- [ ] Test all endpoints

**Testing** (1 day)
- [ ] Unit tests for services
- [ ] Integration tests for flow
- [ ] Test with various scenarios
- [ ] Verify caps work correctly

**Documentation** (0.5 days)
- [ ] Update API documentation
- [ ] Update README
- [ ] Update CHANGELOG
- [ ] Create user guide

---

## 🎯 **Current Status**

**Completed**:
- ✅ Phase 1: Core Infrastructure (100%)
- ✅ UI/UX Specifications (100%)
- ✅ Ethical messaging approved (100%)

**Ready to Build**:
- ⏳ Phase 2: Transaction Hooks (0%)
- ⏳ Phase 3: SMS Integration (0%)
- ⏳ Phase 4: Payout Engine (0%)
- ⏳ Phase 5: API Endpoints (0%)

**Estimated Remaining**: 6-8 days of development work

---

## 💡 **Recommendation**

**Foundation is SOLID.** Phase 1 provides:
- Complete database schema
- All models with business logic
- Core services for earnings calculation
- Clear integration points

**Next session can:**
1. Hook into transactions (Phase 2)
2. Add SMS (Phase 3)
3. Build payout engine (Phase 4)
4. Create APIs (Phase 5)
5. Test end-to-end

**Fresh context = better code quality for complex integration work**

---

**Status**: ✅ Foundation complete, roadmap clear, ready for Phases 2-5

