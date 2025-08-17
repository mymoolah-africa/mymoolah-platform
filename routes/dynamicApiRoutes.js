/**
 * Dynamic API Routes - MyMoolah Treasury Platform
 * 
 * Routes for Dynamic API endpoints
 * Handles real-time product and menu data
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const DynamicApiController = require('../controllers/dynamicApiController');

// Initialize Dynamic API Controller
const dynamicApiController = new DynamicApiController();

// Middleware for API versioning
router.use('/v1', (req, res, next) => {
    req.apiVersion = 'v1';
    next();
});

// ========================================
// PUBLIC DYNAMIC API ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/dynamic/products
 * @desc    Get all products from all Service Providers
 * @access  Public
 */
router.get('/products', dynamicApiController.getAllProducts.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/products/sp/:spId
 * @desc    Get products by specific Service Provider
 * @access  Public
 */
router.get('/products/sp/:spId', dynamicApiController.getProductsBySP.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/menu
 * @desc    Get complete dynamic menu
 * @access  Public
 */
router.get('/menu', dynamicApiController.getDynamicMenu.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/menu/category/:category
 * @desc    Get menu by specific category
 * @access  Public
 */
router.get('/menu/category/:category', dynamicApiController.getMenuByCategory.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/menu/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/menu/featured', dynamicApiController.getFeaturedProducts.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/search
 * @desc    Search products with filters
 * @access  Public
 * @query   query, category, spId, availableOnly, maxPrice
 */
router.get('/search', dynamicApiController.searchProducts.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/status
 * @desc    Get Service Provider status
 * @access  Public
 */
router.get('/status', dynamicApiController.getSPStatus.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/stats
 * @desc    Get menu statistics
 * @access  Public
 */
router.get('/stats', dynamicApiController.getMenuStats.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/categories', dynamicApiController.getCategories.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/health
 * @desc    Health check for Dynamic API
 * @access  Public
 */
router.get('/health', dynamicApiController.healthCheck.bind(dynamicApiController));

// ========================================
// ADMIN DYNAMIC API ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/dynamic/admin/sync/sp/:spId
 * @desc    Force sync specific Service Provider
 * @access  Admin
 */
router.post('/admin/sync/sp/:spId', dynamicApiController.forceSyncSP.bind(dynamicApiController));

/**
 * @route   POST /api/v1/dynamic/admin/sync/all
 * @desc    Force sync all Service Providers
 * @access  Admin
 */
router.post('/admin/sync/all', dynamicApiController.forceSyncAll.bind(dynamicApiController));

/**
 * @route   GET /api/v1/dynamic/admin/stats
 * @desc    Get engine statistics
 * @access  Admin
 */
router.get('/admin/stats', dynamicApiController.getEngineStats.bind(dynamicApiController));

// ========================================
// SERVICE PROVIDER SPECIFIC ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/dynamic/easypay/products
 * @desc    Get EasyPay products
 * @access  Public
 */
router.get('/easypay/products', (req, res) => {
    req.params.spId = 'easypay';
    dynamicApiController.getProductsBySP(req, res);
});

/**
 * @route   GET /api/v1/dynamic/dtmercury/products
 * @desc    Get dtMercury products
 * @access  Public
 */
router.get('/dtmercury/products', (req, res) => {
    req.params.spId = 'dtmercury';
    dynamicApiController.getProductsBySP(req, res);
});

/**
 * @route   GET /api/v1/dynamic/flash/products
 * @desc    Get Flash products
 * @access  Public
 */
router.get('/flash/products', (req, res) => {
    req.params.spId = 'flash';
    dynamicApiController.getProductsBySP(req, res);
});

/**
 * @route   GET /api/v1/dynamic/mobilemart/products
 * @desc    Get MobileMart products
 * @access  Public
 */
router.get('/mobilemart/products', (req, res) => {
    req.params.spId = 'mobilemart';
    dynamicApiController.getProductsBySP(req, res);
});

// ========================================
// CATEGORY SPECIFIC ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/dynamic/category/bill-payments
 * @desc    Get bill payments category
 * @access  Public
 */
router.get('/category/bill-payments', (req, res) => {
    req.params.category = 'Bill Payments';
    dynamicApiController.getMenuByCategory(req, res);
});

/**
 * @route   GET /api/v1/dynamic/category/vouchers
 * @desc    Get vouchers category
 * @access  Public
 */
router.get('/category/vouchers', (req, res) => {
    req.params.category = 'Vouchers';
    dynamicApiController.getMenuByCategory(req, res);
});

/**
 * @route   GET /api/v1/dynamic/category/mobile-services
 * @desc    Get mobile services category
 * @access  Public
 */
router.get('/category/mobile-services', (req, res) => {
    req.params.category = 'Mobile Services';
    dynamicApiController.getMenuByCategory(req, res);
});

/**
 * @route   GET /api/v1/dynamic/category/banking-services
 * @desc    Get banking services category
 * @access  Public
 */
router.get('/category/banking-services', (req, res) => {
    req.params.category = 'Banking Services';
    dynamicApiController.getMenuByCategory(req, res);
});

/**
 * @route   GET /api/v1/dynamic/category/vas-services
 * @desc    Get VAS services category
 * @access  Public
 */
router.get('/category/vas-services', (req, res) => {
    req.params.category = 'VAS Services';
    dynamicApiController.getMenuByCategory(req, res);
});

// ========================================
// UTILITY ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/dynamic/info
 * @desc    Get Dynamic API information
 * @access  Public
 */
router.get('/info', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'MyMoolah Dynamic API',
            version: '1.0.0',
            description: 'Real-time product ingestion and dynamic menu generation',
            features: [
                'Real-time product ingestion from Service Providers',
                'Dynamic menu generation',
                'Automatic product updates',
                'Real-time pricing updates',
                'Service Provider integration',
                'Category organization',
                'Search and filtering',
                'Featured products',
                'Health monitoring'
            ],
            endpoints: {
                public: [
                    'GET /api/v1/dynamic/products',
                    'GET /api/v1/dynamic/menu',
                    'GET /api/v1/dynamic/search',
                    'GET /api/v1/dynamic/status',
                    'GET /api/v1/dynamic/stats',
                    'GET /api/v1/dynamic/categories',
                    'GET /api/v1/dynamic/health'
                ],
                admin: [
                    'POST /api/v1/dynamic/admin/sync/sp/:spId',
                    'POST /api/v1/dynamic/admin/sync/all',
                    'GET /api/v1/dynamic/admin/stats'
                ]
            },
            timestamp: new Date().toISOString()
        }
    });
});

/**
 * @route   GET /api/v1/dynamic/version
 * @desc    Get Dynamic API version
 * @access  Public
 */
router.get('/version', (req, res) => {
    res.json({
        success: true,
        data: {
            version: '1.0.0',
            apiVersion: req.apiVersion,
            timestamp: new Date().toISOString()
        }
    });
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler for undefined routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Dynamic API endpoint not found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
router.use((error, req, res, next) => {
    console.error('❌ Dynamic API Routes: Error:', error.message);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

module.exports = router; 