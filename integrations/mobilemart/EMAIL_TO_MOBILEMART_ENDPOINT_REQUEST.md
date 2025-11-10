# Email to MobileMart - Endpoint Path Request

**To:** support@mobilemart.co.za  
**Subject:** MobileMart Fulcrum API - Need Exact Product Endpoint Path

---

Hi MobileMart Support Team,

Thank you for verifying our PROD credentials and confirming that you successfully retrieved products.

We've implemented the `scope=api` parameter in our token requests and authentication is working perfectly. However, we're still unable to retrieve products - all product endpoints are returning HTML instead of JSON.

**Current Status:**
- ✅ Authentication: Working (token retrieval successful)
- ✅ Token includes `scope=api` parameter
- ✅ PROD credentials verified by you
- ❌ Product endpoints: All returning HTML (not JSON)

**What We Need:**

Could you please provide:

1. **The exact endpoint path** you used to successfully retrieve products?

   For example:
   - Was it `/api/v1/airtime/products`?
   - Or `/merchant/products/airtime`?
   - Or a different path structure?

2. **A working curl command** that successfully retrieves products?

   Example format:
   ```bash
   curl -X GET "https://fulcrumswitch.com/???" \
     -H "Authorization: Bearer {token}" \
     -H "Accept: application/json"
   ```

3. **Any additional headers or parameters** required beyond:
   - `Authorization: Bearer {token}`
   - `Accept: application/json`

**Endpoints We've Tested (All Return HTML):**
- `/api/v1/airtime/products`
- `/api/v1/data/products`
- `/api/v1/products/airtime`
- `/api/v1/products/data`
- `/api/v1/products`
- And 11 other variations...

**Our Current Token Request (Working):**
```bash
curl -X POST "https://fulcrumswitch.com/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=mymoolah&client_secret=c799bf37-934d-4dcf-bfec-42fb421a6407&scope=api"
```

Once we have the correct endpoint path, we can:
- Update our integration code
- Test product listings
- Complete the 24 UAT compliance tests
- Move forward with production integration

Thank you for your assistance!

Best regards,  
MyMoolah Development Team

---

**Merchant:** mymoolah  
**Environment:** PROD (verified working by MobileMart)  
**Date:** November 10, 2025

