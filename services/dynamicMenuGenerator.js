/**
 * Dynamic Menu Generator - MyMoolah Treasury Platform
 * 
 * Real-time menu creation and organization system
 * Handles dynamic menu generation from ingested products
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

class DynamicMenuGenerator {
    constructor() {
        this.menuCache = new Map();
        this.categoryCache = new Map();
        this.featuredProducts = new Map();
        this.lastGenerated = null;
        this.menuVersion = 1;
        
        // Menu configuration
        this.menuConfig = {
            maxFeaturedProducts: 10,
            maxProductsPerCategory: 50,
            categoryOrder: [
                'Featured',
                'Bill Payments',
                'Banking Services',
                'Vouchers',
                'Mobile Services',
                'VAS Services',
                'Other'
            ],
            updateInterval: 30000 // 30 seconds
        };
        
        console.log('✅ Dynamic Menu Generator: Initialized');
    }

    /**
     * Generate complete dynamic menu
     */
    async generateMenu(allProducts = []) {
        try {
            console.log('🔄 Dynamic Menu Generator: Generating menu...');
            
            // Process all products
            const processedProducts = this.processProducts(allProducts);
            
            // Organize by category
            const categorizedProducts = this.organizeByCategory(processedProducts);
            
            // Generate featured products
            const featuredProducts = this.generateFeaturedProducts(processedProducts);
            
            // Create menu structure
            const menuStructure = this.createMenuStructure(categorizedProducts, featuredProducts);
            
            // Update cache
            this.updateMenuCache(menuStructure);
            
            // Update version
            this.menuVersion++;
            this.lastGenerated = new Date().toISOString();
            
            console.log('✅ Dynamic Menu Generator: Menu generated successfully');
            
            return menuStructure;
            
        } catch (error) {
            console.error('❌ Dynamic Menu Generator: Error generating menu:', error.message);
            throw error;
        }
    }

    /**
     * Process products for menu generation
     */
    processProducts(products) {
        return products.map(product => ({
            ...product,
            displayName: this.generateDisplayName(product),
            displayPrice: this.formatPrice(product.price, product.currency),
            availability: this.checkAvailability(product),
            priority: this.calculatePriority(product),
            tags: this.generateTags(product)
        }));
    }

    /**
     * Generate display name for product
     */
    generateDisplayName(product) {
        // Custom display names for different product types
        switch (product.category) {
            case 'Bill Payments':
                return `${product.name} Bill Payment`;
            case 'Vouchers':
                return `${product.name} Voucher`;
            case 'Mobile Services':
                return `${product.name} Service`;
            case 'Banking Services':
                return `${product.name} Banking`;
            default:
                return product.name;
        }
    }

    /**
     * Format price for display
     */
    formatPrice(price, currency = 'ZAR') {
        if (!price || price === 0) return 'Free';
        
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: currency
        }).format(price);
    }

    /**
     * Check product availability
     */
    checkAvailability(product) {
        // Check if product is available
        if (product.availability === false) return false;
        
        // Check if product has expired (for vouchers)
        if (product.metadata?.expiryDate) {
            const expiryDate = new Date(product.metadata.expiryDate);
            if (expiryDate < new Date()) return false;
        }
        
        return true;
    }

    /**
     * Calculate product priority for sorting
     */
    calculatePriority(product) {
        let priority = 0;
        
        // Featured products get highest priority
        if (product.features?.includes('featured')) priority += 100;
        
        // Popular categories get higher priority
        switch (product.category) {
            case 'Bill Payments':
                priority += 80;
                break;
            case 'Vouchers':
                priority += 70;
                break;
            case 'Mobile Services':
                priority += 60;
                break;
            case 'Banking Services':
                priority += 50;
                break;
            default:
                priority += 10;
        }
        
        // New products get higher priority
        if (product.lastUpdated) {
            const daysSinceUpdate = (Date.now() - new Date(product.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate < 7) priority += 20;
        }
        
        return priority;
    }

    /**
     * Generate tags for product
     */
    generateTags(product) {
        const tags = [];
        
        // Add category tag
        tags.push(product.category);
        
        // Add feature tags
        if (product.features) {
            tags.push(...product.features);
        }
        
        // Add SP tag
        if (product.spName) {
            tags.push(product.spName);
        }
        
        // Add availability tag
        if (product.availability) {
            tags.push('Available');
        } else {
            tags.push('Unavailable');
        }
        
        return tags;
    }

    /**
     * Organize products by category
     */
    organizeByCategory(products) {
        const categorized = {};
        
        products.forEach(product => {
            const category = product.category || 'Other';
            
            if (!categorized[category]) {
                categorized[category] = [];
            }
            
            categorized[category].push(product);
        });
        
        // Sort products within each category by priority
        Object.keys(categorized).forEach(category => {
            categorized[category].sort((a, b) => b.priority - a.priority);
            
            // Limit products per category
            if (categorized[category].length > this.menuConfig.maxProductsPerCategory) {
                categorized[category] = categorized[category].slice(0, this.menuConfig.maxProductsPerCategory);
            }
        });
        
        return categorized;
    }

    /**
     * Generate featured products
     */
    generateFeaturedProducts(products) {
        // Filter available products
        const availableProducts = products.filter(product => product.availability);
        
        // Sort by priority
        availableProducts.sort((a, b) => b.priority - a.priority);
        
        // Take top products
        return availableProducts.slice(0, this.menuConfig.maxFeaturedProducts);
    }

    /**
     * Create menu structure
     */
    createMenuStructure(categorizedProducts, featuredProducts) {
        const menu = {
            version: this.menuVersion,
            generatedAt: new Date().toISOString(),
            categories: [],
            featured: {
                name: 'Featured',
                products: featuredProducts,
                count: featuredProducts.length
            },
            stats: {
                totalProducts: 0,
                totalCategories: 0,
                availableProducts: 0
            }
        };
        
        // Add categories in order
        this.menuConfig.categoryOrder.forEach(categoryName => {
            if (categorizedProducts[categoryName]) {
                const categoryProducts = categorizedProducts[categoryName];
                const availableProducts = categoryProducts.filter(p => p.availability);
                
                menu.categories.push({
                    name: categoryName,
                    products: categoryProducts,
                    count: categoryProducts.length,
                    availableCount: availableProducts.length
                });
                
                menu.stats.totalProducts += categoryProducts.length;
                menu.stats.availableProducts += availableProducts.length;
            }
        });
        
        // Add remaining categories
        Object.keys(categorizedProducts).forEach(categoryName => {
            if (!this.menuConfig.categoryOrder.includes(categoryName)) {
                const categoryProducts = categorizedProducts[categoryName];
                const availableProducts = categoryProducts.filter(p => p.availability);
                
                menu.categories.push({
                    name: categoryName,
                    products: categoryProducts,
                    count: categoryProducts.length,
                    availableCount: availableProducts.length
                });
                
                menu.stats.totalProducts += categoryProducts.length;
                menu.stats.availableProducts += availableProducts.length;
            }
        });
        
        menu.stats.totalCategories = menu.categories.length;
        
        return menu;
    }

    /**
     * Update menu cache
     */
    updateMenuCache(menuStructure) {
        this.menuCache.set('main', menuStructure);
        this.menuCache.set('lastUpdated', new Date().toISOString());
    }

    /**
     * Get current menu
     */
    getCurrentMenu() {
        return this.menuCache.get('main') || null;
    }

    /**
     * Get menu by category
     */
    getMenuByCategory(categoryName) {
        const menu = this.getCurrentMenu();
        if (!menu) return null;
        
        return menu.categories.find(category => category.name === categoryName);
    }

    /**
     * Get featured products
     */
    getFeaturedProducts() {
        const menu = this.getCurrentMenu();
        return menu?.featured?.products || [];
    }

    /**
     * Search products in menu
     */
    searchProducts(query, filters = {}) {
        const menu = this.getCurrentMenu();
        if (!menu) return [];
        
        const allProducts = [];
        
        // Collect all products
        if (menu.featured?.products) {
            allProducts.push(...menu.featured.products);
        }
        
        menu.categories.forEach(category => {
            allProducts.push(...category.products);
        });
        
        // Filter by query
        let filteredProducts = allProducts;
        
        if (query) {
            const searchQuery = query.toLowerCase();
            filteredProducts = allProducts.filter(product => 
                product.name.toLowerCase().includes(searchQuery) ||
                product.description.toLowerCase().includes(searchQuery) ||
                product.tags.some(tag => tag.toLowerCase().includes(searchQuery))
            );
        }
        
        // Apply filters
        if (filters.category) {
            filteredProducts = filteredProducts.filter(product => 
                product.category === filters.category
            );
        }
        
        if (filters.spId) {
            filteredProducts = filteredProducts.filter(product => 
                product.spId === filters.spId
            );
        }
        
        if (filters.availableOnly) {
            filteredProducts = filteredProducts.filter(product => 
                product.availability
            );
        }
        
        if (filters.maxPrice) {
            filteredProducts = filteredProducts.filter(product => 
                product.price <= filters.maxPrice
            );
        }
        
        return filteredProducts;
    }

    /**
     * Get menu statistics
     */
    getMenuStats() {
        const menu = this.getCurrentMenu();
        if (!menu) return null;
        
        return {
            ...menu.stats,
            version: menu.version,
            generatedAt: menu.generatedAt,
            lastUpdated: this.menuCache.get('lastUpdated'),
            categories: menu.categories.map(cat => ({
                name: cat.name,
                count: cat.count,
                availableCount: cat.availableCount
            }))
        };
    }

    /**
     * Get category list
     */
    getCategories() {
        const menu = this.getCurrentMenu();
        if (!menu) return [];
        
        return menu.categories.map(category => ({
            name: category.name,
            count: category.count,
            availableCount: category.availableCount
        }));
    }

    /**
     * Force menu regeneration
     */
    async forceRegenerate(allProducts) {
        console.log('🔄 Dynamic Menu Generator: Force regenerating menu...');
        return await this.generateMenu(allProducts);
    }

    /**
     * Get generator statistics
     */
    getStats() {
        return {
            version: this.menuVersion,
            lastGenerated: this.lastGenerated,
            cacheSize: this.menuCache.size,
            categoryCacheSize: this.categoryCache.size,
            featuredProductsCount: this.featuredProducts.size
        };
    }
}

module.exports = DynamicMenuGenerator; 