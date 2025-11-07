# MobileMart (Fulcrum) Integration — Status Update (2025-11-07)

## Summary of MobileMart Feedback

- Credentials: Production credentials are active and working (token retrieval and product list confirmed by MobileMart).
- UAT: UAT credentials will be shared via WhatsApp once we provide a cellphone number. UAT Swagger: https://uat.fulcrumswitch.com/swagger
- Account: Merchant account is activated for API access; all products exposed.
- IP Whitelisting: Not required currently (access controls in place on their side).
- Environment URLs: `https://fulcrumswitch.com` (PROD), `https://uat.fulcrumswitch.com` (UAT) — both confirmed correct.
- Products exposed: Airtime, Data, Utilities (Prepaid Electricity), BillPayments, Vouchers.
- Emails: Balance emails and low-balance emails not configured yet — MobileMart requests our preference (email addresses, frequency). Alert email addresses requested for system alerts.
- Testing process: They prefer UAT first using their test pack. Once test packs are completed, we can move to Production.

## Our Current Position

- Codebase implements Fulcrum API structure and OAuth token flow.
- Env handling supports UAT and PROD base URLs.
- Test scripts exist for integration probing.
- Pending items: capture UAT creds, configure alert/balance emails, align product endpoints per UAT pack, and run/record test results.

## Required Inputs to Proceed

1. Cellphone number to receive UAT credentials via WhatsApp.
2. Email addresses for:
   - Balance statements (recipient list, frequency preference)
   - Low-balance alerts (recipient list, threshold if applicable)
   - General system alerts (recipient list)
3. Confirmation of UAT vs PROD base URL selections for each environment file.

## Agreed Next Steps

1. Provide cellphone number to MobileMart to receive UAT credentials and test pack link.
2. Configure UAT credentials in environment and verify token + products.
3. Execute test pack in UAT, capture results, fix gaps, retest until green.
4. Configure alert emails and (optional) balance emails.
5. Request go-live after successful UAT pack completion.

## Contacts & Links

- UAT Swagger: https://uat.fulcrumswitch.com/swagger
- Token example (from MobileMart email):
  ```bash
  curl -X POST "https://fulcrumswitch.com/connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=mymoolah&client_secret=***REDACTED***&scope=api"
  ```


