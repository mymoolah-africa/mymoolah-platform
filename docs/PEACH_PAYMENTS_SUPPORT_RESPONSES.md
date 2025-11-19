PEACH PAYMENTS SUPPORT RESPONSES

Date: November 14, 2025
Ticket: https://support.peachpayments.com/helpdesk/tickets/332799
Status: Responses received - Implementation updates required

---

EXECUTIVE SUMMARY

Peach Payments Support has provided responses to all critical questions regarding production deployment. Key information includes production URLs, webhook configuration details, status polling endpoint confirmation, and clarification on production environment differences.

---

1. PRODUCTION CREDENTIALS

1.1 OAuth Credentials (Client ID, Client Secret, Merchant ID)
Response: Once you are granted access to the live Peach dashboard, you will find all the required credentials.

Status: PENDING - Awaiting dashboard access
Action Required: Request access to live Peach dashboard to obtain production credentials

1.2 Production API Base URLs
Response:
- Auth URL: https://dashboard.peachpayments.com
- Checkout URL: https://secure.peachpayments.com

Status: CONFIRMED
Current Sandbox URLs:
- Auth: https://sandbox-dashboard.peachpayments.com
- Checkout: https://testsecure.peachpayments.com

Action Required: Update environment variables with production URLs when deploying

1.3 Production Entity IDs
Response: The payment methods have not yet been enabled. This will be done as part of the go-live process. However, this should be the entity ID of the checkout channel.

Status: PENDING - Will be provided during go-live
Action Required: Entity IDs will be configured during go-live process

---

2. WEBHOOK CONFIGURATION

2.1 Webhook URL Registration
Response: The webhook URLs can be added from the Peach dashboard under the Checkout tab.

Status: CONFIRMED
Action Required:
1. Access live Peach dashboard
2. Navigate to Checkout tab
3. Add webhook URL: https://api.mymoolah.africa/api/v1/peach/webhook (or production domain)

2.2 Webhook Signature Validation Method
Response: Please refer to https://developer.peachpayments.com/docs/checkout-webhooks#webhook-security and let us know if you have any further questions.

Status: DOCUMENTATION PROVIDED
Action Required:
1. Review webhook security documentation
2. Implement signature validation based on documentation
3. Test signature validation in sandbox if possible

2.3 Webhook Secret Key
Response: Please use the secret token from the Peach dashboard. Same can be found under the Checkout tab.

Status: CONFIRMED
Action Required:
1. Retrieve secret token from Peach dashboard (Checkout tab)
2. Store securely in environment variables
3. Use for webhook signature validation

---

3. STATUS POLLING

3.1 Status Polling Endpoint
Response: https://secure.peachpayments.com/v2/checkout/{checkoutId}/status

Status: CONFIRMED
Current Implementation: Attempts GET /v2/checkouts/{checkoutId}/payment
Note: Support confirmed both endpoints are correct

Action Required: Update status polling endpoint to use confirmed URL format

3.2 Endpoint Confirmation
Response: Yes, this is correct. (Referring to GET /v2/checkouts/{checkoutId}/payment)

Status: CONFIRMED
Both endpoint formats are acceptable:
- https://secure.peachpayments.com/v2/checkout/{checkoutId}/status
- GET /v2/checkouts/{checkoutId}/payment

3.3 Authentication for Status Polling
Response: You will need to generate the access token using the Client ID, Client Secret, Merchant ID.

Status: CONFIRMED
Current Implementation: Already using OAuth token generation
Action Required: Ensure production credentials are used for token generation

---

4. BANK ACCOUNT SUPPORT

4.1 Questions Asked
- Are direct bank account numbers supported in Payments API v1?
- Are direct bank account numbers supported in Checkout V2 production?
- What is the recommended approach for bank account payments?
- What fields are required for bank account payments?

4.2 Response
Response: Can you please share more information about the above questions? Please advise what you are trying to achieve so that we can best advise. Are you still referring to the Checkout integration?

Status: AWAITING CLARIFICATION
Action Required: Provide detailed explanation to Peach Payments:
1. We are using Checkout V2 integration
2. We want to support both PayShap proxy (phone numbers) and direct bank account payments
3. Current issue: Checkout V2 sandbox returns "customer.accountNumber":"unknown field" error
4. Question: Is bank account support available in Checkout V2 production, or should we use Payments API v1 for bank accounts?

---

5. PRODUCTION ENVIRONMENT

5.1 Differences Between Sandbox and Production
Response: The only differences will be the credentials and the endpoints.

Status: CONFIRMED
Differences:
- Credentials: OAuth credentials, entity IDs, secret tokens
- Endpoints: Base URLs (auth and checkout)
- No API structure differences

5.2 Additional Configuration Steps
Response: Same as above.

Status: CONFIRMED
No additional configuration steps beyond:
- Updating credentials
- Updating endpoints
- Registering webhook URL

5.3 Rate Limits or Quotas
Response: Can you please elaborate on this one?

Status: AWAITING CLARIFICATION
Action Required: Provide clarification to Peach Payments:
1. What are the API rate limits in production?
2. Are there transaction volume quotas?
3. What happens if rate limits are exceeded?
4. Are there different limits for different payment methods?

---

IMPLEMENTATION UPDATES REQUIRED

1. Update Status Polling Endpoint
File: controllers/peachController.js
Current: Attempts GET /v2/checkouts/{checkoutId}/payment
Update: Use confirmed endpoint: https://secure.peachpayments.com/v2/checkout/{checkoutId}/status
Or: Keep current implementation (both confirmed as correct)

2. Implement Webhook Signature Validation
File: controllers/peachController.js (handleWebhook method)
Action:
- Review webhook security documentation
- Implement signature validation using secret token from dashboard
- Test signature validation

3. Update Environment Variables Template
File: env.template
Add production URLs:
- PEACH_BASE_AUTH_PROD=https://dashboard.peachpayments.com
- PEACH_BASE_CHECKOUT_PROD=https://secure.peachpayments.com
- PEACH_WEBHOOK_SECRET=<from dashboard>

4. Create Production Configuration Guide
Action: Document production deployment steps including:
- Dashboard access request
- Credential retrieval
- Webhook URL registration
- Entity ID configuration during go-live

---

NEXT STEPS

Immediate Actions:
1. Review webhook security documentation at provided URL
2. Draft response to Peach Payments regarding:
   - Bank account support clarification
   - Rate limits/quotas questions
3. Update code with confirmed status polling endpoint
4. Prepare production deployment checklist

Before Production:
1. Request access to live Peach dashboard
2. Retrieve production credentials
3. Register webhook URL in dashboard
4. Obtain entity IDs during go-live process
5. Configure webhook secret token
6. Test webhook signature validation
7. Update environment variables with production values

---

QUESTIONS TO CLARIFY WITH PEACH PAYMENTS

1. Bank Account Support
   - Provide detailed explanation of use case
   - Confirm if Checkout V2 supports bank accounts in production
   - Or if Payments API v1 should be used for bank accounts

2. Rate Limits
   - Request specific rate limit information
   - Transaction volume quotas
   - Rate limit handling procedures

---

DOCUMENTATION REFERENCES

Webhook Security Documentation:
https://developer.peachpayments.com/docs/checkout-webhooks#webhook-security

Support Ticket:
https://support.peachpayments.com/helpdesk/tickets/332799

---

Document Created: November 19, 2025
Status: Responses received - Implementation updates pending

