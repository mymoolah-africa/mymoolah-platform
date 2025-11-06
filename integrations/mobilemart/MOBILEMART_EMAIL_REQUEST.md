# MobileMart Fulcrum Integration - Email Request Template

**To:** support@mobilemart.co.za  
**CC:** angelique@stackworx.io  
**Subject:** MobileMart Fulcrum API Integration - Production Testing Request

---

## **REQUEST FOR PRODUCTION TESTING ACCESS**

Dear MobileMart Support Team,

We have completed the MobileMart Fulcrum API integration code for MyMoolah Treasury Platform and are ready to test in the production environment. We require your assistance to verify our credentials and confirm account setup.

---

## **CURRENT STATUS**

✅ **Integration Code**: Complete and matches MobileMart Fulcrum documentation  
✅ **OAuth Endpoint**: Configured (`/connect/token`)  
✅ **API Structure**: Updated to match documentation  
⚠️ **Authentication**: Currently receiving `invalid_client` error

---

## **IMMEDIATE REQUESTS**

### **1. Credential Verification**

Please verify if our credentials are correct:
- **Client ID**: `mymoolah`
- **Client Secret**: `c799bf37-934d-4dcf-bfec-42fb421a6407`
- **Question**: Are these credentials for UAT or PROD environment?

### **2. Account Activation**

- Is our merchant account activated for API access?
- Is API access enabled for our account?
- Are there any pending setup steps?

### **3. Working Example**

Please provide a working curl command that successfully authenticates:
```bash
# Example format we need:
curl -X POST https://fulcrumswitch.com/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=...&client_secret=..."
```

### **4. IP Whitelisting**

- Is IP whitelisting required for API access?
- If yes, what IP addresses should be whitelisted?
- How do we add our production server IP addresses?

### **5. Environment URLs**

Please confirm:
- **UAT**: `https://uat.fulcrumswitch.com` ✓
- **PROD**: `https://fulcrumswitch.com` ✓

Are these URLs correct?

---

## **ACCOUNT SETUP CHECKLIST**

Please confirm:
- [ ] Merchant account loaded with funds / credit limit set
- [ ] Products exposed to our merchant account
- [ ] Balance alerts configured
- [ ] Low balance email notifications configured
- [ ] Rate limits confirmed

**Alert Email Addresses** (if needed):
- Primary: [TO BE PROVIDED]
- Secondary: [TO BE PROVIDED]

---

## **SUPPORT REQUESTS**

1. **Swagger Documentation Access**
   - Access to `https://uat.fulcrumswitch.com/swagger`
   - API release notes

2. **Testing Process**
   - Can we test in UAT first?
   - Do we need to complete compliance tests before PROD?
   - What is the process for moving from UAT to PROD?

---

## **TECHNICAL DETAILS**

**Current Authentication Request:**
```
POST https://fulcrumswitch.com/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=mymoolah&client_secret=c799bf37-934d-4dcf-bfec-42fb421a6407
```

**Current Error Response:**
```json
{
  "error": "invalid_client",
  "error_description": "The specified client credentials are invalid.",
  "error_uri": "https://documentation.openiddict.com/errors/ID2055"
}
```

---

## **NEXT STEPS**

1. Verify credentials with MobileMart support
2. Complete account activation steps
3. Test authentication in UAT environment
4. Complete compliance test packs
5. Test in production environment

---

**Thank you for your assistance. We look forward to completing the integration.**

Best regards,  
MyMoolah Development Team

---

**Reference Documents:**
- Detailed Request: `docs/MOBILEMART_PRODUCTION_TESTING_REQUEST.md`
- Integration Status: `docs/MOBILEMART_FULCRUM_FINAL_REPORT.md`

