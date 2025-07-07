/**
 * Flash Controller - MyMoolah Treasury Platform
 * 
 * Handles all Flash Partner API v4 transactional endpoints
 * Includes 1Voucher, Gift Vouchers, Cash Out PIN, Cellular, and Prepaid Utilities
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const FlashAuthService = require('../services/flashAuthService');

class FlashController {
    constructor() {
        this.authService = new FlashAuthService();
        console.log('✅ Flash Controller: Initialized');
    }

    /**
     * Health check for Flash integration
     */
    async healthCheck(req, res) {
        try {
            const health = await this.authService.healthCheck();
            
            res.json({
                success: true,
                data: {
                    service: 'Flash API',
                    status: health.status,
                    timestamp: new Date().toISOString(),
                    details: health
                }
            });
        } catch (error) {
            console.error('❌ Flash Controller: Health check error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Flash service health check failed',
                message: error.message
            });
        }
    }

    /**
     * List products for an account
     */
    async listProducts(req, res) {
        try {
            const { accountNumber } = req.params;
            
            if (!accountNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Account number is required'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            const products = await this.authService.makeAuthenticatedRequest(
                'GET',
                `/accounts/${accountNumber}/products`
            );

            res.json({
                success: true,
                data: {
                    accountNumber,
                    products: products || [],
                    count: Array.isArray(products) ? products.length : 0,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Flash Controller: Error listing products:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to list Flash products',
                message: error.message
            });
        }
    }

    /**
     * Lookup a specific product
     */
    async lookupProduct(req, res) {
        try {
            const { accountNumber, productCode } = req.params;
            
            if (!accountNumber || !productCode) {
                return res.status(400).json({
                    success: false,
                    error: 'Account number and product code are required'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            const product = await this.authService.makeAuthenticatedRequest(
                'GET',
                `/accounts/${accountNumber}/products/${productCode}`
            );

            res.json({
                success: true,
                data: {
                    accountNumber,
                    productCode,
                    product,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Flash Controller: Error looking up product:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to lookup Flash product',
                message: error.message
            });
        }
    }

    /**
     * Purchase a 1Voucher
     */
    async purchase1Voucher(req, res) {
        try {
            const { reference, accountNumber, amount, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, and amount are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format (only alphanumeric, -, ., = allowed)'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format (max 9 properties, 10 chars name, 43 chars value)'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/1voucher/purchase',
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
            console.error('❌ Flash Controller: Error purchasing 1Voucher:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase 1Voucher',
                message: error.message
            });
        }
    }

    /**
     * Disburse a 1Voucher
     */
    async disburse1Voucher(req, res) {
        try {
            const { reference, accountNumber, amount, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, and amount are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/1voucher/disburse',
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
            console.error('❌ Flash Controller: Error disbursing 1Voucher:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to disburse 1Voucher',
                message: error.message
            });
        }
    }

    /**
     * Redeem a 1Voucher
     */
    async redeem1Voucher(req, res) {
        try {
            const { reference, accountNumber, pin, amount, mobileNumber, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !pin || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, pin, and amount are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!/^\d{16}$/.test(pin)) {
                return res.status(400).json({
                    success: false,
                    error: 'Pin must be exactly 16 digits'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (mobileNumber && !this.authService.validateMobileNumber(mobileNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid mobile number format (11 digits, 27 country code, no leading 0)'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                pin,
                amount,
                ...(mobileNumber && { mobileNumber }),
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/1voucher/redeem',
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
            console.error('❌ Flash Controller: Error redeeming 1Voucher:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to redeem 1Voucher',
                message: error.message
            });
        }
    }

    /**
     * Refund a 1Voucher redemption
     */
    async refund1Voucher(req, res) {
        try {
            const { reference, accountNumber, amount, mobileNumber, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, and amount are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (mobileNumber && !this.authService.validateMobileNumber(mobileNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid mobile number format'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                ...(mobileNumber && { mobileNumber }),
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/1voucher/refund',
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
            console.error('❌ Flash Controller: Error refunding 1Voucher:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to refund 1Voucher',
                message: error.message
            });
        }
    }

    /**
     * Purchase a Gift Voucher
     */
    async purchaseGiftVoucher(req, res) {
        try {
            const { reference, accountNumber, amount, productCode, storeId, terminalId, barcode, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount || !productCode || !storeId || !terminalId) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, amount, product code, store ID, and terminal ID are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (!Number.isInteger(productCode) || productCode <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Product code must be a positive integer'
                });
            }

            if (!/^[a-zA-Z0-9]+$/.test(storeId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Store ID must be alphanumeric'
                });
            }

            if (!/^[a-zA-Z0-9]+$/.test(terminalId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Terminal ID must be alphanumeric'
                });
            }

            if (barcode && !/^[a-zA-Z0-9]+$/.test(barcode)) {
                return res.status(400).json({
                    success: false,
                    error: 'Barcode must be alphanumeric'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                productCode,
                storeId,
                terminalId,
                ...(barcode && { barcode }),
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/gift-vouchers/purchase',
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
            console.error('❌ Flash Controller: Error purchasing gift voucher:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase gift voucher',
                message: error.message
            });
        }
    }

    /**
     * Purchase a Cash Out PIN
     */
    async purchaseCashOutPin(req, res) {
        try {
            const { reference, accountNumber, amount, productCode, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount || !productCode) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, amount, and product code are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (!Number.isInteger(productCode) || productCode <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Product code must be a positive integer'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                productCode,
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/cash-out-pin/purchase',
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
            console.error('❌ Flash Controller: Error purchasing cash out PIN:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase cash out PIN',
                message: error.message
            });
        }
    }

    /**
     * Cancel a Cash Out PIN purchase
     */
    async cancelCashOutPin(req, res) {
        try {
            const { reference, accountNumber, serial, productCode, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !serial || !productCode) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, serial, and product code are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!/^[a-zA-Z0-9]+$/.test(serial)) {
                return res.status(400).json({
                    success: false,
                    error: 'Serial must be alphanumeric'
                });
            }

            if (!Number.isInteger(productCode) || productCode <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Product code must be a positive integer'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                serial,
                productCode,
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/cash-out-pin/cancel',
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
            console.error('❌ Flash Controller: Error cancelling cash out PIN:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to cancel cash out PIN',
                message: error.message
            });
        }
    }

    /**
     * Purchase a Cellular Pinless Recharge
     */
    async purchaseCellularRecharge(req, res) {
        try {
            const { reference, subAccountNumber, amount, productCode, mobileNumber, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !subAccountNumber || !amount || !productCode || !mobileNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, sub account number, amount, product code, and mobile number are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(subAccountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid sub account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (!Number.isInteger(productCode) || productCode <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Product code must be a positive integer'
                });
            }

            if (!this.authService.validateMobileNumber(mobileNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid mobile number format'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                subAccountNumber,
                amount,
                productCode,
                mobileNumber,
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/cellular/pinless/purchase',
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
            console.error('❌ Flash Controller: Error purchasing cellular recharge:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase cellular recharge',
                message: error.message
            });
        }
    }

    /**
     * Purchase an Eezi Voucher
     */
    async purchaseEeziVoucher(req, res) {
        try {
            const { reference, accountNumber, amount, productCode, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount || !productCode) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, amount, and product code are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (!Number.isInteger(productCode) || productCode <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Product code must be a positive integer'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                productCode,
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/eezi-voucher/purchase',
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
            console.error('❌ Flash Controller: Error purchasing Eezi voucher:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase Eezi voucher',
                message: error.message
            });
        }
    }

    /**
     * Lookup a meter number for prepaid utilities
     */
    async lookupMeter(req, res) {
        try {
            const { reference, accountNumber, amount, meterNumber, isFBE, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount || !meterNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, amount, and meter number are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (!/^[a-zA-Z0-9]+$/.test(meterNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Meter number must be alphanumeric'
                });
            }

            if (isFBE !== undefined && typeof isFBE !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'isFBE must be a boolean value'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                meterNumber,
                ...(isFBE !== undefined && { isFBE }),
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/prepaid-utilities/lookup',
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
            console.error('❌ Flash Controller: Error looking up meter:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to lookup meter',
                message: error.message
            });
        }
    }

    /**
     * Purchase a prepaid utility voucher
     */
    async purchasePrepaidUtility(req, res) {
        try {
            const { reference, accountNumber, amount, transactionID, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount || !transactionID) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, amount, and transaction ID are required'
                });
            }

            // Validate field formats
            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid reference format'
                });
            }

            if (!this.authService.validateAccountNumber(accountNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid account number format'
                });
            }

            if (!this.authService.validateAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive integer in cents'
                });
            }

            if (!Number.isInteger(transactionID) || transactionID <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction ID must be a positive integer'
                });
            }

            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metadata format'
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                transactionID,
                ...(metadata && { metadata })
            };

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/prepaid-utilities/purchase',
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
            console.error('❌ Flash Controller: Error purchasing prepaid utility:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase prepaid utility',
                message: error.message
            });
        }
    }
}

module.exports = FlashController; 