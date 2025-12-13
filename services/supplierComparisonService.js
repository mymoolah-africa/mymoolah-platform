/**
 * Supplier Comparison Service - MyMoolah Treasury Platform
 * 
 * AI-powered service to compare deals and promotional offers from multiple suppliers
 * Uses normalized product_variants schema for consistent cross-supplier comparison
 * 
 * @author MyMoolah Development Team
 * @version 2.0.0 - Migrated to normalized schema
 */

const { ProductVariant, Product, Supplier } = require('../models');
const { Op } = require('sequelize');

class SupplierComparisonService {
    constructor() {
        this.suppliers = {
            flash: {
                name: 'Flash',
                priority: 1 // Preferred supplier on ties
            },
            mobilemart: {
                name: 'MobileMart',
                priority: 2
            }
            // New suppliers can be added here with a priority to break ties.
        };
        
    
    }

    /**
     * Compare products across suppliers for a specific VAS type
     * @param {string} vasType - Type of VAS (airtime, data, electricity, etc.)
     * @param {number} amount - Amount in cents
     * @param {string} provider - Specific provider (MTN, Vodacom, etc.)
     * @returns {Object} Comparison results with best deals
     */
    async compareProducts(vasType, amount = null, provider = null) {
        try {
            const comparison = {
                vasType,
                amount,
                provider,
                timestamp: new Date().toISOString(),
                suppliers: {},
                bestDeals: [],
                promotionalOffers: [],
                recommendations: []
            };

            // Get products from all suppliers using normalized schema
            const allProducts = await this.getProductVariants(vasType, amount, provider);

            // Group by supplier dynamically (supports new suppliers without code changes)
            const groupedBySupplier = {};
            for (const p of allProducts) {
                const codeRaw = p.supplier?.code || 'UNKNOWN';
                const code = codeRaw.toLowerCase();
                if (!groupedBySupplier[code]) {
                    groupedBySupplier[code] = [];
                }
                groupedBySupplier[code].push(p);
            }

            // Build supplier summaries for known suppliers (ensure keys always exist)
            for (const [knownCode, supMeta] of Object.entries(this.suppliers)) {
                const products = groupedBySupplier[knownCode] || [];
                comparison.suppliers[knownCode] = {
                    name: supMeta.name || knownCode,
                    priority: supMeta.priority ?? 999,
                    productCount: products.length,
                    products: products.map(p => this.formatProductForResponse(p))
                };
            }

            // Include any additional suppliers not in the known list
            for (const [code, products] of Object.entries(groupedBySupplier)) {
                if (comparison.suppliers[code]) continue;
                comparison.suppliers[code] = {
                    name: code,
                    priority: 999,
                    productCount: products.length,
                    products: products.map(p => this.formatProductForResponse(p))
                };
            }

            // Find best deals across all suppliers
            comparison.bestDeals = this.findBestDeals(Object.values(groupedBySupplier), amount);
            
            // Find promotional offers across all suppliers
            comparison.promotionalOffers = this.findPromotionalOffers(Object.values(groupedBySupplier));
            
            // Generate AI recommendations
            comparison.recommendations = this.generateRecommendations(comparison);

            return comparison;

        } catch (error) {
            console.error('❌ Supplier Comparison Service: Error comparing products:', error.message);
            throw new Error(`Failed to compare products: ${error.message}`);
        }
    }

    /**
     * Get product variants from normalized schema
     * @param {string} vasType - Type of VAS (airtime, data, electricity, etc.)
     * @param {number} amount - Amount in cents
     * @param {string} provider - Specific provider (MTN, Vodacom, etc.)
     * @returns {Array} Product variants matching criteria
     */
    async getProductVariants(vasType, amount = null, provider = null) {
        const whereClause = {
            status: 'active'
        };

        // Filter by product type (source of truth) instead of variant vasType enum
        const productWhere = vasType ? { type: vasType } : {};

        if (provider) {
            whereClause.provider = provider;
        }

        if (amount) {
            whereClause.minAmount = { [Op.lte]: amount };
            whereClause.maxAmount = { [Op.gte]: amount };
        }

        return await ProductVariant.findAll({
            where: whereClause,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'type', 'status'],
                    where: productWhere
                },
                {
                    model: Supplier,
                    as: 'supplier',
                    attributes: ['id', 'name', 'code', 'isActive']
                }
            ],
            order: [['commission', 'DESC'], ['isPromotional', 'DESC'], ['priority', 'ASC']]
        });
    }

    /**
     * Format product variant for API response
     * @param {Object} productVariant - Sequelize ProductVariant instance
     * @returns {Object} Formatted product for response
     */
    formatProductForResponse(productVariant) {
        const pv = productVariant.toJSON ? productVariant.toJSON() : productVariant;
        
        return {
            id: pv.id,
            productId: pv.productId,
            productName: pv.product ? pv.product.name : 'Unknown Product',
            supplierProductId: pv.supplierProductId,
            supplier: pv.supplier ? pv.supplier.name : 'Unknown Supplier',
            supplierCode: pv.supplier ? pv.supplier.code : null,
            vasType: pv.vasType,
            transactionType: pv.transactionType,
            provider: pv.provider,
            minAmount: pv.minAmount,
            maxAmount: pv.maxAmount,
            predefinedAmounts: pv.predefinedAmounts,
            commission: pv.commission,
            fixedFee: pv.fixedFee,
            isPromotional: pv.isPromotional,
            promotionalDiscount: pv.promotionalDiscount,
            priority: pv.priority,
            status: pv.status,
            metadata: pv.metadata
        };
    }

    /**
     * Map VAS types between suppliers
     */
    mapVasType(vasType, supplier) {
        const mappings = {
            'airtime': {
                flash: 'airtime',
                mobilemart: 'airtime'
            },
            'data': {
                flash: 'data',
                mobilemart: 'data'
            },
            'electricity': {
                flash: 'electricity',
                mobilemart: 'electricity'
            },
            'bill_payment': {
                flash: 'bill_payment',
                mobilemart: 'bill_payment'
            },
            'voucher': {
                flash: 'voucher',
                mobilemart: 'voucher'
            },
            'gaming': {
                flash: 'gaming',
                mobilemart: 'gaming'
            },
            'streaming': {
                flash: 'streaming',
                mobilemart: 'streaming'
            }
        };

        return mappings[vasType]?.[supplier] || vasType;
    }

    /**
     * Find best deals across suppliers
     */
    findBestDeals(groupedProducts, amount) {
        const allProducts = [];
        for (const group of groupedProducts) {
            allProducts.push(...group.map(p => this.formatProductForResponse(p)));
        }

        const getUserPrice = (p) => {
            if (Array.isArray(p.predefinedAmounts) && p.predefinedAmounts.length > 0) {
                return Math.min(...p.predefinedAmounts);
            }
            return p.minAmount ?? Number.POSITIVE_INFINITY;
        };

        // Group by logical product. For vouchers (or likely vouchers), normalize by name to avoid dup suppliers.
        const byProduct = new Map();
        for (const p of allProducts) {
            const pType = (p.productType || p.type || p.serviceType || p.vasType || '').toLowerCase();
            let nameKey = (p.productName || p.name || '').trim().toLowerCase();
            
            // Strip denomination suffixes and "voucher" for better deduplication
            // e.g., "Hollywood Bets R10" -> "hollywood bets", "Hollywood Bets Voucher" -> "hollywood bets"
            const originalName = nameKey;
            nameKey = nameKey
                .replace(/\s+r\d+$/i, '')           // Remove trailing " R10", " R100", etc.
                .replace(/\s+r\d+k$/i, '')          // Remove " R10K" style
                .replace(/\s+\d+\s*rands?$/i, '')   // Remove " 100 rand"
                .replace(/\s+voucher$/i, '')        // Remove trailing " Voucher"
                .replace(/\s+gift\s+card$/i, '')    // Remove trailing " Gift Card"
                .trim();
            
            if (originalName !== nameKey && originalName.includes('hollywood')) {
                console.log(`🔍 [Dedup] Normalized "${originalName}" -> "${nameKey}"`);
            }
            
            const baseKey = p.productId ?? p.productName ?? p.name ?? p.id;
            const likelyVoucher = pType === 'voucher' || nameKey.includes('gift card') || nameKey.includes('voucher');
            const key = likelyVoucher && nameKey ? `voucher:${nameKey}` : baseKey;
            if (!byProduct.has(key)) byProduct.set(key, []);
            byProduct.get(key).push(p);
        }

        const bestPerProduct = [];
        for (const variants of byProduct.values()) {
            variants.sort((a, b) => {
                // 1) Commission desc
                if ((b.commission || 0) !== (a.commission || 0)) {
                    return (b.commission || 0) - (a.commission || 0);
                }
                // 2) User price asc
                const priceA = getUserPrice(a);
                const priceB = getUserPrice(b);
                if (priceA !== priceB) {
                    return priceA - priceB;
                }
                // 3) Preferred supplier priority (lower number = higher preference)
                const prioA = this.suppliers[a.supplierCode?.toLowerCase()]?.priority ?? 999;
                const prioB = this.suppliers[b.supplierCode?.toLowerCase()]?.priority ?? 999;
                return prioA - prioB;
            });
            bestPerProduct.push(variants[0]);
        }

        // Return all best picks (no slicing)
        return bestPerProduct;
    }

    /**
     * Find promotional offers across suppliers
     */
    findPromotionalOffers(groupedProducts) {
        const allProducts = [];
        for (const group of groupedProducts) {
            allProducts.push(...group.map(p => this.formatProductForResponse(p)));
        }

        const promotionalProducts = allProducts.filter(p => p.isPromotional);

        // Sort by promotional discount (higher is better)
        promotionalProducts.sort((a, b) => (b.promotionalDiscount || 0) - (a.promotionalDiscount || 0));

        return promotionalProducts;
    }

    /**
     * Generate AI-powered recommendations
     */
    generateRecommendations(comparison) {
        const recommendations = [];

        // Best value recommendation
        if (comparison.bestDeals.length > 0) {
            const bestDeal = comparison.bestDeals[0];
            recommendations.push({
                type: 'best_value',
                title: 'Best Value Deal',
                description: `${bestDeal.productName} from ${bestDeal.supplier}`,
                reason: `Lowest commission rate (${bestDeal.commission || 0}%)`,
                supplier: bestDeal.supplier,
                supplierCode: bestDeal.supplierCode,
                productId: bestDeal.productId,
                variantId: bestDeal.id
            });
        }

        // Promotional recommendation
        if (comparison.promotionalOffers.length > 0) {
            const bestPromo = comparison.promotionalOffers[0];
            recommendations.push({
                type: 'promotional',
                title: 'Limited Time Offer',
                description: `${bestPromo.productName} from ${bestPromo.supplier}`,
                reason: `${bestPromo.promotionalDiscount || 0}% discount available`,
                supplier: bestPromo.supplier,
                supplierCode: bestPromo.supplierCode,
                productId: bestPromo.productId,
                variantId: bestPromo.id
            });
        }

        // Supplier recommendation based on availability
        const flashCount = comparison.suppliers.flash.productCount;
        const mobilemartCount = comparison.suppliers.mobilemart.productCount;

        if (flashCount > mobilemartCount) {
            recommendations.push({
                type: 'availability',
                title: 'Wide Selection',
                description: 'Flash offers more options',
                reason: `${flashCount} products vs ${mobilemartCount} from MobileMart`,
                supplier: 'Flash',
                supplierCode: 'FLASH'
            });
        } else if (mobilemartCount > flashCount) {
            recommendations.push({
                type: 'availability',
                title: 'Wide Selection',
                description: 'MobileMart offers more options',
                reason: `${mobilemartCount} products vs ${flashCount} from Flash`,
                supplier: 'MobileMart',
                supplierCode: 'MOBILEMART'
            });
        }

        return recommendations;
    }

    /**
     * Get trending products across suppliers
     */
    async getTrendingProducts(vasType = null) {
        try {
            const whereClause = { status: 'active' };
            if (vasType) {
                whereClause.vasType = vasType;
            }

            // Get trending products from all suppliers
            const allTrendingProducts = await ProductVariant.findAll({
                where: whereClause,
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'type', 'status']
                    },
                    {
                        model: Supplier,
                        as: 'supplier',
                        attributes: ['id', 'name', 'code', 'isActive']
                    }
                ],
                order: [['isPromotional', 'DESC'], ['commission', 'ASC'], ['priority', 'ASC']],
                limit: 10
            });

            // Group by supplier
            const flashTrending = allTrendingProducts.filter(p => p.supplier && p.supplier.code === 'FLASH').slice(0, 5);
            const mobilemartTrending = allTrendingProducts.filter(p => p.supplier && p.supplier.code === 'MOBILEMART').slice(0, 5);

            return {
                flash: flashTrending.map(p => this.formatProductForResponse(p)),
                mobilemart: mobilemartTrending.map(p => this.formatProductForResponse(p)),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Supplier Comparison Service: Error getting trending products:', error.message);
            throw new Error(`Failed to get trending products: ${error.message}`);
        }
    }

    /**
     * Health check for supplier comparison service
     */
    async healthCheck() {
        try {
            // Get Flash supplier
            const flashSupplier = await Supplier.findOne({ where: { code: 'FLASH' } });
            const flashSupplierId = flashSupplier ? flashSupplier.id : null;

            // Get MobileMart supplier
            const mobilemartSupplier = await Supplier.findOne({ where: { code: 'MOBILEMART' } });
            const mobilemartSupplierId = mobilemartSupplier ? mobilemartSupplier.id : null;

            // Count active products for each supplier
            const flashCount = flashSupplierId ? await ProductVariant.count({
                where: {
                    supplierId: flashSupplierId,
                    status: 'active'
                }
            }) : 0;

            const mobilemartCount = mobilemartSupplierId ? await ProductVariant.count({
                where: {
                    supplierId: mobilemartSupplierId,
                    status: 'active'
                }
            }) : 0;

            return {
                status: 'healthy',
                schema: 'normalized', // Indicate we're using normalized schema
                suppliers: {
                    flash: {
                        name: 'Flash',
                        supplierId: flashSupplierId,
                        productCount: flashCount,
                        status: flashCount > 0 ? 'active' : 'no_products'
                    },
                    mobilemart: {
                        name: 'MobileMart',
                        supplierId: mobilemartSupplierId,
                        productCount: mobilemartCount,
                        status: mobilemartCount > 0 ? 'active' : 'no_products'
                    }
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Supplier Comparison Service: Health check failed:', error.message);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = SupplierComparisonService;
