/**
 * Supplier Comparison Service - MyMoolah Treasury Platform
 * 
 * AI-powered service to compare deals and promotional offers from multiple suppliers
 * Scrapes Flash and MobileMart APIs to find the best deals for customers
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const { FlashProduct, MobileMartProduct } = require('../models');

class SupplierComparisonService {
    constructor() {
        this.suppliers = {
            flash: {
                name: 'Flash',
                priority: 1, // Primary supplier
                baseUrl: process.env.FLASH_API_URL || 'https://api.flashswitch.flash-group.com'
            },
            mobilemart: {
                name: 'MobileMart',
                priority: 2, // Secondary supplier
                baseUrl: process.env.MOBILEMART_API_URL || 'https://api.mobilemart.co.za'
            }
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

            // Get products from both suppliers
            const flashProducts = await this.getFlashProducts(vasType, amount, provider);
            const mobilemartProducts = await this.getMobileMartProducts(vasType, amount, provider);

            comparison.suppliers.flash = {
                name: 'Flash',
                priority: 1,
                productCount: flashProducts.length,
                products: flashProducts
            };

            comparison.suppliers.mobilemart = {
                name: 'MobileMart',
                priority: 2,
                productCount: mobilemartProducts.length,
                products: mobilemartProducts
            };

            // Find best deals
            comparison.bestDeals = this.findBestDeals(flashProducts, mobilemartProducts, amount);
            
            // Find promotional offers
            comparison.promotionalOffers = this.findPromotionalOffers(flashProducts, mobilemartProducts);
            
            // Generate AI recommendations
            comparison.recommendations = this.generateRecommendations(comparison);

            return comparison;

        } catch (error) {
            console.error('❌ Supplier Comparison Service: Error comparing products:', error.message);
            throw new Error(`Failed to compare products: ${error.message}`);
        }
    }

    /**
     * Get Flash products from database
     */
    async getFlashProducts(vasType, amount = null, provider = null) {
        const whereClause = {
            isActive: true,
            vasType: this.mapVasType(vasType, 'flash')
        };

        if (provider) {
            whereClause.provider = provider;
        }

        if (amount) {
            whereClause.minAmount = { [require('sequelize').Op.lte]: amount };
            whereClause.maxAmount = { [require('sequelize').Op.gte]: amount };
        }

        return await FlashProduct.findAll({
            where: whereClause,
            order: [['commission', 'ASC'], ['isPromotional', 'DESC']]
        });
    }

    /**
     * Get MobileMart products from database
     */
    async getMobileMartProducts(vasType, amount = null, provider = null) {
        const whereClause = {
            isActive: true,
            vasType: this.mapVasType(vasType, 'mobilemart')
        };

        if (provider) {
            whereClause.provider = provider;
        }

        if (amount) {
            whereClause.minAmount = { [require('sequelize').Op.lte]: amount };
            whereClause.maxAmount = { [require('sequelize').Op.gte]: amount };
        }

        return await MobileMartProduct.findAll({
            where: whereClause,
            order: [['commission', 'ASC'], ['isPromotional', 'DESC']]
        });
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
    findBestDeals(flashProducts, mobilemartProducts, amount) {
        const allProducts = [
            ...flashProducts.map(p => ({ ...p.toJSON(), supplier: 'Flash', supplierPriority: 1 })),
            ...mobilemartProducts.map(p => ({ ...p.toJSON(), supplier: 'MobileMart', supplierPriority: 2 }))
        ];

        // Sort by commission (lower is better) and promotional status
        allProducts.sort((a, b) => {
            // Prioritize promotional products
            if (a.isPromotional && !b.isPromotional) return -1;
            if (!a.isPromotional && b.isPromotional) return 1;
            
            // Then by commission
            if (a.commission !== b.commission) return a.commission - b.commission;
            
            // Then by supplier priority (Flash first)
            return a.supplierPriority - b.supplierPriority;
        });

        return allProducts.slice(0, 5); // Top 5 deals
    }

    /**
     * Find promotional offers across suppliers
     */
    findPromotionalOffers(flashProducts, mobilemartProducts) {
        const promotionalProducts = [
            ...flashProducts.filter(p => p.isPromotional).map(p => ({ ...p.toJSON(), supplier: 'Flash' })),
            ...mobilemartProducts.filter(p => p.isPromotional).map(p => ({ ...p.toJSON(), supplier: 'MobileMart' }))
        ];

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
                reason: `Lowest commission rate (${bestDeal.commission}%)`,
                supplier: bestDeal.supplier,
                productId: bestDeal.merchantProductId || bestDeal.productCode
            });
        }

        // Promotional recommendation
        if (comparison.promotionalOffers.length > 0) {
            const bestPromo = comparison.promotionalOffers[0];
            recommendations.push({
                type: 'promotional',
                title: 'Limited Time Offer',
                description: `${bestPromo.productName} from ${bestPromo.supplier}`,
                reason: `${bestPromo.promotionalDiscount}% discount available`,
                supplier: bestPromo.supplier,
                productId: bestPromo.merchantProductId || bestPromo.productCode
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
                supplier: 'Flash'
            });
        }

        return recommendations;
    }

    /**
     * Get trending products across suppliers
     */
    async getTrendingProducts(vasType = null) {
        try {
            const whereClause = { isActive: true };
            if (vasType) {
                whereClause.vasType = vasType;
            }

            const flashTrending = await FlashProduct.findAll({
                where: whereClause,
                order: [['commission', 'ASC']], // FlashProduct doesn't have isPromotional column
                limit: 5
            });

            const mobilemartTrending = await MobileMartProduct.findAll({
                where: whereClause,
                order: [['isPromotional', 'DESC'], ['commission', 'ASC']],
                limit: 5
            });

            return {
                flash: flashTrending.map(p => ({ ...p.toJSON(), supplier: 'Flash' })),
                mobilemart: mobilemartTrending.map(p => ({ ...p.toJSON(), supplier: 'MobileMart' })),
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
            const flashCount = await FlashProduct.count({ where: { isActive: true } });
            const mobilemartCount = await MobileMartProduct.count({ where: { isActive: true } });

            return {
                status: 'healthy',
                suppliers: {
                    flash: {
                        name: 'Flash',
                        productCount: flashCount,
                        status: flashCount > 0 ? 'active' : 'no_products'
                    },
                    mobilemart: {
                        name: 'MobileMart',
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
