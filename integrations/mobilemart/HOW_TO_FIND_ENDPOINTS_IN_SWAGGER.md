# How to Find Exact Endpoint Paths in MobileMart Swagger UI

**Swagger URL:** https://uat.fulcrumswitch.com/swagger (or https://conformance.fulcrumswitch.com/swagger)

---

## 📍 **Step-by-Step Guide**

### **Step 1: Access Swagger UI**
1. Open: https://uat.fulcrumswitch.com/swagger
2. You should see a Swagger interface with API documentation

### **Step 2: Find the VAS Type Sections**
Swagger organizes endpoints by VAS Type. Look for these sections:
- **Airtime** - For airtime products and transactions
- **Data** - For data products and transactions
- **Voucher** - For voucher products
- **Bill Payment** - For bill payment products
- **Prepaid Utility** - For utility products

### **Step 3: Locate the GET Products Endpoint**
For each VAS type, look for:
- **GET** endpoints (usually listed first)
- Endpoint that says something like:
  - `GET /api/v1/airtime/products`
  - `GET /api/v1/data/products`
  - Or similar pattern

### **Step 4: Check the Endpoint Details**
Click on the GET products endpoint to see:
- **Full path:** The complete endpoint URL
- **Parameters:** Any required query parameters
- **Headers:** Required headers (Authorization, Accept, etc.)
- **Response:** Example response structure

### **Step 5: Note the Base Path**
Swagger usually shows:
- **Base URL:** e.g., `https://uat.fulcrumswitch.com`
- **API Path:** e.g., `/api/v1` or `/api`
- **Full Endpoint:** Base URL + API Path + Endpoint

---

## 🔍 **What to Look For**

### **Common Patterns in Swagger:**
1. **GET /api/v1/{vasType}/products**
2. **GET /api/{vasType}/products**
3. **GET /{vasType}/products**
4. **GET /products?type={vasType}**

### **Key Information to Capture:**
- ✅ **Exact endpoint path** (e.g., `/api/v1/airtime/products`)
- ✅ **HTTP method** (should be GET)
- ✅ **Required headers** (Authorization, Accept, Content-Type)
- ✅ **Query parameters** (if any)
- ✅ **Response format** (JSON structure)

---

## 📋 **Checklist**

For each VAS type, find and document:

- [ ] **Airtime Products Endpoint**
  - Path: `???`
  - Method: `GET`
  - Headers: `???`
  - Parameters: `???`

- [ ] **Data Products Endpoint**
  - Path: `???`
  - Method: `GET`
  - Headers: `???`
  - Parameters: `???`

- [ ] **Voucher Products Endpoint**
  - Path: `???`
  - Method: `GET`
  - Headers: `???`
  - Parameters: `???`

- [ ] **Bill Payment Products Endpoint**
  - Path: `???`
  - Method: `GET`
  - Headers: `???`
  - Parameters: `???`

- [ ] **Prepaid Utility Products Endpoint**
  - Path: `???`
  - Method: `GET`
  - Headers: `???`
  - Parameters: `???`

---

## 🎯 **Quick Test in Swagger**

1. **Authorize:** Click "Authorize" button in Swagger
2. **Enter Token:** Use your Bearer token from our auth service
3. **Try Endpoint:** Click "Try it out" on a GET products endpoint
4. **Execute:** Click "Execute" to see the actual response
5. **Copy Path:** Copy the exact endpoint path that works

---

## 💡 **Tips**

- Swagger UI shows the **exact path** in the endpoint description
- The path is usually shown as: `GET /api/v1/{vasType}/products`
- Full URL = Base URL + Path (e.g., `https://uat.fulcrumswitch.com/api/v1/airtime/products`)
- Check if there's a "Try it out" button to test endpoints directly in Swagger

---

**Once you find the paths, share them and we'll update the integration code!**

