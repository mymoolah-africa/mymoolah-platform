# Airtime & Data UX Upgrade - Beneficiary-First Design

## Design Philosophy

**User-Centric Flow:** The user comes to buy airtime/data for SOMEONE. That someone (the beneficiary) must be selected FIRST, not the product.

## Correct User Flow

### Screen 1: Beneficiary Selection (Home)

**What the user sees:**
- Header: "Airtime & Data" with back arrow
- **Favorites Section** (if any): Large cards for favorite beneficiaries with one-tap repeat purchase
- **Recent Recipients**: List of recently used beneficiaries
- **"+ Add Recipient" Button**: Prominent, clearly tappable
- **Search bar**: Find existing beneficiaries

**Card Design (Beneficiary):**
```
┌─────────────────────────────────────┐
│  👤 Avatar    Mom                   │
│               +27 82 123 4567       │
│               MTN                   │
│  ⭐ Favorite  Last: R50 Airtime     │
└─────────────────────────────────────┘
```

**Actions:**
- Tap beneficiary → Go to Account Selection (Screen 2)
- Tap "Last purchase" → Quick repeat purchase flow
- Tap "+ Add Recipient" → Add Recipient Modal (Screen 3)

---

### Screen 2: Account Selection (for selected beneficiary)

**What the user sees:**
- Header: "Select Number" with back arrow
- Beneficiary name at top (e.g., "Buying for: Mom")
- List of their mobile accounts (airtime/data enabled)
- "+ Add Another Number" button

**Card Design (Account):**
```
┌─────────────────────────────────────┐
│  📱 +27 82 123 4567                 │
│     MTN                             │
│     Last: R50 Airtime (2 days ago)  │
└─────────────────────────────────────┘
```

**Actions:**
- Tap account → Go to Product Selection (Screen 4)
- Tap "+ Add Another Number" → Add Account Modal (Screen 3b)

---

### Screen 3: Add Recipient Modal

**Form Fields:**
1. **Name** (required): "Who is this for?"
2. **Mobile Number** (required): SA format validation
3. **Network** (required): MTN | Vodacom | Cell C | Telkom (radio/pills)
4. **Save as Favorite** (optional): Toggle

**Actions:**
- Save → Creates beneficiary + airtime account
- Cancel → Return to Screen 1

---

### Screen 3b: Add Account Modal (to existing beneficiary)

**Form Fields:**
1. **Mobile Number** (required): SA format validation
2. **Network** (required): MTN | Vodacom | Cell C | Telkom
3. **Description** (optional): "Work phone", "Personal", etc.

**Actions:**
- Add → Adds account to existing beneficiary
- Cancel → Return to Screen 2

---

### Screen 4: Product Selection (filtered by network)

**What the user sees:**
- Header: "Choose Product" with back arrow
- Recipient info bar: "For: Mom • 082 123 4567 • MTN"
- **Smart Suggestions** (AI-powered based on history):
  - "Your usual: R50 Airtime" (one-tap)
  - "Best value today: 2GB Data R49"
- **Airtime Section**: Clean grid of amounts (R10, R20, R50, R100, R200, R500+)
- **Data Bundles Section**: Grid of data options

**Product Card Design:**
```
┌─────────────────────┐
│       R50           │
│     Airtime         │
│                     │
│  💰 Best Value      │
└─────────────────────┘
```

**Actions:**
- Tap product → Go to Confirmation (Screen 5)

---

### Screen 5: Confirmation

**What the user sees:**
- Recipient details (name, number, network)
- Product details (type, amount)
- Wallet balance
- Total to pay
- "Confirm Purchase" button
- "Edit" link

---

## API Integration (Based on Beneficiary Service Audit)

### Endpoints Used:

1. **Load beneficiaries:**
   ```
   GET /api/v1/unified-beneficiaries/by-service/airtime-data
   ```

2. **Create new beneficiary:**
   ```
   POST /api/v1/unified-beneficiaries
   Body: { name, serviceType: 'airtime', serviceData: { mobileNumber, network } }
   ```

3. **Add account to existing beneficiary:**
   ```
   POST /api/v1/unified-beneficiaries/:beneficiaryId/services
   Body: { serviceType: 'airtime', serviceData: { mobileNumber, network } }
   ```

4. **Load products (filtered by network):**
   ```
   GET /api/v1/suppliers/compare/airtime?provider=MTN
   ```

5. **Purchase:**
   ```
   POST /api/v1/products/purchase
   Body: { productId, beneficiaryMsisdn, amount, ... }
   ```

---

## Visual Style Guide

### Colors:
- Primary: #86BE41 (MyMoolah Green)
- Secondary: #2196F3 (Blue accents)
- Network colors:
  - MTN: #FFCB05
  - Vodacom: #E60000
  - Cell C: #0066CC
  - Telkom: #009FE3

### Typography:
- Headers: Montserrat Bold
- Body: Inter Regular
- Amounts: Montserrat Bold

### Spacing:
- Card padding: 16px
- Grid gap: 12px
- Section margin: 24px

---

## Key UX Principles

1. **Beneficiary First**: Never show products without knowing WHO the purchase is for
2. **One-Tap Repeat**: Most common action is "buy the same thing again"
3. **Network Filtering**: Only show products relevant to the selected network
4. **Favorites Prominent**: Favorite beneficiaries are the most accessed
5. **Clean, Not Cluttered**: Each screen has ONE primary purpose
6. **Progressive Disclosure**: Don't overwhelm with options upfront

---

## Implementation Status

- [ ] Screen 1: Beneficiary Selection
- [ ] Screen 2: Account Selection  
- [ ] Screen 3: Add Recipient Modal
- [ ] Screen 3b: Add Account Modal
- [ ] Screen 4: Product Selection
- [ ] Screen 5: Confirmation
- [ ] API Integration
- [ ] Testing

---

## Next Steps

1. Build Screen 1 (Beneficiary Selection) with working "+ Add Recipient"
2. Connect to unified beneficiaries API
3. Build Add Recipient modal
4. Build Account Selection screen
5. Build filtered Product Selection
6. End-to-end testing
