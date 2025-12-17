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
            'billpayment': 'bill-payment',  // CORRECTED: Uses hyphen in API path
            'bill_payment': 'bill-payment',
            'bill-payment': 'bill-payment',
            'electricity': 'utility',  // CORRECTED: Maps to 'utility' not 'prepaidutility'
            'prepaidutility': 'utility',  // CORRECTED: API uses 'utility' not 'prepaidutility'
            'prepaid-utility': 'utility',  // CORRECTED: API uses 'utility'
            'utility': 'utility'  // CORRECTED: Direct mapping
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
            // MobileMart Fulcrum API structure: /v1/{vasType}/products (from Swagger docs)
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
     * @body { requestId, merchantProductId, tenderType, amount, mobileNumber, prevendTransactionId, etc. }
     * 
     * Request schemas per VAS type:
     * - Airtime Pinless: requestId, merchantProductId, tenderType, mobileNumber, amount (optional)
     * - Airtime Pinned: requestId, merchantProductId, tenderType, amount (optional)
     * - Data Pinless: requestId, merchantProductId, tenderType, mobileNumber
     * - Data Pinned: requestId, merchantProductId, tenderType
     * - Voucher: requestId, merchantProductId, tenderType, amount (optional)
     * - Bill Payment: requestId, prevendTransactionId, tenderType, amount, tenderPan (optional)
     * - Utility: requestId, prevendTransactionId, tenderType, tenderPan (optional)
     */
    async purchaseProduct(req, res) {
        try {
            const { vasType } = req.params;
            const { 
                requestId, 
                merchantProductId, 
                tenderType = 'CreditCard',  // Default to CreditCard
                amount, 
                mobileNumber, 
                prevendTransactionId,
                tenderPan,
                pinned,  // Boolean to determine pinned vs pinless
                ...rest 
            } = req.body;
            
            // Generate requestId if not provided
            const txnRequestId = requestId || `MM_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            
            // Validate required fields based on VAS type
            const normalizedVasType = this.normalizeVasType(vasType);
            
            if (!merchantProductId) {
                return res.status(400).json({
                    success: false,
                    error: 'merchantProductId is required'
                });
            }
            
            // Build request payload according to MobileMart API schemas
            let requestData = {
                requestId: txnRequestId,
                merchantProductId,
                tenderType
            };
            
            // VAS-specific request construction
            if (normalizedVasType === 'bill-payment') {
                // Bill Payment requires prevend flow
                if (!prevendTransactionId) {
                    return res.status(400).json({
                        success: false,
                        error: 'prevendTransactionId is required for bill payment. Call /v2/bill-payment/prevend first.'
                    });
                }
                if (!amount) {
                    return res.status(400).json({
                        success: false,
                        error: 'amount is required for bill payment'
                    });
                }
                requestData = {
                    requestId: txnRequestId,
                    prevendTransactionId,
                    tenderType,
                    amount,
                    ...(tenderPan && { tenderPan })
                };
            } else if (normalizedVasType === 'utility') {
                // Utility requires prevend flow
                if (!prevendTransactionId) {
                    return res.status(400).json({
                        success: false,
                        error: 'prevendTransactionId is required for utility. Call /v1/utility/prevend first.'
                    });
                }
                requestData = {
                    requestId: txnRequestId,
                    prevendTransactionId,
                    tenderType,
                    ...(tenderPan && { tenderPan })
                };
            } else if (normalizedVasType === 'airtime' || normalizedVasType === 'data') {
                // Airtime/Data: Check if pinned or pinless
                const isPinned = pinned !== undefined ? pinned : false;  // Default to pinless
                
                if (isPinned) {
                    // Pinned: no mobileNumber needed
                    requestData = {
                        requestId: txnRequestId,
                        merchantProductId,
                        tenderType,
                        ...(amount && { amount })  // Optional for FixedAmount products
                    };
                } else {
                    // Pinless: mobileNumber required
                    if (!mobileNumber) {
                        return res.status(400).json({
                            success: false,
                            error: 'mobileNumber is required for pinless airtime/data'
                        });
                    }
                    requestData = {
                        requestId: txnRequestId,
                        merchantProductId,
                        tenderType,
                        mobileNumber,
                        ...(amount && { amount })  // Optional for FixedAmount products
                    };
                }
            } else if (normalizedVasType === 'voucher') {
                // Voucher: amount optional for FixedAmount products
                requestData = {
                    requestId: txnRequestId,
                    merchantProductId,
                    tenderType,
                    ...(amount && { amount })
                };
            }
            
            // Determine endpoint based on VAS type and pinned/pinless
            // Note: apiUrl already includes /v1, so endpoints should NOT include /v1 prefix
            let endpoint;
            if (normalizedVasType === 'bill-payment') {
                endpoint = '/v2/bill-payment/pay';  // Note: v2 for bill payment (special case)
            } else if (normalizedVasType === 'utility') {
                endpoint = '/utility/purchase';
            } else if (normalizedVasType === 'airtime' || normalizedVasType === 'data') {
                const isPinned = pinned !== undefined ? pinned : false;
                endpoint = isPinned 
                    ? `/${normalizedVasType}/pinned`
                    : `/${normalizedVasType}/pinless`;
            } else {
                // Voucher
                endpoint = `/${normalizedVasType}/purchase`;
            }
            
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