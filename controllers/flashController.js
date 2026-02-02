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
const { sequelize, FlashTransaction } = require('../models');
const supplierPricing = require('../services/supplierPricingService');

class FlashController {
    constructor() {
        this.authService = new FlashAuthService();
    
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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

            // Enforce eeziCash cap: R50–R500 (in cents)
            if (amount < 5000 || amount > 50000) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be between R50 and R500 for eeziCash'
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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

            // Flash Cash-Out Fee Structure:
            // Customer pays: Face value + R8.00 fee (VAT Inclusive)
            // Flash charges MM: R5.00 (VAT Exclusive) = R5.75 (VAT Inclusive @ 15%)
            // MM revenue: R8.00 - R5.75 = R2.25 (VAT Inclusive)
            const faceValueCents = amount; // Amount in cents
            const customerFeeCents = 800; // R8.00 flat fee (VAT Inclusive)
            const totalCustomerChargeCents = faceValueCents + customerFeeCents;
            
            const flashFeeCents = 500; // R5.00 (VAT Exclusive)
            const VAT_RATE = 0.15;
            const flashFeeVatCents = Math.round(flashFeeCents * VAT_RATE); // R0.75
            const flashFeeTotalCents = flashFeeCents + flashFeeVatCents; // R5.75 (VAT Inclusive)
            
            const mmRevenueCents = customerFeeCents - flashFeeTotalCents; // R8.00 - R5.75 = R2.25
            
            console.log(`💰 Flash Cash-Out Fee Breakdown:`);
            console.log(`   Face Value: R${(faceValueCents / 100).toFixed(2)}`);
            console.log(`   Customer Fee: R${(customerFeeCents / 100).toFixed(2)} (VAT Incl)`);
            console.log(`   Total Customer Charge: R${(totalCustomerChargeCents / 100).toFixed(2)}`);
            console.log(`   Flash Fee: R${(flashFeeCents / 100).toFixed(2)} (VAT Excl) + R${(flashFeeVatCents / 100).toFixed(2)} VAT = R${(flashFeeTotalCents / 100).toFixed(2)}`);
            console.log(`   MM Revenue: R${(mmRevenueCents / 100).toFixed(2)}`);

            // Get user wallet
            const { Wallet, Transaction, VasTransaction, VasProduct } = require('../models');
            const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
            
            if (!wallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Wallet not found'
                });
            }

            // Check sufficient balance
            if (wallet.balance < (totalCustomerChargeCents / 100)) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient wallet balance',
                    details: {
                        required: totalCustomerChargeCents / 100,
                        available: wallet.balance
                    }
                });
            }

            const requestData = {
                reference,
                accountNumber,
                amount,
                productCode,
                ...(metadata && { metadata })
            };

            // Determine if using real Flash API or simulation
            const useFlashAPI = process.env.FLASH_LIVE_INTEGRATION === 'true';
            let flashResponse = null;
            let cashOutPin = null;

            if (useFlashAPI) {
                // PRODUCTION/STAGING: Call real Flash API
                console.log('📞 Flash: Calling cash-out PIN purchase API...');
                flashResponse = await this.authService.makeAuthenticatedRequest(
                    'POST',
                    '/cash-out-pin/purchase',
                    requestData
                );
                
                console.log('✅ Flash: Cash-out response received');
                
                // Extract PIN from Flash response
                const transaction = flashResponse.transaction || flashResponse;
                cashOutPin = transaction?.pin || 
                           transaction?.token || 
                           transaction?.serialNumber || 
                           transaction?.reference || 
                           'PIN_PENDING';
                
                console.log(`✅ Flash cash-out PIN extracted: ${cashOutPin.substring(0, 4)}***`);
            } else {
                // UAT/SIMULATION: Generate fake PIN
                cashOutPin = `EZ${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
                flashResponse = { simulated: true, pin: cashOutPin };
                console.log(`🧪 Simulation: Generated fake PIN: ${cashOutPin}`);
            }

            // Create VasProduct for Flash cash-out if it doesn't exist
            const [vasProduct] = await VasProduct.findOrCreate({
                where: {
                    supplierId: 'FLASH',
                    supplierProductId: 'FLASH_CASH_OUT_PIN'
                },
                defaults: {
                    supplierId: 'FLASH',
                    supplierProductId: 'FLASH_CASH_OUT_PIN',
                    productName: 'Flash Eezi Cash',
                    vasType: 'cash_out',
                    transactionType: 'voucher',
                    provider: 'Flash',
                    networkType: 'local',
                    predefinedAmounts: null,
                    minAmount: 5000, // R50
                    maxAmount: 50000, // R500
                    commission: 0,
                    fixedFee: customerFeeCents, // R8.00 fee
                    isPromotional: false,
                    isActive: true,
                    metadata: {
                        flatFee: true,
                        customerFee: customerFeeCents,
                        flashFee: flashFeeTotalCents,
                        mmRevenue: mmRevenueCents
                    }
                }
            });

            // Create VasTransaction record
            const vasTransactionId = `VAS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const vasTransaction = await VasTransaction.create({
                transactionId: vasTransactionId,
                userId: req.user.id,
                walletId: wallet.walletId,
                vasProductId: vasProduct.id,
                vasType: 'cash_out',
                transactionType: 'voucher',
                supplierId: 'FLASH',
                supplierProductId: 'FLASH_CASH_OUT_PIN',
                amount: faceValueCents,
                fee: customerFeeCents,
                totalAmount: totalCustomerChargeCents,
                mobileNumber: null,
                status: 'completed',
                reference: reference,
                supplierReference: flashResponse?.transactionId || flashResponse?.reference || reference,
                metadata: {
                    productCode: productCode,
                    accountNumber: accountNumber,
                    pin: cashOutPin,
                    faceValue: faceValueCents,
                    customerFee: customerFeeCents,
                    totalCharge: totalCustomerChargeCents,
                    flashFee: flashFeeTotalCents,
                    flashFeeVAT: flashFeeVatCents,
                    mmRevenue: mmRevenueCents,
                    useFlashAPI: useFlashAPI,
                    flashResponse: useFlashAPI ? flashResponse : null,
                    processedAt: new Date().toISOString()
                }
            });

            // Debit wallet (face value + fee)
            await wallet.debit(totalCustomerChargeCents / 100, 'payment');
            console.log(`💳 Wallet debited: R${(totalCustomerChargeCents / 100).toFixed(2)}`);

            // Create wallet ledger transaction
            const ledgerTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const ledgerTransaction = await Transaction.create({
                transactionId: ledgerTransactionId,
                userId: req.user.id,
                walletId: wallet.walletId,
                amount: totalCustomerChargeCents / 100, // Total amount (face value + fee)
                type: 'payment',
                status: 'completed',
                description: 'Flash Eezi Cash purchase',
                metadata: {
                    vasTransactionId: vasTransaction.id,
                    vasType: 'cash_out', // For identification in transaction modal
                    serviceType: 'cash_out', // Additional identifier
                    faceValue: faceValueCents / 100,
                    transactionFee: customerFeeCents / 100,
                    pin: cashOutPin,
                    reference: reference,
                    supplierCode: 'FLASH',
                    channel: 'flash_controller'
                },
                currency: wallet.currency
            });

            // Post to ledger (Flash float account + VAT)
            try {
                const { postCommissionVatAndLedger } = require('../services/commissionVatService');
                
                await postCommissionVatAndLedger({
                    commissionCents: flashFeeCents, // R5.00 to Flash (VAT Excl)
                    supplierCode: 'FLASH',
                    serviceType: 'cash_out',
                    walletTransactionId: ledgerTransaction.transactionId,
                    sourceTransactionId: vasTransaction.transactionId,
                    idempotencyKey: reference,
                    purchaserUserId: req.user.id
                });
                
                console.log(`📒 Ledger posted: Flash fee R${(flashFeeCents / 100).toFixed(2)} + VAT R${(flashFeeVatCents / 100).toFixed(2)}`);
            } catch (ledgerError) {
                console.error('⚠️ Ledger posting failed:', ledgerError.message);
                // Continue - transaction already completed
            }

            res.json({
                success: true,
                data: {
                    transaction: flashResponse,
                    pin: cashOutPin,
                    reference: reference,
                    transactionId: vasTransactionId,
                    amount: faceValueCents / 100,
                    fee: customerFeeCents / 100,
                    totalCharged: totalCustomerChargeCents / 100,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Flash Controller: Error purchasing cash out PIN:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase cash out PIN',
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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

            // Banking-grade: determine current commission tier (volume-based)
            const commissionRatePct = await supplierPricing.getCommissionRatePct('FLASH', 'eezi_voucher');

            const faceValueCents = amount;
            const commissionCents = supplierPricing.computeCommission(faceValueCents, commissionRatePct);
            const netRevenueCents = commissionCents; // revenue equals commission for eeziCash

            // Load fees from schedule (VAT exclusive)
            const { fees } = await supplierPricing.getFees('FLASH', 'eezi_voucher');
            const generationFeeCents = Number(fees['token_generation'] || 0);
            const redemptionFeeCents = Number(fees['token_redemption'] || 0);

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

            // Persist transaction (do not expose commission in API response)
            try {
              await FlashTransaction.create({
                reference,
                accountNumber,
                serviceType: 'eezi_voucher',
                operation: 'purchase',
                amount,
                productCode,
                status: 'completed',
                faceValueCents,
                commissionRatePct,
                commissionCents,
                netRevenueCents,
                generationFeeCents,
                redemptionFeeCents,
                vatExclusive: true,
                metadata: metadata || null,
                flashResponseCode: String(response?.responseCode ?? '0'),
                flashResponseMessage: response?.responseMessage || 'OK'
              });
            } catch (persistErr) {
              console.error('⚠️ Failed to persist eezi voucher transaction:', persistErr.message);
            }

            res.json({
                success: true,
                data: {
                    transaction: response,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            // Persist failed attempt for audit
            try {
              const { reference, accountNumber, amount, productCode, metadata } = req.body || {};
              await FlashTransaction.create({
                reference: reference || this.authService.generateReference('MM_EEZI_FAIL'),
                accountNumber: accountNumber || 'unknown',
                serviceType: 'eezi_voucher',
                operation: 'purchase',
                amount: amount || 0,
                productCode: productCode || null,
                status: 'failed',
                errorMessage: error.message,
                metadata: metadata || null
              });
            } catch (persistErr) {
              console.error('⚠️ Failed to persist failed eezi voucher transaction:', persistErr.message);
            }
            console.error('❌ Flash Controller: Error purchasing Eezi voucher:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to purchase Eezi voucher',
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
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
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
            });
        }
    }
}

module.exports = FlashController; 