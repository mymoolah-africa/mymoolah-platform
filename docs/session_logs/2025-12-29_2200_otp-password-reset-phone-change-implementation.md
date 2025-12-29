# Session Log - 2025-12-29 - OTP Password Reset & Phone Number Change Implementation

**Session Date**: 2025-12-29 22:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Planning session

---

## Session Summary

Comprehensive codebase sweep revealed that SMS OTP infrastructure exists (`services/smsService.js` with `sendPasswordResetOtp()` and `sendPhoneChangeOtp()` methods and 11-language templates), but the actual password reset and phone number change flows are NOT implemented. Frontend shows placeholder messages ("Contact support for password reset" and "Phone number cannot be changed"). This session documents the implementation plan for completing the OTP-based password reset and phone number change functionality.

---

## Current Status

### ✅ **What EXISTS**:
1. **SMS Service** (`services/smsService.js`):
   - ✅ `sendPasswordResetOtp()` method - sends OTP for password reset
   - ✅ `sendPhoneChangeOtp()` method - sends OTP for phone number change
   - ✅ `getOtpTemplate()` - 11-language OTP templates (en, af, zu, xh, st, tn, nso, ve, ts, ss, nr)
   - ✅ All OTP messages localized in 11 South African languages

2. **Frontend**:
   - ✅ `input-otp` package installed
   - ✅ OTP input component (`components/ui/input-otp.tsx`)

3. **Documentation**:
   - ✅ FAQ mentions password reset via OTP
   - ✅ Support service mentions OTP verification for phone changes

### ❌ **What's MISSING**:

1. **Backend Routes**:
   - ❌ No `/forgot-password` endpoint
   - ❌ No `/reset-password` endpoint
   - ❌ No `/request-phone-change` endpoint
   - ❌ No `/verify-phone-change` endpoint
   - ✅ Only `/change-password` exists (requires current password)

2. **Backend Controllers**:
   - ❌ No `requestPasswordReset()` method
   - ❌ No `resetPassword()` method
   - ❌ No `requestPhoneChange()` method
   - ❌ No `verifyPhoneChange()` method

3. **OTP Infrastructure**:
   - ❌ No OTP storage model/table (no migrations found)
   - ❌ No OTP service for generation/verification
   - ❌ No OTP verification logic

4. **Frontend**:
   - ❌ LoginPage shows "Contact support for password reset" (no actual flow)
   - ❌ ProfilePage shows "Phone number cannot be changed for security reasons"

---

## Implementation Plan

### **Phase 1: OTP Infrastructure** 🔧

#### 1.1 Database Schema
- [ ] Create migration: `20251230_01_create_otp_verifications_table.js`
- [ ] Table structure:
  - `id` (primary key)
  - `userId` (foreign key to users)
  - `phoneNumber` (E.164 format)
  - `otp` (6-digit code, hashed)
  - `type` (enum: 'password_reset', 'phone_change')
  - `expiresAt` (timestamp, 10 minutes)
  - `verified` (boolean, default false)
  - `verifiedAt` (timestamp, nullable)
  - `createdAt`, `updatedAt`
- [ ] Indexes: `userId`, `phoneNumber`, `type`, `expiresAt`

#### 1.2 Sequelize Model
- [ ] Create `models/OtpVerification.js`
- [ ] Associations: belongsTo User
- [ ] Instance methods: `isExpired()`, `verify()`, `markAsVerified()`

#### 1.3 OTP Service
- [ ] Create `services/otpService.js`
- [ ] Methods:
  - `generateOtp()` - Generate 6-digit OTP
  - `hashOtp()` - Hash OTP for storage
  - `storeOtp(userId, phoneNumber, type)` - Store OTP with 10-min expiry
  - `verifyOtp(userId, phoneNumber, type, otp)` - Verify and mark as used
  - `cleanupExpiredOtps()` - Cleanup expired OTPs (cron job)

---

### **Phase 2: Password Reset Flow** 🔐

#### 2.1 Backend Endpoints
- [ ] `POST /api/v1/auth/forgot-password`
  - Request: `{ phoneNumber }`
  - Find user by phoneNumber
  - Generate OTP
  - Store OTP (10 min expiry)
  - Send SMS via `smsService.sendPasswordResetOtp()`
  - Return: `{ success: true, message: "OTP sent" }`

- [ ] `POST /api/v1/auth/reset-password`
  - Request: `{ phoneNumber, otp, newPassword }`
  - Verify OTP via `otpService.verifyOtp()`
  - Validate password strength
  - Update `user.password_hash`
  - Invalidate OTP
  - Return: `{ success: true, message: "Password reset successful" }`

#### 2.2 Controller Methods
- [ ] Add `requestPasswordReset()` to `controllers/authController.js`
- [ ] Add `resetPassword()` to `controllers/authController.js`

#### 2.3 Routes
- [ ] Add routes to `routes/auth.js`:
  ```javascript
  router.post('/forgot-password', [...validation], authController.requestPasswordReset);
  router.post('/reset-password', [...validation], authController.resetPassword);
  ```

#### 2.4 Frontend
- [ ] Create `pages/ForgotPasswordPage.tsx`
- [ ] Create `pages/ResetPasswordPage.tsx`
- [ ] Update `LoginPage.tsx` - Add "Forgot Password?" link
- [ ] Add API methods to `services/apiService.ts`:
  - `requestPasswordReset(phoneNumber)`
  - `resetPassword(phoneNumber, otp, newPassword)`

---

### **Phase 3: Phone Number Change Flow** 📱

#### 3.1 Backend Endpoints
- [ ] `POST /api/v1/auth/request-phone-change`
  - Request: `{ newPhoneNumber }` (authenticated)
  - Validate new phone number format
  - Check if new number already exists
  - Generate OTP
  - Store OTP (10 min expiry)
  - Send SMS to NEW phone number via `smsService.sendPhoneChangeOtp()`
  - Return: `{ success: true, message: "OTP sent to new number" }`

- [ ] `POST /api/v1/auth/verify-phone-change`
  - Request: `{ newPhoneNumber, otp }` (authenticated)
  - Verify OTP via `otpService.verifyOtp()`
  - Update `user.phoneNumber` and `user.accountNumber`
  - Invalidate OTP
  - Return: `{ success: true, message: "Phone number changed" }`

#### 3.2 Controller Methods
- [ ] Add `requestPhoneChange()` to `controllers/authController.js`
- [ ] Add `verifyPhoneChange()` to `controllers/authController.js`

#### 3.3 Routes
- [ ] Add routes to `routes/auth.js`:
  ```javascript
  router.post('/request-phone-change', [auth, ...validation], authController.requestPhoneChange);
  router.post('/verify-phone-change', [auth, ...validation], authController.verifyPhoneChange);
  ```

#### 3.4 Frontend
- [ ] Update `pages/ProfilePage.tsx` - Add phone change UI
- [ ] Create phone change modal/flow with OTP input
- [ ] Add API methods to `services/apiService.ts`:
  - `requestPhoneChange(newPhoneNumber)`
  - `verifyPhoneChange(newPhoneNumber, otp)`

---

### **Phase 4: Security & Best Practices** 🔒

#### 4.1 Security Measures
- [ ] Rate limiting: Max 3 OTP requests per phone per hour
- [ ] OTP expiry: 10 minutes
- [ ] OTP one-time use: Mark as verified after use
- [ ] Phone number validation: E.164 format only
- [ ] Password strength validation: Same rules as registration

#### 4.2 Error Handling
- [ ] Invalid phone number errors
- [ ] OTP expired errors
- [ ] OTP already used errors
- [ ] User not found errors
- [ ] SMS sending failures (graceful degradation)

#### 4.3 Logging & Audit
- [ ] Log all OTP generation attempts
- [ ] Log all OTP verification attempts
- [ ] Log password reset completions
- [ ] Log phone number changes
- [ ] Audit trail for compliance

---

## Files to Create/Modify

### **New Files**:
1. `migrations/20251230_01_create_otp_verifications_table.js`
2. `models/OtpVerification.js`
3. `services/otpService.js`
4. `pages/ForgotPasswordPage.tsx` (frontend)
5. `pages/ResetPasswordPage.tsx` (frontend)

### **Modified Files**:
1. `controllers/authController.js` - Add 4 new methods
2. `routes/auth.js` - Add 4 new routes
3. `mymoolah-wallet-frontend/pages/LoginPage.tsx` - Add forgot password link
4. `mymoolah-wallet-frontend/pages/ProfilePage.tsx` - Add phone change UI
5. `mymoolah-wallet-frontend/services/apiService.ts` - Add 4 new API methods

---

## Testing Checklist

### **Password Reset Flow**:
- [ ] Request OTP with valid phone number
- [ ] Request OTP with invalid phone number
- [ ] Request OTP with non-existent phone number
- [ ] Verify OTP with correct code
- [ ] Verify OTP with incorrect code
- [ ] Verify OTP with expired code
- [ ] Reset password with valid OTP
- [ ] Reset password with invalid OTP
- [ ] Rate limiting (max 3 requests/hour)
- [ ] SMS delivery in all 11 languages

### **Phone Number Change Flow**:
- [ ] Request OTP with valid new phone number
- [ ] Request OTP with invalid phone number
- [ ] Request OTP with existing phone number
- [ ] Verify OTP with correct code
- [ ] Verify OTP with incorrect code
- [ ] Verify OTP with expired code
- [ ] Change phone number with valid OTP
- [ ] Change phone number with invalid OTP
- [ ] Rate limiting (max 3 requests/hour)
- [ ] SMS delivery in all 11 languages

---

## Next Steps

1. **Tomorrow First Thing**: Start with Phase 1 (OTP Infrastructure)
   - Create database migration
   - Create Sequelize model
   - Create OTP service

2. **Then**: Phase 2 (Password Reset Flow)
   - Backend endpoints
   - Frontend pages

3. **Then**: Phase 3 (Phone Number Change Flow)
   - Backend endpoints
   - Frontend UI updates

4. **Finally**: Phase 4 (Security & Testing)
   - Security measures
   - Comprehensive testing

---

## Important Context

- **SMS Service**: Already fully implemented with 11-language support
- **OTP Templates**: Already exist in `smsService.js`
- **Frontend OTP Component**: Already exists (`components/ui/input-otp.tsx`)
- **MyMobileAPI**: Credentials need to be configured in `.env`
- **Security**: Must follow banking-grade standards (rate limiting, expiry, one-time use)

---

## Questions/Unresolved Items

- Should OTP be stored hashed or plaintext? (Recommendation: Hashed for security)
- Should we allow phone number change if user has active transactions? (Recommendation: Yes, but log for audit)
- Should we require KYC verification before phone change? (Recommendation: No, OTP is sufficient)

---

## Related Documentation

- `services/smsService.js` - SMS OTP sending methods
- `docs/2FA_BEST_PRACTICES.md` - 2FA implementation guide
- `docs/SECURITY.md` - Security best practices
- `docs/FAQ_MASTER.md` - FAQ mentions password reset

