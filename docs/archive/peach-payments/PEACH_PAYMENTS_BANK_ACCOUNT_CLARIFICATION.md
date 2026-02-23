PEACH PAYMENTS - BANK ACCOUNT SUPPORT CLARIFICATION

Date: November 19, 2025
Ticket: https://support.peachpayments.com/helpdesk/tickets/332799
Subject: Bank Account Support in Checkout V2 Integration

---

CLARIFICATION REQUEST

Hi Peach Payments Support Team,

Thank you for your previous responses. We need clarification on bank account support in our Checkout V2 integration.

---

CURRENT INTEGRATION

We are using the Checkout V2 API for our Peach Payments integration, specifically for PayShap payments. Our integration supports:

1. PayShap RPP (Rapid Payments Programme - Outbound payments)
2. PayShap RTP (Request to Pay - Inbound payment requests)
3. Request Money functionality (using PayShap RTP with MSISDN reference)

---

USE CASE: DUAL PAYMENT METHOD SUPPORT

We want to support TWO payment methods for PayShap:

1. PayShap Proxy (Mobile Phone Numbers) - Currently working
   - Users can make payments using their mobile phone numbers
   - Example: debtorPhone: "+27-711111200"
   - Status: Working perfectly in sandbox

2. Direct Bank Account Numbers - Currently failing
   - Users should be able to make payments using direct bank account numbers
   - Example: debtorAccountNumber: "1234567890", bankCode: "250655", bankName: "First National Bank (FNB)"
   - Status: Failing in sandbox with error

---

CURRENT ISSUE

When attempting to use direct bank account numbers in Checkout V2 sandbox, we receive the following error:

Error Response:
{
  "Invalid request body",
  "errors": {
    "customer.accountNumber": "unknown field",
    "customer.bankCode": "unknown field"
  }
}

This error occurs when we send a request like:
{
  "amount": "100.00",
  "currency": "ZAR",
  "defaultPaymentMethod": "PAYSHAP",
  "forceDefaultMethod": true,
  "customer": {
    "accountNumber": "1234567890",
    "bankCode": "250655",
    "bankName": "First National Bank (FNB)"
  }
}

However, when using PayShap proxy (mobile phone numbers), it works correctly:
{
  "amount": "100.00",
  "currency": "ZAR",
  "defaultPaymentMethod": "PAYSHAP",
  "forceDefaultMethod": true,
  "customer": {
    "mobile": "+27-711111200"
  }
}

---

QUESTIONS

1. Are direct bank account numbers supported in Checkout V2?
   - If yes: What is the correct field structure/format for bank account payments?
   - If no: Should we use Payments API v1 for bank account payments instead?

2. If Checkout V2 does not support bank accounts:
   - Can we use Payments API v1 for bank account payments while using Checkout V2 for phone number payments?
   - What is the recommended approach for supporting both payment methods?

3. If bank accounts are supported in Checkout V2 production (but not sandbox):
   - Will the same field structure work in production?
   - Are there any additional configuration steps required?

4. Required fields for bank account payments:
   - Is bankCode required when using accountNumber?
   - Is bankName required, or is bankCode sufficient?
   - What is the correct format for accountNumber (any validation rules)?

---

CURRENT IMPLEMENTATION

Our code currently attempts to support both methods:

For PayShap Proxy (Phone Numbers):
- Uses: customer.mobile field
- Status: Working

For Bank Accounts:
- Attempts to use: customer.accountNumber, customer.bankCode, customer.bankName
- Status: Failing with "unknown field" error

---

DESIRED OUTCOME

We want to provide users with the flexibility to:
- Pay using their mobile phone number (PayShap proxy) - Currently working
- Pay using their bank account number - Currently not working

Both methods should work for:
- PayShap RPP (outbound payments)
- PayShap RTP (inbound payment requests)
- Request Money functionality

---

TESTING ENVIRONMENT

- Environment: Sandbox
- API: Checkout V2
- Entity ID: 8ac7a4ca98972c34019899445be504d8
- Test Mode: Enabled (PEACH_ENABLE_TEST_MODE=true)

---

ADDITIONAL INFORMATION

Our integration is production-ready for phone number payments (84.6% UAT success rate). We are ready to proceed with production deployment once we clarify the bank account support approach.

Thank you for your assistance.

---

Best regards,
MyMoolah Treasury Platform Team

