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
        // In-memory cache for discovered eezi-voucher product code
        this._eeziVoucherProductCode = null;
    }

    /**
     * Resolve the eeziAirtime Token product code.
     *
     * Resolution order:
     *   1. In-process cache (fastest — avoids repeated DB hits)
     *   2. Our own product_variants table (synced from Flash via sync-flash-catalog.js)
     *      — looks for a FLASH variant whose metadata.flash_product_group contains "eezi"
     *   3. Live Flash catalog API (fallback if DB has no matching variant yet)
     *
     * The Flash catalog API endpoint (/accounts/{id}/products) returns products
     * filtered to the account's enabled product set, which may not include all
     * product groups depending on account configuration.  Querying our own DB
     * first is therefore more reliable and avoids an extra round-trip.
     */
    async _resolveEeziVoucherProductCode() {
        if (this._eeziVoucherProductCode) return this._eeziVoucherProductCode;

        // ── 1. Query our own product_variants table (primary source of truth) ──
        //
        // sync-flash-catalog.js syncs the Flash catalog into product_variants and
        // stores:  supplier_product_id = Flash productCode (e.g. "420")
        //          metadata->>'flash_product_group' = "Eezi Vouchers"
        //
        // We use a raw SQL query to avoid Sequelize alias ambiguity when using
        // sequelize.literal() alongside JOIN includes.
        try {
            const [rows] = await sequelize.query(`
                SELECT pv."supplierProductId"
                FROM   product_variants pv
                JOIN   suppliers s ON s.id = pv."supplierId"
                WHERE  pv.status = 'active'
                  AND  pv."supplierProductId" IS NOT NULL
                  AND  s.code = 'FLASH'
                  AND  pv.metadata->>'flash_product_group' ILIKE '%eezi%'
                LIMIT 1
            `);

            if (rows && rows.length > 0 && rows[0].supplierProductId) {
                const code = parseInt(rows[0].supplierProductId, 10);
                if (code > 0) {
                    console.log(`✅ Flash: Resolved eezi-voucher product code from product_variants DB: ${code}`);
                    this._eeziVoucherProductCode = code;
                    return code;
                }
            }
            console.warn('⚠️ Flash: No eezi variant found in product_variants. Falling back to live Flash catalog API.');
        } catch (dbErr) {
            console.warn('⚠️ Flash: DB lookup for eezi-voucher product code failed, falling back to API:', dbErr.message);
        }

        // ── 2. Fallback: query the live Flash catalog API ────────────────────
        //
        // This path runs only if the DB lookup fails (e.g. catalog not yet synced).
        // The Flash API v4 endpoint is:
        //   GET /aggregation/4.0/accounts/{accountNumber}/products?includeInstructions=false
        // (makeAuthenticatedRequest prepends /aggregation/4.0 automatically)
        //
        // The eeziAirtime Token product has:
        //   productName:  "R2 - R999 eeziAirtime Token"
        //   productGroup: "Eezi Vouchers"
        // Match on "eezi" in either field — case-insensitive.
        const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
        if (!accountNumber) throw new Error('FLASH_ACCOUNT_NUMBER not configured');

        console.log('🔍 Flash: Querying live Flash catalog API for eezi-voucher product code...');
        const response = await this.authService.makeAuthenticatedRequest(
            'GET',
            `/accounts/${accountNumber}/products?includeInstructions=false`
        );

        const products = response.products || response || [];

        const eeziProduct = products.find(p => {
            const name  = (p.productName  || p.name          || '').toLowerCase();
            const group = (p.productGroup || p.category || p.type || '').toLowerCase();
            return name.includes('eezi') || group.includes('eezi');
        });

        if (!eeziProduct) {
            console.error('❌ Flash: eezi-voucher product not found in live catalog.');
            console.error('❌ Flash: All products returned by Flash API:',
                products.map(p => `${p.productCode}:${p.productName || p.name}:${p.productGroup || ''}`));
            throw new Error(
                'eeziAirtime Token product not found in Flash catalog or product_variants DB. ' +
                'Run: node scripts/sync-flash-catalog.js to populate the catalog.'
            );
        }

        const code = parseInt(eeziProduct.productCode || eeziProduct.code, 10);
        if (!code || code <= 0) throw new Error(`Invalid product code from Flash catalog: ${eeziProduct.productCode}`);

        console.log(`✅ Flash: Resolved eezi-voucher product code from live Flash API: ${code} (${eeziProduct.productName || eeziProduct.name})`);
        this._eeziVoucherProductCode = code;
        return code;
    }

    /**
     * Resolve the eeziPower (electricity PIN voucher) product code from Flash.
     * Mirrors _resolveEeziVoucherProductCode but specifically targets "power" products.
     */
    async _resolveEeziPowerProductCode() {
        if (this._eeziPowerProductCode) return this._eeziPowerProductCode;

        try {
            const [rows] = await sequelize.query(`
                SELECT pv."supplierProductId"
                FROM   product_variants pv
                JOIN   suppliers s ON s.id = pv."supplierId"
                WHERE  pv.status = 'active'
                  AND  pv."supplierProductId" IS NOT NULL
                  AND  s.code = 'FLASH'
                  AND  (pv.metadata->>'flash_product_group' ILIKE '%eezi%'
                        AND (pv.metadata->>'flash_product_name' ILIKE '%power%'
                             OR pv.name ILIKE '%power%'))
                LIMIT 1
            `);

            if (rows && rows.length > 0 && rows[0].supplierProductId) {
                const code = parseInt(rows[0].supplierProductId, 10);
                if (code > 0) {
                    console.log(`✅ Flash: Resolved eeziPower product code from product_variants DB: ${code}`);
                    this._eeziPowerProductCode = code;
                    return code;
                }
            }
            console.warn('⚠️ Flash: No eeziPower variant found in product_variants. Falling back to live Flash catalog API.');
        } catch (dbErr) {
            console.warn('⚠️ Flash: DB lookup for eeziPower product code failed, falling back to API:', dbErr.message);
        }

        const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
        if (!accountNumber) throw new Error('FLASH_ACCOUNT_NUMBER not configured');

        console.log('🔍 Flash: Querying live Flash catalog API for eeziPower product code...');
        const response = await this.authService.makeAuthenticatedRequest(
            'GET',
            `/accounts/${accountNumber}/products?includeInstructions=false`
        );

        const products = response.products || response || [];

        const powerProduct = products.find(p => {
            const name  = (p.productName  || p.name          || '').toLowerCase();
            const group = (p.productGroup || p.category || p.type || '').toLowerCase();
            return (group.includes('eezi') && name.includes('power'));
        });

        if (!powerProduct) {
            console.error('❌ Flash: eeziPower product not found in live catalog.');
            console.error('❌ Flash: All eezi products:',
                products.filter(p => ((p.productGroup || '').toLowerCase().includes('eezi') || (p.productName || '').toLowerCase().includes('eezi')))
                    .map(p => `${p.productCode}:${p.productName || p.name}:${p.productGroup || ''}`));
            throw new Error(
                'eeziPower product not found in Flash catalog or product_variants DB. ' +
                'Run: node scripts/sync-flash-catalog.js to populate the catalog.'
            );
        }

        const code = parseInt(powerProduct.productCode || powerProduct.code, 10);
        if (!code || code <= 0) throw new Error(`Invalid product code from Flash catalog: ${powerProduct.productCode}`);

        console.log(`✅ Flash: Resolved eeziPower product code from live Flash API: ${code} (${powerProduct.productName || powerProduct.name})`);
        this._eeziPowerProductCode = code;
        return code;
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
     * Redeem a voucher (1Voucher / FNB / Flash Pay) and credit user's wallet.
     *
     * Fee: 4% of face value (excl VAT) — per Flash contract Mar 2026.
     * MyMoolah does NOT add a markup; user bears Flash's fee only.
     *
     * Flow:
     *   1. User enters 16-digit PIN
     *   2. Backend calls Flash POST /1voucher/redeem
     *   3. Flash returns face value
     *   4. Backend credits wallet with face_value − 4% fee
     */
    async redeemVoucherTopup(req, res) {
        try {
            const { pin, voucherType = '1voucher' } = req.body;

            if (!pin || !/^\d{16}$/.test(pin)) {
                return res.status(400).json({
                    success: false,
                    error: 'A valid 16-digit voucher PIN is required'
                });
            }

            const VOUCHER_PRODUCT_CODES = {
                '1voucher': parseInt(process.env.FLASH_1VOUCHER_PRODUCT_CODE || '1', 10),
                'fnb':      parseInt(process.env.FLASH_FNB_VOUCHER_PRODUCT_CODE || '1', 10),
                'flashpay':  parseInt(process.env.FLASH_FLASHPAY_PRODUCT_CODE || '1', 10),
            };

            const productCode = VOUCHER_PRODUCT_CODES[voucherType];
            if (!productCode) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid voucher type. Must be: 1voucher, fnb, or flashpay'
                });
            }

            const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
            if (!accountNumber) {
                return res.status(500).json({
                    success: false,
                    error: 'FLASH_ACCOUNT_NUMBER not configured'
                });
            }

            const reference = `VTOP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

            // Flash charges 4% excl VAT per deal sheet (Mar 2026).
            // VAT at 15% is added on top. Total deduction = 4% + 0.6% = 4.6%.
            // This is Flash's fee — MMTP earns zero markup. No output VAT for MMTP.
            // MMTP recovers the full cost (fee + VAT) from the user's deposit.
            const FLASH_FEE_RATE_EXCL_VAT = parseFloat(process.env.FLASH_VOUCHER_TOPUP_FEE_PCT || '4') / 100;
            const VAT_RATE = 0.15;
            const useFlashAPI = process.env.FLASH_LIVE_INTEGRATION === 'true';

            let flashResponse = null;
            let faceValueCents = 0;

            if (useFlashAPI) {
                flashResponse = await this.authService.makeAuthenticatedRequest(
                    'POST',
                    '/1voucher/redeem',
                    { reference, accountNumber, pin, productCode }
                );

                const txn = flashResponse?.transaction || flashResponse;
                faceValueCents = parseInt(txn?.amount || txn?.faceValue || txn?.value || '0', 10);

                if (!faceValueCents || faceValueCents <= 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Flash returned an invalid or zero face value for this voucher'
                    });
                }
                console.log(`Flash: Voucher redeemed — face value ${faceValueCents} cents`);
            } else {
                faceValueCents = parseInt(req.body.simulatedAmount || '10000', 10);
                flashResponse = { simulated: true, amount: faceValueCents };
                console.log(`Simulation: Voucher top-up — face value ${faceValueCents} cents`);
            }

            const feeExclVatCents = Math.round(faceValueCents * FLASH_FEE_RATE_EXCL_VAT);
            const feeVatCents = Math.round(feeExclVatCents * VAT_RATE);
            const feeCents = feeExclVatCents + feeVatCents;
            const netDepositCents = faceValueCents - feeCents;

            const { Wallet, Transaction, VasTransaction, VasProduct, sequelize } = require('../models');
            const { postVoucherDepositAndRestriction } = require('../services/restrictedFundsService');

            const wallet = await Wallet.findOne({ where: { userId: req.user.id } });

            if (!wallet) {
                return res.status(404).json({ success: false, error: 'Wallet not found' });
            }

            const [vasProduct] = await VasProduct.findOrCreate({
                where: { supplierId: 'FLASH', supplierProductId: `FLASH_${voucherType.toUpperCase()}_TOPUP` },
                defaults: {
                    supplierId: 'FLASH',
                    supplierProductId: `FLASH_${voucherType.toUpperCase()}_TOPUP`,
                    productName: `Flash ${voucherType === 'fnb' ? 'FNB Voucher' : voucherType === 'flashpay' ? 'Flash Pay' : '1Voucher'} Top-up`,
                    vasType: 'voucher_topup',
                    transactionType: 'topup',
                    provider: 'Flash',
                    networkType: 'local',
                    predefinedAmounts: null,
                    minAmount: 1000,
                    maxAmount: 300000,
                    commission: 0,
                    fixedFee: 0,
                    isPromotional: false,
                    isActive: true,
                    metadata: { feeRateExclVat: FLASH_FEE_RATE_EXCL_VAT, vatRate: VAT_RATE, voucherType }
                }
            });

            const netDepositRand = netDepositCents / 100;
            const faceValueRand = faceValueCents / 100;
            const feeRand = feeCents / 100;

            const t = await sequelize.transaction();
            let mainTransactionId;
            try {
                const vasTransactionId = `VAS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                await VasTransaction.create({
                    transactionId: vasTransactionId,
                    userId: req.user.id,
                    walletId: wallet.walletId,
                    vasProductId: vasProduct.id,
                    vasType: 'voucher_topup',
                    transactionType: 'topup',
                    supplierId: 'FLASH',
                    supplierProductId: `FLASH_${voucherType.toUpperCase()}_TOPUP`,
                    amount: faceValueCents,
                    fee: feeCents,
                    totalAmount: netDepositCents,
                    mobileNumber: null,
                    status: 'completed',
                    reference,
                    supplierReference: flashResponse?.transactionId || flashResponse?.reference || reference,
                    metadata: {
                        voucherType,
                        productCode,
                        pin: `****${pin.slice(-4)}`,
                        faceValueCents,
                        feeExclVatCents,
                        feeVatCents,
                        feeCents,
                        feeRateExclVat: FLASH_FEE_RATE_EXCL_VAT,
                        vatRate: VAT_RATE,
                        netDepositCents,
                        useFlashAPI,
                        flashResponse: useFlashAPI ? flashResponse : null,
                        processedAt: new Date().toISOString()
                    }
                }, { transaction: t });

                await wallet.credit(netDepositRand, 'deposit', { transaction: t });

                const currentRestricted = parseFloat(wallet.restrictedBalance || 0);
                wallet.restrictedBalance = parseFloat((currentRestricted + netDepositRand).toFixed(2));
                await wallet.save({ transaction: t });

                console.log(`Wallet credited: R${netDepositRand.toFixed(2)} (face R${faceValueRand.toFixed(2)} - fee R${(feeExclVatCents/100).toFixed(2)} - VAT R${(feeVatCents/100).toFixed(2)}), restricted: R${wallet.restrictedBalance}`);

                mainTransactionId = `VTOP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                await Transaction.create({
                    transactionId: mainTransactionId,
                    userId: req.user.id,
                    walletId: wallet.walletId,
                    amount: netDepositRand,
                    type: 'deposit',
                    status: 'completed',
                    description: `${voucherType === 'fnb' ? 'FNB Voucher' : voucherType === 'flashpay' ? 'Flash Pay' : '1Voucher'} top-up`,
                    currency: wallet.currency,
                    fee: feeRand,
                    metadata: {
                        vasTransactionId,
                        vasType: 'voucher_topup',
                        voucherType,
                        reference,
                        supplierCode: 'FLASH',
                        operationType: 'voucher_topup',
                        faceValue: faceValueRand,
                        fee: feeRand,
                        feeExclVat: feeExclVatCents / 100,
                        feeVat: feeVatCents / 100,
                        feeRate: `${FLASH_FEE_RATE_EXCL_VAT * 100}% excl VAT`,
                        isVoucherTopup: true,
                        isRestricted: true,
                        restrictionSource: 'flash_voucher'
                    }
                }, { transaction: t });

                await t.commit();
            } catch (txError) {
                await t.rollback();
                throw txError;
            }

            try {
                await postVoucherDepositAndRestriction({
                    reference,
                    netDepositRand,
                    faceValueRand,
                    description: `Flash ${voucherType} voucher deposit`
                });
                console.log(`Ledger posted: deposit + restriction JEs for ${reference}`);
            } catch (ledgerError) {
                console.error('Voucher deposit/restriction ledger posting failed:', ledgerError.message);
            }

            // No commissionVatService call — Flash's 4% + VAT fee is a pure pass-through
            // cost to the user. MMTP earns zero markup, so there is no commission revenue
            // and no output VAT. The fee is recorded in transaction/VAS metadata for audit.

            try {
                await FlashTransaction.create({
                    transactionId: reference,
                    accountNumber,
                    serviceType: 'voucher_topup',
                    operation: 'redeem',
                    amount: faceValueCents,
                    reference,
                    status: 'completed',
                    metadata: {
                        voucherType,
                        productCode,
                        faceValueCents,
                        feeExclVatCents,
                        feeVatCents,
                        feeCents,
                        netDepositCents,
                        flashResponse: useFlashAPI ? flashResponse : null
                    }
                });
            } catch (auditErr) {
                console.error('FlashTransaction audit record failed:', auditErr.message);
            }

            res.json({
                success: true,
                data: {
                    faceValue: faceValueRand,
                    fee: feeExclVatCents / 100,
                    feeVat: feeVatCents / 100,
                    feeTotal: feeCents / 100,
                    feeRate: `${FLASH_FEE_RATE_EXCL_VAT * 100}% excl VAT`,
                    netDeposit: netDepositRand,
                    transactionId: mainTransactionId,
                    reference,
                    voucherType,
                    restricted: true,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Flash Controller: Error redeeming voucher top-up:', error.message);

            const flashCode = error.flashError?.code || error.code;
            const VOUCHER_ERROR_MESSAGES = {
                '2401': 'This voucher has already been used.',
                '2402': 'This voucher could not be found. Please check the PIN.',
                '2403': 'This voucher has been cancelled.',
                '2405': 'This voucher has expired.',
                '2406': 'The voucher amount is too small.',
                '2408': 'The voucher amount is too large.',
            };

            const userMessage = VOUCHER_ERROR_MESSAGES[String(flashCode)]
                || 'Failed to redeem voucher. Please try again.';

            res.status(flashCode ? 400 : 500).json({
                success: false,
                error: userMessage,
                ...(error.flashError && { flash: { code: flashCode } })
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
                '/gift-voucher/purchase',
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

            // Cash-out restriction: Flash voucher deposits cannot be cashed out (AML ringfencing)
            const cashOutCheck = wallet.canCashOut(totalCustomerChargeCents / 100);
            if (!cashOutCheck.allowed) {
                return res.status(400).json({
                    success: false,
                    error: cashOutCheck.reason,
                    details: {
                        required: totalCustomerChargeCents / 100,
                        available: parseFloat(wallet.balance) - parseFloat(wallet.restrictedBalance || 0)
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

            // Create TWO separate wallet ledger transactions (EXACT EasyPay pattern)
            // Transaction 1: Voucher/PIN amount ONLY
            const mainTransactionId = `FLASH-CASHOUT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            await Transaction.create({
                transactionId: mainTransactionId,
                userId: req.user.id,
                walletId: wallet.walletId,
                amount: -(faceValueCents / 100), // Negative: Face value only (R -50.00)
                type: 'payment',
                status: 'completed',
                description: `Flash Eezi Cash purchase`,
                currency: wallet.currency,
                fee: 0, // Fee shown as separate transaction
                metadata: {
                    vasTransactionId: vasTransaction.id,
                    vasType: 'cash_out',
                    pin: cashOutPin,
                    reference: reference,
                    supplierCode: 'FLASH',
                    operationType: 'flash_cashout_creation',
                    grossAmount: faceValueCents / 100,
                    isFlashCashoutAmount: true
                }
            });

            // Transaction 2: Fee ONLY
            const feeTransactionId = `FEE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            await Transaction.create({
                transactionId: feeTransactionId,
                userId: req.user.id,
                walletId: wallet.walletId,
                amount: -(customerFeeCents / 100), // Negative: Fee only (R -8.00)
                type: 'fee',
                status: 'completed',
                description: 'Transaction Fee',
                currency: wallet.currency,
                fee: 0,
                metadata: {
                    vasTransactionId: vasTransaction.id,
                    vasType: 'cash_out',
                    feeType: 'flash_cashout_fee',
                    feeAmount: customerFeeCents / 100,
                    supplierCode: 'FLASH',
                    operationType: 'flash_cashout_fee',
                    isFlashCashoutFee: true,
                    relatedTransactionId: mainTransactionId
                }
            });

            // Post to ledger (Flash float account + VAT)
            try {
                const { postCommissionVatAndLedger } = require('../services/commissionVatAndLedger');
                
                await postCommissionVatAndLedger({
                    commissionCents: flashFeeCents, // R5.00 to Flash (VAT Excl)
                    supplierCode: 'FLASH',
                    serviceType: 'cash_out',
                    walletTransactionId: mainTransactionId,
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
            const { reference, accountNumber, amount, productCode, mobileNumber, metadata } = req.body;
            
            // Validate required fields
            if (!reference || !accountNumber || !amount || !productCode || !mobileNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference, account number, amount, product code, and mobile number are required'
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
                accountNumber,
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
     * Purchase an Eezi Voucher (eeziAirtime Token)
     *
     * Full banking-grade flow (mirrors cashOutCreate):
     *  1. Validate & resolve product code
     *  2. Calculate commission / fees
     *  3. Call Flash API
     *  4. Debit user wallet
     *  5. Create wallet Transaction record (shows in history)
     *  6. Post commission / VAT / ledger entries
     *  7. Persist FlashTransaction audit record
     */
    async purchaseEeziVoucher(req, res) {
        try {
            const { reference: rawReference, amount, metadata, type } = req.body;

            const reference = rawReference ? String(rawReference).replace(/_/g, '-') : rawReference;
            const isEeziPower = type === 'power';

            const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
            const storeId    = process.env.FLASH_STORE_ID    || process.env.FLASH_ACCOUNT_NUMBER?.replace(/-/g, '').slice(0, 12) || 'MYMOOLAHDIGITAL';
            const terminalId = process.env.FLASH_TERMINAL_ID || process.env.FLASH_ACCOUNT_NUMBER?.replace(/-/g, '').slice(0, 12) || 'MYMOOLAHPOS01';

            if (!reference || !amount) {
                return res.status(400).json({ success: false, error: 'Reference and amount are required' });
            }
            if (!accountNumber) {
                return res.status(500).json({ success: false, error: 'Flash account not configured' });
            }

            let productCode;
            try {
                productCode = isEeziPower
                    ? await this._resolveEeziPowerProductCode()
                    : await this._resolveEeziVoucherProductCode();
            } catch (err) {
                const label = isEeziPower ? 'eeziPower' : 'eezi-voucher';
                console.error(`❌ Failed to resolve ${label} product code:`, err.message);
                return res.status(500).json({ success: false, error: `Flash ${label} product code not available`, details: err.message });
            }

            if (!this.authService.validateReference(reference)) {
                return res.status(400).json({ success: false, error: 'Invalid reference format' });
            }

            const amountInt = Number.isInteger(amount) ? amount : parseInt(amount, 10);
            if (!this.authService.validateAmount(amountInt)) {
                return res.status(400).json({ success: false, error: 'Amount must be a positive integer in cents' });
            }
            if (metadata && !this.authService.validateMetadata(metadata)) {
                return res.status(400).json({ success: false, error: 'Invalid metadata format' });
            }

            const faceValueCents = amountInt;
            const pricingCategory = isEeziPower ? 'eezi_power' : 'eezi_voucher';
            console.log(`📤 ${isEeziPower ? 'eeziPower' : 'eezi-voucher'} purchase:`, { reference, amountInt, productCode });

            // ── Commission & fees ──
            const commissionInfo = await supplierPricing.getCommissionInfo('FLASH', pricingCategory);
            const commissionRatePct = commissionInfo.ratePct;
            const commissionCents = supplierPricing.computeCommissionFromInfo(faceValueCents, commissionInfo);
            const { fees } = await supplierPricing.getFees('FLASH', pricingCategory);
            const generationFeeCents = Number(fees['token_generation'] || 0);
            const redemptionFeeCents = Number(fees['token_redemption'] || 0);

            // ── Wallet: load & check balance ──
            const { Wallet, Transaction, VasProduct, VasTransaction, SupplierFloat } = require('../models');
            const { Op } = require('sequelize');

            const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
            if (!wallet) {
                return res.status(404).json({ success: false, error: 'Wallet not found' });
            }

            const totalChargeCents = faceValueCents;
            const balanceCents = Math.round(Number(wallet.balance) * 100);
            if (balanceCents < totalChargeCents) {
                return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
            }

            // ── Flash API call ──
            const requestData = { reference, accountNumber, amount: amountInt, productCode, storeId, terminalId, ...(metadata && { metadata }) };
            console.log('📤 eezi-voucher → Flash API payload:', { reference, accountNumber, amount: amountInt, productCode, storeId, terminalId });

            const response = await this.authService.makeAuthenticatedRequest('POST', '/eezi-voucher/purchase', requestData);

            // Debug: log Flash response structure (sanitized - no full PIN) to diagnose PIN extraction
            const safeKeys = (obj) => {
                if (!obj || typeof obj !== 'object') return 'null';
                return Object.keys(obj).join(', ');
            };
            console.log('📥 Flash eezi-voucher response keys:', safeKeys(response));
            const nested = response?.transaction || response?.data || response?.result || response?.voucher;
            if (nested && typeof nested === 'object') {
                console.log('📥 Flash nested (transaction/data/result/voucher) keys:', safeKeys(nested));
            }

            // Extract PIN: Flash eezi-voucher returns PIN in response.voucher (pin, pinNumber, code, token, etc.)
            // UAT/sandbox and Production may use different response structures.
            const voucher = response?.voucher;
            const tx = response?.transaction || response?.data || response?.result || response;
            const vd = (typeof tx === 'object' && tx?.voucherDetails) || response?.voucherDetails;

            // Helper: extract string from obj by any of the known PIN-like keys (case-insensitive)
            const extractPin = (obj, keys = ['pin', 'pinNumber', 'voucherPin', 'token', 'code', 'serialNumber', 'pinCode', 'voucherCode', 'value', 'PIN']) => {
                if (!obj || typeof obj !== 'object') return null;
                for (const k of Object.keys(obj)) {
                    const lower = k.toLowerCase();
                    if (keys.some(key => key.toLowerCase() === lower)) {
                        const v = obj[k];
                        if (v != null && typeof v === 'string' && v.trim().length > 0) return v.trim();
                        if (v != null && typeof v === 'number' && !Number.isNaN(v)) return String(v);
                    }
                }
                return null;
            };

            const eeziPin =
                extractPin(voucher) ||
                extractPin(tx) ||
                extractPin(response) ||
                extractPin(vd) ||
                (voucher && typeof voucher === 'object' && (voucher.pin || voucher.pinNumber || voucher.voucherPin || voucher.token || voucher.code || voucher.serialNumber || voucher.pinCode || voucher.voucherCode || voucher.value)) ||
                (typeof tx === 'object' && (tx.pinNumber || tx.pin || tx.voucherPin || tx.token || tx.code || tx.serialNumber)) ||
                response?.pinNumber || response?.pin || response?.voucherPin || response?.token || response?.code ||
                (vd && (vd.pin || vd.pinNumber || vd.code)) ||
                null;

            if (!eeziPin) {
                // Diagnostic: log full response structure (sanitized) when Staging/production returns no PIN
                const safeDump = (o, depth = 0) => {
                    if (depth > 4) return '[max depth]';
                    if (o == null) return String(o);
                    if (typeof o !== 'object') return typeof o;
                    const acc = {};
                    for (const k of Object.keys(o)) {
                        const lower = k.toLowerCase();
                        if (['pin', 'pinnumber', 'token', 'code', 'serialnumber', 'password', 'secret'].some(s => lower.includes(s))) {
                            acc[k] = '[REDACTED]';
                        } else {
                            acc[k] = safeDump(o[k], depth + 1);
                        }
                    }
                    return acc;
                };
                console.warn('⚠️ No PIN extracted from Flash eezi-voucher response. Full response structure (sanitized):', JSON.stringify(safeDump(response)));
            }

            // ── VAS records ──
            const eeziLabel = isEeziPower ? 'eeziPower' : 'eeziAirtime';
            const eeziSupplierProductId = isEeziPower ? 'FLASH_EEZI_POWER_TOKEN' : 'FLASH_EEZI_AIRTIME_TOKEN';
            const eeziVasType = isEeziPower ? 'electricity' : 'airtime';

            const [vasProduct] = await VasProduct.findOrCreate({
                where: { supplierId: 'FLASH', supplierProductId: eeziSupplierProductId },
                defaults: {
                    supplierId: 'FLASH',
                    supplierProductId: eeziSupplierProductId,
                    productName: `${eeziLabel} Token`,
                    vasType: eeziVasType,
                    transactionType: 'voucher',
                    provider: 'Flash',
                    networkType: 'local',
                    predefinedAmounts: null,
                    minAmount: isEeziPower ? 2000 : 200,
                    maxAmount: isEeziPower ? 100000 : 99900,
                    commission: commissionRatePct || 0,
                    fixedFee: 0,
                    isPromotional: false,
                    isActive: true,
                    metadata: { productCode }
                }
            });

            const vasTransactionId = `VAS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const vasTransaction = await VasTransaction.create({
                transactionId: vasTransactionId,
                userId: req.user.id,
                walletId: wallet.walletId,
                vasProductId: vasProduct.id,
                vasType: eeziVasType,
                transactionType: 'voucher',
                supplierId: 'FLASH',
                supplierProductId: eeziSupplierProductId,
                amount: faceValueCents,
                fee: 0,
                totalAmount: totalChargeCents,
                mobileNumber: null,
                status: 'completed',
                reference: reference,
                supplierReference: response?.transactionId || response?.reference || reference,
                metadata: {
                    productCode,
                    accountNumber,
                    pin: eeziPin,
                    faceValue: faceValueCents,
                    commissionRatePct,
                    commissionCents,
                    flashResponse: response,
                    processedAt: new Date().toISOString()
                }
            });

            // ── Debit wallet ──
            await wallet.debit(totalChargeCents / 100, 'payment');
            console.log(`💳 Wallet debited: R${(totalChargeCents / 100).toFixed(2)}`);

            // ── Main VAS ledger entry: user paid → Flash float consumed (zero tolerance reconciliation)
            const ledgerService = require('../services/ledgerService');
            const LEDGER_ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
            const LEDGER_ACCOUNT_FLASH_FLOAT = process.env.LEDGER_ACCOUNT_FLASH_FLOAT || '1200-10-04';
            const faceValueRand = Number((faceValueCents / 100).toFixed(2));
            try {
                await ledgerService.postJournalEntry({
                    reference: `EEZI-${reference}`,
                    description: `${eeziLabel} R${faceValueRand} (Flash eezi-voucher)`,
                    lines: [
                        { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: faceValueRand, memo: `User wallet debit (${eeziLabel})` },
                        { accountCode: LEDGER_ACCOUNT_FLASH_FLOAT, dc: 'credit', amount: faceValueRand, memo: `Flash float consumed (${eeziLabel})` }
                    ]
                });
                // Sync SupplierFloat (operational balance) with ledger
                const flashFloat = await SupplierFloat.findOne({ where: { supplierId: { [Op.iLike]: 'flash' } } });
                if (flashFloat) {
                    await flashFloat.updateBalance(faceValueRand, 'debit');
                }
            } catch (ledgerErr) {
                console.error('⚠️ Failed to post eezi-voucher main ledger entry:', ledgerErr.message);
            }

            // ── Wallet transaction record (appears in history) ──
            const mainTransactionId = `FLASH-EEZI-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            await Transaction.create({
                transactionId: mainTransactionId,
                userId: req.user.id,
                walletId: wallet.walletId,
                amount: -(faceValueCents / 100),
                type: 'payment',
                status: 'completed',
                description: `${eeziLabel} R${(faceValueCents / 100).toFixed(0)} Token`,
                currency: wallet.currency,
                fee: 0,
                metadata: {
                    vasTransactionId: vasTransaction.id,
                    vasType: eeziVasType,
                    pin: eeziPin,
                    reference: reference,
                    supplierCode: 'FLASH',
                    operationType: isEeziPower ? 'eezi_power_token' : 'eezi_airtime_token',
                    grossAmount: faceValueCents / 100,
                    isEeziAirtimeToken: !isEeziPower,
                    isEeziPowerToken: isEeziPower
                }
            });

            // ── Commission / VAT / Ledger ──
            if (commissionCents > 0) {
                try {
                    const { postCommissionVatAndLedger } = require('../services/commissionVatService');
                    await postCommissionVatAndLedger({
                        commissionCents,
                        supplierCode: 'FLASH',
                        serviceType: pricingCategory,
                        walletTransactionId: mainTransactionId,
                        sourceTransactionId: vasTransaction.transactionId,
                        idempotencyKey: reference,
                        purchaserUserId: req.user.id
                    });
                    console.log(`📒 Ledger posted: commission R${(commissionCents / 100).toFixed(2)}`);
                } catch (ledgerError) {
                    console.error('⚠️ Commission/Ledger posting failed:', ledgerError.message);
                }
            }

            // ── Flash audit record ──
            try {
              await FlashTransaction.create({
                transactionId: reference,
                accountNumber,
                serviceType: pricingCategory,
                operation: 'purchase',
                amount: amountInt / 100,
                currency: 'ZAR',
                productId: String(productCode),
                status: 'completed',
                flashReference: String(response?.responseCode ?? '0'),
                faceValueCents: amountInt,
                commissionRatePct: commissionRatePct || 0,
                commissionCents: commissionCents || 0,
                netRevenueCents: commissionCents || 0,
                generationFeeCents: generationFeeCents || 0,
                redemptionFeeCents: redemptionFeeCents || 0,
                vatExclusive: true
              });
            } catch (persistErr) {
              console.error('⚠️ Failed to persist eezi voucher transaction:', persistErr.message);
            }

            res.json({
                success: true,
                data: {
                    transaction: response,
                    pin: eeziPin,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            try {
              const rawRef = (req.body || {}).reference;
              const safeRef = rawRef ? String(rawRef).replace(/_/g, '-') : this.authService.generateReference('MM_EEZI_FAIL');
              const rawAmt = (req.body || {}).amount;
              const safeAmt = Number.isInteger(rawAmt) ? rawAmt : parseInt(rawAmt, 10) || 0;
              await FlashTransaction.create({
                transactionId: safeRef,
                accountNumber: process.env.FLASH_ACCOUNT_NUMBER || 'unknown',
                serviceType: 'eezi_voucher',
                operation: 'purchase',
                amount: safeAmt / 100,
                currency: 'ZAR',
                productId: 'eezi_voucher_420',
                status: 'failed',
                errorMessage: error.message,
                faceValueCents: safeAmt
              });
            } catch (persistErr) {
              console.error('⚠️ Failed to persist failed eezi voucher transaction:', persistErr.message);
            }
            console.error('❌ Flash Controller: Error purchasing Eezi voucher:', error.message, error.flashError || '');
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
    /**
     * Lookup available international airtime products for a destination number.
     * Flash API: POST /cellular/international/lookup
     *
     * Returns a list of products (productId, productName, price in cents ZAR)
     * specific to the destination country/operator.
     */
    async internationalLookup(req, res) {
        try {
            const { destinationMobileNumber, metadata } = req.body;

            if (!destinationMobileNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'destinationMobileNumber is required'
                });
            }

            // Strip leading + if present — Flash expects digits only (country code + number)
            const cleanDest = String(destinationMobileNumber).replace(/^\+/, '').replace(/\D/g, '');
            if (cleanDest.length < 7 || cleanDest.length > 15) {
                return res.status(400).json({
                    success: false,
                    error: 'destinationMobileNumber must be 7-15 digits in international format'
                });
            }

            const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
            if (!accountNumber) {
                return res.status(500).json({
                    success: false,
                    error: 'FLASH_ACCOUNT_NUMBER not configured'
                });
            }

            const reference = `INTL_LOOKUP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            const requestData = {
                reference,
                accountNumber,
                mobileNumber: process.env.FLASH_MERCHANT_MOBILE || '27000000001',
                destinationMobileNumber: cleanDest,
                type: 'airtime',
                ...(metadata && { metadata })
            };

            console.log('📤 Flash international lookup:', {
                endpoint: '/cellular/international/lookup',
                destinationMobileNumber: cleanDest
            });

            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/cellular/international/lookup',
                requestData
            );

            console.log('✅ Flash international lookup response:', JSON.stringify(response, null, 2));

            res.json({
                success: true,
                data: {
                    products: response.products || [],
                    destinationMobileNumber: cleanDest,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Flash Controller: International lookup failed:', error.message);
            res.status(error.statusCode || 500).json({
                success: false,
                error: 'Failed to lookup international airtime products',
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
            });
        }
    }

    /**
     * Purchase international airtime (pinless) for a destination number.
     * Uses the productId returned by internationalLookup.
     *
     * Flow:
     *  1. Call /cellular/international/lookup to get product list
     *  2. User selects a product
     *  3. This method purchases it — the recipient's phone is topped up directly
     */
    async purchaseInternationalAirtime(req, res) {
        try {
            const { destinationMobileNumber, productId, amount, metadata } = req.body;

            if (!destinationMobileNumber || !productId) {
                return res.status(400).json({
                    success: false,
                    error: 'destinationMobileNumber and productId are required'
                });
            }

            const cleanDest = String(destinationMobileNumber).replace(/^\+/, '').replace(/\D/g, '');
            if (cleanDest.length < 7 || cleanDest.length > 15) {
                return res.status(400).json({
                    success: false,
                    error: 'destinationMobileNumber must be 7-15 digits in international format'
                });
            }

            const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
            if (!accountNumber) {
                return res.status(500).json({
                    success: false,
                    error: 'FLASH_ACCOUNT_NUMBER not configured'
                });
            }

            const reference = `INTL_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            const requestData = {
                reference,
                accountNumber,
                mobileNumber: process.env.FLASH_MERCHANT_MOBILE || '27000000001',
                destinationMobileNumber: cleanDest,
                type: 'airtime',
                productCode: parseInt(productId, 10),
                ...(amount && { amount: parseInt(amount, 10) }),
                ...(metadata && { metadata })
            };

            console.log('📤 Flash international purchase:', {
                endpoint: '/cellular/international/lookup',
                destinationMobileNumber: cleanDest,
                productId,
                amount
            });

            // Flash uses the same lookup endpoint for purchase — the productCode
            // parameter triggers a purchase rather than a lookup
            const response = await this.authService.makeAuthenticatedRequest(
                'POST',
                '/cellular/international/lookup',
                requestData
            );

            console.log('✅ Flash international purchase response:', JSON.stringify(response, null, 2));

            res.json({
                success: true,
                data: {
                    transaction: response,
                    reference,
                    destinationMobileNumber: cleanDest,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Flash Controller: International airtime purchase failed:', error.message);
            res.status(error.statusCode || 500).json({
                success: false,
                error: 'Failed to purchase international airtime',
                message: error.message,
                ...(error.flashError && { flash: error.flashError })
            });
        }
    }
}

module.exports = FlashController; 