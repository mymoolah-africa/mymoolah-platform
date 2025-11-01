# MyMoolah Portal Architecture - Production URLs

## 🎯 **PORTAL STRUCTURE**

You have **5 different portals** for different user types:

1. **Admin Portal** - Your internal team
2. **Supplier Portal** - Suppliers (Flash, MobileMart, etc.)
3. **Client Portal** - Enterprise clients (B2B)
4. **Merchant Portal** - Merchants/retailers
5. **Reseller Portal** - Resellers/distributors

---

## 🌐 **RECOMMENDED URL STRUCTURE**

### **Option 1: Separate Subdomains (RECOMMENDED)**

**Why**: Better security, easier management, clearer separation

```
https://admin.mymoolah.africa      → Admin Portal
https://supplier.mymoolah.africa   → Supplier Portal
https://client.mymoolah.africa     → Client Portal
https://merchant.mymoolah.africa   → Merchant Portal
https://reseller.mymoolah.africa   → Reseller Portal
```

**Advantages**:
- ✅ Each portal has its own URL
- ✅ Easier to manage access
- ✅ Better security (separate domains)
- ✅ Can add data-free access per portal
- ✅ Easier to monitor usage per portal

---

### **Option 2: Path-Based (Alternative)**

```
https://portal.mymoolah.africa/admin     → Admin Portal
https://portal.mymoolah.africa/supplier → Supplier Portal
https://portal.mymoolah.africa/client    → Client Portal
https://portal.mymoolah.africa/merchant → Merchant Portal
https://portal.mymoolah.africa/reseller  → Reseller Portal
```

**Advantages**:
- ✅ Single domain to manage
- ✅ Simpler SSL certificate
- ✅ Lower cost

**Disadvantages**:
- ❌ Less clear separation
- ❌ Harder to restrict access per portal
- ❌ More complex routing

---

## 🎯 **RECOMMENDATION: Separate Subdomains**

**Use this structure:**

```
https://admin.mymoolah.africa      → Admin Portal (Your Team)
https://supplier.mymoolah.africa   → Supplier Portal (Flash, MobileMart, etc.)
https://client.mymoolah.africa     → Client Portal (B2B Clients)
https://merchant.mymoolah.africa   → Merchant Portal (Merchants/Retailers)
https://reseller.mymoolah.africa   → Reseller Portal (Resellers/Distributors)
```

---

## 🏢 **PRODUCTION ARCHITECTURE**

### **How It Works:**

```
Google Cloud Platform
│
├── 🌐 Load Balancer
│   ├── Routes admin.mymoolah.africa → Admin Portal
│   ├── Routes supplier.mymoolah.africa → Supplier Portal
│   ├── Routes client.mymoolah.africa → Client Portal
│   ├── Routes merchant.mymoolah.africa → Merchant Portal
│   └── Routes reseller.mymoolah.africa → Reseller Portal
│
├── 🖥️ Portal Servers
│   ├── Admin Portal (Port 3003)
│   ├── Supplier Portal (Port 3004)
│   ├── Client Portal (Port 3005)
│   ├── Merchant Portal (Port 3006)
│   └── Reseller Portal (Port 3007)
│
└── 🔌 Backend API (Shared)
    └── api.mymoolah.africa (Port 3001)
        └── All portals use the same backend API
```

---

## 🔐 **ACCESS CONTROL**

### **Admin Portal (admin.mymoolah.africa)**
- **Who**: Your internal MyMoolah team
- **Access**: Full system access
- **Can Manage**:
  - All users
  - All suppliers
  - All clients
  - All merchants
  - All resellers
  - System configuration
  - Reports and analytics

### **Supplier Portal (supplier.mymoolah.africa)**
- **Who**: Suppliers (Flash, MobileMart, Zapper, etc.)
- **Access**: Their own data only
- **Can Manage**:
  - Their products
  - Their transactions
  - Their float account
  - Their commissions
  - Their performance reports

### **Client Portal (client.mymoolah.africa)**
- **Who**: Enterprise clients (B2B)
- **Access**: Their company data only
- **Can Manage**:
  - Their employees
  - Their usage
  - Their float account
  - Their service configuration
  - Their reports

### **Merchant Portal (merchant.mymoolah.africa)**
- **Who**: Merchants/retailers
- **Access**: Their merchant data only
- **Can Manage**:
  - Their sales
  - Their payments
  - Their commissions
  - Their performance

### **Reseller Portal (reseller.mymoolah.africa)**
- **Who**: Resellers/distributors
- **Access**: Their reseller data only
- **Can Manage**:
  - Their clients
  - Their performance
  - Their commissions
  - Their targets

---

## 📱 **DATA-FREE ACCESS**

### **All Portals Can Be Data-Free**

**Setup**:
1. Partner with data-free provider
2. Whitelist all portal URLs:
   - `*.mymoolah.africa` (covers all subdomains)
   - Or individually:
     - `admin.mymoolah.africa`
     - `supplier.mymoolah.africa`
     - `client.mymoolah.africa`
     - `merchant.mymoolah.africa`
     - `reseller.mymoolah.africa`

**Benefits**:
- ✅ Suppliers can access their portal data-free
- ✅ Clients can manage their accounts data-free
- ✅ Merchants can monitor sales data-free
- ✅ Better user experience

---

## 💰 **COST IMPACT**

### **Additional Costs:**

**Phase 1 (Start Small)**:
- **Portals**: All portals share the same backend API (no extra cost)
- **Frontend Servers**: Add 1-2 portal servers = **+$50-100/month**
- **Total**: Still ~$180-280/month

**Phase 2+ (Growing)**:
- **Portals**: Each portal can have its own server (optional)
- **Or**: All portals share servers (lower cost)
- **Cost**: Depends on your choice

**Recommendation**: Start with portals sharing servers, separate later if needed.

---

## 🎯 **ANSWER TO YOUR QUESTION**

### **Do You Need a "Master Portal" URL?**

**Answer**: **NO** - Use separate subdomains instead:

- ✅ **Better**: `admin.mymoolah.africa` (Admin Portal manages everything)
- ❌ **Not Needed**: `master.mymoolah.africa` or `portal.mymoolah.africa`

### **Why Admin Portal is the "Master":**

The **Admin Portal** (`admin.mymoolah.africa`) is your "master portal" because:

1. **Full Access**: Can manage all other portals
2. **Central Control**: Controls suppliers, clients, merchants, resellers
3. **System Management**: Manages the entire platform
4. **Monitoring**: Sees all activity across all portals

### **Other Portals Are "Limited":**

- **Supplier Portal**: Only sees their own data
- **Client Portal**: Only sees their company data
- **Merchant Portal**: Only sees their merchant data
- **Reseller Portal**: Only sees their reseller data

---

## 📋 **PRODUCTION URL SUMMARY**

### **Customer-Facing:**
- `https://www.mymoolah.africa` - Main website
- `https://app.mymoolah.africa` - Customer wallet app

### **Admin & Partners:**
- `https://admin.mymoolah.africa` - Admin Portal (master control)
- `https://supplier.mymoolah.africa` - Supplier Portal
- `https://client.mymoolah.africa` - Client Portal
- `https://merchant.mymoolah.africa` - Merchant Portal
- `https://reseller.mymoolah.africa` - Reseller Portal

### **Backend API:**
- `https://api.mymoolah.africa` - Backend API (all portals use this)

---

## ✅ **FINAL RECOMMENDATION**

**Structure**:
- ✅ **Admin Portal** = Your "master portal" (`admin.mymoolah.africa`)
- ✅ **Separate URLs** for each portal type
- ✅ **All portals** use the same backend API
- ✅ **Admin Portal** can manage everything

**No need for a separate "master portal" URL** - the Admin Portal IS the master portal! 🎯

---

**This keeps things simple, secure, and scalable!** 🚀

