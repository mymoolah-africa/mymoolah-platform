/**
 * Flash Product Mapper - MyMoolah Treasury Platform
 * 
 * Maps Flash API product responses to normalized ProductVariant schema
 * Handles Flash-specific fields and stores them in metadata JSONB
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 * @date 2025-12-01
 */

const { Product, ProductVariant, Supplier } = require('../../models');

class FlashProductMapper {
    constructor() {
        this.supplierCode = 'FLASH';
        this.supplierName = 'Flash';
    }

    /**
     * Map Flash API product response to ProductVariant schema
     * 
     * Flash API Response Example:
     * {
     *   productCode: 12345,
     *   productName: "MTN Airtime",
     *   category: "airtime",
     *   provider: "MTN",
     *   minAmount: 500, // cents
     *   maxAmount: 100000, // cents
     *   commission: 2.5, // percentage
     *   isActive: true,
     *   metadata: { ... }
     * }
     * 
     * @param {Object} flashProduct - Flash API product response
     * @param {number} supplierId - Supplier ID from database
     * @param {number} productId - Product ID from database
     * @returns {Object} ProductVariant data ready for insert/update
     */
    mapToProductVariant(flashProduct, supplierId, productId) {
        // Map Flash category to standard vasType
        const vasType = this.mapCategoryToVasType(flashProduct.category);

        // Extract transaction type based on category
        const transactionType = this.determineTransactionType(flashProduct.category, flashProduct.metadata);

        return {
            productId: productId,
            supplierId: supplierId,
            supplierProductId: flashProduct.productCode.toString(),
            
            // VAS fields
            vasType: vasType,
            transactionType: transactionType,
            networkType: 'local', // Flash is primarily local
            provider: flashProduct.provider,
            
            // Amount constraints
            minAmount: flashProduct.minAmount || 500, // Default R5
            maxAmount: flashProduct.maxAmount || 100000, // Default R1000
            predefinedAmounts: null, // Flash typically uses ranges, not predefined amounts
            
            // Commission and fees
            commission: flashProduct.commission || 0,
            fixedFee: 0, // Flash uses percentage commission, not fixed fee
            
            // Promotional
            isPromotional: flashProduct.isPromotional || false,
            promotionalDiscount: flashProduct.promotionalDiscount || null,
            
            // Priority and status
            priority: 1, // Flash is priority 1 (primary supplier)
            status: flashProduct.isActive ? 'active' : 'inactive',
            
            // Denominations (Flash uses ranges, so we'll set this to null)
            denominations: null,
            
            // Pricing structure
            pricing: {
                defaultCommissionRate: flashProduct.commission || 0,
                commissionTiers: [],
                fees: {}
            },
            
            // Constraints
            constraints: {
                minAmount: flashProduct.minAmount || 500,
                maxAmount: flashProduct.maxAmount || 100000
            },
            
            // Metadata (store Flash-specific fields)
            metadata: {
                flash_product_code: flashProduct.productCode,
                flash_category: flashProduct.category,
                flash_original_response: flashProduct,
                flash_last_updated: new Date().toISOString()
            },
            
            // Tracking
            lastSyncedAt: new Date(),
            sortOrder: 0,
            isPreferred: flashProduct.isPromotional || false
        };
    }

    /**
     * Map Flash category to standard vasType enum
     * @param {string} flashCategory - Flash API category
     * @returns {string} Standard vasType
     */
    mapCategoryToVasType(flashCategory) {
        const mapping = {
            'airtime': 'airtime',
            'data': 'data',
            'electricity': 'electricity',
            'voucher': 'voucher',
            'bill_payment': 'bill_payment',
            'gaming': 'gaming',
            'streaming': 'streaming'
        };

        return mapping[flashCategory.toLowerCase()] || 'voucher';
    }

    /**
     * Determine transaction type based on Flash product category
     * @param {string} category - Flash product category
     * @param {Object} metadata - Flash product metadata
     * @returns {string} Transaction type
     */
    determineTransactionType(category, metadata = {}) {
        // Flash typically uses direct topups for airtime/data
        // and vouchers for gaming/streaming
        const directCategories = ['airtime', 'data', 'electricity', 'bill_payment'];
        const voucherCategories = ['voucher', 'gaming', 'streaming'];

        if (directCategories.includes(category.toLowerCase())) {
            return 'direct';
        } else if (voucherCategories.includes(category.toLowerCase())) {
            return 'voucher';
        }

        // Default to topup
        return 'topup';
    }

    /**
     * Create or update ProductVariant from Flash product
     * @param {Object} flashProduct - Flash API product response
     * @returns {Object} Created/updated ProductVariant
     */
    async syncProductVariant(flashProduct) {
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

            // Get or create product (base product)
            // In production, you'd have proper product management
            // For now, we'll use a simple name-based lookup
            const [product] = await Product.findOrCreate({
                where: {
                    name: flashProduct.productName,
                    type: this.mapCategoryToVasType(flashProduct.category)
                },
                defaults: {
                    name: flashProduct.productName,
                    type: this.mapCategoryToVasType(flashProduct.category),
                    supplierProductId: flashProduct.productCode.toString(),
                    denominations: [], // Flash uses ranges
                    status: 'active',
                    isFeatured: false,
                    sortOrder: 0,
                    metadata: {
                        source: 'flash',
                        synced: true
                    }
                }
            });

            // Map to ProductVariant
            const variantData = this.mapToProductVariant(flashProduct, supplier.id, product.id);

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

            console.log(`✅ ${created ? 'Created' : 'Updated'} ProductVariant for Flash product: ${flashProduct.productName}`);

            return productVariant;

        } catch (error) {
            console.error(`❌ Flash Product Mapper: Error syncing product ${flashProduct.productCode}:`, error.message);
            throw error;
        }
    }

    /**
     * Bulk sync multiple Flash products
     * @param {Array} flashProducts - Array of Flash API product responses
     * @returns {Object} Sync results
     */
    async bulkSyncProducts(flashProducts) {
        const results = {
            total: flashProducts.length,
            created: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        for (const flashProduct of flashProducts) {
            try {
                const variant = await this.syncProductVariant(flashProduct);
                if (variant._options.isNewRecord) {
                    results.created++;
                } else {
                    results.updated++;
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    productCode: flashProduct.productCode,
                    error: error.message
                });
            }
        }

        console.log(`📊 Flash Product Sync Complete: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);

        return results;
    }
}

module.exports = FlashProductMapper;
