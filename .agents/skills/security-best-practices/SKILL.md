---
name: security-best-practices
description: Implement security best practices for web applications and infrastructure. Use when securing APIs, preventing common vulnerabilities, or implementing security policies. Handles HTTPS, CORS, XSS, SQL Injection, CSRF, rate limiting, and OWASP Top 10.
---

# MyMoolah Security Best Practices

Banking-grade security for the MyMoolah digital wallet platform. This skill enforces
OWASP Top 10, PCI-DSS, POPIA (South Africa), and fintech-specific security standards
across all backend (Node.js/Express/Sequelize) and frontend (React) code.

## When This Skill Activates

- Securing API endpoints (routes/*.js)
- Handling user authentication/authorization (routes/auth.js, middleware/)
- Processing financial transactions (wallets, send money, payments)
- Managing KYC/AML data (routes/kyc.js, models/Kyc.js)
- Integrating payment providers (EasyPay, Flash, Peach, Mercury)
- Webhook handlers for external providers
- Any code touching PII, credentials, or monetary values

---

## 1. HTTPS & Security Headers

### Express.js Security Middleware (MyMoolah Standard)
```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Helmet: Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_BASE_URL],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS — restrict to MyMoolah frontend domains only
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.PORTAL_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-ID']
}));

// HTTPS enforcement
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

---

## 2. Rate Limiting

### Tiered Rate Limits for Financial APIs
```javascript
// General API: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', generalLimiter);

// Auth endpoints: 5 attempts per 15 minutes (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/otp', authLimiter);

// Financial transaction endpoints: 30 per minute
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Transaction rate limit exceeded.' }
});
app.use('/api/wallets/*/send', transactionLimiter);
app.use('/api/airtime/purchase', transactionLimiter);
app.use('/api/flash/purchase', transactionLimiter);

// KYC uploads: 10 per hour
const kycLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10
});
app.use('/api/kyc/upload', kycLimiter);
```

---

## 3. Input Validation & Injection Prevention

### Sequelize Parameterized Queries (MANDATORY)
```javascript
// ✅ CORRECT — Sequelize auto-parameterizes
const user = await User.findOne({ where: { email: req.body.email } });

// ✅ CORRECT — Raw query with bind parameters
const [results] = await sequelize.query(
  'SELECT * FROM users WHERE email = $email',
  { bind: { email: req.body.email }, type: QueryTypes.SELECT }
);

// ❌ NEVER — String interpolation in queries
const user = await sequelize.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### Request Validation with Joi
```javascript
const Joi = require('joi');

// MyMoolah-specific schemas
const walletTransferSchema = Joi.object({
  recipientId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).max(50000).required(), // ZAR limit
  reference: Joi.string().max(64).pattern(/^[a-zA-Z0-9-_]+$/).optional(),
  idempotencyKey: Joi.string().uuid().required()
});

const kycSchema = Joi.object({
  idType: Joi.string().valid('sa_id', 'passport', 'asylum_permit').required(),
  idNumber: Joi.string().pattern(/^[0-9]{13}$/).when('idType', {
    is: 'sa_id', then: Joi.required()
  }),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  dateOfBirth: Joi.date().max('now').required()
});

// Validation middleware factory
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(422).json({
      error: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.validatedBody = value;
  next();
};

// Usage
router.post('/transfer', validate(walletTransferSchema), walletController.transfer);
```

### XSS Prevention
```javascript
const DOMPurify = require('isomorphic-dompurify');

// Sanitize any user-generated content before storage
const sanitized = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] }); // Strip ALL HTML
```

---

## 4. Authentication & Authorization

### JWT with Refresh Token Rotation
```javascript
const jwt = require('jsonwebtoken');

// Access Token: 15 minutes
const accessToken = jwt.sign(
  { userId, role, walletId },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '15m', algorithm: 'HS256' }
);

// Refresh Token: 7 days, stored in DB, rotated on each use
const refreshToken = jwt.sign(
  { userId, tokenFamily: uuidv4() },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
await RefreshToken.create({
  userId, token: refreshToken, family: tokenFamily,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});

// Refresh endpoint — rotate and invalidate old token
router.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const stored = await RefreshToken.findOne({ where: { token: refreshToken } });

  if (!stored) {
    // Token reuse detected — invalidate entire family (possible theft)
    await RefreshToken.destroy({ where: { family: payload.tokenFamily } });
    return res.status(401).json({ error: 'Token reuse detected. All sessions revoked.' });
  }

  await stored.destroy(); // Invalidate used token
  // Issue new pair...
});
```

### Role-Based Access Control (RBAC)
```javascript
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Usage
router.get('/admin/reconciliation', authenticate, authorize('admin', 'finance'), reconController.list);
router.post('/wallets/send', authenticate, authorize('user', 'merchant', 'admin'), walletController.send);
```

---

## 5. Financial Transaction Security

### Idempotency Keys (MANDATORY for all mutations)
```javascript
const { IdempotencyKey } = require('../models');

const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return res.status(400).json({ error: 'X-Idempotency-Key header required' });

  const existing = await IdempotencyKey.findOne({ where: { key } });
  if (existing) {
    if (existing.status === 'processing') {
      return res.status(409).json({ error: 'Request still processing' });
    }
    return res.status(200).json(existing.response);
  }

  await IdempotencyKey.create({ key, status: 'processing', endpoint: req.originalUrl });
  req.idempotencyKey = key;
  next();
};

// Apply to all financial endpoints
router.post('/wallets/send', idempotencyMiddleware, walletController.send);
router.post('/airtime/purchase', idempotencyMiddleware, airtimeController.purchase);
router.post('/flash/purchase', idempotencyMiddleware, flashController.purchase);
```

### Transaction Amount Limits
```javascript
const LIMITS = {
  user: { daily: 25000, single: 5000 },      // ZAR
  merchant: { daily: 500000, single: 50000 },
  admin: { daily: Infinity, single: Infinity }
};

async function validateTransactionLimits(userId, role, amount) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dailyTotal = await MyMoolahTransaction.sum('amount', {
    where: { userId, createdAt: { [Op.gte]: today }, status: 'completed' }
  });

  const limits = LIMITS[role] || LIMITS.user;
  if (amount > limits.single) throw new Error(`Single transaction limit: R${limits.single}`);
  if ((dailyTotal + amount) > limits.daily) throw new Error(`Daily limit: R${limits.daily}`);
}
```

---

## 6. Webhook Security (EasyPay, Flash, Peach)

### HMAC Signature Verification
```javascript
const crypto = require('crypto');

const verifyWebhookSignature = (secret) => (req, res, next) => {
  const signature = req.headers['x-webhook-signature'] || req.headers['x-hmac-sha256'];
  if (!signature) return res.status(401).json({ error: 'Missing signature' });

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody) // Must capture raw body before JSON parsing
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.error('Webhook signature mismatch', { endpoint: req.originalUrl });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Replay attack protection: check timestamp freshness
  const timestamp = req.headers['x-webhook-timestamp'];
  if (timestamp && Date.now() - new Date(timestamp).getTime() > 5 * 60 * 1000) {
    return res.status(401).json({ error: 'Webhook too old' });
  }

  next();
};

// Usage
router.post('/webhooks/easypay', verifyWebhookSignature(process.env.EASYPAY_WEBHOOK_SECRET), easypayController.handleWebhook);
router.post('/webhooks/flash', verifyWebhookSignature(process.env.FLASH_WEBHOOK_SECRET), flashController.handleWebhook);
router.post('/webhooks/peach', verifyWebhookSignature(process.env.PEACH_WEBHOOK_SECRET), peachController.handleWebhook);
```

---

## 7. Secrets Management

### Environment Variables (MANDATORY)
```bash
# .env — NEVER commit this file
# Database
DATABASE_URL=postgresql://user:pass@host:5432/mymoolah
DATABASE_SSL=true

# JWT
JWT_ACCESS_SECRET=<min-64-char-random-string>
JWT_REFRESH_SECRET=<min-64-char-random-string>

# Payment Provider Secrets
EASYPAY_API_KEY=
EASYPAY_WEBHOOK_SECRET=
FLASH_API_KEY=
FLASH_WEBHOOK_SECRET=
PEACH_API_KEY=
PEACH_WEBHOOK_SECRET=
MERCURY_API_KEY=

# Encryption
ENCRYPTION_KEY=<32-byte-hex-string>
```

### .gitignore Requirements
```
.env
.env.*
*.pem
*.key
config/secrets.json
```

---

## 8. POPIA Compliance (South Africa)

### Data Handling Requirements
1. **Consent**: Collect explicit consent before processing personal information
2. **Purpose Limitation**: Use data only for the stated purpose
3. **Data Minimization**: Collect only what's necessary for KYC/AML
4. **Retention**: Delete personal data after statutory period (5 years post-relationship)
5. **Right to Access**: Users can request their data export
6. **Right to Delete**: Users can request data deletion (subject to regulatory retention)
7. **Breach Notification**: Notify POPIA Information Regulator within 72 hours of breach

### POPIA-Compliant Logging
```javascript
// ❌ NEVER — Log sensitive data
console.log('User login:', { email, password, idNumber });

// ✅ CORRECT — Mask PII in logs
console.log('User login:', { email: maskEmail(email), userId });

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function maskIdNumber(id) {
  return `${id.slice(0, 4)}*****${id.slice(-2)}`;
}
```

---

## 9. OWASP Top 10 Checklist (MyMoolah-Specific)

| # | Vulnerability | MyMoolah Controls |
|---|--------------|-------------------|
| A01 | Broken Access Control | JWT + RBAC middleware, wallet ownership verification |
| A02 | Cryptographic Failures | HTTPS, AES-256 encryption at rest, bcrypt password hashing |
| A03 | Injection | Sequelize parameterized queries, Joi validation |
| A04 | Insecure Design | Idempotency keys, double-entry ledger validation |
| A05 | Security Misconfiguration | Helmet, environment-based configs, no default creds |
| A06 | Vulnerable Components | `npm audit` in CI/CD, Dependabot alerts |
| A07 | Authentication Failures | JWT rotation, OTP verification, KYC verification |
| A08 | Data Integrity Failures | HMAC webhook verification, ReconAuditTrail hash chains |
| A09 | Logging Failures | Structured logging (Winston), audit trail for all financial ops |
| A10 | SSRF | Validate all external URLs, whitelist payment provider domains |

---

## 10. Code Review Security Checklist

When reviewing any PR, verify:

- [ ] No hardcoded secrets, API keys, or passwords
- [ ] All user input validated with Joi before processing
- [ ] All DB queries use parameterized queries (no string interpolation)
- [ ] Financial endpoints have idempotency key middleware
- [ ] Webhook handlers verify HMAC signatures
- [ ] PII is masked in all log statements
- [ ] JWT tokens have appropriate expiry times
- [ ] RBAC applied to admin/financial endpoints
- [ ] Rate limiting applied to sensitive endpoints
- [ ] Error responses don't leak internal details (stack traces, DB schema)
- [ ] Monetary values use DECIMAL, never FLOAT
- [ ] Database transactions wrap multi-step financial operations
- [ ] `.env` values validated at startup (fail-fast on missing secrets)
- [ ] CORS restricted to known frontend origins
- [ ] File uploads validated (type, size, content) for KYC documents

## References

- [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/)
- [OWASP MASVS](https://owasp.org/www-project-mobile-app-security/)
- [PCI-DSS v4.0](https://www.pcisecuritystandards.org/)
- [POPIA Act](https://popia.co.za/)
- [SARB/FSCA Joint Security Standard (2025)](https://www.fsca.co.za/)
- [helmet.js](https://helmetjs.github.io/)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
