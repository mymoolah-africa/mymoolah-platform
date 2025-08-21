/**
 * Dynamic API Controller - MyMoolah Treasury Platform
 * 
 * Handles all Dynamic API endpoints and requests
 * Provides real-time product and menu data
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const DynamicApiEngine = require('../services/dynamicApiEngine');
const DynamicMenuGenerator = require('../services/dynamicMenuGenerator');

class DynamicApiController {
    constructor() {
        this.apiEngine = new DynamicApiEngine();
        this.menuGenerator = new DynamicMenuGenerator();
        
        // Initialize menu generation
        this.initializeMenuGeneration();
        
    
    }

    /**
     * Initialize menu generation
     */
    async initializeMenuGeneration() {
        try {
            // Get all products from API engine
            const allProducts = this.apiEngine.getAllProducts();
            
            // Generate initial menu
            await this.menuGenerator.generateMenu(allProducts);
            
        
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error initializing menu:', error.message);
        }
    }

    /**
     * Get all products (Dynamic API endpoint)
     */
    async getAllProducts(req, res) {
        try {
            const products = this.apiEngine.getAllProducts();
            
            res.json({
                success: true,
                data: {
                    products: products,
                    count: products.length,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting all products:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve products',
                message: error.message
            });
        }
    }

    /**
     * Get products by Service Provider (Dynamic API endpoint)
     */
    async getProductsBySP(req, res) {
        try {
            const { spId } = req.params;
            
            if (!spId) {
                return res.status(400).json({
                    success: false,
                    error: 'Service Provider ID is required'
                });
            }
            
            const products = this.apiEngine.getProductsBySP(spId);
            const spStatus = this.apiEngine.getSPStatus()[spId];
            
            res.json({
                success: true,
                data: {
                    spId: spId,
                    spName: spStatus?.name || 'Unknown',
                    products: products,
                    count: products.length,
                    lastSync: spStatus?.lastSync,
                    status: spStatus?.status || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting products by SP:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve products for SP',
                message: error.message
            });
        }
    }

    /**
     * Get dynamic menu (Dynamic API endpoint)
     */
    async getDynamicMenu(req, res) {
        try {
            const menu = this.menuGenerator.getCurrentMenu();
            
            if (!menu) {
                return res.status(404).json({
                    success: false,
                    error: 'Menu not available'
                });
            }
            
            res.json({
                success: true,
                data: {
                    menu: menu,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting dynamic menu:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve dynamic menu',
                message: error.message
            });
        }
    }

    /**
     * Get menu by category (Dynamic API endpoint)
     */
    async getMenuByCategory(req, res) {
        try {
            const { category } = req.params;
            
            if (!category) {
                return res.status(400).json({
                    success: false,
                    error: 'Category is required'
                });
            }
            
            const categoryMenu = this.menuGenerator.getMenuByCategory(category);
            
            if (!categoryMenu) {
                return res.status(404).json({
                    success: false,
                    error: 'Category not found'
                });
            }
            
            res.json({
                success: true,
                data: {
                    category: categoryMenu,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting menu by category:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve category menu',
                message: error.message
            });
        }
    }

    /**
     * Get featured products (Dynamic API endpoint)
     */
    async getFeaturedProducts(req, res) {
        try {
            const featuredProducts = this.menuGenerator.getFeaturedProducts();
            
            res.json({
                success: true,
                data: {
                    featured: featuredProducts,
                    count: featuredProducts.length,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting featured products:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve featured products',
                message: error.message
            });
        }
    }

    /**
     * Search products (Dynamic API endpoint)
     */
    async searchProducts(req, res) {
        try {
            const { query, category, spId, availableOnly, maxPrice } = req.query;
            
            const filters = {};
            if (category) filters.category = category;
            if (spId) filters.spId = spId;
            if (availableOnly === 'true') filters.availableOnly = true;
            if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
            
            const results = this.menuGenerator.searchProducts(query, filters);
            
            res.json({
                success: true,
                data: {
                    query: query || '',
                    filters: filters,
                    results: results,
                    count: results.length,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error searching products:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to search products',
                message: error.message
            });
        }
    }

    /**
     * Get Service Provider status (Dynamic API endpoint)
     */
    async getSPStatus(req, res) {
        try {
            const status = this.apiEngine.getSPStatus();
            
            res.json({
                success: true,
                data: {
                    status: status,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting SP status:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve SP status',
                message: error.message
            });
        }
    }

    /**
     * Get menu statistics (Dynamic API endpoint)
     */
    async getMenuStats(req, res) {
        try {
            const stats = this.menuGenerator.getMenuStats();
            
            if (!stats) {
                return res.status(404).json({
                    success: false,
                    error: 'Menu statistics not available'
                });
            }
            
            res.json({
                success: true,
                data: {
                    stats: stats,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting menu stats:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve menu statistics',
                message: error.message
            });
        }
    }

    /**
     * Get categories (Dynamic API endpoint)
     */
    async getCategories(req, res) {
        try {
            const categories = this.menuGenerator.getCategories();
            
            res.json({
                success: true,
                data: {
                    categories: categories,
                    count: categories.length,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting categories:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve categories',
                message: error.message
            });
        }
    }

    /**
     * Force sync specific SP (Admin endpoint)
     */
    async forceSyncSP(req, res) {
        try {
            const { spId } = req.params;
            
            if (!spId) {
                return res.status(400).json({
                    success: false,
                    error: 'Service Provider ID is required'
                });
            }
            
            await this.apiEngine.forceSyncSP(spId);
            
            // Regenerate menu with updated products
            const allProducts = this.apiEngine.getAllProducts();
            await this.menuGenerator.forceRegenerate(allProducts);
            
            res.json({
                success: true,
                message: `Successfully synced SP: ${spId}`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error force syncing SP:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to sync SP',
                message: error.message
            });
        }
    }

    /**
     * Force sync all SPs (Admin endpoint)
     */
    async forceSyncAll(req, res) {
        try {
            await this.apiEngine.forceSyncAll();
            
            // Regenerate menu with updated products
            const allProducts = this.apiEngine.getAllProducts();
            await this.menuGenerator.forceRegenerate(allProducts);
            
            res.json({
                success: true,
                message: 'Successfully synced all SPs',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error force syncing all SPs:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to sync all SPs',
                message: error.message
            });
        }
    }

    /**
     * Get engine statistics (Admin endpoint)
     */
    async getEngineStats(req, res) {
        try {
            const apiStats = this.apiEngine.getStats();
            const menuStats = this.menuGenerator.getStats();
            
            res.json({
                success: true,
                data: {
                    apiEngine: apiStats,
                    menuGenerator: menuStats,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error getting engine stats:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve engine statistics',
                message: error.message
            });
        }
    }

    /**
     * Health check (Dynamic API endpoint)
     */
    async healthCheck(req, res) {
        try {
            const apiStats = this.apiEngine.getStats();
            const menuStats = this.menuGenerator.getStats();
            
            const health = {
                status: 'healthy',
                apiEngine: {
                    status: apiStats.activeSPs > 0 ? 'active' : 'inactive',
                    activeSPs: apiStats.activeSPs,
                    totalSPs: apiStats.totalSPs
                },
                menuGenerator: {
                    status: menuStats.lastGenerated ? 'active' : 'inactive',
                    version: menuStats.version,
                    lastGenerated: menuStats.lastGenerated
                },
                timestamp: new Date().toISOString()
            };
            
            res.json({
                success: true,
                data: health
            });
        } catch (error) {
            console.error('❌ Dynamic API Controller: Error in health check:', error.message);
            res.status(500).json({
                success: false,
                error: 'Health check failed',
                message: error.message
            });
        }
    }
}

module.exports = DynamicApiController; 