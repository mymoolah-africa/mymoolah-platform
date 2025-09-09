# Product Variants System - Commission Logic

## How It Works

### MyMoolah Perspective (MyMoolah is the customer buying from suppliers)
- **MyMoolah pays supplier**: R10.00
- **MyMoolah receives**: R10.00 airtime
- **MyMoolah earns**: Commission from supplier
- **MyMoolah chooses**: Supplier with highest commission rate
- **MyMoolah goal**: Maximize earnings

## Example: MTN Airtime R10.00

### Product Definition
```sql
-- products table
id: 1
name: "MTN Airtime"
type: "airtime"
description: "MTN mobile airtime top-up"
```

### Variant 1: Flash
```sql
-- product_variants table
supplierId: 1 (Flash)
commissionRate: 3.0%
fees: R0.00

-- Calculation for R10.00 airtime:
MyMoolah pays Flash: R10.00
MyMoolah receives: R10.00 airtime
Flash pays MyMoolah commission: R0.30 (3.0%)
Flash keeps: R9.70
```

### Variant 2: MobileMart
```sql
-- product_variants table
supplierId: 2 (MobileMart)
commissionRate: 3.5%
fees: R0.50

-- Calculation for R10.00 airtime:
MyMoolah pays MobileMart: R10.00
MyMoolah receives: R10.00 airtime
MobileMart pays MyMoolah commission: R0.35 (3.5%)
MobileMart keeps: R9.65
```

## Selection Logic

### Step 1: Compare Commission Rates
- **Flash**: 3.0% commission = R0.30
- **MobileMart**: 3.5% commission = R0.35

### Step 2: Choose Highest Commission
- **Winner**: MobileMart (3.5% > 3.0%)
- **Reason**: MyMoolah earns R0.35 vs R0.30

### Step 3: Flash Preference (if same commission)
- **If commission rates are equal**: Choose Flash as preferred supplier
- **Example**: If both Flash and MobileMart offer 3.0% commission, choose Flash

### Step 4: MyMoolah Experience
```javascript
// MyMoolah sees:
{
  productName: "MTN Airtime",
  denomination: 1000, // R10.00
  myMoolahPays: 1000, // R10.00 (MyMoolah pays supplier)
  supplier: "MobileMart", // Automatically selected
  myMoolahEarnings: 35, // R0.35 commission
  myMoolahNetCost: 965 // R9.65 (R10.00 - R0.35 commission)
}
```

## API Response Example

```json
{
  "productId": 1,
  "productName": "MTN Airtime",
  "denomination": 1000,
  "bestVariant": {
    "variantId": 2,
    "supplier": {
      "id": 2,
      "name": "MobileMart",
      "code": "MOBILEMART"
    },
    "denomination": 1000, // R10.00 (MyMoolah pays supplier)
    "commissionRate": 3.5, // 3.5%
    "myMoolahCommission": 35, // R0.35 (supplier pays MyMoolah)
    "supplierKeeps": 965, // R9.65 (supplier keeps after commission)
    "myMoolahNetCost": 965, // R9.65 (R10.00 - R0.35 commission)
    "effectiveRate": 3.5 // Commission rate
  },
  "allVariants": [
    {
      "supplier": "MobileMart",
      "commissionRate": 3.5,
      "myMoolahCommission": 35
    },
    {
      "supplier": "Flash", 
      "commissionRate": 3.0,
      "myMoolahCommission": 30
    }
  ]
}
```

## Key Benefits

1. **MyMoolah gets same product**: R10.00 airtime regardless of supplier
2. **MyMoolah maximizes earnings**: Always chooses highest commission
3. **Flash preference**: If same commission, Flash is preferred supplier
4. **Supplier competition**: Suppliers compete on commission rates
5. **Automatic selection**: System picks best option for MyMoolah
6. **Clear cost structure**: MyMoolah knows exactly what they pay and earn

## Commission Tiers

Suppliers can offer volume-based commission tiers:

```json
{
  "commissionTiers": [
    {"minAmount": 1000, "maxAmount": 5000, "rate": 3.5},
    {"minAmount": 5001, "maxAmount": 20000, "rate": 3.0},
    {"minAmount": 20001, "maxAmount": 50000, "rate": 2.5}
  ]
}
```

This allows suppliers to offer better rates for higher volumes while MyMoolah still chooses the best option for each transaction.

## Flash Preference Example

### Scenario: Same Commission Rate
```sql
-- Flash Variant
commissionRate: 3.0%
myMoolahCommission: R0.30

-- MobileMart Variant  
commissionRate: 3.0% (same as Flash)
myMoolahCommission: R0.30 (same as Flash)
```

### Selection Logic:
1. **Commission rates are equal** (3.0% = 3.0%)
2. **Flash preference applies** (Flash is preferred supplier)
3. **Winner**: Flash (preferred over MobileMart)

### Result:
```javascript
{
  "bestVariant": {
    "supplier": "Flash",
    "commissionRate": 3.0,
    "myMoolahCommission": 30,
    "reason": "Flash preferred (same commission rate)"
  }
}
```
