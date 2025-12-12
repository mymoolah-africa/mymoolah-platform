/**
 * MobileMart Product Mapper - MyMoolah Treasury Platform
 * 
 * Maps MobileMart API product responses to normalized ProductVariant schema
 * Handles MobileMart-specific fields and stores them in metadata JSONB
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 * @date 2025-12-01
 */

const { Product, ProductVariant, Supplier, ProductBrand } = require('../../models');

class MobileMartProductMapper {
    constructor() {
        this.supplierCode = 'MOBILEMART';
        this.supplierName = 'MobileMart';
    }

    normalizeProductType(vasType) {
        const t = (vasType || '').toLowerCase();
        if (t === 'bill-payment' || t === 'billpayment') return 'bill_payment';
        if (t === 'prepaidutility' || t === 'utility' || t === 'prepaid-utility') return 'electricity';
        return t; // airtime, data, voucher, etc.
    }

    getBrandCategory(vasType) {
        const t = (vasType || '').toLowerCase();
        if (t === 'voucher') return 'entertainment';
        if (t === 'airtime' || t === 'data' || t === 'electricity' || t === 'bill_payment') return 'utilities';
        return 'other';
    }

    async ensureBrand(brandName, vasType) {
        const name = (brandName || 'MobileMart').trim();
        const category = this.getBrandCategory(vasType);
        const [brand] = await ProductBrand.findOrCreate({
            where: { name },
            defaults: {
                name,
                category,
                isActive: true,
                metadata: { source: 'mobilemart' }
            }
        });
        return brand;
    }

    /**
     * Map MobileMart API product response to ProductVariant schema
     * 
     * MobileMart API Response Example:
     * {
     *   merchantProductId: "MM-12345",
     *   productName: "MTN Airtime",
     *   vasType: "airtime",
     *   provider: "MTN",
     *   minAmount: 500, // cents
     *   maxAmount: 100000, // cents
     *   commission: 2.0, // percentage
     *   isPromotional: true,
     *   promotionalDiscount: 5.0,
     *   isActive: true,
     *   metadata: { ... }
     * }
     * 
     * @param {Object} mobilemartProduct - MobileMart API product response
     * @param {number} supplierId - Supplier ID from database
     * @param {number} productId - Product ID from database
     * @returns {Object} ProductVariant data ready for insert/update
     */
    mapToProductVariant(mobilemartProduct, supplierId, productId) {
        // MobileMart already uses standard vasType
        const vasType = mobilemartProduct.vasType;

        // Extract transaction type
        const transactionType = this.determineTransactionType(mobilemartProduct.vasType, mobilemartProduct.metadata);

        return {
            productId: productId,
            supplierId: supplierId,
            supplierProductId: mobilemartProduct.merchantProductId.toString(),
            
            // VAS fields
            vasType: vasType,
            transactionType: transactionType,
            networkType: mobilemartProduct.networkType || 'local',
            provider: mobilemartProduct.provider,
            
            // Amount constraints
            minAmount: mobilemartProduct.minAmount || 500, // Default R5
            maxAmount: mobilemartProduct.maxAmount || 100000, // Default R1000
            predefinedAmounts: mobilemartProduct.predefinedAmounts || null,
            
            // Commission and fees
            commission: mobilemartProduct.commission || 0,
            fixedFee: mobilemartProduct.fixedFee || 0,
            
            // Promotional
            isPromotional: mobilemartProduct.isPromotional || false,
            promotionalDiscount: mobilemartProduct.promotionalDiscount || null,
            
            // Priority and status
            priority: 2, // MobileMart is priority 2 (secondary supplier)
            status: mobilemartProduct.isActive ? 'active' : 'inactive',
            
            // Denominations
            denominations: mobilemartProduct.predefinedAmounts || null,
            
            // Pricing structure
            pricing: {
                defaultCommissionRate: mobilemartProduct.commission || 0,
                commissionTiers: [],
                fees: mobilemartProduct.fixedFee ? { fixed: mobilemartProduct.fixedFee } : {}
            },
            
            // Constraints
            constraints: {
                minAmount: mobilemartProduct.minAmount || 500,
                maxAmount: mobilemartProduct.maxAmount || 100000
            },
            
            // Metadata (store MobileMart-specific fields)
            metadata: {
                mobilemart_merchant_product_id: mobilemartProduct.merchantProductId,
                mobilemart_vas_type: mobilemartProduct.vasType,
                mobilemart_network_type: mobilemartProduct.networkType,
                mobilemart_original_response: mobilemartProduct,
                mobilemart_last_updated: new Date().toISOString()
            },
            
            // Tracking
            lastSyncedAt: new Date(),
            sortOrder: 0,
            isPreferred: mobilemartProduct.isPromotional || false
        };
    }

    /**
     * Determine transaction type based on MobileMart product vasType
     * @param {string} vasType - MobileMart VAS type
     * @param {Object} metadata - MobileMart product metadata
     * @returns {string} Transaction type
     */
    determineTransactionType(vasType, metadata = {}) {
        // MobileMart transaction type logic
        const directTypes = ['airtime', 'data', 'electricity', 'bill_payment'];
        const voucherTypes = ['voucher', 'gaming', 'streaming'];

        if (directTypes.includes(vasType.toLowerCase())) {
            return 'direct';
        } else if (voucherTypes.includes(vasType.toLowerCase())) {
            return 'voucher';
        }

        // Check metadata for specific transaction type
        if (metadata && metadata.transactionType) {
            return metadata.transactionType;
        }

        // Default to topup
        return 'topup';
    }

    /**
     * Create or update ProductVariant from MobileMart product
     * @param {Object} mobilemartProduct - MobileMart API product response
     * @returns {Object} Created/updated ProductVariant
     */
    async syncProductVariant(mobilemartProduct) {
        try {
            // Get or create supplier
            const [supplier] = await Supplier.findOrCreate({
                where: { code: this.supplierCode },
                defaults: {
                    name: this.supplierName,
                    code: this.supplierCode,
                    isActive: true
                }
            });

            // Normalize product type to match our enum
            const normalizedType = this.normalizeProductType(mobilemartProduct.vasType);

            // Ensure brand (use contentCreator if provided, else productName)
            const brand = await this.ensureBrand(
                mobilemartProduct.contentCreator || mobilemartProduct.productName || this.supplierName,
                normalizedType
            );

            if (!supplier || !supplier.id) {
                throw new Error('Supplier ID is required (MobileMart)');
            }
            if (!brand || !brand.id) {
                throw new Error('Brand ID is required (MobileMart)');
            }

            // Build denominations fallback for safety
            const denominations =
                mobilemartProduct.predefinedAmounts ||
                (mobilemartProduct.fixedAmount && mobilemartProduct.amount ? [mobilemartProduct.amount] : null) ||
                [mobilemartProduct.minAmount || 500];

            // Get or create product (base product)
            const [product] = await Product.findOrCreate({
                where: {
                    supplierId: supplier.id,
                    name: mobilemartProduct.productName,
                    type: normalizedType
                },
                defaults: {
                    supplierId: supplier.id,
                    brandId: brand.id,
                    name: mobilemartProduct.productName,
                    type: normalizedType,
                    supplierProductId: mobilemartProduct.merchantProductId.toString(),
                    denominations,
                    status: 'active',
                    isFeatured: mobilemartProduct.isPromotional || false,
                    sortOrder: 0,
                    metadata: {
                        source: 'mobilemart',
                        synced: true
                    }
                }
            });

            // Ensure product has required foreign keys if it pre-existed
            const updateFields = {};
            if (!product.brandId) updateFields.brandId = brand.id;
            if (!product.supplierId) updateFields.supplierId = supplier.id;
            if (!product.supplierProductId) updateFields.supplierProductId = mobilemartProduct.merchantProductId.toString();
            if (product.type !== normalizedType) updateFields.type = normalizedType;
            if (!product.denominations || !Array.isArray(product.denominations) || product.denominations.length === 0) {
                updateFields.denominations = denominations;
            }
            if (Object.keys(updateFields).length > 0) {
                await product.update(updateFields);
            }

            // Map to ProductVariant
            const variantData = this.mapToProductVariant(
                { ...mobilemartProduct, vasType: normalizedType },
                supplier.id,
                product.id
            );

            // Create or update ProductVariant
            const [productVariant, created] = await ProductVariant.findOrCreate({
                where: {
                    productId: product.id,
                    supplierId: supplier.id
                },
                defaults: variantData
            });

            if (!created) {
                // Update existing variant
                await productVariant.update(variantData);
            }

            console.log(`✅ ${created ? 'Created' : 'Updated'} ProductVariant for MobileMart product: ${mobilemartProduct.productName}`);

            return productVariant;

        } catch (error) {
            console.error(`❌ MobileMart Product Mapper: Error syncing product ${mobilemartProduct.merchantProductId}:`, error.message);
            throw error;
        }
    }

    /**
     * Bulk sync multiple MobileMart products
     * @param {Array} mobilemartProducts - Array of MobileMart API product responses
     * @returns {Object} Sync results
     */
    async bulkSyncProducts(mobilemartProducts) {
        const results = {
            total: mobilemartProducts.length,
            created: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        for (const mobilemartProduct of mobilemartProducts) {
            try {
                const variant = await this.syncProductVariant(mobilemartProduct);
                if (variant._options.isNewRecord) {
                    results.created++;
                } else {
                    results.updated++;
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    merchantProductId: mobilemartProduct.merchantProductId,
                    error: error.message
                });
            }
        }

        console.log(`📊 MobileMart Product Sync Complete: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);

        return results;
    }
}

module.exports = MobileMartProductMapper;
