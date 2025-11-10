# MobileMart Fulcrum Documentation - Key Findings

**Source:** [MobileMart Fulcrum Integration Documentation](https://doc.clickup.com/26409196/d/h/t5y7c-8428/9bac487864beb0b)  
**Last Updated:** April 8, 2025

---

## 🔍 **Key Findings**

### **1. GET Products Endpoint**
**Documentation States:**
> "All the MobileMart products are available through the GET products endpoint for each VAS Type."

**Key Points:**
- Products are available per VAS Type
- Use `merchantProductId` from GET products endpoint for purchases
- Each VAS type has its own products endpoint

### **2. Swagger Documentation**
- **Conformance Environment:** https://conformance.fulcrumswitch.com/swagger/index.html#/Airtime
- **UAT Swagger:** https://uat.fulcrumswitch.com/swagger (requires UAT credentials)
- Swagger contains exact endpoint paths, request/response schemas

### **3. VAS Types**
- **Airtime:** Pinned and Pinless transactions
- **Data:** Pinned and Pinless transactions  
- **Voucher:** Pinned transactions
- **Bill Payment:** Bill payment transactions
- **Prepaid Utility:** Utility transactions

### **4. Error Codes**
Documentation includes comprehensive error codes (1000-1103) with detailed explanations.

---

## 📋 **Compliance Test Packs**

Documentation links to 7 test packs:
1. Variable Pinless Airtime
2. Variable Pinned Airtime
3. Fixed Pinless Airtime & Data
4. Fixed Pinned Airtime & Data
5. Pinned Vouchers
6. Bill Payments
7. Prepaid Utilities

---

## 🎯 **Next Steps**

1. **Access Swagger UI:**
   - Get UAT credentials via WhatsApp
   - Access: https://uat.fulcrumswitch.com/swagger
   - Find exact endpoint paths documented there

2. **Test Conformance Environment:**
   - Try: https://conformance.fulcrumswitch.com/swagger/index.html#/Airtime
   - May require authentication

3. **Request from MobileMart:**
   - Exact endpoint path structure
   - Working curl example
   - Any additional requirements

---

**Last Updated:** November 10, 2025

