---
name: api-design-principles
description: Master REST API design principles for MyMoolah's Node.js/Express backend. Use when designing new APIs, reviewing API specifications, building webhooks, or establishing consistent response patterns.
---

# MyMoolah API Design Principles

REST API design standards for MyMoolah's Node.js/Express backend serving the digital
wallet platform. All APIs must be mobile-first, idempotent for financial operations,
and compliant with Mojaloop FSPIOP patterns where applicable.

> **Current Architecture**: Express routes in `routes/*.js`, controllers in
> `controllers/*.js`, validation via Joi middleware. The API serves both the wallet
> frontend (React/Vite on mobile) and the admin portal. Webhook endpoints receive
> callbacks from EasyPay, Flash, and Peach payment providers.

## When This Skill Activates

- Designing new API routes (routes/*.js)
- Creating/modifying controllers (controllers/*.js)
- Integrating payment providers (EasyPay, Flash, Peach, Mercury)
- Building webhook endpoints for external providers
- API versioning decisions
- Pagination and filtering for transaction/product lists

---

## 1. URL Design Standards

### MyMoolah Resource Hierarchy
```
# Wallet operations
GET     /api/wallets/:walletId                    # Get wallet details
GET     /api/wallets/:walletId/transactions       # List transactions
POST    /api/wallets/:walletId/send               # Send money (P2P)
POST    /api/wallets/:walletId/deposit             # Initiate deposit

# Products (VAS)
GET     /api/products                              # List all products
GET     /api/products/:productId                   # Product details
GET     /api/products/:productId/variants           # Product variants
POST    /api/airtime/purchase                       # Purchase airtime
POST    /api/flash/purchase                         # Purchase Flash product

# User management
GET     /api/users/me                              # Current user profile
PATCH   /api/users/me                              # Update profile
POST    /api/kyc/submit                            # KYC submission
GET     /api/kyc/status                            # KYC status

# Reconciliation
GET     /api/reconciliation/runs                   # List recon runs
GET     /api/reconciliation/runs/:runId            # Recon run details
POST    /api/reconciliation/runs                   # Trigger recon run

# Ledger (admin)
GET     /api/ledger/accounts                       # Chart of Accounts
GET     /api/ledger/trial-balance                  # Trial Balance report
GET     /api/ledger/entries                        # Journal entries

# Webhooks (inbound from providers)
POST    /api/webhooks/easypay                      # EasyPay payment notifications
POST    /api/webhooks/flash                        # Flash transaction callbacks
POST    /api/webhooks/peach                        # Peach payment callbacks
```

### Naming Conventions
- **Plural nouns** for collections: `/api/products`, `/api/users`
- **Singular action verbs** only for non-CRUD operations: `/api/wallets/:id/send`
- **kebab-case** for multi-word resources: `/api/payment-requests`
- **Never expose internal IDs** directly — use UUIDs for public-facing resources

---

## 2. Request/Response Standards

### Standard Success Response
```javascript
// Single resource
res.status(200).json({
  success: true,
  data: { id: 'uuid', name: 'Product', price: 2500 }
});

// Collection with pagination
res.status(200).json({
  success: true,
  data: [...items],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 156,
    totalPages: 8,
    hasNext: true,
    hasPrev: false
  }
});

// Created resource
res.status(201).json({
  success: true,
  data: { id: 'uuid', ...newResource },
  message: 'Transaction created successfully'
});
```

### Standard Error Response
```javascript
// Validation error (422)
res.status(422).json({
  success: false,
  error: 'VALIDATION_ERROR',
  message: 'Request validation failed',
  details: [
    { field: 'amount', message: 'Amount must be positive' },
    { field: 'recipientId', message: 'Invalid recipient UUID' }
  ]
});

// Business logic error (400)
res.status(400).json({
  success: false,
  error: 'INSUFFICIENT_BALANCE',
  message: 'Wallet balance insufficient for this transaction'
});

// Not found (404)
res.status(404).json({
  success: false,
  error: 'NOT_FOUND',
  message: 'Wallet not found'
});

// Server error (500) — NEVER expose stack traces
res.status(500).json({
  success: false,
  error: 'INTERNAL_ERROR',
  message: 'An unexpected error occurred',
  requestId: req.headers['x-request-id']
});
```

### HTTP Status Codes
| Code | Use Case |
|------|----------|
| 200 | Successful GET, PATCH, PUT |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no content) |
| 400 | Bad request (business logic violation) |
| 401 | Missing/invalid authentication |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (idempotency key collision, duplicate) |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## 3. Pagination & Filtering

### Cursor-Based Pagination (Preferred for Transactions)
```javascript
// GET /api/wallets/:id/transactions?cursor=abc123&limit=20&type=purchase

router.get('/wallets/:walletId/transactions', async (req, res) => {
  const { cursor, limit = 20, type, startDate, endDate } = req.query;

  const where = { walletId: req.params.walletId };
  if (type) where.type = type;
  if (startDate) where.createdAt = { [Op.gte]: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };
  if (cursor) where.id = { [Op.lt]: cursor }; // cursor = last item's ID

  const transactions = await MyMoolahTransaction.findAll({
    where,
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: parseInt(limit) + 1 // Fetch one extra to determine hasNext
  });

  const hasNext = transactions.length > limit;
  if (hasNext) transactions.pop();

  res.json({
    success: true,
    data: transactions,
    pagination: {
      cursor: transactions.length ? transactions[transactions.length - 1].id : null,
      hasNext,
      limit: parseInt(limit)
    }
  });
});
```

### Offset-Based Pagination (For Admin/Portal)
```javascript
// GET /api/reconciliation/runs?page=1&pageSize=20&status=completed

const page = parseInt(req.query.page) || 1;
const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
const offset = (page - 1) * pageSize;

const { count, rows } = await ReconRun.findAndCountAll({
  where: filters,
  order: [['createdAt', 'DESC']],
  limit: pageSize,
  offset
});

res.json({
  success: true,
  data: rows,
  pagination: {
    page, pageSize, total: count,
    totalPages: Math.ceil(count / pageSize),
    hasNext: page * pageSize < count,
    hasPrev: page > 1
  }
});
```

---

## 4. Idempotency for Financial Endpoints

### ALL mutating financial operations MUST be idempotent:
```javascript
// Client sends: POST /api/wallets/123/send
// Headers: { 'X-Idempotency-Key': 'uuid-v4-client-generated' }

// Server checks IdempotencyKey model before processing
// If key exists + completed → return cached response (200)
// If key exists + processing → return 409 Conflict
// If key doesn't exist → process and cache response
```

### Required Headers for Financial Operations
```
X-Idempotency-Key: <uuid>        # Required for POST/PUT/DELETE on financial endpoints
X-Request-ID: <uuid>             # Correlation ID for distributed tracing
Authorization: Bearer <jwt>      # JWT access token
Content-Type: application/json
```

---

## 5. Webhook API Design (Inbound)

### Webhook Handler Pattern
```javascript
// routes/webhooks/easypay.js
router.post('/webhooks/easypay',
  express.raw({ type: 'application/json' }),     // Capture raw body for HMAC
  verifyWebhookSignature(process.env.EASYPAY_WEBHOOK_SECRET),
  async (req, res) => {
    // 1. Acknowledge immediately
    res.status(200).json({ received: true });

    // 2. Process asynchronously (don't block the response)
    try {
      const event = JSON.parse(req.rawBody);
      await processEasyPayWebhook(event);
    } catch (error) {
      logger.error('Webhook processing failed', { error, provider: 'easypay' });
    }
  }
);
```

### Webhook Response Rules
- Always return 200 immediately (within 5 seconds)
- Process webhook payload asynchronously
- Implement idempotent webhook processing (use event ID as key)
- Log all webhook events for audit trail
- Handle retries gracefully (providers will retry on non-2xx)

---

## 6. API Versioning

### URL-Based Versioning (MyMoolah Standard)
```
/api/v1/wallets          # Current stable API
/api/v2/wallets          # New version with breaking changes
```

### Version Lifecycle
1. **Active**: Current production version
2. **Deprecated**: Still functional, with `Deprecation` header
3. **Sunset**: Removed, returns 410 Gone

```javascript
// Deprecation middleware
const deprecated = (sunsetDate) => (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', sunsetDate);
  res.set('Link', '</api/v2/wallets>; rel="successor-version"');
  next();
};

router.get('/api/v1/wallets', deprecated('2026-06-01'), v1WalletController.list);
```

---

## 7. Controller Pattern

### Standard Controller Structure
```javascript
// controllers/walletController.js
const { Wallet, MyMoolahTransaction, JournalEntry, JournalLine } = require('../models');

const walletController = {
  // GET /api/wallets/:walletId
  async getWallet(req, res) {
    try {
      const wallet = await Wallet.findOne({
        where: { id: req.params.walletId, userId: req.user.id }
      });
      if (!wallet) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      res.json({ success: true, data: wallet });
    } catch (error) {
      logger.error('Failed to fetch wallet', { error, userId: req.user.id });
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  },

  // POST /api/wallets/:walletId/send
  async sendMoney(req, res) {
    const t = await sequelize.transaction();
    try {
      const { recipientId, amount, reference } = req.validatedBody;
      // ... business logic within transaction ...
      await t.commit();
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      await t.rollback();
      if (error.message === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({ success: false, error: error.message });
      }
      logger.error('Send money failed', { error, userId: req.user.id });
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }
};
```

---

## 8. Code Review Checklist

- [ ] URLs use plural nouns and kebab-case
- [ ] All responses follow standard `{ success, data, error }` envelope
- [ ] Financial endpoints have `X-Idempotency-Key` middleware
- [ ] Pagination implemented for all collection endpoints
- [ ] Error responses don't leak internal details
- [ ] Webhooks acknowledge immediately and process asynchronously
- [ ] Input validation middleware applied before controller logic
- [ ] Appropriate HTTP status codes used
- [ ] Authentication/authorization middleware applied
- [ ] Rate limiting applied to sensitive endpoints

## References

- [REST API Design Best Practices](https://restfulapi.net/)
- [Mojaloop FSPIOP API](https://docs.mojaloop.io/)
- [Stripe API Design](https://stripe.com/docs/api) (gold standard for payment APIs)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
