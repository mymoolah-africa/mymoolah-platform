PEACH PAYMENTS IMPLEMENTATION UPDATES

Date: November 19, 2025
Status: Implementation updates based on Peach Payments Support responses

---

EXECUTIVE SUMMARY

Based on responses from Peach Payments Support (Ticket #332799), we have implemented webhook signature validation, updated the status polling endpoint, and prepared production configuration. All code updates are complete and ready for testing.

---

IMPLEMENTATION UPDATES

1. WEBHOOK SIGNATURE VALIDATION - IMPLEMENTED

Status: COMPLETE

Implementation Details:
- Added validateWebhookSignature function using HMAC-SHA256
- Uses secret token from PEACH_WEBHOOK_SECRET environment variable
- Validates signature from headers (x-peach-signature, x-signature, signature, x-peach-webhook-signature)
- Uses constant-time comparison for security (crypto.timingSafeEqual)
- Supports raw body for accurate signature validation

Files Modified:
- controllers/peachController.js: Added signature validation function and updated handleWebhook
- routes/peach.js: Added raw body middleware for webhook route

Security Features:
- Signature validation required in production (NODE_ENV=production)
- Graceful fallback in sandbox/UAT if secret not configured
- Detailed logging for troubleshooting
- Returns 401 for invalid signatures

Environment Variable:
- PEACH_WEBHOOK_SECRET: Secret token from Peach dashboard (Checkout tab)

Reference:
- Documentation: https://developer.peachpayments.com/docs/checkout-webhooks#webhook-security

---

2. STATUS POLLING ENDPOINT - UPDATED

Status: COMPLETE

Implementation Details:
- Updated endpoint to use confirmed URL format
- Endpoint: /v2/checkout/{checkoutId}/status
- Alternative endpoint also confirmed: /v2/checkouts/{checkoutId}/payment
- Updated comments to reflect confirmed endpoints

Files Modified:
- controllers/peachController.js: Updated pollPaymentStatus method

Confirmed Endpoints:
- Production: https://secure.peachpayments.com/v2/checkout/{checkoutId}/status
- Sandbox: https://testsecure.peachpayments.com/v2/checkout/{checkoutId}/status
- Alternative: GET /v2/checkouts/{checkoutId}/payment (also confirmed)

---

3. ENVIRONMENT VARIABLES - UPDATED

Status: COMPLETE

Updates:
- Added production URLs (commented for reference)
- Added PEACH_WEBHOOK_SECRET variable
- Organized Peach Payments configuration section
- Added comments for production deployment

Files Modified:
- env.template: Updated Peach Payments section

New Variables:
- PEACH_WEBHOOK_SECRET: Webhook secret token from dashboard

Production URLs (Documented):
- PEACH_BASE_AUTH: https://dashboard.peachpayments.com
- PEACH_BASE_CHECKOUT: https://secure.peachpayments.com

---

4. BANK ACCOUNT SUPPORT - RESPONSE DRAFTED

Status: COMPLETE (Response ready to send)

Documentation:
- docs/PEACH_PAYMENTS_BANK_ACCOUNT_CLARIFICATION.md

Response includes:
- Current integration details (Checkout V2)
- Use case explanation (dual payment method support)
- Current issue description (sandbox error)
- Specific questions for Peach Payments
- Testing environment details

Next Steps:
- Send response to Peach Payments Support
- Await clarification on bank account support

---

CODE CHANGES SUMMARY

1. controllers/peachController.js
   - Added validateWebhookSignature function (lines 854-892)
   - Updated handleWebhook with signature validation (lines 894-948)
   - Updated pollPaymentStatus comments (lines 1076-1094)

2. routes/peach.js
   - Added rawBodyMiddleware for webhook route
   - Updated webhook route to capture raw body for signature validation

3. env.template
   - Updated Peach Payments configuration section
   - Added production URLs (commented)
   - Added PEACH_WEBHOOK_SECRET variable

---

TESTING REQUIREMENTS

1. Webhook Signature Validation
   - Test with valid signature (should pass)
   - Test with invalid signature (should return 401)
   - Test without signature in production (should return 401)
   - Test without secret configured (should log warning, allow in sandbox)

2. Status Polling
   - Test with valid checkoutId (should return status)
   - Test with invalid checkoutId (should handle gracefully)
   - Verify endpoint format matches confirmed URL

3. Production Configuration
   - Verify production URLs are correct
   - Verify webhook secret is configured
   - Test webhook registration in dashboard

---

PRODUCTION DEPLOYMENT CHECKLIST

Before Production:
- [ ] Obtain production credentials from live dashboard
- [ ] Configure PEACH_WEBHOOK_SECRET in production environment
- [ ] Register webhook URL in Peach dashboard (Checkout tab)
- [ ] Update environment variables with production URLs
- [ ] Test webhook signature validation with production secret
- [ ] Test status polling with production endpoint
- [ ] Obtain entity IDs during go-live process

Production URLs:
- Auth: https://dashboard.peachpayments.com
- Checkout: https://secure.peachpayments.com
- Status: https://secure.peachpayments.com/v2/checkout/{checkoutId}/status

---

PENDING ITEMS

1. Bank Account Support Clarification
   - Response drafted and ready to send
   - Awaiting Peach Payments response

2. Rate Limits Information
   - Need to provide clarification to Peach Payments
   - Awaiting their response

3. Production Credentials
   - Awaiting access to live dashboard
   - Entity IDs will be provided during go-live

---

SECURITY NOTES

1. Webhook Signature Validation
   - Uses HMAC-SHA256 (industry standard)
   - Constant-time comparison prevents timing attacks
   - Raw body required for accurate validation
   - Production mode enforces signature validation

2. Environment Variables
   - Webhook secret must be kept secure
   - Never commit secrets to version control
   - Use secure secret management in production

3. Error Handling
   - Invalid signatures return 401 (not 500)
   - Error messages don't expose implementation details
   - Detailed logging for troubleshooting (non-production)

---

DOCUMENTATION UPDATES

1. Created: docs/PEACH_PAYMENTS_SUPPORT_RESPONSES.md
   - Complete record of support responses
   - Action items and next steps

2. Created: docs/PEACH_PAYMENTS_BANK_ACCOUNT_CLARIFICATION.md
   - Draft response for bank account support
   - Ready to send to Peach Payments

3. Created: docs/PEACH_PAYMENTS_IMPLEMENTATION_UPDATES.md
   - This document - implementation summary

---

NEXT STEPS

Immediate:
1. Test webhook signature validation in sandbox
2. Send bank account support clarification to Peach Payments
3. Test status polling with confirmed endpoint

Before Production:
1. Obtain production credentials
2. Configure webhook secret
3. Register webhook URL
4. Test end-to-end with production environment

---

Document Created: November 19, 2025
Status: Implementation updates complete - Ready for testing

