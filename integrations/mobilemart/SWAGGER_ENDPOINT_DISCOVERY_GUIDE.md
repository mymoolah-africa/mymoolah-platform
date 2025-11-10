# Swagger UI - Finding Exact Endpoint Paths

**Swagger URL:** https://uat.fulcrumswitch.com/swagger

---

## 🎯 **Quick Guide: What to Look For**

### **In Swagger UI, you'll see:**

1. **Top Section:** Base URL (e.g., `https://uat.fulcrumswitch.com`)
2. **Main Section:** Grouped by VAS Types:
   - **Airtime** (expand this section)
   - **Data** (expand this section)
   - **Voucher** (expand this section)
   - **Bill Payment** (expand this section)
   - **Prepaid Utility** (expand this section)

### **For Each VAS Type Section:**

When you expand a section (e.g., "Airtime"), you'll see endpoints listed like:

```
📁 Airtime
  ├── GET    /api/v1/airtime/products      ← PRODUCTS ENDPOINT
  ├── POST   /api/v1/airtime/purchase      ← PURCHASE ENDPOINT
  ├── GET    /api/v1/airtime/reprint/{transactionId}
  └── POST   /api/v1/airtime/reverse
```

---

## 📋 **What to Copy**

For each VAS type, find and copy the **exact path** shown for the GET products endpoint:

### **Example Format:**
- `/api/v1/airtime/products`
- `/api/v1/data/products`
- `/api/v1/voucher/products`
- `/api/v1/billpayment/products`
- `/api/v1/prepaidutility/products`

**OR** it might be:
- `/airtime/products`
- `/data/products`
- etc.

---

## 🔍 **Step-by-Step Instructions**

1. **Open Swagger:** https://uat.fulcrumswitch.com/swagger

2. **Authorize (if needed):**
   - Click "Authorize" button (usually top right)
   - Enter: `Bearer {your_token}`
   - Or use the token from our auth service

3. **Find "Airtime" Section:**
   - Scroll or search for "Airtime"
   - Click to expand the section

4. **Locate GET Products Endpoint:**
   - Look for endpoint that says "GET" and "products"
   - The path will be shown like: `GET /api/v1/airtime/products`
   - **Copy this exact path** (e.g., `/api/v1/airtime/products`)

5. **Repeat for Other VAS Types:**
   - Data
   - Voucher
   - Bill Payment
   - Prepaid Utility

---

## 💡 **Visual Guide**

Swagger UI typically looks like this:

```
┌─────────────────────────────────────────┐
│ Swagger UI                               │
│ Base URL: https://uat.fulcrumswitch.com │
├─────────────────────────────────────────┤
│ 📁 Airtime                               │
│   GET  /api/v1/airtime/products    ← COPY THIS
│   POST /api/v1/airtime/purchase
│                                         │
│ 📁 Data                                 │
│   GET  /api/v1/data/products      ← COPY THIS
│   POST /api/v1/data/purchase
│                                         │
│ 📁 Voucher                              │
│   GET  /api/v1/voucher/products   ← COPY THIS
│   POST /api/v1/voucher/purchase
└─────────────────────────────────────────┘
```

---

## 📝 **What to Share**

Once you find them, share the exact paths like this:

```
Airtime Products: /api/v1/airtime/products
Data Products: /api/v1/data/products
Voucher Products: /api/v1/voucher/products
Bill Payment Products: /api/v1/billpayment/products
Prepaid Utility Products: /api/v1/prepaidutility/products
```

---

## 🧪 **Quick Test in Swagger**

1. Click on the GET products endpoint
2. Click "Try it out" button
3. Click "Execute"
4. Check if it returns JSON products (not HTML)

If it returns JSON, that's the correct path! ✅

---

**Once you share the exact paths, I'll update our integration code immediately!**

