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
const bestOfferService = require('./bestOfferService');

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
                recommendations: [],
                catalogVersion: null
            };

            // Environment detection:
            //   Production  → NODE_ENV=production  (uses best-offers cache, deduped)
            //   Staging     → NODE_ENV=staging      (GCP Secret Manager injects this)
            //   UAT / Dev   → NODE_ENV=development or test
            //
            // Staging and UAT both show ALL products from ALL suppliers for testing.
            // GCP Secret Manager injects NODE_ENV at runtime — no .env file on server.
            const isProduction = process.env.NODE_ENV === 'production';
            const isUatOrStaging = !isProduction; // staging, development, test

            if (isProduction) {
                // Production only: use pre-computed best-offers cache
                try {
                    const bestResult = await bestOfferService.getBestOffers(vasType, provider);
                    if (bestResult.source === 'vas_best_offers' && bestResult.products.length > 0) {
                        comparison.bestDeals = this._applyInternationalPinConversion(bestResult.products, vasType);
                        comparison.catalogVersion = bestResult.catalogVersion;
                        for (const [code, meta] of Object.entries(this.suppliers)) {
                            comparison.suppliers[code] = {
                                name: meta.name || code,
                                priority: meta.priority ?? 999,
                                productCount: 0,
                                products: []
                            };
                        }
                        return comparison;
                    }
                } catch (boErr) {
                    console.warn('⚠️ BestOfferService fallback:', boErr.message);
                }
            }

            // UAT / Staging / Fallback: runtime comparison - ALL products from all suppliers
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

            if (isProduction) {
                // Production fallback (best-offers cache missed): deduplicate by best commission
                comparison.bestDeals = this.findBestDeals(Object.values(groupedBySupplier), amount, vasType);
            } else {
                // UAT / Staging: ALL products, sorted Flash-first then MobileMart,
                // within each supplier: airtime/data by price asc, vouchers A-Z
                const allFormatted = [];
                // Iterate suppliers in priority order (Flash=1, MobileMart=2, others last)
                const sortedSupplierCodes = Object.keys(groupedBySupplier).sort((a, b) => {
                    const pa = this.suppliers[a]?.priority ?? 999;
                    const pb = this.suppliers[b]?.priority ?? 999;
                    return pa - pb;
                });
                for (const code of sortedSupplierCodes) {
                    const group = groupedBySupplier[code];
                    const formatted = group.map(p => this.formatProductForResponse(p));
                    allFormatted.push(...formatted);
                }
                comparison.bestDeals = this.sortProductsForUat(allFormatted, vasType);
            }
            
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
     * International PIN: Flash catalog stores face value in USD; we charge in ZAR.
     * Converts USD cents → ZAR cents using rate (env USD_TO_ZAR_RATE or 21).
     * @param {number} usdCents - Face value in USD cents
     * @returns {number} Charge in ZAR cents
     */
    _internationalPinUsdToZarCents(usdCents) {
        if (usdCents == null || usdCents <= 0) return usdCents;
        const rate = parseFloat(process.env.USD_TO_ZAR_RATE || '21', 10) || 21;
        return Math.round(Number(usdCents) * rate);
    }

    /**
     * Apply international_pin USD→ZAR conversion to product list (for production best-offers path).
     */
    _applyInternationalPinConversion(products, vasType) {
        if (vasType !== 'international_pin' || !Array.isArray(products)) return products;
        return products.map((p) => {
            const code = (p.supplierCode || p.supplier || '').toString().toUpperCase();
            if (code !== 'FLASH') return p;
            const name = (p.productName || p.name || '').toLowerCase();
            if (!name.includes('global pin') && !name.includes('$')) return p;
            return {
                ...p,
                minAmount: this._internationalPinUsdToZarCents(p.minAmount),
                maxAmount: this._internationalPinUsdToZarCents(p.maxAmount),
                denominations: Array.isArray(p.denominations)
                    ? p.denominations.map(d => this._internationalPinUsdToZarCents(d))
                    : p.denominations,
                predefinedAmounts: Array.isArray(p.predefinedAmounts)
                    ? p.predefinedAmounts.map(d => this._internationalPinUsdToZarCents(d))
                    : p.predefinedAmounts
            };
        });
    }

    /**
     * Format product variant for API response
     * @param {Object} productVariant - Sequelize ProductVariant instance
     * @returns {Object} Formatted product for response
     */
    formatProductForResponse(productVariant) {
        // Handle both Sequelize instances and plain objects
        const pv = productVariant.toJSON ? productVariant.toJSON() : productVariant;
        
        // Safely extract product and supplier info (handle both Sequelize instances and plain objects)
        const product = pv.product || (productVariant.product ? (productVariant.product.toJSON ? productVariant.product.toJSON() : productVariant.product) : null);
        const supplier = pv.supplier || (productVariant.supplier ? (productVariant.supplier.toJSON ? productVariant.supplier.toJSON() : productVariant.supplier) : null);
        
        let minAmount = pv.minAmount;
        let maxAmount = pv.maxAmount;
        let predefinedAmounts = pv.predefinedAmounts;
        let denominations = pv.denominations;

        // International PIN (Global PIN): Flash stores face value in USD; we charge in ZAR.
        // Convert minAmount/maxAmount/denominations from USD cents to ZAR cents for display and purchase.
        if (pv.vasType === 'international_pin' && (supplier?.code || pv.supplierCode || '').toUpperCase() === 'FLASH') {
            const productName = (product?.name || '').toLowerCase();
            if (productName.includes('global pin') || productName.includes('$')) {
                minAmount = this._internationalPinUsdToZarCents(minAmount);
                maxAmount = this._internationalPinUsdToZarCents(maxAmount);
                if (Array.isArray(denominations) && denominations.length > 0) {
                    denominations = denominations.map(d => this._internationalPinUsdToZarCents(d));
                }
                if (Array.isArray(predefinedAmounts) && predefinedAmounts.length > 0) {
                    predefinedAmounts = predefinedAmounts.map(d => this._internationalPinUsdToZarCents(d));
                }
            }
        }
        
        return {
            id: pv.id,
            productId: pv.productId,
            productName: product?.name || 'Unknown Product',
            supplierProductId: pv.supplierProductId,
            supplier: supplier?.name || 'Unknown Supplier',
            supplierCode: supplier?.code || null,
            vasType: pv.vasType,
            transactionType: pv.transactionType,
            provider: pv.provider,
            minAmount,
            maxAmount,
            predefinedAmounts: predefinedAmounts || pv.predefinedAmounts,
            denominations: denominations != null ? denominations : pv.denominations,
            commission: pv.commission,
            fixedFee: pv.fixedFee,
            isPromotional: pv.isPromotional,
            promotionalDiscount: pv.promotionalDiscount,
            priority: pv.priority,
            status: pv.status,
            metadata: pv.metadata,
            product: product,
            supplier: supplier
        };
    }

    /**
     * Sort products for UAT/Staging display:
     *   - airtime / data: by minAmount ascending (lowest price first)
     *   - vouchers and everything else: alphabetically by productName
     * The supplier ordering (Flash → MobileMart) is already applied before this call.
     * @param {Array} products - Formatted product objects
     * @param {string} vasType - 'airtime' | 'data' | 'voucher' | etc.
     * @returns {Array} Sorted products
     */
    sortProductsForUat(products, vasType) {
        if (vasType === 'airtime' || vasType === 'data') {
            return [...products].sort((a, b) => {
                // Primary: supplier priority (already grouped, but keep stable)
                const supA = this.suppliers[(a.supplierCode || '').toLowerCase()]?.priority ?? 999;
                const supB = this.suppliers[(b.supplierCode || '').toLowerCase()]?.priority ?? 999;
                if (supA !== supB) return supA - supB;
                // Secondary: price ascending
                return (a.minAmount || 0) - (b.minAmount || 0);
            });
        }
        // Vouchers and others: alphabetical by product name within each supplier group
        return [...products].sort((a, b) => {
            const supA = this.suppliers[(a.supplierCode || '').toLowerCase()]?.priority ?? 999;
            const supB = this.suppliers[(b.supplierCode || '').toLowerCase()]?.priority ?? 999;
            if (supA !== supB) return supA - supB;
            return (a.productName || '').localeCompare(b.productName || '');
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
    findBestDeals(groupedProducts, amount, serviceType = null) {
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
            // e.g., "Hollywood Bets R10" -> "hollywood bets", "R10 LottoStar" -> "lottostar"
            const originalName = nameKey;
            nameKey = nameKey
                // Leading denominations (e.g., "R10 LottoStar" -> "LottoStar")
                .replace(/^r\d+\s+/i, '')           // Remove leading "R10 ", "R100 ", etc.
                .replace(/^r\d+k\s+/i, '')          // Remove leading "R10K "
                
                // Trailing denominations
                .replace(/\s+r\d+$/i, '')           // Remove trailing " R10", " R100", etc.
                .replace(/\s+r\d+k$/i, '')          // Remove " R10K" style
                .replace(/\s+\d+\s*rands?$/i, '')   // Remove " 100 rand"
                
                // Duration patterns (e.g., "1 Month", "3 Months", "6 Months")
                .replace(/\s+\d+\s+months?(\s+r\d+)?$/i, '')  // Remove " 1 Month R120", " 3 Months", etc.
                
                // Embedded price patterns (e.g., "Plan R120")
                .replace(/\s+r\d+/gi, '')           // Remove ALL " R10", " R100" patterns throughout
                
                // Plan/subscription details for streaming services
                .replace(/\s+(entertainment|premier\s+league|mobile|general|only|\+|plus)/gi, ' ')
                
                // Voucher/card suffixes
                .replace(/\s+voucher$/i, '')        // Remove trailing " Voucher"
                .replace(/\s+gift\s+card$/i, '')    // Remove trailing " Gift Card"
                
                // Clean up multiple spaces
                .replace(/\s+/g, ' ')
                .trim();
            
            // Normalize common brand name variations (e.g., "hollywoodbets" vs "hollywood bets")
            nameKey = nameKey
                .replace(/^hollywoodbets$/i, 'hollywood bets')  // Normalize HollywoodBets to Hollywood Bets
                .replace(/^googleplay$/i, 'google play')        // GooglePlay -> Google Play
                .replace(/^playstation$/i, 'playstation')       // Keep consistent
                .trim();
            
            const baseKey = p.productId ?? p.productName ?? p.name ?? p.id;
            // Use serviceType parameter (from API call) OR product-level type for voucher detection
            const isVoucherService = serviceType === 'voucher';
            const likelyVoucher = isVoucherService || pType === 'voucher' || originalName.includes('gift card') || originalName.includes('voucher');
            const key = likelyVoucher && nameKey ? `voucher:${nameKey}` : baseKey;
            
            if (!byProduct.has(key)) byProduct.set(key, []);
            byProduct.get(key).push(p);
        }

        const bestPerProduct = [];
        for (const variants of byProduct.values()) {
            // Sort variants to pick the commercial "best" first
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

            // Take the top commercial pick as the base object
            const best = variants[0];
            
            // Ensure productId is included (variants have productId linking to products table)
            if (!best.productId && best.product?.id) {
                best.productId = best.product.id;
            }

            // 🔢 Aggregate all available denominations across variants that belong to the same logical product
            // This fixes cases like LottoStar / Showmax where each denomination is a separate variant.
            const allDenominations = [];

            for (const v of variants) {
                if (Array.isArray(v.predefinedAmounts)) {
                    allDenominations.push(...v.predefinedAmounts);
                }
                if (Array.isArray(v.denominationOptions)) {
                    allDenominations.push(...v.denominationOptions);
                }
                if (Array.isArray(v.denominations)) {
                    allDenominations.push(...v.denominations);
                }

                // If a variant only encodes a single fixed amount via min/max, treat it as a denomination
                if (
                    !Array.isArray(v.predefinedAmounts) &&
                    !Array.isArray(v.denominations) &&
                    typeof v.minAmount === 'number' &&
                    typeof v.maxAmount === 'number' &&
                    v.minAmount === v.maxAmount
                ) {
                    allDenominations.push(v.minAmount);
                }
            }

            const uniqueDenoms = Array.from(
                new Set(
                    allDenominations.filter(n => typeof n === 'number' && !Number.isNaN(n))
                )
            ).sort((a, b) => a - b);

            if (uniqueDenoms.length > 0) {
                // Attach aggregated denominations to the best pick so downstream clients (wallet UI)
                // can render a full grid of options like Google Play, LottoStar, Showmax, etc.
                best.denominations = uniqueDenoms;
                best.predefinedAmounts = uniqueDenoms;

                // Ensure min/max are consistent with the aggregated denominations
                const minD = uniqueDenoms[0];
                const maxD = uniqueDenoms[uniqueDenoms.length - 1];
                best.minAmount = typeof best.minAmount === 'number'
                    ? Math.min(best.minAmount, minD)
                    : minD;
                best.maxAmount = typeof best.maxAmount === 'number'
                    ? Math.max(best.maxAmount, maxD)
                    : maxD;
            }

            // Format the best variant for response (ensures productId and all fields are included)
            const formattedBest = this.formatProductForResponse(best);
            // Preserve aggregated denominations from the raw variant
            if (uniqueDenoms.length > 0) {
                formattedBest.denominations = uniqueDenoms;
                formattedBest.predefinedAmounts = uniqueDenoms;
            }
            
            bestPerProduct.push(formattedBest);
        }

        // Return all best picks (no slicing) with aggregated denominations
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
