/**
 * MobileMart Controller - MyMoolah Treasury Platform
 * 
 * Handles all MobileMart Fulcrum API transactional endpoints
 * Includes Airtime, Data, Electricity, and other VAS purchases
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const MobileMartAuthService = require('../services/mobilemartAuthService');

class MobileMartController {
    constructor() {
        this.authService = new MobileMartAuthService();
    }

    /**
     * Normalize VAS type to match MobileMart Fulcrum API naming
     * @param {string} vasType - VAS type from request
     * @returns {string} Normalized VAS type
     */
    normalizeVasType(vasType) {
        const mapping = {
            'airtime': 'airtime',
            'data': 'data',
            'voucher': 'voucher',
            'billpayment': 'billpayment',
            'bill_payment': 'billpayment',
            'electricity': 'prepaidutility',
            'prepaidutility': 'prepaidutility',
            'utility': 'prepaidutility'
        };
        return mapping[vasType.toLowerCase()] || vasType.toLowerCase();
    }

    /**
     * Health check for MobileMart integration
     */
    async healthCheck(req, res) {
        try {
            const health = await this.authService.healthCheck();
            res.json({
                success: true,
                data: {
                    service: 'MobileMart API',
                    status: health.status,
                    timestamp: new Date().toISOString(),
                    details: health
                }
            });
        } catch (error) {
            console.error('❌ MobileMart Controller: Health check error:', error.message);
            res.status(500).json({
                success: false,
                error: 'MobileMart service health check failed',
                message: error.message
            });
        }
    }

    /**
     * List products for a VAS type (airtime, data, electricity, etc.)
     * @route GET /api/v1/mobilemart/products/:vasType
     */
    async listProducts(req, res) {
        try {
            const { vasType } = req.params;
            if (!vasType) {
                return res.status(400).json({ success: false, error: 'VAS type is required' });
            }
            // MobileMart Fulcrum API structure: /api/v1/{vasType}/products
            // VAS types: airtime, data, voucher, billpayment, prepaidutility
            const normalizedVasType = this.normalizeVasType(vasType);
            const response = await this.authService.makeAuthenticatedRequest(
                'GET',
                `/${normalizedVasType}/products`
            );
            res.json({
                success: true,
                data: {
                    vasType,
                    products: response.products || response || [],
                    count: Array.isArray(response.products) ? response.products.length : (Array.isArray(response) ? response.length : 0),
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ MobileMart Controller: Error listing products:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to list MobileMart products',
                message: error.message
            });
        }
    }

    /**
     * Purchase a VAS product (airtime, data, electricity, etc.)
     * @route POST /api/v1/mobilemart/purchase/:vasType
     * @body { merchantProductId, amount, mobileNumber/accountNumber/meterNumber, etc. }
     */
    async purchaseProduct(req, res) {
        try {
            const { vasType } = req.params;
            const { merchantProductId, amount, mobileNumber, accountNumber, meterNumber, reference, ...rest } = req.body;
            // Validate required fields
            if (!vasType || !merchantProductId || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'VAS type, merchantProductId, and amount are required'
                });
            }
            // Validate amount
            if (!Number.isInteger(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer (in cents)'
                });
            }
            // Validate reference (optional, but recommended for idempotency)
            const txnReference = reference || `MM_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            // Build request payload
            const requestData = {
                merchantProductId,
                amount,
                reference: txnReference,
                ...(mobileNumber && { mobileNumber }),
                ...(accountNumber && { accountNumber }),
                ...(meterNumber && { meterNumber }),
                ...rest
            };
            // MobileMart Fulcrum API structure: /api/v1/{vasType}/purchase or /api/v1/{vasType}/pay
            // VAS types: airtime, data, voucher, billpayment, prepaidutility
            const normalizedVasType = this.normalizeVasType(vasType);
            const endpoint = vasType === 'billpayment' ? `/${normalizedVasType}/pay` : `/${normalizedVasType}/purchase`;
            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                endpoint,
                requestData
            );
            res.json({
                success: true,
                data: {
                    transaction: response,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ MobileMart Controller: Error purchasing product:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase MobileMart product',
                message: error.message
            });
        }
    }
}

module.exports = MobileMartController; 