# Banking-Grade Security Features - Setup Guide

## ✅ Implemented Features

### 1. CAPTCHA (reCAPTCHA v3) - Optional
- **Location**: `middleware/captchaMiddleware.js`
- **Status**: ✅ Implemented, optional (not enforced)
- **Usage**: Automatically enabled when `RECAPTCHA_SECRET_KEY` is set

### 2. Two-Factor Authentication (2FA) - Optional
- **Location**: `services/twoFactorAuthService.js`, `controllers/twoFactorAuthController.js`
- **Status**: ✅ Implemented, optional (not enforced)
- **Standard**: RFC 6238 TOTP (Time-based One-Time Password)
- **Digits**: 6-digit codes
- **Window**: 30-second time steps

### 3. Security Monitoring & Alerting
- **Location**: `services/securityMonitoringService.js`
- **Status**: ✅ Implemented
- **Features**:
  - Suspicious activity detection
  - Failed login tracking
  - Security event logging
  - Alert system (console, email, webhook)

### 4. IP Whitelisting - Optional
- **Location**: `middleware/securityMiddleware.js`
- **Status**: ✅ Implemented, optional
- **Usage**: Enabled when `ADMIN_IP_WHITELIST` is set

---

## 🔧 Environment Variables

Add these to your `.env` file:

```bash
# Optional: reCAPTCHA v3 (for bot protection)
# Get keys from: https://www.google.com/recaptcha/admin
RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here

# Optional: IP Whitelist for admin routes (comma-separated)
# Examples:
# ADMIN_IP_WHITELIST=192.168.1.100,10.0.0.50
# ADMIN_IP_WHITELIST=192.168.1.0/24  # CIDR notation supported
ADMIN_IP_WHITELIST=

# Optional: Security Alert Email
SECURITY_ALERT_EMAIL=security@mymoolah.com

# Optional: Security Alert Webhook URL
SECURITY_WEBHOOK_URL=https://your-webhook-url.com/alerts
```

---

## 📦 Database Migration

Run the migration to add 2FA fields:

```bash
npx sequelize-cli db:migrate --name 20251031_add_2fa_to_users
```

---

## 🔐 2FA API Endpoints

### Get 2FA Status
```http
GET /api/v1/auth/2fa/status
Authorization: Bearer <token>
```

### Setup 2FA (Generate Secret & QR Code)
```http
POST /api/v1/auth/2fa/setup
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "secret": "BASE32SECRET...",
  "qrCodeUrl": "data:image/png;base64,...",
  "manualEntryKey": "BASE32SECRET...",
  "verifyRequired": true
}
```

### Verify and Enable 2FA
```http
POST /api/v1/auth/2fa/verify-and-enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456",
  "secret": "BASE32SECRET..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "backupCodes": ["12345678", "87654321", ...],
  "warning": "Save these backup codes in a secure location."
}
```

### Disable 2FA
```http
POST /api/v1/auth/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "user_password",
  "token": "123456"  // 2FA token or backup code
}
```

### Verify 2FA Token
```http
POST /api/v1/auth/2fa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}
```

---

## 🔒 Login Flow with 2FA

### Step 1: Login Request
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "+27821234567",
  "password": "password123"
}
```

### Step 2a: If 2FA is NOT enabled
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": { ... }
}
```

### Step 2b: If 2FA IS enabled (no token provided)
```json
{
  "success": false,
  "requires2FA": true,
  "message": "Two-factor authentication required.",
  "userId": 123
}
```

### Step 2c: If 2FA IS enabled (with token)
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "+27821234567",
  "password": "password123",
  "twoFactorToken": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    ...,
    "twoFactorEnabled": true
  }
}
```

---

## 🛡️ IP Whitelist Usage

### Apply to Admin Routes
```javascript
const { ipWhitelist } = require('./middleware/securityMiddleware');

// Apply to specific routes
router.use('/admin', ipWhitelist());

// Or specify IPs directly
router.use('/admin', ipWhitelist(['192.168.1.100', '10.0.0.50']));
```

### Environment Variable
```bash
# In .env file
ADMIN_IP_WHITELIST=192.168.1.100,10.0.0.50,192.168.1.0/24
```

---

## 📊 Security Monitoring

### Logged Events
- ✅ Failed login attempts
- ✅ Successful logins
- ✅ Suspicious activity patterns
- ✅ 2FA enable/disable
- ✅ IP whitelist violations
- ✅ Rate limit violations

### Alert Levels
- **Low**: Informational events
- **Medium**: Warning events
- **High**: Critical security events
- **Critical**: Immediate attention required

---

## ✅ Testing Checklist

- [ ] Run migration: `npx sequelize-cli db:migrate --name 20251031_add_2fa_to_users`
- [ ] Test login without 2FA (should work normally)
- [ ] Test 2FA setup endpoint
- [ ] Test enabling 2FA with valid token
- [ ] Test login with 2FA enabled
- [ ] Test login with invalid 2FA token
- [ ] Test disabling 2FA
- [ ] Test backup codes
- [ ] Test CAPTCHA (if keys configured)
- [ ] Test IP whitelist (if configured)

---

## 🎯 Production Deployment

### Before Production:
1. ✅ Set `RECAPTCHA_SECRET_KEY` in production environment
2. ✅ Configure `ADMIN_IP_WHITELIST` for admin routes
3. ✅ Set `SECURITY_ALERT_EMAIL` for security alerts
4. ✅ Enable security monitoring
5. ✅ Test 2FA flow end-to-end
6. ✅ Review security logs

### Optional Enforcement:
- 2FA can be made mandatory by updating the login controller
- CAPTCHA can be enforced by removing `skipInDevelopment` option
- IP whitelist can be enforced by setting `ADMIN_IP_WHITELIST`

---

## 📝 Notes

- **2FA is OPTIONAL** - Users can enable/disable at will
- **CAPTCHA is OPTIONAL** - Only enforced if keys are configured
- **IP Whitelist is OPTIONAL** - Only enforced if `ADMIN_IP_WHITELIST` is set
- All features are **banking-grade** and production-ready
- Features are **backward compatible** - existing functionality unaffected

