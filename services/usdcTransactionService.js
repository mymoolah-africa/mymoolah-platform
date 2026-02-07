/**
 * USDC Transaction Service
 * 
 * Orchestrates USDC purchase and transfer transactions with full ledger integration
 * 
 * Flow:
 * 1. Validate user KYC tier (Tier 2 minimum)
 * 2. Check transaction limits (per-txn, daily, monthly)
 * 3. Validate beneficiary and cooldown
 * 4. Run compliance checks
 * 5. Get VALR quote and execute order
 * 6. Debit wallet and post to ledger
 * 7. Initiate USDC withdrawal to Solana address
 * 8. Create transaction record
 * 9. Poll for blockchain confirmation
 * 
 * Banking-Grade Features:
 * - Double-entry ledger integration
 * - ACID compliance with database transactions
 * - Comprehensive audit trail
 * - Idempotency support
 * - Rollback on failure
 */

const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  User,
  Wallet,
  Transaction,
  Beneficiary,
  LedgerAccount,
  SupplierFloat,
  sequelize
} = require('../models');
const valrService = require('./valrService');
const ledgerService = require('./ledgerService');
const cachingService = require('./cachingService');
const auditLogger = require('./auditLogger');
const { isValidSolanaAddress } = require('../utils/solanaAddressValidator');

class UsdcTransactionService {
  constructor() {
    this.feePercent = parseFloat(process.env.USDC_FEE_PERCENT || '7.5');
    this.feeVatInclusive = process.env.USDC_FEE_VAT_INCLUSIVE === 'true';
    this.minKycTier = parseInt(process.env.USDC_MIN_KYC_TIER || '2');
    this.quoteExpirySeconds = parseInt(process.env.USDC_QUOTE_EXPIRY_SECONDS || '60');
    
    // Limits (in ZAR)
    this.limits = {
      perTxn: parseFloat(process.env.USDC_LIMIT_PER_TXN || '5000'),
      daily: parseFloat(process.env.USDC_LIMIT_DAILY || '15000'),
      monthly: parseFloat(process.env.USDC_LIMIT_MONTHLY || '50000'),
      newBeneficiaryDaily: parseFloat(process.env.USDC_NEW_BENEFICIARY_DAILY_LIMIT || '5000')
    };
    
    // Blocked countries (OFAC/EU/UN sanctions)
    this.blockedCountries = (process.env.USDC_BLOCKED_COUNTRIES || 'CU,IR,KP,SY,RU,UA-43,UA-14,UA-09').split(',');
    
    // High-risk countries (enhanced due diligence)
    this.highRiskCountries = (process.env.USDC_HIGH_RISK_COUNTRIES || 'AF,BY,CF,CD,ER,LY,ML,MM,NI,SO,SS,SD,VE,YE,ZW').split(',');
  }

  /**
   * Get current USDC/ZAR exchange rate (cached)
   * 
   * @returns {Promise<Object>} Rate data
   */
  async getCurrentRate() {
    const cacheKey = 'usdc:rate:USDCZAR';
    
    try {
      // Try cache first (60 second TTL)
      const cached = await cachingService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.warn('[UsdcService] Cache read failed, fetching fresh rate', { error: cacheError.message });
    }
    
    // Fetch from VALR
    const rate = await valrService.getMarketRate('USDCZAR');
    
    // Cache for 60 seconds
    try {
      await cachingService.set(cacheKey, JSON.stringify(rate), 60);
    } catch (cacheError) {
      console.warn('[UsdcService] Cache write failed', { error: cacheError.message });
    }
    
    return rate;
  }

  /**
   * Calculate USDC amount and fees for a given ZAR amount
   * 
   * @param {number} zarAmount - Amount in ZAR
   * @param {number} exchangeRate - USDC/ZAR rate (ask price)
   * @returns {Object} Calculation breakdown
   */
  calculateAmounts(zarAmount, exchangeRate) {
    // Platform fee (7.5% incl VAT)
    const platformFeeCents = Math.round(zarAmount * 100 * (this.feePercent / 100));
    const vatCents = Math.round(platformFeeCents * (15 / 115));  // Extract VAT portion
    const platformFeeExVatCents = platformFeeCents - vatCents;
    
    // Net amount to VALR (after fee)
    const netToValrCents = (zarAmount * 100) - platformFeeCents;
    const netToValrZar = netToValrCents / 100;
    
    // USDC amount (using ask price)
    const usdcAmount = netToValrZar / exchangeRate;
    
    // Network fee estimate (Solana is ~$0.00025 per transaction)
    const networkFeeUsd = 0.00025;
    const networkFeeZar = networkFeeUsd * exchangeRate;
    const networkFeeCents = Math.round(networkFeeZar * 100);
    
    return {
      zarAmountCents: zarAmount * 100,
      zarAmount,
      usdcAmount: parseFloat(usdcAmount.toFixed(6)),
      exchangeRate,
      platformFeeCents,
      platformFeeZar: platformFeeCents / 100,
      platformFeeVatCents: vatCents,
      platformFeeExVatCents,
      networkFeeCents,
      networkFeeZar: networkFeeCents / 100,
      netToValrCents,
      netToValrZar
    };
  }

  /**
   * Get quote for USDC purchase
   * 
   * @param {number} userId - User ID
   * @param {number} zarAmount - Amount in ZAR
   * @returns {Promise<Object>} Quote details
   */
  async getQuote(userId, zarAmount) {
    // Validate user KYC tier
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.kycTier < this.minKycTier) {
      const error = new Error(`Tier ${this.minKycTier} KYC required for USDC Send`);
      error.code = 'INSUFFICIENT_KYC_TIER';
      error.requiredTier = this.minKycTier;
      error.currentTier = user.kycTier;
      throw error;
    }

    // Validate amount
    if (zarAmount < 10 || zarAmount > this.limits.perTxn) {
      throw new Error(`Amount must be between R10 and R${this.limits.perTxn}`);
    }

    // Get current rate
    const rate = await this.getCurrentRate();
    
    // Calculate amounts
    const amounts = this.calculateAmounts(zarAmount, rate.askPrice);
    
    // Get VALR quote
    const valrQuote = await valrService.getInstantQuote('USDCZAR', amounts.netToValrZar);
    
    return {
      ...amounts,
      valrOrderId: valrQuote.orderId,
      valrUsdcAmount: valrQuote.usdcAmount,
      valrRate: valrQuote.rate,
      expiresAt: valrQuote.expiresAt,
      createdAt: new Date()
    };
  }

  /**
   * Validate transaction limits
   * 
   * @param {number} userId - User ID
   * @param {number} zarAmount - Amount in ZAR
   * @param {Object} beneficiary - Beneficiary record
   * @returns {Promise<Object>} Validation result
   */
  async validateLimits(userId, zarAmount, beneficiary) {
    const zarCents = zarAmount * 100;
    
    // Per-transaction limit
    if (zarAmount > this.limits.perTxn) {
      return {
        valid: false,
        reason: `Maximum per transaction is R${this.limits.perTxn}`,
        limit: 'perTxn',
        value: zarAmount,
        max: this.limits.perTxn
      };
    }

    // Daily limit (rolling 24 hours)
    const dailyCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyTransactions = await Transaction.findAll({
      where: {
        userId,
        'metadata.transactionType': 'usdc_send',
        status: { [Op.in]: ['completed', 'pending'] },
        createdAt: { [Op.gte]: dailyCutoff }
      }
    });
    
    const dailySum = dailyTransactions.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    const dailySumZar = dailySum / 100;
    
    if (dailySumZar + zarAmount > this.limits.daily) {
      return {
        valid: false,
        reason: `Daily limit exceeded. You have used R${dailySumZar.toFixed(2)} of R${this.limits.daily} (24h rolling)`,
        limit: 'daily',
        used: dailySumZar,
        value: zarAmount,
        max: this.limits.daily,
        remaining: this.limits.daily - dailySumZar
      };
    }

    // Monthly limit (rolling 30 days)
    const monthlyCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyTransactions = await Transaction.findAll({
      where: {
        userId,
        'metadata.transactionType': 'usdc_send',
        status: { [Op.in]: ['completed', 'pending'] },
        createdAt: { [Op.gte]: monthlyCutoff }
      }
    });
    
    const monthlySum = monthlyTransactions.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    const monthlySumZar = monthlySum / 100;
    
    if (monthlySumZar + zarAmount > this.limits.monthly) {
      return {
        valid: false,
        reason: `Monthly limit exceeded. You have used R${monthlySumZar.toFixed(2)} of R${this.limits.monthly} (30d rolling)`,
        limit: 'monthly',
        used: monthlySumZar,
        value: zarAmount,
        max: this.limits.monthly,
        remaining: this.limits.monthly - monthlySumZar
      };
    }

    // New beneficiary daily limit (first 7 days)
    if (beneficiary && beneficiary.cryptoServices?.usdc) {
      const primaryWallet = beneficiary.cryptoServices.usdc.find(w => w.isDefault || w.isActive);
      if (primaryWallet) {
        const createdAt = new Date(primaryWallet.createdAt);
        const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreation <= 7) {
          // Check daily limit to this beneficiary
          const benefDailyTransactions = await Transaction.findAll({
            where: {
              userId,
              'metadata.transactionType': 'usdc_send',
              'metadata.beneficiaryId': beneficiary.id,
              status: { [Op.in]: ['completed', 'pending'] },
              createdAt: { [Op.gte]: dailyCutoff }
            }
          });
          
          const benefDailySum = benefDailyTransactions.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
          const benefDailySumZar = benefDailySum / 100;
          
          if (benefDailySumZar + zarAmount > this.limits.newBeneficiaryDaily) {
            return {
              valid: false,
              reason: `New beneficiary daily limit: R${this.limits.newBeneficiaryDaily}/day for first 7 days. You have used R${benefDailySumZar.toFixed(2)} today.`,
              limit: 'newBeneficiaryDaily',
              used: benefDailySumZar,
              value: zarAmount,
              max: this.limits.newBeneficiaryDaily,
              daysRemaining: Math.ceil(7 - daysSinceCreation)
            };
          }
        }
      }
    }

    return { valid: true };
  }

  /**
   * Run compliance checks
   * 
   * @param {Object} params - Check parameters
   * @returns {Promise<Object>} Compliance result
   */
  async runComplianceChecks(params) {
    const { userId, zarAmount, beneficiary } = params;
    
    const flags = [];
    let hold = false;
    let severity = 'low';

    // Check 1: Blocked country
    if (beneficiary.cryptoServices?.usdc) {
      const primaryWallet = beneficiary.cryptoServices.usdc.find(w => w.isDefault || w.isActive);
      if (primaryWallet && this.blockedCountries.includes(primaryWallet.country)) {
        flags.push({
          rule: 'BLOCKED_COUNTRY',
          message: `Recipient country ${primaryWallet.country} is sanctioned`,
          severity: 'critical'
        });
        hold = true;
        severity = 'critical';
      }
      
      // Check 2: High-risk country
      if (primaryWallet && this.highRiskCountries.includes(primaryWallet.country)) {
        flags.push({
          rule: 'HIGH_RISK_COUNTRY',
          message: `Recipient country ${primaryWallet.country} requires enhanced review`,
          severity: 'high'
        });
        hold = true;
        severity = 'high';
      }
    }

    // Check 3: Rapid cashout (deposit within 10 minutes + USDC send)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentDeposit = await Transaction.findOne({
      where: {
        userId,
        type: 'received',
        'metadata.transactionType': { [Op.in]: ['deposit', 'easypay_topup_settlement'] },
        createdAt: { [Op.gte]: tenMinutesAgo }
      },
      order: [['createdAt', 'DESC']]
    });
    
    if (recentDeposit) {
      flags.push({
        rule: 'RAPID_CASHOUT',
        message: 'Recent deposit followed by USDC send',
        severity: 'high',
        depositAmount: Math.abs(recentDeposit.amount) / 100,
        minutesAgo: (Date.now() - recentDeposit.createdAt.getTime()) / 60000
      });
      hold = true;
      severity = 'high';
    }

    // Check 4: Velocity (multiple USDC transactions in 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUsdcCount = await Transaction.count({
      where: {
        userId,
        'metadata.transactionType': 'usdc_send',
        status: { [Op.in]: ['completed', 'pending'] },
        createdAt: { [Op.gte]: last24h }
      }
    });
    
    if (recentUsdcCount >= 10) {
      flags.push({
        rule: 'VELOCITY_BREACH',
        message: `${recentUsdcCount} USDC transactions in 24 hours`,
        severity: 'medium',
        count: recentUsdcCount
      });
      hold = true;
      if (severity === 'low') severity = 'medium';
    }

    // Check 5: New beneficiary surge
    const last7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newBeneficiariesCount = await Beneficiary.count({
      where: {
        userId,
        cryptoServices: { [Op.ne]: null },
        createdAt: { [Op.gte]: last7days }
      }
    });
    
    if (newBeneficiariesCount >= 5) {
      flags.push({
        rule: 'NEW_BENEFICIARY_SURGE',
        message: `${newBeneficiariesCount} new crypto beneficiaries in 7 days`,
        severity: 'medium',
        count: newBeneficiariesCount
      });
      hold = true;
      if (severity === 'low') severity = 'medium';
    }

    // Calculate risk score (0-100)
    const riskScore = flags.reduce((score, flag) => {
      switch (flag.severity) {
        case 'critical': return score + 40;
        case 'high': return score + 25;
        case 'medium': return score + 15;
        default: return score + 5;
      }
    }, 0);

    return {
      hold,
      flags,
      severity,
      riskScore,
      reviewRequired: hold || riskScore > 50
    };
  }

  /**
   * Execute USDC buy and send transaction
   * 
   * @param {number} userId - User ID
   * @param {string} walletId - Wallet ID
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction record
   */
  async executeBuyAndSend(userId, walletId, params) {
    const {
      zarAmount,
      beneficiaryId,
      purpose,
      idempotencyKey
    } = params;

    // Start database transaction for ACID compliance
    const dbTransaction = await sequelize.transaction();

    try {
      // 1. Validate user and KYC tier
      const user = await User.findByPk(userId, { transaction: dbTransaction });
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.kycTier < this.minKycTier) {
        const error = new Error(`Tier ${this.minKycTier} KYC required for USDC Send`);
        error.code = 'INSUFFICIENT_KYC_TIER';
        error.requiredTier = this.minKycTier;
        error.currentTier = user.kycTier;
        throw error;
      }

      // 2. Get beneficiary and validate
      const beneficiary = await Beneficiary.findOne({
        where: { id: beneficiaryId, userId },
        transaction: dbTransaction
      });
      
      if (!beneficiary || !beneficiary.cryptoServices?.usdc) {
        throw new Error('USDC beneficiary not found');
      }

      const primaryWallet = beneficiary.cryptoServices.usdc.find(w => w.isDefault || w.isActive);
      if (!primaryWallet) {
        throw new Error('No active USDC wallet for beneficiary');
      }

      // Validate Solana address
      const addressValidation = isValidSolanaAddress(primaryWallet.walletAddress);
      if (!addressValidation.valid) {
        throw new Error(`Invalid Solana address: ${addressValidation.reason}`);
      }

      // Check beneficiary cooldown
      if (primaryWallet.cooldownUntil && new Date(primaryWallet.cooldownUntil) > new Date()) {
        const error = new Error('Beneficiary is in cooldown period. Please wait before sending again.');
        error.code = 'BENEFICIARY_COOLDOWN';
        error.cooldownUntil = primaryWallet.cooldownUntil;
        throw error;
      }

      // 3. Check transaction limits
      const limitCheck = await this.validateLimits(userId, zarAmount, beneficiary);
      if (!limitCheck.valid) {
        const error = new Error(limitCheck.reason);
        error.code = 'LIMIT_EXCEEDED';
        error.limitDetails = limitCheck;
        throw error;
      }

      // 4. Run compliance checks
      const complianceResult = await this.runComplianceChecks({
        userId,
        zarAmount,
        beneficiary
      });

      // If compliance hold required, create pending transaction and return
      if (complianceResult.hold) {
        const heldTransactionId = `USDC-HOLD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        
        const heldTransaction = await Transaction.create({
          transactionId: heldTransactionId,
          userId,
          walletId,
          amount: 0,  // No wallet debit until approved
          type: 'sent',
          status: 'pending',
          description: `USDC Send to ${beneficiary.name} (Compliance Review)`,
          metadata: {
            transactionType: 'usdc_send',
            complianceHold: true,
            complianceFlags: complianceResult.flags,
            riskScore: complianceResult.riskScore,
            severity: complianceResult.severity,
            zarAmount: zarAmount * 100,
            beneficiaryId,
            beneficiaryName: beneficiary.name,
            beneficiaryWalletAddress: primaryWallet.walletAddress,
            beneficiaryCountry: primaryWallet.country,
            purpose
          }
        }, { transaction: dbTransaction });

        await dbTransaction.commit();

        // Log to audit trail (non-blocking)
        setImmediate(() => {
          auditLogger.log({
            action: 'usdc_send_compliance_hold',
            userId,
            metadata: {
              transactionId: heldTransactionId,
              complianceResult,
              beneficiaryId
            }
          });
        });

        return {
          status: 'compliance_hold',
          transaction: heldTransaction,
          complianceResult
        };
      }

      // 5. Get wallet and check balance
      const wallet = await Wallet.findOne({
        where: { walletId },
        transaction: dbTransaction
      });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Calculate total amount (ZAR + fee)
      const rate = await this.getCurrentRate();
      const amounts = this.calculateAmounts(zarAmount, rate.askPrice);
      const totalZarCents = amounts.zarAmountCents;

      if (wallet.balance < totalZarCents) {
        const error = new Error(`Insufficient balance. Required: R${(totalZarCents / 100).toFixed(2)}, Available: R${(wallet.balance / 100).toFixed(2)}`);
        error.code = 'INSUFFICIENT_BALANCE';
        error.required = totalZarCents;
        error.available = wallet.balance;
        throw error;
      }

      // 6. Get VALR quote (fresh quote for execution)
      const valrQuote = await valrService.getInstantQuote('USDCZAR', amounts.netToValrZar);
      
      // 7. Execute VALR instant order
      const transactionId = idempotencyKey || `USDC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const valrOrder = await valrService.executeInstantOrder(valrQuote.orderId, transactionId);
      
      // 8. Debit wallet
      wallet.balance -= totalZarCents;
      await wallet.save({ transaction: dbTransaction });

      // 9. Get ledger accounts
      const userWalletAccount = await LedgerAccount.findOne({
        where: { walletId },
        transaction: dbTransaction
      });
      
      const valrFloatAccount = await LedgerAccount.findOne({
        where: { code: '1200-10-06' },
        transaction: dbTransaction
      });
      
      const feeRevenueAccount = await LedgerAccount.findOne({
        where: { code: '4100-01-06' },
        transaction: dbTransaction
      });

      if (!userWalletAccount || !valrFloatAccount || !feeRevenueAccount) {
        throw new Error('Ledger accounts not found. Run migrations first.');
      }

      // 10. Post to general ledger (double-entry accounting)
      await ledgerService.postJournalEntry({
        description: `USDC Send to ${beneficiary.name}`,
        reference: transactionId,
        lines: [
          // Credit: User wallet (asset decrease)
          {
            accountCode: userWalletAccount.code,
            dc: 'credit',
            amount: totalZarCents,
            memo: 'USDC purchase debit from user wallet'
          },
          // Debit: VALR float (asset increase)
          {
            accountCode: '1200-10-06',
            dc: 'debit',
            amount: amounts.netToValrCents,
            memo: 'USDC purchase - funds to VALR'
          },
          // Debit: Fee revenue (excluding VAT)
          {
            accountCode: '4100-01-06',
            dc: 'debit',
            amount: amounts.platformFeeExVatCents,
            memo: 'USDC transaction fee revenue (ex VAT)'
          },
          // Debit: VAT payable
          {
            accountCode: '2300-01-01',
            dc: 'debit',
            amount: amounts.platformFeeVatCents,
            memo: 'VAT on USDC transaction fee'
          }
        ]
      });

      // 11. Initiate USDC withdrawal to Solana address
      const withdrawal = await valrService.withdrawUsdc({
        amount: valrOrder.usdcAmount,
        address: primaryWallet.walletAddress,
        network: 'solana',
        paymentReference: transactionId
      });

      // 12. Create transaction record (existing transactions table)
      const transaction = await Transaction.create({
        transactionId,
        userId,
        walletId,
        amount: totalZarCents * -1,  // Negative for debit
        type: 'sent',
        status: 'completed',
        description: `USDC Send to ${beneficiary.name}`,
        metadata: {
          transactionType: 'usdc_send',
          // Financial
          usdcAmount: valrOrder.usdcAmount.toFixed(6),
          exchangeRate: valrQuote.rate.toFixed(8),
          platformFee: amounts.platformFeeCents,
          platformFeeVat: amounts.platformFeeVatCents,
          networkFee: amounts.networkFeeCents,
          // Beneficiary (Travel Rule)
          beneficiaryId,
          beneficiaryName: beneficiary.name,
          beneficiaryWalletAddress: primaryWallet.walletAddress,
          beneficiaryWalletNetwork: 'solana',
          beneficiaryCountry: primaryWallet.country,
          beneficiaryRelationship: primaryWallet.relationship,
          beneficiaryPurpose: purpose || primaryWallet.purpose,
          // VALR Integration
          valrOrderId: valrOrder.orderId,
          valrWithdrawalId: withdrawal.id,
          blockchainTxHash: withdrawal.txHash,
          blockchainStatus: 'pending',
          blockchainConfirmations: 0,
          // Compliance
          complianceHold: false,
          complianceFlags: complianceResult.flags,
          riskScore: complianceResult.riskScore
        }
      }, { transaction: dbTransaction });

      // 13. Update beneficiary stats
      primaryWallet.totalSends = (primaryWallet.totalSends || 0) + 1;
      primaryWallet.totalUsdcSent = (primaryWallet.totalUsdcSent || 0) + valrOrder.usdcAmount;
      primaryWallet.firstSendAt = primaryWallet.firstSendAt || new Date().toISOString();
      
      // Set cooldown if first send > R1,000
      if (!primaryWallet.firstSendAt && zarAmount > 1000) {
        const cooldownHours = parseInt(process.env.USDC_NEW_BENEFICIARY_COOLDOWN_HOURS || '24');
        primaryWallet.cooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString();
      }
      
      await beneficiary.update({
        cryptoServices: beneficiary.cryptoServices,
        lastPaidAt: new Date(),
        timesPaid: (beneficiary.timesPaid || 0) + 1
      }, { transaction: dbTransaction });

      // Commit database transaction
      await dbTransaction.commit();

      // 14. Log to audit trail (non-blocking)
      setImmediate(() => {
        auditLogger.log({
          action: 'usdc_send_executed',
          userId,
          metadata: {
            transactionId,
            zarAmount,
            usdcAmount: valrOrder.usdcAmount,
            beneficiaryId,
            beneficiaryWalletAddress: primaryWallet.walletAddress,
            valrOrderId: valrOrder.orderId,
            valrWithdrawalId: withdrawal.id
          }
        });
      });

      console.log('[UsdcService] USDC send executed successfully', {
        transactionId,
        userId,
        zarAmount,
        usdcAmount: valrOrder.usdcAmount,
        beneficiaryId
      });

      return {
        status: 'success',
        transaction,
        withdrawal,
        amounts
      };

    } catch (error) {
      // Rollback database transaction
      await dbTransaction.rollback();
      
      console.error('[UsdcService] USDC send failed', {
        userId,
        zarAmount,
        beneficiaryId,
        error: error.message,
        code: error.code
      });
      
      throw error;
    }
  }

  /**
   * Get USDC transaction history for user
   * 
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Transactions
   */
  async getTransactionHistory(userId, options = {}) {
    const { limit = 50, offset = 0, status } = options;
    
    const where = {
      userId,
      'metadata.transactionType': 'usdc_send'
    };
    
    if (status) {
      where.status = status;
    }

    const transactions = await Transaction.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return transactions.map(txn => ({
      id: txn.id,
      transactionId: txn.transactionId,
      zarAmount: Math.abs(txn.amount) / 100,
      usdcAmount: parseFloat(txn.metadata.usdcAmount),
      exchangeRate: parseFloat(txn.metadata.exchangeRate),
      platformFee: txn.metadata.platformFee / 100,
      beneficiaryName: txn.metadata.beneficiaryName,
      beneficiaryWalletAddress: txn.metadata.beneficiaryWalletAddress,
      beneficiaryCountry: txn.metadata.beneficiaryCountry,
      blockchainTxHash: txn.metadata.blockchainTxHash,
      blockchainStatus: txn.metadata.blockchainStatus,
      status: txn.status,
      createdAt: txn.createdAt
    }));
  }

  /**
   * Update blockchain confirmation status
   * 
   * @param {string} transactionId - Transaction ID
   * @param {Object} statusUpdate - Status update data
   * @returns {Promise<Object>} Updated transaction
   */
  async updateBlockchainStatus(transactionId, statusUpdate) {
    const transaction = await Transaction.findOne({
      where: { transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Update metadata
    transaction.metadata = {
      ...transaction.metadata,
      blockchainTxHash: statusUpdate.txHash || transaction.metadata.blockchainTxHash,
      blockchainStatus: statusUpdate.status || transaction.metadata.blockchainStatus,
      blockchainConfirmations: statusUpdate.confirmations || transaction.metadata.blockchainConfirmations
    };
    
    // Update transaction status if blockchain confirmed
    if (statusUpdate.status === 'confirmed' && transaction.status !== 'completed') {
      transaction.status = 'completed';
    }
    
    await transaction.save();

      console.log('[UsdcService] Blockchain status updated', {
      transactionId,
      blockchainStatus: statusUpdate.status,
      confirmations: statusUpdate.confirmations
    });

    return transaction;
  }

  /**
   * Poll VALR withdrawal status and update transaction
   * Background job - called by cron/scheduler
   * 
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Status update result
   */
  async pollWithdrawalStatus(transactionId) {
    try {
      const transaction = await Transaction.findOne({
        where: { transactionId }
      });
      
      if (!transaction || !transaction.metadata.valrWithdrawalId) {
        return { found: false };
      }

      // Skip if already confirmed
      if (transaction.metadata.blockchainStatus === 'confirmed') {
        return { status: 'already_confirmed' };
      }

      // Get status from VALR
      const withdrawalStatus = await valrService.getWithdrawalStatus(transaction.metadata.valrWithdrawalId);
      
      // Update transaction
      await this.updateBlockchainStatus(transactionId, {
        txHash: withdrawalStatus.txHash,
        status: withdrawalStatus.status === 'COMPLETED' ? 'confirmed' : 'pending',
        confirmations: withdrawalStatus.confirmations
      });

      return {
        found: true,
        updated: true,
        status: withdrawalStatus.status,
        txHash: withdrawalStatus.txHash
      };
    } catch (error) {
      console.error('[UsdcService] Failed to poll withdrawal status', {
        transactionId,
        error: error.message
      });
      
      return {
        found: true,
        updated: false,
        error: error.message
      };
    }
  }

  /**
   * Health check - verify USDC service is operational
   * 
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const checks = {
      valrConfigured: valrService.isConfigured(),
      valrHealthy: false,
      circuitBreakerStatus: valrService.getCircuitBreakerStatus()
    };

    try {
      const valrHealth = await valrService.healthCheck();
      checks.valrHealthy = valrHealth.healthy;
      checks.valrTimestamp = valrHealth.timestamp;
    } catch (error) {
      checks.valrError = error.message;
    }

    checks.overall = checks.valrConfigured && checks.valrHealthy && !checks.circuitBreakerStatus.open;

    return checks;
  }
}

module.exports = new UsdcTransactionService();
