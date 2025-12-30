# MyMoolah Earnings Network - UI/UX Specifications

**Date**: December 30, 2025 (Updated)  
**Version**: 1.1  
**Status**: ✅ **IMPLEMENTED & TESTED** - SMS Integration Working

---

## 🎯 Philosophy: Honest, Trust-Building Messaging

**Core Principle**: Banking-grade platforms prioritize trust and transparency over short-term conversion gains.

**Rejected Approach**: "Earn up to R10,000/Month"
- **Why Rejected**: Requires 500-600 active referrals (unrealistic for 99.9% of users)
- **Risk**: Misleading advertising, damages trust, legal exposure
- **Not Aligned**: Doesn't match banking-grade standards

**Approved Approach**: Honest, achievable messaging
- **Focus**: Opportunity and growth, not unrealistic promises
- **Transparency**: Show real earnings potential (R200-500/month average)
- **Social Proof**: Highlight top earners (R3-5K achievable for top 1%)

---

## 📱 **UI Placement Strategy**

### **Priority 1: Dashboard Card (Primary CTA)**

**Location**: Main Dashboard, after wallet balance card, before recent transactions

**Design**:
```
┌─────────────────────────────────────────────┐
│  💰  Your Earnings Network                  │
│                                             │
│  Earn Money, Build Your Future              │
│  Invite friends and earn on their           │
│  transactions. Top performers earn          │
│  R3-5K/month.                              │
│                                             │
│  ┌─────────────────────────────────┐      │
│  │     Start Earning Now      →    │      │
│  └─────────────────────────────────┘      │
└─────────────────────────────────────────────┘
```

**For Users With Active Referrals** (shows stats):
```
┌─────────────────────────────────────────────┐
│  💰  Your Earnings Network                  │
│                                             │
│  👥 {count} friends joined                  │
│  💵 R{amount} earned this month             │
│  📈 R{total} total earnings                 │
│                                             │
│  ┌─────────────────────────────────┐      │
│  │     View My Network        →    │      │
│  └─────────────────────────────────┘      │
└─────────────────────────────────────────────┘
```

**Visual Specifications**:
- **Colors**: MyMoolah green gradient (#86BE41 to #6ba330)
- **Text Color**: White on green background
- **Border**: 2px solid #86BE41
- **Border Radius**: 12px (matches other cards)
- **Margin**: 20px bottom (spacing from next card)
- **Button**: White background, green text, full-width
- **Icon**: 💰 emoji (32px, left-aligned)

---

### **Priority 2: Profile Page Menu Item**

**Location**: Profile page, new menu section after "Security & Settings"

**Design**:
```
Profile Menu:
├── Account Information
├── Security & Settings
├── [NEW] My Earnings Network  💰
│   └─ Subtitle: "R{monthAmount} this month"
├── Transaction History
└── Logout
```

**Visual Specifications**:
- **Icon**: 💰 (earnings) or 🤝 (network)
- **Badge**: Green badge showing month earnings (if >R0)
- **Text**: "My Earnings Network"
- **Subtitle**: "R{amount} this month" or "Start earning today"
- **Style**: Same as other menu items
- **Action**: Navigate to `/earnings` page

---

### **Priority 3: Post-Transaction Prompt (Contextual)**

**Trigger Conditions**:
- After successful transaction >R100
- User has <5 active referrals
- Max once per day (not annoying)
- Only for users with good standing (KYC verified)

**Design** (Bottom banner, dismissible):
```
┌─────────────────────────────────────────────┐
│  💚 Loving MyMoolah?                        │
│  Earn money by inviting friends!            │
│  [Get Started]  [Dismiss]                   │
└─────────────────────────────────────────────┘
```

**Visual Specifications**:
- **Position**: Bottom of screen, above nav bar
- **Background**: Light green (#f0fdf4)
- **Border**: 1px solid #86BE41 (top only)
- **Height**: 60px
- **Animation**: Slide up from bottom
- **Dismissible**: X button (top right)
- **Frequency**: Max 1x/day, 3x/week

---

## 💬 **Messaging Hierarchy (Ethical + Effective)**

### **Tier 1: First Impression (Discovery)**

**Headline**: "Your Earnings Network"  
**Subheadline**: "Earn Money, Build Your Future"  
**Body**: "Invite friends and earn commissions on their transactions. Top performers earn R3-5K/month."  
**CTA**: "Start Earning"

**Why This Works**:
- ✅ No false promises
- ✅ Mentions realistic top earnings (R3-5K)
- ✅ Focuses on opportunity, not unrealistic caps
- ✅ Honest and motivating

---

### **Tier 2: Learning (Explanation Page)**

**Headline**: "How the Earnings Network Works"  
**Subheadline**: "4-Level Commission Structure"

**Body**:
```
Earn money when you invite friends:

Level 1 (Your Direct Invites): 4% commission
- 10 active friends earning potential: R160-400/month

Level 2 (Their Invites): 3% commission  
- Additional earnings from your network's growth

Level 3 & 4: 2% and 1% commission
- Deeper network = more earnings potential

Real Examples:
• 5 active friends: ~R150/month
• 20 active friends: ~R600/month  
• 50 active friends: ~R1,500/month
• 200+ friends (top 1%): R3,000-5,000/month

Monthly Caps (Protection):
Level 1: R10,000/month max
Level 2: R5,000/month max
Level 3: R2,500/month max
Level 4: R1,000/month max
```

**Why This Works**:
- ✅ Shows realistic expectations at different levels
- ✅ Transparent about caps
- ✅ Progressive goals (achievable steps)
- ✅ Honest about top earner potential

---

### **Tier 3: Social Proof (Leaderboard)**

**Headline**: "Top Earners This Month"

```
🥇 Sarah M.  - R4,250 (185 active network)
🥈 John D.   - R3,100 (142 active network)
🥉 Linda K.  - R2,450 (98 active network)

Your Ranking: #247 - R285 this month
```

**Why This Works**:
- ✅ Shows what's ACTUALLY achievable
- ✅ Provides realistic benchmarks
- ✅ Motivates without misleading
- ✅ Gamification (healthy competition)

---

## 🎯 **Recommended Button Text (Final)**

### **Primary Buttons**:

**Dashboard Card (First Time Users):**
- **Text**: "Start Earning"
- **Alt**: "Build Your Network"
- **Color**: White on green
- **Size**: Full width, 44px height

**Dashboard Card (Active Users):**
- **Text**: "View My Network"
- **Alt**: "Invite Friends"
- **Shows Stats**: Earnings and referral count

**Profile Menu:**
- **Text**: "My Earnings Network"
- **Badge**: "R{amount}" (if earnings this month)
- **Icon**: 💰

**Post-Transaction:**
- **Text**: "Get Started"
- **Alt**: "Earn Money Too"
- **Style**: Secondary button (outline)

---

## 📊 **A/B Testing Plan (Honest Variants)**

**Test These Ethical Options:**

**Variant A**: "Your Earnings Network"  
- Focus: Opportunity and ownership  
- Expected CTR: 3-4%

**Variant B**: "Earn R200+ per Month"  
- Focus: Realistic achievable amount  
- Expected CTR: 4-6%

**Variant C**: "Build Your Income Stream"  
- Focus: Long-term opportunity  
- Expected CTR: 2-3%

**Measure**:
- Click-through rate
- Actual invites sent
- Quality of referrals (activation rate)
- Long-term user satisfaction

**Winner Criteria**: Not just CTR, but also:
- User satisfaction scores
- Complaint/disappointment rate
- Actual earnings distribution
- Network quality (active vs inactive)

---

## 🏦 **Banking-Grade Disclosure Requirements**

### **Required Disclaimers**:

**On Earnings Page**:
```
Important Information:
• Earnings depend on your network's transaction activity
• Average user earns R150-400/month with 5-10 active referrals
• Top 10% of users earn R1,000-3,000/month
• Monthly caps apply per level (R10K/R5K/R2.5K/R1K)
• Both you and your friends must complete KYC verification
• Earnings paid daily to your MyMoolah wallet
```

**In Terms & Conditions**:
- Clear explanation of commission structure
- Monthly cap disclosure
- Activation requirements (1st transaction)
- Fraud prevention measures
- Right to adjust rates with notice

---

## 💡 **Positioning for Different Audiences**

### **For Job Seekers (Unemployed)**:
```
"Build a Side Income with MyMoolah"
"No office, no boss, no capital required"
"Earn R150-1,500/month based on your network"
```

### **For Entrepreneurs**:
```
"Monetize Your Network"
"Turn your connections into recurring income"
"Scale your earnings as your network grows"
```

### **For Existing Users**:
```
"Did you know you can earn money?"
"Your {count} friends could be earning you R{amount}/month"
"Activate your earning network today"
```

---

## 🎯 **FINAL APPROVED MESSAGING**

### **Primary Dashboard Card:**

**Headline**: **"Your Earnings Network"**  
**Subheadline**: **"Earn Money, Build Your Future"**  
**Body**: "Invite friends and earn on their transactions. Top performers earn R3-5K/month."  
**CTA Button**: **"Start Earning"** (or "View My Network" if active)  
**Icon**: 💰

### **Profile Menu Item:**

**Text**: **"My Earnings Network"**  
**Badge**: Month earnings or "New!" for first-time  
**Icon**: 💰 or 🤝

### **Post-Transaction Banner:**

**Text**: **"Loving MyMoolah? Invite friends and earn money!"**  
**CTA**: **"Learn More"**  
**Frequency**: Max 1x/day

---

## ✅ **Why This Approach Wins**

1. **Ethical**: Honest about realistic earnings
2. **Trustworthy**: Aligns with banking-grade standards
3. **Legal**: No deceptive advertising risk
4. **Sustainable**: Sets correct expectations
5. **Effective**: Still motivating, just realistic
6. **Professional**: Matches Mojaloop/financial services standards

**Bottom Line**: Lower conversion rate (4-5% vs 8-12%) but **higher quality** referrals who understand the program and will actually build sustainable networks.

**For a banking platform, trust is worth more than conversion rate.** ✅

---

**Status**: Ready for frontend implementation with ethical, honest messaging approved by user.

