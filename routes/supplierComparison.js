/**
 * Supplier Comparison Routes - MyMoolah Treasury Platform
 * 
 * AI-powered routes for comparing deals across Flash and MobileMart suppliers
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const SupplierComparisonService = require('../services/supplierComparisonService');

// Initialize Supplier Comparison Service
const comparisonService = new SupplierComparisonService();

// ========================================
// SUPPLIER COMPARISON HEALTH ENDPOINT
// ========================================

/**
 * @route   GET /api/v1/suppliers/health
 * @desc    Health check for supplier comparison service
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        const health = await comparisonService.healthCheck();
        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        console.error('❌ Supplier Comparison: Health check error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Supplier comparison service health check failed',
            message: error.message
        });
    }
});

// ========================================
// PRODUCT COMPARISON ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/suppliers/compare/:vasType
 * @desc    Compare products across suppliers for a specific VAS type
 * @access  Public
 * @query   { amount?, provider? }
 */
router.get('/compare/:vasType', async (req, res) => {
    try {
        const { vasType } = req.params;
        const { amount, provider } = req.query;

        if (!vasType) {
            return res.status(400).json({
                success: false,
                error: 'VAS type is required'
            });
        }

        const parsedAmount = amount ? parseInt(amount) : null;
        
        const comparison = await comparisonService.compareProducts(
            vasType, 
            parsedAmount, 
            provider
        );

        res.json({
            success: true,
            data: comparison
        });

    } catch (error) {
        console.error('❌ Supplier Comparison: Error comparing products:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to compare products',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/v1/suppliers/trending
 * @desc    Get trending products across suppliers
 * @access  Public
 * @query   { vasType? }
 */
router.get('/trending', async (req, res) => {
    try {
        const { vasType } = req.query;
        
        const trending = await comparisonService.getTrendingProducts(vasType);

        res.json({
            success: true,
            data: trending
        });

    } catch (error) {
        console.error('❌ Supplier Comparison: Error getting trending products:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get trending products',
            message: error.message
        });
    }
});

// ========================================
// BEST DEALS ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/suppliers/best-deals/:vasType
 * @desc    Get best deals for a specific VAS type
 * @access  Public
 * @query   { amount?, provider? }
 */
router.get('/best-deals/:vasType', async (req, res) => {
    try {
        const { vasType } = req.params;
        const { amount, provider } = req.query;

        if (!vasType) {
            return res.status(400).json({
                success: false,
                error: 'VAS type is required'
            });
        }

        const parsedAmount = amount ? parseInt(amount) : null;
        
        const comparison = await comparisonService.compareProducts(
            vasType, 
            parsedAmount, 
            provider
        );

        res.json({
            success: true,
            data: {
                vasType,
                amount: parsedAmount,
                provider,
                bestDeals: comparison.bestDeals,
                timestamp: comparison.timestamp
            }
        });

    } catch (error) {
        console.error('❌ Supplier Comparison: Error getting best deals:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get best deals',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/v1/suppliers/promotions
 * @desc    Get all promotional offers across suppliers
 * @access  Public
 * @query   { vasType? }
 */
router.get('/promotions', async (req, res) => {
    try {
        const { vasType } = req.query;
        
        const comparison = await comparisonService.compareProducts(vasType);
        
        res.json({
            success: true,
            data: {
                vasType,
                promotionalOffers: comparison.promotionalOffers,
                timestamp: comparison.timestamp
            }
        });

    } catch (error) {
        console.error('❌ Supplier Comparison: Error getting promotions:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get promotional offers',
            message: error.message
        });
    }
});

// ========================================
// AI RECOMMENDATIONS ENDPOINT
// ========================================

/**
 * @route   GET /api/v1/suppliers/recommendations/:vasType
 * @desc    Get AI-powered recommendations for a specific VAS type
 * @access  Public
 * @query   { amount?, provider? }
 */
router.get('/recommendations/:vasType', async (req, res) => {
    try {
        const { vasType } = req.params;
        const { amount, provider } = req.query;

        if (!vasType) {
            return res.status(400).json({
                success: false,
                error: 'VAS type is required'
            });
        }

        const parsedAmount = amount ? parseInt(amount) : null;
        
        const comparison = await comparisonService.compareProducts(
            vasType, 
            parsedAmount, 
            provider
        );

        res.json({
            success: true,
            data: {
                vasType,
                amount: parsedAmount,
                provider,
                recommendations: comparison.recommendations,
                timestamp: comparison.timestamp
            }
        });

    } catch (error) {
        console.error('❌ Supplier Comparison: Error getting recommendations:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get recommendations',
            message: error.message
        });
    }
});

module.exports = router;
