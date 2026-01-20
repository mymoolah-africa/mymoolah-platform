# Watch to Earn - Complete Documentation

**Version**: 1.0.0  
**Last Updated**: January 20, 2026  
**Status**: ✅ **IMPLEMENTED** - Ready for UAT Testing

---

## Executive Summary

**Watch to Earn** is a revolutionary video advertising platform that allows MyMoolah users to earn wallet credits by watching 20-30 second video advertisements from retail partners. The feature serves dual purposes:

1. **B2C**: Users earn R2.00 - R3.00 per ad view
2. **B2B**: Merchants gain a cost-effective advertising channel and receive ad float credits as an incentive to make payouts via MyMoolah ("Payout-to-Promote")

---

## Ad Types

### 1. Reach Ads (`adType: 'reach'`)
**Purpose**: Brand awareness, large audience reach

- **User Action**: Watch video only (no additional button)
- **Merchant Cost**: R6.00 per view (debited from ad float account)
- **User Reward**: R2.00 (instant wallet credit)
- **MM Revenue**: R4.00 per view
- **Use Case**: Product launches, brand campaigns, general awareness

###2. Engagement Ads (`adType: 'engagement'`)
**Purpose**: Lead generation, interest capture

- **User Action**: Watch video + click "I'm Interested" button
- **Merchant Cost**: R15.00 per engagement (debited from ad float account)
- **User Reward**: R3.00 total (R2.00 for view + R1.00 engagement bonus)
- **MM Revenue**: R12.00 per engagement
- **Lead Delivery**: User details (name, phone, email) sent to merchant via email/webhook
- **Use Case**: Insurance quotes, loan applications, service signups

### 3. Conversion Ads (`adType: 'conversion'`) - FUTURE PHASE
**Purpose**: Actual sale/settlement fulfillment

- **Status**: Not yet implemented (planned for future phase)
- **User Action**: Complete purchase/transaction through ad
- **Use Case**: E-commerce, instant purchases

---

## Architecture

### Database Schema

#### MerchantFloat Extensions
```javascript
adFloatBalance         DECIMAL(15,2)  // Prefunded ad spend account (separate from voucher balance)
adFloatInitialBalance  DECIMAL(15,2)  // Initial balance tracking
adFloatMinimumBalance  DECIMAL(15,2)  // Alert threshold
ledgerAccountCode      STRING(64)     // Ledger account for double-entry accounting
```

#### AdCampaigns Table
- Stores video ad campaigns created by merchants
- Fields: title, description, videoUrl, thumbnailUrl, durationSeconds
- Ad types: `'reach'`, `'engagement'`
- Status: `'pending'`, `'approved'`, `'rejected'`, `'active'`, `'paused'`, `'completed'`
- Budget tracking: `totalBudget`, `remainingBudget`
- Pricing: `costPerView`, `rewardPerView`
- Targeting: `targetingRules` (JSONB for future expansion)
- Moderation: `moderationStatus`, `moderatedBy`, `moderationNotes`

#### AdViews Table
- Tracks individual ad views by users
- One view per user per campaign (unique constraint for fraud prevention)
- Server-side watch duration verification
- Reward and debit amount tracking
- Status: `'started'`, `'completed'`

#### AdEngagements Table
- Tracks lead captures for Engagement ads
- Stores user details (name, phone, email)
- Delivery tracking (email/webhook)
- One engagement per view (unique constraint for idempotency)

---

## Financial Model

### Prefunded Ad Float Account
Merchants prepay money into their **ad float account** (similar to how supplier floats work for VAS products).

**Example**:
- Merchant deposits R600 into ad float account
- Account balance: R600.00
- Each Reach ad view costs R6.00
- Merchant can run 100 ad views (R600 ÷ R6.00)

### Revenue Per View (Reach Ads)
| Party | Amount | Ledger Account |
|-------|--------|----------------|
| Merchant (debit) | R6.00 | 2100-05-001 (Ad Float Liability) |
| User (credit) | R2.00 | 1100-01-01 (Wallet Clearing) |
| MyMoolah (revenue) | R4.00 | 4100-05-01 (Ad Revenue) |

### Revenue Per Engagement (Engagement Ads)
| Party | Amount | Ledger Account |
|-------|--------|----------------|
| Merchant (debit) | R15.00 | 2100-05-001 (Ad Float Liability) |
| User (credit) | R3.00 | 1100-01-01 (Wallet Clearing) |
| MyMoolah (revenue) | R12.00 | 4100-05-01 (Ad Revenue) |

---

## B2B Incentive: "Payout-to-Promote"

### Purpose
Attract new merchant clients (Betway, Hollywoodbets, payroll companies) by offering free advertising in exchange for using MyMoolah as a payout channel.

### Mechanism
When merchants make payouts to MyMoolah wallets, their ad float account is automatically credited.

**Formula**: R200 payout = R6.00 ad float credit (1 free ad view)

**Example**:
- Betway pays R200,000 to 1,000 customers (R200 each)
- MyMoolah credits Betway's ad float account with R6,000
- Betway gets 1,000 free ad views (worth R6,000)
- Betway advertises their platform to all MyMoolah users for free

### Implementation
`services/payoutIncentiveService.js` hooks into any wallet credit transaction and checks if the payer is a merchant. If yes, credits their ad float account based on the configured ratio.

---

## API Endpoints

### User Endpoints (Authenticated)

#### GET `/api/v1/ads/available`
Get available ads for authenticated user

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Vodacom Airtime Deals",
      "description": "Get amazing airtime deals",
      "videoUrl": "gs://mymoolah-ads/...",
      "thumbnailUrl": "gs://mymoolah-ads/...",
      "durationSeconds": 25,
      "adType": "reach",
      "rewardPerView": 2.00,
      "merchant": {
        "merchantName": "Vodacom"
      }
    }
  ],
  "count": 5
}
```

#### POST `/api/v1/ads/:id/start`
Record that user started watching an ad

**Headers**:
- `Authorization: Bearer {token}`
- `X-Idempotency-Key: AD_START_{campaignId}_{timestamp}`

**Response**:
```json
{
  "success": true,
  "data": {
    "viewId": "uuid",
    "campaignId": "uuid",
    "startedAt": "2026-01-20T10:30:00Z"
  }
}
```

#### POST `/api/v1/ads/:id/complete`
Complete ad view and credit user wallet

**Headers**:
- `Authorization: Bearer {token}`
- `X-Idempotency-Key: AD_COMPLETE_{campaignId}_{viewId}`

**Body**:
```json
{
  "viewId": "uuid",
  "watchDuration": 24
}
```

**Response**:
```json
{
  "success": true,
  "message": "You earned R2.00!",
  "data": {
    "success": true,
    "rewardAmount": 2.00,
    "walletBalance": 152.00,
    "viewId": "uuid"
  }
}
```

#### POST `/api/v1/ads/:id/engage`
Record engagement (for Engagement ads only)

**Headers**:
- `Authorization: Bearer {token}`
- `X-Idempotency-Key: AD_ENGAGE_{campaignId}_{viewId}`

**Body**:
```json
{
  "viewId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "You earned R1.00 bonus! The merchant will contact you soon.",
  "data": {
    "success": true,
    "engagementId": "uuid",
    "bonusAmount": 1.00,
    "totalReward": 3.00,
    "walletBalance": 153.00
  }
}
```

#### GET `/api/v1/ads/history`
Get user's ad view history

**Query Params**:
- `limit` (optional): Max number of records (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "status": "completed",
      "completedAt": "2026-01-20T10:35:00Z",
      "rewardAmount": 2.00,
      "campaign": {
        "title": "Vodacom Airtime Deals",
        "adType": "reach"
      }
    }
  ],
  "count": 5
}
```

---

## Security & Fraud Prevention

### Rate Limiting
- **View Limit**: 5 ads per hour per user
- **Engagement Limit**: 10 engagements per day per user
- **Implementation**: express-rate-limit middleware

### Idempotency
- All POST endpoints require `X-Idempotency-Key` header
- Prevents double-crediting if user clicks "Complete" button twice
- 24-hour TTL on idempotency keys

### Database Constraints
- **Unique constraint**: One view per user per campaign
- **Unique constraint**: One engagement per ad view
- Prevents duplicate views and engagements at database level

### Watch Verification
- Server-side timestamp comparison (not client-side)
- Must watch 95%+ of video to earn reward
- Watch duration validated on `/complete` endpoint

### Budget Validation
- Ad only served if merchant has sufficient ad float balance
- Budget checked before serving ad list
- Budget decremented atomically with view completion

---

## Video Infrastructure

### Launch Strategy (10-100 ads)
- **Storage**: Google Cloud Storage (already integrated)
- **Delivery**: Direct GCS signed URLs (1-hour expiry)
- **Format**: MP4 H.264 (mobile-optimized, 360p max)
- **Size**: Target <2MB per video (low data consumption)
- **Cost**: R0.00 per view (GCS free tier + Cloudflare CDN)

### Future Scaling (100+ ads)
- **Transcoding**: Cloud Functions + ffmpeg
- **Streaming**: HLS adaptive bitrate
- **CDN**: Cloudflare Pro or Google Cloud CDN
- **Analytics**: View completion tracking

---

## Content Moderation

### Launch Strategy
**Manual Moderation Queue**: Admin reviews and approves each ad before it goes live

**Fields**:
- `moderationStatus`: `'pending'`, `'approved'`, `'rejected'`, `'flagged'`
- `moderatedBy`: Admin username
- `moderationNotes`: Review notes

### Future Strategy
**OpenAI GPT-4o Text Analysis**: Analyze ad title/description/metadata (not video content - too expensive)

**Cost**: ~R0.01 per ad (vs R1.00 for Google Video Intelligence)

---

## Testing

### Seed Data
Run seeder to create:
- 1 dummy merchant float with R600 ad float balance
- 10 dummy ads (5 Reach + 5 Engagement, all approved)

```bash
npx sequelize-cli db:seed --seed 20260120_seed_watch_to_earn
```

### Test Flow (UAT)
1. Navigate to `/loyalty-promotions`
2. Click "Earn Moolahs"
3. Select a Reach ad
4. Watch video to completion
5. Verify wallet credited with R2.00
6. Select an Engagement ad
7. Watch video to completion
8. Click "I'm Interested"
9. Verify wallet credited with R3.00 total
10. Check email (leads-test@mymoolah.africa) for lead notification

---

## Files Created

### Backend
- `migrations/20260120_01_add_ad_float_to_merchant_floats.js`
- `migrations/20260120_02_create_ad_campaigns.js`
- `migrations/20260120_03_create_ad_views.js`
- `migrations/20260120_04_create_ad_engagements.js`
- `models/AdCampaign.js`
- `models/AdView.js`
- `models/AdEngagement.js`
- `services/adService.js`
- `services/engagementService.js`
- `services/payoutIncentiveService.js`
- `controllers/adController.js`
- `routes/ads.js`
- `seeders/20260120_seed_watch_to_earn.js`

### Frontend
- `pages/LoyaltyPromotionsPage.tsx`
- `components/modals/EarnMoolahsModal.tsx`

### Documentation
- `docs/WATCH_TO_EARN.md` (this file)

---

## Performance

### Targets
- API response time: <200ms
- Video loading time: <2s (with CDN)
- Database queries: <50ms
- Throughput: >1,000 req/s

### Optimizations
- Database indexes on high-query columns
- Unique constraints for fraud prevention
- Redis caching for available ads (future)
- Async ledger posting (non-blocking)
- Connection pooling (existing)

---

## Cost Analysis

### Per Ad View (Reach)
| Component | Cost | Notes |
|-----------|------|-------|
| CDN bandwidth (Cloudflare) | R0.00 | Free tier: 10GB/month |
| GCS storage (amortized) | R0.001 | 1 year ÷ avg views |
| **Total Data Cost** | **R0.001** | Nearly free! |

### Revenue Model (Reach)
- Merchant pays: R6.00
- User earns: R2.00
- Data cost: R0.001
- **MM net profit**: R3.999 per view

### Revenue Model (Engagement)
- Merchant pays: R15.00
- User earns: R3.00
- Data cost: R0.001
- **MM net profit**: R11.999 per engagement

---

## Deployment Checklist

- [ ] Run migrations in UAT: `npx sequelize-cli db:migrate`
- [ ] Run seeder: `npx sequelize-cli db:seed --seed 20260120_seed_watch_to_earn`
- [ ] Upload 10 test videos to GCS bucket `mymoolah-ads/test/`
- [ ] Configure environment variables in `.env`
- [ ] Test backend server starts successfully
- [ ] Test frontend compiles and runs
- [ ] Navigate to `/loyalty-promotions` in browser
- [ ] Complete end-to-end test flow
- [ ] Verify wallet balance increases
- [ ] Verify ledger entries posted correctly
- [ ] Test Engagement ad lead delivery (check email)
- [ ] Commit changes to git
- [ ] Push to main branch
- [ ] Pull in Codespaces
- [ ] Test in Codespaces UAT environment

---

## Future Enhancements

### Phase 2 (100+ Ads)
1. **AI Moderation**: OpenAI GPT-4o text analysis
2. **Advanced Targeting**: Spend-based, demographic, age-restricted content
3. **Video Transcoding**: Cloud Functions + HLS
4. **Analytics Dashboard**: Merchant reporting in Admin Portal
5. **Merchant Self-Service**: Upload and manage ads directly

### Phase 3 (1,000+ Ads)
1. **Conversion Ads**: Actual sale/settlement fulfillment
2. **Behavioral Targeting**: Machine learning for ad matching
3. **Dynamic Pricing**: Real-time bid adjustments
4. **A/B Testing**: Campaign optimization tools

---

## Security Compliance

### Banking-Grade Standards
- ✅ Double-entry ledger accounting
- ✅ Atomic database transactions
- ✅ Idempotency middleware
- ✅ Rate limiting (fraud prevention)
- ✅ Input validation
- ✅ TLS 1.3 encryption
- ✅ JWT authentication
- ✅ Audit trail (all views logged)

### Mojaloop Compliance
- ✅ Prefunded float accounts
- ✅ No overdrafts
- ✅ Clear payer/payee roles
- ✅ End-to-end transaction references
- ✅ Immutable ledger

---

## Support & Troubleshooting

### Common Issues

**Q: "No ads available right now"**
- Check merchant has sufficient ad float balance
- Check campaign status is 'active'
- Check moderation status is 'approved'
- Check user hasn't already viewed all ads

**Q: "Video not watched completely"**
- User must watch 95%+ of video duration
- Server-side verification (not client-side)
- Check watch duration in request body

**Q: "Insufficient ad float balance"**
- Merchant needs to top up ad float account
- Check `merchant_floats.adFloatBalance` value

**Q: "Lead not sent to merchant"**
- Check `conversionEmail` or `conversionWebhookUrl` configured
- Check SMTP settings in `.env`
- Check webhook endpoint is reachable
- Review logs for delivery errors

---

## Integration with Existing Systems

### Wallet Integration
- Uses existing `Wallet.credit()` method
- Creates `Transaction` records (standard pattern)
- Appears in user's transaction history

### Ledger Integration
- Uses existing `ledgerService.postJournalEntry()`
- Double-entry accounting (debits = credits)
- Posted async (non-blocking, same as other services)

### Float System Integration
- Extends existing `MerchantFloat` model
- Uses same prefunded pattern as supplier/client floats
- Reuses `updateBalance()` and `hasSufficientBalance()` methods

### Payout Integration
- `payoutIncentiveService` hooks into any wallet credit
- Checks if payer is a merchant
- Credits ad float account automatically
- No integration needed in payout controllers (service-layer hook)

---

## Monitoring & Analytics

### Merchant Metrics
- Total views
- Total engagements
- Conversion rate (engagements ÷ views)
- Remaining budget
- Ad float balance

### Platform Metrics
- Total ad views per day
- Total revenue per day
- Average watch duration
- Completion rate (views ÷ starts)
- Engagement rate (engagements ÷ views)

### User Metrics
- Total ads watched
- Total earned amount
- Engagement rate
- Favorite ad categories

---

## Compliance & Legal

### Content Policies
- No adult/sexual content
- No drugs or illegal substances
- No hate speech or violence
- Age restrictions enforced for gambling/alcohol (18+)

### User Consent
- Users consent to share details for Engagement ads
- Privacy policy updated to reflect data sharing
- Clear messaging in UI about what merchant receives

### Data Protection
- User data encrypted in transit (TLS 1.3)
- User data encrypted at rest (AES-256-GCM)
- Lead delivery over HTTPS only
- No sensitive data stored in AdEngagements table

---

## Contact

For questions or issues, contact:
- **Technical**: MyMoolah Development Team
- **Business**: MyMoolah B2B Sales Team
- **Support**: support@mymoolah.africa

---

**Version History**:
- v1.0.0 (2026-01-20): Initial implementation with Reach and Engagement ads
