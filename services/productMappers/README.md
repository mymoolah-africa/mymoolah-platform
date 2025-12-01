# Product Mappers - MyMoolah Treasury Platform

## Overview

Product Mappers are responsible for transforming supplier-specific API responses into our **normalized ProductVariant schema**. This ensures consistent data structure across all suppliers while preserving supplier-specific details in metadata JSONB fields.

## Architecture

```
Supplier API Response → Product Mapper → Normalized ProductVariant
```

### Normalized Schema Benefits:
- ✅ **No schema drift** between environments
- ✅ **Easy cross-supplier comparison** (e.g., Flash MTN vs MobileMart MTN)
- ✅ **Easy to add new suppliers** (no new tables required)
- ✅ **API changes don't break schema** (stored in metadata JSONB)
- ✅ **Consistent business logic** across all suppliers

---

## Available Mappers

### 1. FlashProductMapper
Maps Flash API product responses to ProductVariant schema.

**Usage:**
```javascript
const FlashProductMapper = require('./services/productMappers/flashProductMapper');

const mapper = new FlashProductMapper();

// Sync single product
const productVariant = await mapper.syncProductVariant(flashApiResponse);

// Bulk sync products
const results = await mapper.bulkSyncProducts(flashApiResponseArray);
```

**Flash-Specific Fields Stored in Metadata:**
- `flash_product_code` - Original Flash product code
- `flash_category` - Flash category
- `flash_original_response` - Complete Flash API response
- `flash_last_updated` - Last sync timestamp

---

### 2. MobileMartProductMapper
Maps MobileMart API product responses to ProductVariant schema.

**Usage:**
```javascript
const MobileMartProductMapper = require('./services/productMappers/mobilemartProductMapper');

const mapper = new MobileMartProductMapper();

// Sync single product
const productVariant = await mapper.syncProductVariant(mobilemartApiResponse);

// Bulk sync products
const results = await mapper.bulkSyncProducts(mobilemartApiResponseArray);
```

**MobileMart-Specific Fields Stored in Metadata:**
- `mobilemart_merchant_product_id` - Original MobileMart product ID
- `mobilemart_vas_type` - MobileMart VAS type
- `mobilemart_network_type` - MobileMart network type
- `mobilemart_original_response` - Complete MobileMart API response
- `mobilemart_last_updated` - Last sync timestamp

---

## ProductVariant Schema

All mappers output to this normalized schema:

```javascript
{
  // Core fields
  productId: number,
  supplierId: number,
  supplierProductId: string,
  
  // VAS fields
  vasType: enum('airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'gaming', 'streaming', 'cash_out'),
  transactionType: enum('voucher', 'topup', 'direct', 'instant'),
  networkType: enum('local', 'international'),
  provider: string, // MTN, Vodacom, Eskom, etc.
  
  // Amount constraints
  minAmount: number, // cents
  maxAmount: number, // cents
  predefinedAmounts: jsonb, // [100, 500, 1000, 2000, 5000]
  
  // Commission and fees
  commission: decimal(5,2), // percentage
  fixedFee: number, // cents
  
  // Promotional
  isPromotional: boolean,
  promotionalDiscount: decimal(5,2), // percentage
  
  // Priority and status
  priority: number, // 1 = highest priority
  status: enum('active', 'inactive', 'discontinued', 'maintenance'),
  
  // Metadata (JSONB - supplier-specific fields)
  metadata: {
    supplier_specific_field: value,
    original_response: {},
    last_updated: timestamp
  },
  
  // Tracking
  lastSyncedAt: timestamp
}
```

---

## Adding a New Supplier Mapper

To add a new supplier (e.g., Zapper):

1. **Create mapper file:** `zapperProductMapper.js`

2. **Implement mapper class:**
   ```javascript
   class ZapperProductMapper {
       constructor() {
           this.supplierCode = 'ZAPPER';
           this.supplierName = 'Zapper';
       }

       mapToProductVariant(zapperProduct, supplierId, productId) {
           // Map Zapper API response to ProductVariant schema
           return {
               productId,
               supplierId,
               supplierProductId: zapperProduct.id,
               vasType: this.mapVasType(zapperProduct.type),
               // ... other fields ...
               metadata: {
                   zapper_original_response: zapperProduct,
                   zapper_last_updated: new Date()
               }
           };
       }

       async syncProductVariant(zapperProduct) {
           // Create/update ProductVariant
       }

       async bulkSyncProducts(zapperProducts) {
           // Bulk sync
       }
   }
   ```

3. **Update supplierComparisonService** to include Zapper:
   ```javascript
   const zapperProducts = allProducts.filter(p => p.supplier && p.supplier.code === 'ZAPPER');
   ```

4. **No database migrations required!** The normalized schema already supports it.

---

## Testing

Test your mapper before deploying:

```javascript
// Test Flash mapper
const FlashProductMapper = require('./services/productMappers/flashProductMapper');
const mapper = new FlashProductMapper();

const mockFlashProduct = {
    productCode: 12345,
    productName: "MTN Airtime",
    category: "airtime",
    provider: "MTN",
    minAmount: 500,
    maxAmount: 100000,
    commission: 2.5,
    isActive: true
};

const variant = await mapper.syncProductVariant(mockFlashProduct);
console.log(variant);
```

---

## Migration from Legacy Tables

If you have existing supplier-specific tables (`flash_products`, `mobilemart_products`):

1. Run the consolidation migration: `20251201_consolidate_to_normalized_product_schema.js`
2. Use mappers to sync products to new schema
3. Test thoroughly
4. Drop legacy tables when confident

---

## Best Practices

1. **Always store original API response** in metadata for debugging
2. **Use standard enums** for vasType, transactionType, networkType
3. **Map supplier-specific values** to standard values (e.g., Flash "cellular" → "airtime")
4. **Handle errors gracefully** in bulk sync operations
5. **Log sync operations** for auditing
6. **Update lastSyncedAt** on every sync

---

## Support

For questions or issues, contact the MyMoolah Development Team.

**Version:** 1.0.0  
**Last Updated:** 2025-12-01
