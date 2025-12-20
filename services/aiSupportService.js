// Load environment variables first
require('dotenv').config();

const { OpenAI } = require('openai');
const models = require('../models');
const { Sequelize } = require('sequelize');
const CodebaseSweepService = require('./codebaseSweepService');

/**
 * 🏦 BANKING-GRADE AI SUPPORT SERVICE
 * 
 * This service implements proper banking practices for handling millions of customers:
 * - Single SQL queries with database-level aggregation
 * - No JavaScript calculations on large datasets
 * - Proper indexing and query optimization
 * - Redis caching for frequently accessed data
 * - Connection pooling and transaction management
 */

class BankingGradeAISupportService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Banking-grade configuration
    this.MAX_RESPONSE_TIME = 2000; // 2 seconds max response time
    this.CACHE_TTL = 300; // 5 minutes cache TTL
    this.BATCH_SIZE = 1000; // Process data in batches for large datasets
    
    // Initialize codebase sweep service
    this.codebaseSweep = new CodebaseSweepService();
    
    // Initialize query type cache - CRITICAL for preventing OpenAI calls
    this.queryTypeCache = new Map();
    this.queryPatternCache = new Map();
    
    // Start the daily sweep scheduler (non-blocking)
    setImmediate(() => this.initializeCodebaseSweep());
    
    // Verify cache initialization
    console.log('🔧 Constructor - queryTypeCache initialized:', this.queryTypeCache instanceof Map);
    console.log('🔧 Constructor - queryPatternCache initialized:', this.queryPatternCache instanceof Map);
  }

  /**
   * 🚀 Initialize codebase sweep service
   */
  async initializeCodebaseSweep() {
    // Skip if disabled via environment variable
    if (process.env.ENABLE_CODEBASE_SWEEP === 'false') {
      console.log('⚠️  Codebase Sweep Service disabled - ENABLE_CODEBASE_SWEEP=false');
      return;
    }
    
    try {
      console.log('🚀 Initializing MyMoolah codebase sweep service...');
      await this.codebaseSweep.startScheduler();
      console.log('✅ Codebase sweep service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize codebase sweep service:', error);
      // Continue without sweep service - system will still work
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get User Financial Summary
   * Single optimized query with database aggregation
   */
  async getUserFinancialSummary(userId, language) {
    try {
      const { sequelize } = models;
      
      // Use the new database view - NO CALCULATIONS, pure database data
      const financialSummary = await sequelize.query(`
        SELECT * FROM user_financial_summary WHERE user_id = :userId
      `, {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      });

      if (!financialSummary || financialSummary.length === 0) {
        return {
          text: this.getLocalizedResponse('user_not_found', language),
          context: { userFound: false },
          suggestions: ['Contact support', 'Check account status']
        };
      }

      const summary = financialSummary[0];
      
      // Use database values directly - NO CALCULATIONS
      return {
        text: this.getLocalizedResponse('financial_summary', language, {
          walletBalance: parseFloat(summary.wallet_balance || 0).toLocaleString(),
          currency: summary.wallet_currency || 'ZAR',
          activeVouchers: summary.active_vouchers || 0,
          activeVoucherValue: parseFloat(summary.active_voucher_value || 0).toLocaleString(),
          pendingVouchers: summary.pending_vouchers || 0,
          pendingVoucherValue: parseFloat(summary.pending_voucher_value || 0).toLocaleString(),
          totalVouchers: summary.total_vouchers || 0,
          totalTransactions: summary.total_transactions || 0,
          kycStatus: summary.kyc_status || 'not_started',
          idVerified: summary.id_verified || false
        }),
        context: {
          userFound: true,
          walletBalance: summary.wallet_balance,
          activeVouchers: summary.active_vouchers,
          pendingVouchers: summary.pending_vouchers,
          totalVouchers: summary.total_vouchers,
          kycStatus: summary.kyc_status,
          idVerified: summary.id_verified
        },
        suggestions: ['View transaction history', 'Check voucher status', 'Update KYC information']
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get Wallet Balance
   * Direct database field access - NO CALCULATIONS
   */
  async getWalletBalanceResponse(userId, language) {
    try {
      const { Wallet } = models;
      
      // Single query - get balance directly from database
      const wallet = await Wallet.findOne({
        where: { userId },
        attributes: ['balance', 'currency', 'status'],
        raw: true
      });

      if (!wallet) {
        return {
          text: this.getLocalizedResponse('wallet_not_found', language),
          context: { walletFound: false },
          suggestions: ['Contact support', 'Check account status']
        };
      }

      // Use database value directly - NO CALCULATIONS
      return {
        text: this.getLocalizedResponse('wallet_balance', language, {
          balance: parseFloat(wallet.balance || 0).toLocaleString(),
          currency: wallet.currency || 'ZAR'
        }),
        context: { 
          walletFound: true,
          balance: wallet.balance,
          currency: wallet.currency,
          status: wallet.status
        },
        suggestions: ['View transaction history', 'Check voucher balance', 'Make a payment']
      };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get Voucher Summary
   * Database aggregation - NO JavaScript calculations
   */
  async getVoucherSummaryResponse(userId, language) {
    try {
      const { sequelize } = models;
      
      // Use the new database view - NO CALCULATIONS, pure database data
      const voucherSummary = await sequelize.query(`
        SELECT * FROM voucher_summary WHERE user_id = :userId
      `, {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      });

      if (!voucherSummary || voucherSummary.length === 0) {
        return {
          text: this.getLocalizedResponse('no_vouchers', language),
          context: { hasVouchers: false },
          suggestions: ['Purchase vouchers', 'Check wallet balance']
        };
      }

      const summary = voucherSummary[0];
      
      // Use database values directly - NO CALCULATIONS
      return {
        text: this.getLocalizedResponse('voucher_summary', language, {
          activeCount: summary.active_count || 0,
          activeBalance: parseFloat(summary.active_balance || 0).toLocaleString(),
          pendingCount: summary.pending_count || 0,
          pendingBalance: parseFloat(summary.pending_balance || 0).toLocaleString(),
          totalCount: summary.total_vouchers || 0,
          totalValue: parseFloat(summary.total_value || 0).toLocaleString()
        }),
        context: { 
          hasVouchers: true,
          activeCount: summary.active_count,
          activeBalance: summary.active_balance,
          pendingCount: summary.pending_count,
          pendingBalance: summary.pending_balance,
          totalCount: summary.total_vouchers,
          totalValue: summary.total_value
        },
        suggestions: ['View voucher history', 'Purchase new vouchers', 'Check wallet balance']
      };
    } catch (error) {
      console.error('Error getting voucher summary:', error);
      return null;
    }
  }

  /**
   * �� BANKING-GRADE: Get Voucher Balance (Active + Pending Only)
   * Direct database query - NO JavaScript calculations
   */
  async getVoucherBalanceResponse(userId, language) {
    try {
      const { sequelize } = models;
      
      // Query only active and pending vouchers for balance
      const voucherBalance = await sequelize.query(`
        SELECT 
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COALESCE(SUM(CASE WHEN status = 'active' THEN balance ELSE 0 END), 0) as active_balance,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN balance ELSE 0 END), 0) as pending_balance
        FROM vouchers 
        WHERE "userId" = :userId AND status IN ('active', 'pending')
      `, {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      });

      if (!voucherBalance || voucherBalance.length === 0) {
        return {
          text: this.getLocalizedResponse('no_active_vouchers', language),
          context: { hasActiveVouchers: false },
          suggestions: ['Purchase vouchers', 'Check all vouchers']
        };
      }

      const balance = voucherBalance[0];
      const totalActiveBalance = parseFloat(balance.active_balance || 0) + parseFloat(balance.pending_balance || 0);
      
      return {
        text: this.getLocalizedResponse('voucher_balance', language, {
          activeCount: balance.active_count || 0,
          activeBalance: parseFloat(balance.active_balance || 0).toLocaleString(),
          pendingCount: balance.pending_count || 0,
          pendingBalance: parseFloat(balance.pending_balance || 0).toLocaleString(),
          totalBalance: totalActiveBalance.toLocaleString()
        }),
        context: { 
          hasActiveVouchers: true,
          activeCount: balance.active_count,
          activeBalance: balance.active_balance,
          pendingCount: balance.pending_count,
          pendingBalance: balance.pending_balance,
          totalBalance: totalActiveBalance
        },
        suggestions: ['View all vouchers', 'Purchase new vouchers', 'Check wallet balance']
      };
    } catch (error) {
      console.error('Error getting voucher balance:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get Expired Vouchers
   * Direct database query - NO JavaScript calculations
   */
  async getVoucherExpiredResponse(userId, language) {
    try {
      const { sequelize } = models;
      
      // Query only expired vouchers
      const expiredVouchers = await sequelize.query(`
        SELECT 
          COUNT(*) as expired_count,
          COALESCE(SUM(balance), 0) as expired_balance
        FROM vouchers 
        WHERE "userId" = :userId AND status = 'expired'
      `, {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      });

      const expired = expiredVouchers[0];
      
      return {
        text: this.getLocalizedResponse('voucher_expired', language, {
          expiredCount: expired.expired_count || 0,
          expiredBalance: parseFloat(expired.expired_balance || 0).toLocaleString()
        }),
        context: { 
          hasExpiredVouchers: expired.expired_count > 0,
          expiredCount: expired.expired_count,
          expiredBalance: expired.expired_balance
        },
        suggestions: ['View all vouchers', 'Purchase new vouchers', 'Check active vouchers']
      };
    } catch (error) {
      console.error('Error getting expired vouchers:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get Cancelled Vouchers
   * Direct database query - NO JavaScript calculations
   */
  async getVoucherCancelledResponse(userId, language) {
    try {
      const { sequelize } = models;
      
      // Query cancelled vouchers with original amount
      const cancelledVouchers = await sequelize.query(`
        SELECT 
          COUNT(*) as cancelled_count,
          COALESCE(SUM("originalAmount"), 0) as cancelled_original_amount,
          COALESCE(SUM(balance), 0) as cancelled_balance
        FROM vouchers 
        WHERE "userId" = :userId AND status = 'cancelled'
      `, {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      });

      const cancelled = cancelledVouchers[0];
      
      return {
        text: this.getLocalizedResponse('voucher_cancelled', language, {
          cancelledCount: cancelled.cancelled_count || 0,
          cancelledOriginalAmount: parseFloat(cancelled.cancelled_original_amount || 0).toLocaleString(),
          cancelledBalance: parseFloat(cancelled.cancelled_balance || 0).toLocaleString()
        }),
        context: { 
          hasCancelledVouchers: cancelled.cancelled_count > 0,
          cancelledCount: cancelled.cancelled_count,
          cancelledOriginalAmount: cancelled.cancelled_original_amount,
          cancelledBalance: cancelled.cancelled_balance
        },
        suggestions: ['View all vouchers', 'Purchase new vouchers', 'Check active vouchers']
      };
    } catch (error) {
      console.error('Error getting cancelled vouchers:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get KYC Status
   * Direct database field access - NO CALCULATIONS
   */
  async getKycStatusResponse(userId, language) {
    try {
      const { User } = models;
      
      // Single query - get KYC data directly from database
      const user = await User.findByPk(userId, {
        attributes: ['kycStatus', 'idVerified', 'kycVerifiedAt', 'status'],
        raw: true
      });

      if (!user) {
        return {
          text: this.getLocalizedResponse('user_not_found', language),
          context: { userFound: false },
          suggestions: ['Contact support', 'Check account status']
        };
      }

      // Determine tier based on database values - NO CALCULATIONS
      let kycTier = 'tier0';
      if (user.kycStatus === 'verified' && user.idVerified) {
        kycTier = 'tier1';
      } else if (user.kycStatus === 'pending') {
        kycTier = 'tier0';
      }

      return {
        text: this.getLocalizedResponse('kyc_status', language, { 
          status: user.kycStatus, 
          tier: kycTier 
        }),
        context: { 
          userFound: true,
          kycStatus: user.kycStatus,
          kycTier,
          idVerified: user.idVerified,
          kycVerifiedAt: user.kycVerifiedAt
        },
        suggestions: ['Upload documents', 'Check requirements', 'Contact support']
      };
    } catch (error) {
      console.error('Error getting KYC status:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get Last Voucher Created
   * Direct database query - NO JavaScript calculations
   */
  async getLastVoucherResponse(userId, language) {
    try {
      const { Voucher } = models;
      
      // Single query to get the most recently created voucher
      const lastVoucher = await Voucher.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'voucherType', 'originalAmount', 'balance', 'status', 'createdAt'],
        raw: true
      });

      if (!lastVoucher) {
        return {
          text: this.getLocalizedResponse('no_vouchers', language),
          context: { hasVouchers: false },
          suggestions: ['Create your first voucher', 'Check wallet balance']
        };
      }

      const voucherDate = new Date(lastVoucher.createdAt).toLocaleDateString();
      const voucherAmount = parseFloat(lastVoucher.originalAmount).toLocaleString();
      
      return {
        text: this.getLocalizedResponse('last_voucher', language, {
          type: lastVoucher.voucherType,
          amount: voucherAmount,
          status: lastVoucher.status,
          date: voucherDate
        }),
        context: { 
          hasVouchers: true,
          lastVoucher: {
            id: lastVoucher.id,
            type: lastVoucher.voucherType,
            amount: lastVoucher.originalAmount,
            status: lastVoucher.status,
            createdAt: lastVoucher.createdAt
          }
        },
        suggestions: ['View all vouchers', 'Create new voucher', 'Check voucher status']
      };
    } catch (error) {
      console.error('Error getting last voucher:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get Transaction History
   * Database aggregation with pagination - NO JavaScript calculations
   */
  async getTransactionHistoryResponse(userId, language) {
    try {
      const { sequelize } = models;
      
      // Use the new database view - NO CALCULATIONS, pure database data
      const transactionSummary = await sequelize.query(`
        SELECT * FROM transaction_summary WHERE user_id = :userId
      `, {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      });

      if (!transactionSummary || transactionSummary.length === 0) {
        return {
          text: this.getLocalizedResponse('no_transactions', language),
          context: { hasTransactions: false },
          suggestions: ['Make your first transaction', 'Check wallet balance']
        };
      }

      const summary = transactionSummary[0];
      
      // Use database values directly - NO CALCULATIONS
      return {
        text: this.getLocalizedResponse('transaction_summary', language, {
          totalTransactions: summary.total_transactions || 0,
          receivedCount: summary.received_count || 0,
          sentCount: summary.sent_count || 0,
          totalReceived: parseFloat(summary.total_received || 0).toLocaleString(),
          totalSent: parseFloat(summary.total_sent || 0).toLocaleString(),
          lastTransactionDate: summary.last_transaction_date ? new Date(summary.last_transaction_date).toLocaleDateString() : 'Never'
        }),
        context: { 
          hasTransactions: true,
          totalTransactions: summary.total_transactions,
          totalReceived: summary.total_received,
          totalSent: summary.total_sent,
          lastTransactionDate: summary.last_transaction_date
        },
        suggestions: ['View detailed history', 'Make a new transaction', 'Download statement']
      };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get User Profile
   * Direct database query - NO JavaScript calculations
   */
  async getUserProfileResponse(userId, language) {
    try {
      const { User } = models;
      
      // Single query to get user profile data
      const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'kycStatus', 'idVerified', 'status', 'createdAt'],
        raw: true
      });

      if (!user) {
        return {
          text: this.getLocalizedResponse('user_not_found', language),
          context: { userFound: false },
          suggestions: ['Contact support', 'Check account status']
        };
      }

      const accountDate = new Date(user.createdAt).toLocaleDateString();
      
      return {
        text: this.getLocalizedResponse('user_profile', language, {
          firstName: user.firstName || 'User',
          lastName: user.lastName || '',
          email: user.email,
          phone: user.phone || 'Not provided',
          kycStatus: user.kycStatus,
          accountDate: accountDate
        }),
        context: { 
          userFound: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            kycStatus: user.kycStatus,
            idVerified: user.idVerified
          }
        },
        suggestions: ['Update profile', 'Check KYC status', 'View wallet balance']
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * 🔍 Get discovered support capabilities from codebase sweep
   */
  getDiscoveredCapabilities() {
    return this.codebaseSweep.getDiscoveredCapabilities();
  }



  /**
   * 🎯 Get cached query type for a message
   */
  getCachedQueryType(message) {
    const normalizedMessage = this.normalizeMessage(message);
    
    // Debug cache state
    console.log('🔍 Cache check - queryTypeCache size:', this.queryTypeCache?.size || 'undefined');
    console.log('🔍 Cache check - queryPatternCache size:', this.queryPatternCache?.size || 'undefined');
    
    // Check exact match first
    if (this.queryTypeCache && this.queryTypeCache.has(normalizedMessage)) {
      console.log('🔍 Found exact match in cache');
      return this.queryTypeCache.get(normalizedMessage);
    }
    
    // Check pattern matches
    if (this.queryPatternCache) {
      for (const [pattern, queryType] of this.queryPatternCache) {
        if (this.matchesPattern(normalizedMessage, pattern)) {
          console.log('🔍 Found pattern match in cache:', pattern);
          return queryType;
        }
      }
    }
    
    return null;
  }

  /**
   * 💾 Cache query type for future use
   */
  cacheQueryType(message, queryType) {
    const normalizedMessage = this.normalizeMessage(message);
    
    // Cache exact message
    this.queryTypeCache.set(normalizedMessage, queryType);
    
    // Cache pattern for similar queries
    const pattern = this.extractPattern(normalizedMessage);
    if (pattern) {
      this.queryPatternCache.set(pattern, queryType);
    }
    
    console.log('💾 Cached query type:', { message: normalizedMessage, type: queryType, pattern });
  }

  /**
   * 🔧 Normalize message for consistent caching
   */
  normalizeMessage(message) {
    return message.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * 🎯 Extract pattern from message for broader matching
   */
  extractPattern(message) {
    // Extract key words that indicate query type
    const words = message.split(' ');
    const keyWords = words.filter(word => 
      ['wallet', 'balance', 'voucher', 'kyc', 'verification', 'transaction', 'history', 'profile', 'summary'].includes(word)
    );
    
    if (keyWords.length > 0) {
      return keyWords.sort().join(' ');
    }
    
    return null;
  }

  /**
   * 🎯 Check if message matches a pattern
   */
  matchesPattern(message, pattern) {
    const messageWords = message.split(' ');
    const patternWords = pattern.split(' ');
    
    return patternWords.every(word => messageWords.includes(word));
  }

  /**
   * 🎯 DIRECT PATTERN MATCHING - English Only (message pre-translated by RAG layer)
   * Simplified: No multi-language patterns needed, RAG translates first
   */
  directPatternMatch(message) {
    const lowerMessage = message.toLowerCase();
    console.log('🎯 Direct pattern matching (English):', lowerMessage);
    
    // ===== WALLET PATTERNS (English only - pre-translated) =====
    const hasWallet = lowerMessage.includes('wallet');
    const hasBalance = lowerMessage.includes('balance');
    const hasMoney = lowerMessage.includes('money');
    const hasHowMuch = lowerMessage.includes('how much');
    
    // Wallet balance queries
    if ((hasWallet && hasBalance) || (hasWallet && hasMoney) || hasHowMuch) {
      console.log('✅ Matched: wallet_balance');
      return 'wallet_balance';
    }

    // Wallet status queries
    if (hasWallet && (lowerMessage.includes('status') || lowerMessage.includes('active') || lowerMessage.includes('suspended'))) {
      console.log('✅ Matched: wallet_status');
      return 'wallet_status';
    }

    // Wallet limits queries
    if (hasWallet && (lowerMessage.includes('limit') || lowerMessage.includes('daily') || lowerMessage.includes('monthly'))) {
      console.log('✅ Matched: wallet_limits');
      return 'wallet_limits';
    }

    // ===== VOUCHER PATTERNS (English only - pre-translated) =====
    const hasVoucher = lowerMessage.includes('voucher');
    
    // Voucher balance queries
    if (hasVoucher && (hasBalance || hasWallet)) {
      console.log('✅ Matched: voucher_balance');
      return 'voucher_balance';
    }

    // Voucher expired queries
    if (hasVoucher && lowerMessage.includes('expired')) {
      console.log('✅ Matched: voucher_expired');
      return 'voucher_expired';
    }

    // Voucher cancelled queries
    if (hasVoucher && (lowerMessage.includes('cancelled') || lowerMessage.includes('canceled'))) {
      console.log('✅ Matched: voucher_cancelled');
      return 'voucher_cancelled';
    }

    // EasyPay voucher queries
    if (lowerMessage.includes('easypay') && hasVoucher) {
      console.log('✅ Matched: easypay_vouchers');
      return 'easypay_vouchers';
    }

    // MM voucher queries
    if (lowerMessage.includes('mymoolah') && hasVoucher) {
      console.log('✅ Matched: mm_vouchers');
      return 'mm_vouchers';
    }

    // Voucher redeemed queries
    if (hasVoucher && lowerMessage.includes('redeemed')) {
      console.log('✅ Matched: voucher_redeemed');
      return 'voucher_redeemed';
    }

    // Voucher pending queries
    if (hasVoucher && lowerMessage.includes('pending')) {
      console.log('✅ Matched: voucher_pending');
      return 'voucher_pending';
    }

    // General voucher queries
    if (hasVoucher && !hasBalance && !lowerMessage.includes('expired') && !lowerMessage.includes('cancelled') && !lowerMessage.includes('redeemed') && !lowerMessage.includes('pending')) {
      console.log('✅ Matched: voucher_summary');
      return 'voucher_summary';
    }

    // ===== TRANSACTION PATTERNS =====
    // Last transaction queries (MUST come before general transaction queries)
    if (lowerMessage.includes('last') && lowerMessage.includes('transaction')) {
      console.log('✅ Matched: last_transaction');
      return 'last_transaction';
    }

    // Date-specific transaction queries
    // Require a clear date indicator: a standalone 'on' word or a month token
    const mentionsTransactions = /\btransactions?\b/.test(lowerMessage);
    const hasOnWord = /\bon\b/.test(lowerMessage);
    const hasMonthToken = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept|oct|nov|dec)\b/.test(lowerMessage);
    if (mentionsTransactions && (hasOnWord || hasMonthToken)) {
      console.log('✅ Matched: transactions_by_date');
      return 'transactions_by_date';
    }

    // Transaction type queries
    if (lowerMessage.includes('transaction') && (lowerMessage.includes('send') || lowerMessage.includes('sent'))) {
      console.log('✅ Matched: transactions_sent');
      return 'transactions_sent';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('receive') || lowerMessage.includes('received'))) {
      console.log('✅ Matched: transactions_received');
      return 'transactions_received';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('deposit') || lowerMessage.includes('deposited'))) {
      console.log('✅ Matched: transactions_deposits');
      return 'transactions_deposits';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('withdraw') || lowerMessage.includes('withdrawn'))) {
      console.log('✅ Matched: transactions_withdrawals');
      return 'transactions_withdrawals';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('refund') || lowerMessage.includes('refunded'))) {
      console.log('✅ Matched: transactions_refunds');
      return 'transactions_refunds';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('payment') || lowerMessage.includes('paid'))) {
      console.log('✅ Matched: transactions_payments');
      return 'transactions_payments';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('fee') || lowerMessage.includes('fees'))) {
      console.log('✅ Matched: transactions_fees');
      return 'transactions_fees';
    }

    // Transaction status queries
    if (lowerMessage.includes('transaction') && (lowerMessage.includes('pending') || lowerMessage.includes('processing'))) {
      console.log('✅ Matched: transactions_pending');
      return 'transactions_pending';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('completed') || lowerMessage.includes('successful'))) {
      console.log('✅ Matched: transactions_completed');
      return 'transactions_completed';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('failed') || lowerMessage.includes('error'))) {
      console.log('✅ Matched: transactions_failed');
      return 'transactions_failed';
    }

    if (lowerMessage.includes('transaction') && (lowerMessage.includes('cancelled') || lowerMessage.includes('canceled'))) {
      console.log('✅ Matched: transactions_cancelled');
      return 'transactions_cancelled';
    }

    // Transaction queries (general)
    if (lowerMessage.includes('transaction') || lowerMessage.includes('history')) {
      console.log('✅ Matched: transaction_history');
      return 'transaction_history';
    }

    // ===== KYC PATTERNS =====
    // KYC queries
    if (lowerMessage.includes('kyc') || lowerMessage.includes('verification')) {
      console.log('✅ Matched: kyc_status');
      return 'kyc_status';
    }

    // KYC document queries
    if (lowerMessage.includes('kyc') && (lowerMessage.includes('document') || lowerMessage.includes('id') || lowerMessage.includes('passport'))) {
      console.log('✅ Matched: kyc_documents');
      return 'kyc_documents';
    }

    // KYC tier queries
    if (lowerMessage.includes('kyc') && (lowerMessage.includes('tier') || lowerMessage.includes('level'))) {
      console.log('✅ Matched: kyc_tier');
      return 'kyc_tier';
    }

    // ===== PAYMENT PATTERNS =====
    // Payment queries
    if (lowerMessage.includes('payment') && !lowerMessage.includes('transaction')) {
      console.log('✅ Matched: payments');
      return 'payments';
    }

    // Bill payment queries
    if (lowerMessage.includes('bill') && lowerMessage.includes('payment')) {
      console.log('✅ Matched: bill_payments');
      return 'bill_payments';
    }

    // QR payment queries
    if (lowerMessage.includes('qr') && lowerMessage.includes('payment')) {
      console.log('✅ Matched: qr_payments');
      return 'qr_payments';
    }

    // ===== VAS (VALUE ADDED SERVICES) PATTERNS =====
    // Airtime queries
    if (lowerMessage.includes('airtime') || lowerMessage.includes('air time')) {
      console.log('✅ Matched: airtime');
      return 'airtime';
    }

    // Data queries
    if (lowerMessage.includes('data') && (lowerMessage.includes('bundle') || lowerMessage.includes('package'))) {
      console.log('✅ Matched: data_bundles');
      return 'data_bundles';
    }

    // Electricity queries
    if (lowerMessage.includes('electricity') || lowerMessage.includes('power') || lowerMessage.includes('prepaid')) {
      console.log('✅ Matched: electricity');
      return 'electricity';
    }

    // Gaming queries
    if (lowerMessage.includes('gaming') || lowerMessage.includes('game')) {
      console.log('✅ Matched: gaming');
      return 'gaming';
    }

    // Streaming queries
    if (lowerMessage.includes('streaming') || lowerMessage.includes('stream')) {
      console.log('✅ Matched: streaming');
      return 'streaming';
    }

    // ===== NOTIFICATION PATTERNS =====
    // Notification queries
    if (lowerMessage.includes('notification') || lowerMessage.includes('notifications')) {
      console.log('✅ Matched: notifications');
      return 'notifications';
    }

    // Alert queries
    if (lowerMessage.includes('alert') || lowerMessage.includes('alerts')) {
      console.log('✅ Matched: alerts');
      return 'alerts';
    }

    // ===== SETTINGS PATTERNS =====
    // Settings queries
    if (lowerMessage.includes('setting') || lowerMessage.includes('settings')) {
      console.log('✅ Matched: settings');
      return 'settings';
    }

    // Profile queries
    if (lowerMessage.includes('profile') || lowerMessage.includes('account')) {
      console.log('✅ Matched: user_profile');
      return 'user_profile';
    }

    // ===== SECURITY PATTERNS =====
    // Security queries
    if (lowerMessage.includes('security') || lowerMessage.includes('secure')) {
      console.log('✅ Matched: security');
      return 'security';
    }

    // Password queries (English only - pre-translated by RAG)
    if (lowerMessage.includes('password') || lowerMessage.includes('forgot') && lowerMessage.includes('pin')) {
      console.log('✅ Matched: password');
      return 'password';
    }

    // ===== LIMITS PATTERNS =====
    // Daily limit queries
    if (lowerMessage.includes('daily') && lowerMessage.includes('limit')) {
      console.log('✅ Matched: daily_limits');
      return 'daily_limits';
    }

    // Monthly limit queries
    if (lowerMessage.includes('monthly') && lowerMessage.includes('limit')) {
      console.log('✅ Matched: monthly_limits');
      return 'monthly_limits';
    }

    // ===== CURRENCY PATTERNS =====
    // Currency queries
    if (lowerMessage.includes('currency') || lowerMessage.includes('currencies')) {
      console.log('✅ Matched: currencies');
      return 'currencies';
    }

    // Exchange rate queries
    if (lowerMessage.includes('exchange') && lowerMessage.includes('rate')) {
      console.log('✅ Matched: exchange_rates');
      return 'exchange_rates';
    }

    // ===== BENEFICIARY PATTERNS =====
    // Beneficiary queries
    if (lowerMessage.includes('beneficiary') || lowerMessage.includes('beneficiaries')) {
      console.log('✅ Matched: beneficiaries');
      return 'beneficiaries';
    }

    // Contact queries
    if (lowerMessage.includes('contact') || lowerMessage.includes('contacts')) {
      console.log('✅ Matched: contacts');
      return 'contacts';
    }

    // ===== FINANCIAL SUMMARY PATTERNS =====
    // Financial summary queries
    if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
      console.log('✅ Matched: financial_summary');
      return 'financial_summary';
    }

    // Statement queries
    if (lowerMessage.includes('statement') || lowerMessage.includes('statements')) {
      console.log('✅ Matched: statements');
      return 'statements';
    }

    // ===== FLOAT PATTERNS =====
    // Float queries
    if (lowerMessage.includes('float') || lowerMessage.includes('floats')) {
      console.log('✅ Matched: floats');
      return 'floats';
    }

    // ===== SETTLEMENT PATTERNS =====
    // Settlement queries
    if (lowerMessage.includes('settlement') || lowerMessage.includes('settlements')) {
      console.log('✅ Matched: settlements');
      return 'settlements';
    }

    // ===== TAX PATTERNS =====
    // Tax queries
    if (lowerMessage.includes('tax') || lowerMessage.includes('taxes')) {
      console.log('✅ Matched: taxes');
      return 'taxes';
    }

    // VAT queries
    if (lowerMessage.includes('vat')) {
      console.log('✅ Matched: vat');
      return 'vat';
    }

    // ===== COMPLIANCE PATTERNS =====
    // Compliance queries
    if (lowerMessage.includes('compliance') || lowerMessage.includes('compliance')) {
      console.log('✅ Matched: compliance');
      return 'compliance';
    }

    // ===== FEEDBACK PATTERNS =====
    // Feedback queries
    if (lowerMessage.includes('feedback') || lowerMessage.includes('review')) {
      console.log('✅ Matched: feedback');
      return 'feedback';
    }

    // ===== SUPPORT PATTERNS =====
    // Support queries
    if (lowerMessage.includes('support') || lowerMessage.includes('help')) {
      console.log('✅ Matched: support');
      return 'support';
    }

    // ===== LAST VOUCHER PATTERNS =====
    // Last voucher queries
    if (lowerMessage.includes('last') && lowerMessage.includes('voucher')) {
      console.log('✅ Matched: last_voucher');
      return 'last_voucher';
    }

    console.log('🎯 No direct pattern match found');
    return null;
  }

  /**
   * 💾 CACHE: Get cached query type for a message
   * Prevents repeated OpenAI calls for the same question types
   */
  getCachedQueryType(message) {
    const normalizedMessage = this.normalizeMessage(message);
    
    // Check if we have this exact message cached
    if (this.queryCache.has(normalizedMessage)) {
      const cached = this.queryCache.get(normalizedMessage);
      console.log('💾 Cache HIT for message:', normalizedMessage);
      return cached.queryType;
    }
    
    // Check if we have a similar message cached (fuzzy matching)
    for (const [cachedMessage, cached] of this.queryCache) {
      if (this.isSimilarMessage(normalizedMessage, cachedMessage)) {
        console.log('💾 Fuzzy cache HIT for message:', normalizedMessage);
        return cached.queryType;
      }
    }
    
    console.log('💾 Cache MISS for message:', normalizedMessage);
    return null;
  }

  /**
   * 💾 CACHE: Store query type for a message
   */
  cacheQueryType(message, queryType) {
    const normalizedMessage = this.normalizeMessage(message);
    this.queryCache.set(normalizedMessage, {
      queryType,
      timestamp: Date.now(),
      count: 1
    });
    console.log('💾 Cached query type:', normalizedMessage, '->', queryType);
  }

  /**
   * 🔧 Normalize message for consistent caching
   */
  normalizeMessage(message) {
    return message.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[?.,!]/g, ''); // Remove punctuation
  }

  /**
   * 🔍 Check if two messages are similar enough to use cached result
   */
  isSimilarMessage(message1, message2) {
    const words1 = message1.split(' ');
    const words2 = message2.split(' ');
    
    // If messages are very similar (80% word match), consider them the same
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarity >= 0.8;
  }

  /**
   * 🔄 Force immediate codebase sweep
   */
  async forceCodebaseSweep() {
    return await this.codebaseSweep.forceSweep();
  }

  /**
   * 🏦 BANKING-GRADE: Process Chat Message
   * Intelligent routing based on query type
   */
  async processChatMessage(message, language, context) {
    try {
      console.log('🔍 Processing message:', message);
      console.log('🔍 Language:', language);
      console.log('🔍 Context:', context);
      
      // AI-powered query classification - dynamically determines query type
      const simpleQuery = await this.detectSimpleQuery(message);
      console.log('🔍 AI classification result:', simpleQuery);
      
      if (simpleQuery) {
        console.log('🔍 Handling simple query:', simpleQuery);
        const result = await this.handleSimpleQuery(simpleQuery, context, language, message);
        console.log('🔍 Simple query result:', result);
        return result;
      }

      console.log('🔍 Handling complex query with OpenAI');
      // Complex queries use OpenAI for analysis
      return await this.handleComplexQuery(message, language, context);
    } catch (error) {
      console.error('❌ Error processing chat message:', error);
      return {
        text: this.getLocalizedResponse('error_occurred', language),
        context: { error: true },
        suggestions: ['Try again', 'Contact support']
      };
    }
  }

  /**
   * 🚀 SIMPLE & EFFECTIVE: Query Classification
   * No AI calls for obvious queries - just pattern matching
   */
  async detectSimpleQuery(message) {
    try {
      console.log('🔍 Analyzing query:', message);
      
      // DIRECT PATTERN MATCHING - NO AI, NO CACHE, JUST WORK
      const directMatch = this.directPatternMatch(message);
      if (directMatch) {
        console.log('🎯 Direct pattern match (0 OpenAI cost):', directMatch);
        return directMatch;
      }
      
      // Only use AI for truly unclear queries
      console.log('🤖 Query unclear, using AI (1 OpenAI cost)');
      const aiResult = await this.classifyQueryWithAI(message);
      return aiResult?.isSimpleQuery ? aiResult.queryType : null;
      
    } catch (error) {
      console.error('❌ Error in detectSimpleQuery:', error);
      return this.directPatternMatch(message); // Fallback to pattern matching
    }
  }

  /**
   * 🤖 AI-Powered Query Classification
   * Only used for unclear queries that need AI analysis
   */
  async classifyQueryWithAI(message) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a query classifier for MyMoolah financial platform.

Classify if this query can be answered with direct database access (simple) or needs AI analysis (complex).

SIMPLE QUERIES (database) - return exact format:
- wallet_balance (for wallet balance queries)
- voucher_summary (for general voucher queries)
- easypay_vouchers (for EasyPay voucher queries)
- mm_vouchers (for MyMoolah voucher queries)
- kyc_status (for KYC queries)
- transaction_history (for transaction queries)
- user_profile (for profile queries)
- financial_summary (for summary queries)

COMPLEX QUERIES (AI needed):
- how to use features, troubleshooting, explanations, guidance, non-database information

Return JSON: {"isSimpleQuery": true/false, "queryType": "exact_type_with_underscores"}`
          },
          {
            role: "user",
            content: `Classify: "${message}"`
          }
        ],
        max_completion_tokens: 150
      });
      
      const response = completion.choices[0].message.content;
      const classification = JSON.parse(response);
      
      console.log('🤖 AI Classification Result:', classification);
      return classification;
      
    } catch (error) {
      console.error('❌ AI classification failed:', error);
      return null;
    }
  }

  /**
   * 🧠 Smart Pattern Matching
   * Identifies obvious queries without AI (0 OpenAI cost)
   */
  smartPatternMatching(message) {
    const lowerMessage = message.toLowerCase();
    console.log('🧠 Smart pattern matching for:', lowerMessage);
    
    // Wallet balance queries (obvious)
    if (lowerMessage.includes('wallet') && lowerMessage.includes('balance')) {
      return 'wallet_balance';
    }
    
    // Voucher balance queries (obvious)
    if (lowerMessage.includes('voucher') && lowerMessage.includes('balance')) {
      return 'voucher_summary';
    }
    
    // KYC status queries (obvious)
    if (lowerMessage.includes('kyc') || lowerMessage.includes('verification')) {
      return 'kyc_status';
    }
    
    // Transaction history (obvious)
    if (lowerMessage.includes('transaction') || lowerMessage.includes('history')) {
      return 'transaction_history';
    }
    
    // Last voucher (obvious)
    if (lowerMessage.includes('last') && lowerMessage.includes('voucher')) {
      return 'last_voucher';
    }
    
    // User profile (obvious)
    if (lowerMessage.includes('profile') || lowerMessage.includes('account')) {
      return 'user_profile';
    }
    
    // Financial summary (obvious)
    if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
      return 'financial_summary';
    }
    
    console.log('🧠 No obvious pattern match found');
    return null;
  }

  /**
   * 🆘 Emergency Fallback
   * Used when everything else fails
   */
  emergencyFallback(message) {
    const lowerMessage = message.toLowerCase();
    console.log('🆘 Emergency fallback for:', lowerMessage);
    
    // Only handle critical queries in emergency
    if (lowerMessage.includes('wallet') && lowerMessage.includes('balance')) {
      return 'wallet_balance';
    }
    if (lowerMessage.includes('kyc')) {
      return 'kyc_status';
    }
    
    return null;
  }

  /**
   * 🏦 BANKING-GRADE: Handle Simple Queries
   * Direct database access - NO OpenAI calls
   */
  async handleSimpleQuery(queryType, context, language, originalMessage) {
    console.log('🔍 Handling simple query type:', queryType);
    console.log('🔍 Context:', context);
    console.log('🔍 Language:', language);
    
    const userId = context.userId;
    console.log('🔍 User ID:', userId);
    
    switch (queryType) {
      case 'wallet_balance':
        console.log('🔍 Calling getWalletBalanceResponse');
        return await this.getWalletBalanceResponse(userId, language);
      
      case 'voucher_summary':
        console.log('🔍 Calling getVoucherSummaryResponse');
        return await this.getVoucherSummaryResponse(userId, language);
      
      case 'voucher_balance':
        console.log('🔍 Calling getVoucherBalanceResponse');
        return await this.getVoucherBalanceResponse(userId, language);
      
      case 'voucher_expired':
        console.log('🔍 Calling getVoucherExpiredResponse');
        return await this.getVoucherExpiredResponse(userId, language);
      
      case 'voucher_cancelled':
        console.log('🔍 Calling getVoucherCancelledResponse');
        return await this.getVoucherCancelledResponse(userId, language);
      
      case 'easypay_vouchers':
        console.log('🔍 Calling getEasyPayVouchersResponse');
        return await this.getEasyPayVouchersResponse(userId, language);
      
      case 'mm_vouchers':
        console.log('🔍 Calling getMMVouchersResponse');
        return await this.getMMVouchersResponse(userId, language);
      
      case 'kyc_status':
        console.log('🔍 Calling getKycStatusResponse');
        return await this.getKycStatusResponse(userId, language);
      
      case 'transaction_history':
        console.log('🔍 Calling getTransactionHistoryResponse');
        return await this.getTransactionHistoryResponse(userId, language);
      
      case 'transactions_by_date':
        console.log('🔍 Calling getTransactionsByDateResponse');
        return await this.getTransactionsByDateResponse(userId, language, originalMessage);
      
      case 'financial_summary':
        console.log('🔍 Calling getUserFinancialSummary');
        return await this.getUserFinancialSummary(userId, language);
      
      case 'last_voucher':
        console.log('🔍 Calling getLastVoucherResponse');
        return await this.getLastVoucherResponse(userId, language);
      
      case 'last_transaction':
        console.log('🔍 Calling getLastTransactionResponse');
        return await this.getLastTransactionResponse(userId, language);
      
      case 'user_profile':
        console.log('🔍 Calling getUserProfileResponse');
        return await this.getUserProfileResponse(userId, language);
      
      case 'wallet_status':
        console.log('🔍 Calling getWalletStatusResponse');
        return await this.getWalletStatusResponse(userId, language);
      
      case 'wallet_limits':
        console.log('🔍 Calling getWalletLimitsResponse');
        return await this.getWalletLimitsResponse(userId, language);
      
      case 'voucher_redeemed':
        console.log('🔍 Calling getVoucherRedeemedResponse');
        return await this.getVoucherRedeemedResponse(userId, language);
      
      case 'voucher_pending':
        console.log('🔍 Calling getVoucherPendingResponse');
        return await this.getVoucherPendingResponse(userId, language);
      
      case 'transactions_sent':
        console.log('🔍 Calling getTransactionsSentResponse');
        return await this.getTransactionsSentResponse(userId, language);
      
      case 'transactions_received':
        console.log('🔍 Calling getTransactionsReceivedResponse');
        return await this.getTransactionsReceivedResponse(userId, language);
      
      case 'transactions_deposits':
        console.log('🔍 Calling getTransactionsDepositsResponse');
        return await this.getTransactionsDepositsResponse(userId, language);
      
      case 'transactions_withdrawals':
        console.log('🔍 Calling getTransactionsWithdrawalsResponse');
        return await this.getTransactionsWithdrawalsResponse(userId, language);
      
      case 'transactions_refunds':
        console.log('🔍 Calling getTransactionsRefundsResponse');
        return await this.getTransactionsRefundsResponse(userId, language);
      
      case 'transactions_payments':
        console.log('🔍 Calling getTransactionsPaymentsResponse');
        return await this.getTransactionsPaymentsResponse(userId, language);
      
      case 'transactions_fees':
        console.log('🔍 Calling getTransactionsFeesResponse');
        return await this.getTransactionsFeesResponse(userId, language);
      
      case 'transactions_pending':
        console.log('🔍 Calling getTransactionsPendingResponse');
        return await this.getTransactionsPendingResponse(userId, language);
      
      case 'transactions_completed':
        console.log('🔍 Calling getTransactionsCompletedResponse');
        return await this.getTransactionsCompletedResponse(userId, language);
      
      case 'transactions_failed':
        console.log('🔍 Calling getTransactionsFailedResponse');
        return await this.getTransactionsFailedResponse(userId, language);
      
      case 'transactions_cancelled':
        console.log('🔍 Calling getTransactionsCancelledResponse');
        return await this.getTransactionsCancelledResponse(userId, language);
      
      case 'kyc_documents':
        console.log('🔍 Calling getKycDocumentsResponse');
        return await this.getKycDocumentsResponse(userId, language);
      
      case 'kyc_tier':
        console.log('🔍 Calling getKycTierResponse');
        return await this.getKycTierResponse(userId, language);
      
      case 'payments':
        console.log('🔍 Calling getPaymentsResponse');
        return await this.getPaymentsResponse(userId, language);
      
      case 'bill_payments':
        console.log('🔍 Calling getBillPaymentsResponse');
        return await this.getBillPaymentsResponse(userId, language);
      
      case 'qr_payments':
        console.log('🔍 Calling getQrPaymentsResponse');
        return await this.getQrPaymentsResponse(userId, language);
      
      case 'airtime':
        console.log('🔍 Calling getAirtimeResponse');
        return await this.getAirtimeResponse(userId, language);
      
      case 'data_bundles':
        console.log('🔍 Calling getDataBundlesResponse');
        return await this.getDataBundlesResponse(userId, language);
      
      case 'electricity':
        console.log('🔍 Calling getElectricityResponse');
        return await this.getElectricityResponse(userId, language);
      
      case 'gaming':
        console.log('🔍 Calling getGamingResponse');
        return await this.getGamingResponse(userId, language);
      
      case 'streaming':
        console.log('🔍 Calling getStreamingResponse');
        return await this.getStreamingResponse(userId, language);
      
      case 'notifications':
        console.log('🔍 Calling getNotificationsResponse');
        return await this.getNotificationsResponse(userId, language);
      
      case 'alerts':
        console.log('🔍 Calling getAlertsResponse');
        return await this.getAlertsResponse(userId, language);
      
      case 'settings':
        console.log('🔍 Calling getSettingsResponse');
        return await this.getSettingsResponse(userId, language);
      
      case 'security':
        console.log('🔍 Calling getSecurityResponse');
        return await this.getSecurityResponse(userId, language);
      
      case 'password':
        console.log('🔍 Calling getPasswordResponse');
        return await this.getPasswordResponse(userId, language);
      
      case 'daily_limits':
        console.log('🔍 Calling getDailyLimitsResponse');
        return await this.getDailyLimitsResponse(userId, language);
      
      case 'monthly_limits':
        console.log('🔍 Calling getMonthlyLimitsResponse');
        return await this.getMonthlyLimitsResponse(userId, language);
      
      case 'currencies':
        console.log('🔍 Calling getCurrenciesResponse');
        return await this.getCurrenciesResponse(userId, language);
      
      case 'exchange_rates':
        console.log('🔍 Calling getExchangeRatesResponse');
        return await this.getExchangeRatesResponse(userId, language);
      
      case 'beneficiaries':
        console.log('🔍 Calling getBeneficiariesResponse');
        return await this.getBeneficiariesResponse(userId, language);
      
      case 'contacts':
        console.log('🔍 Calling getContactsResponse');
        return await this.getContactsResponse(userId, language);
      
      case 'statements':
        console.log('🔍 Calling getStatementsResponse');
        return await this.getStatementsResponse(userId, language);
      
      case 'floats':
        console.log('🔍 Calling getFloatsResponse');
        return await this.getFloatsResponse(userId, language);
      
      case 'settlements':
        console.log('🔍 Calling getSettlementsResponse');
        return await this.getSettlementsResponse(userId, language);
      
      case 'taxes':
        console.log('🔍 Calling getTaxesResponse');
        return await this.getTaxesResponse(userId, language);
      
      case 'vat':
        console.log('🔍 Calling getVatResponse');
        return await this.getVatResponse(userId, language);
      
      case 'compliance':
        console.log('🔍 Calling getComplianceResponse');
        return await this.getComplianceResponse(userId, language);
      
      case 'feedback':
        console.log('🔍 Calling getFeedbackResponse');
        return await this.getFeedbackResponse(userId, language);
      
      case 'support':
        console.log('🔍 Calling getSupportResponse');
        return await this.getSupportResponse(userId, language);
      
      default:
        console.log('🔍 Unknown query type:', queryType);
        return {
          text: this.getLocalizedResponse('query_not_understood', language),
          context: { queryType },
          suggestions: ['Rephrase your question', 'Contact support']
        };
    }
  }

  /**
   * 🏦 BANKING-GRADE: Handle Complex Queries
   * OpenAI analysis for non-standard queries
   */
  async handleComplexQuery(message, language, context) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a friendly, helpful banking support assistant for MyMoolah, a financial platform in South Africa. 

IMPORTANT: Always respond in a warm, conversational tone as if you're talking to a friend. Never use technical jargon or formal language.

Your responses should be:
- Conversational and friendly (use "you" and "we")
- Simple and easy to understand
- Helpful and actionable
- Written in ${language}
- Under 100 words when possible

For technical questions, explain things simply and focus on what the user can do, not technical specifications.

Remember: You're helping real people with their money, so be encouraging and supportive!`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_completion_tokens: 200
      });

      return {
        text: completion.choices[0].message.content,
        context: { aiGenerated: true },
        suggestions: ['Ask another question', 'Contact human support']
      };
    } catch (error) {
      console.error('OpenAI error:', error);
      return {
        text: this.getLocalizedResponse('ai_unavailable', language),
        context: { aiError: true },
        suggestions: ['Try again later', 'Contact support']
      };
    }
  }

  /**
   * 🏦 BANKING-GRADE: Localized Responses
   * Multi-language support for banking queries
   */
  getLocalizedResponse(key, language, params = {}) {
    const responses = {
      wallet_balance: {
        en: `Your current wallet balance is ${params.currency} ${params.balance}.`,
        af: `Jou beursie balans is ${params.currency} ${params.balance}.`,
        zu: `Ibhalansi yakho yewallet yi-${params.currency} ${params.balance}.`,
        xh: `Ibhalansi yakho yewallet yi-${params.currency} ${params.balance}.`,
        st: `Balans ya hao ya wallet ke ${params.currency} ${params.balance}.`
      },
      voucher_summary: {
        en: `Your voucher portfolio: You currently have ${params.activeCount} active vouchers worth R${params.activeBalance}, ${params.pendingCount} pending vouchers worth R${params.pendingBalance}, and ${params.totalCount} total vouchers worth R${params.totalValue}.`,
        af: `Jy het ${params.activeCount} aktiewe vouchers ter waarde van R${params.activeBalance}, ${params.pendingCount} hangende vouchers ter waarde van R${params.pendingBalance}, en ${params.totalCount} totale vouchers ter waarde van R${params.totalValue}.`,
        zu: `Une-${params.activeCount} ama-voucher asebenzayo anexabiso elingu-R${params.activeBalance}, ${params.pendingCount} ama-voucher alindileyo anexabiso elingu-R${params.pendingBalance}, kanye nama-${params.totalCount} ama-voucher esamba anexabiso elingu-R${params.totalValue}.`,
        xh: `Une-${params.activeCount} ama-voucher asebenzayo anexabiso elingu-R${params.activeBalance}, ${params.pendingCount} ama-voucher alindileyo anexabiso elingu-R${params.pendingBalance}, kunye nama-${params.totalCount} ama-voucher esamba anexabiso elingu-R${params.totalValue}.`,
        st: `O na le ${params.activeCount} li-voucher tse sebetsang tsa R${params.activeBalance}, ${params.pendingCount} li-voucher tse lindileng tsa R${params.pendingBalance}, le ${params.totalCount} li-voucher tsa kakaretso tsa R${params.totalValue}.`
      },
      voucher_balance: {
        en: `Your voucher balance: ${params.activeCount} active vouchers worth R${params.activeBalance} and ${params.pendingCount} pending vouchers worth R${params.pendingBalance}. Total available balance: R${params.totalBalance}.`,
        af: `Jou voucher balans: ${params.activeCount} aktiewe vouchers ter waarde van R${params.activeBalance} en ${params.pendingCount} hangende vouchers ter waarde van R${params.pendingBalance}. Totale beskikbare balans: R${params.totalBalance}.`,
        zu: `Ibhalansi yakho yama-voucher: ${params.activeCount} ama-voucher asebenzayo anexabiso elingu-R${params.activeBalance} kanye nama-${params.pendingCount} ama-voucher alindileyo anexabiso elingu-R${params.pendingBalance}. Ibhalansi esamba etholakalayo: R${params.totalBalance}.`,
        xh: `Ibhalansi yakho yama-voucher: ${params.activeCount} ama-voucher asebenzayo anexabiso elingu-R${params.activeBalance} kunye nama-${params.pendingCount} ama-voucher alindileyo anexabiso elingu-R${params.pendingBalance}. Ibhalansi esamba etholakalayo: R${params.totalBalance}.`,
        st: `Balans ya hao ya li-voucher: ${params.activeCount} li-voucher tse sebetsang tsa R${params.activeBalance} le ${params.pendingCount} li-voucher tse lindileng tsa R${params.pendingBalance}. Balans ea kakaretso e fumanehang: R${params.totalBalance}.`
      },
      voucher_expired: {
        en: `Your expired vouchers: ${params.expiredCount} expired vouchers worth R${params.expiredBalance}.`,
        af: `Jou vervalle vouchers: ${params.expiredCount} vervalle vouchers ter waarde van R${params.expiredBalance}.`,
        zu: `Ama-voucher akho aphelelwe yisikhathi: ${params.expiredCount} ama-voucher aphelelwe yisikhathi anexabiso elingu-R${params.expiredBalance}.`,
        xh: `Ama-voucher akho aphelelwe yisikhathi: ${params.expiredCount} ama-voucher aphelelwe yisikhathi anexabiso elingu-R${params.expiredBalance}.`,
        st: `Li-voucher tsa hao tse fetileng: ${params.expiredCount} li-voucher tse fetileng tsa R${params.expiredBalance}.`
      },
      voucher_cancelled: {
        en: `Your cancelled vouchers: ${params.cancelledCount} cancelled vouchers with original value of R${params.cancelledOriginalAmount} (current balance: R${params.cancelledBalance}).`,
        af: `Jou gekanselleerde vouchers: ${params.cancelledCount} gekanselleerde vouchers met oorspronklike waarde van R${params.cancelledOriginalAmount} (huidige balans: R${params.cancelledBalance}).`,
        zu: `Ama-voucher akho akhanseliwe: ${params.cancelledCount} ama-voucher akhanseliwe anexabiso lokuqala elingu-R${params.cancelledOriginalAmount} (ibhalansi yamanje: R${params.cancelledBalance}).`,
        xh: `Ama-voucher akho akhanseliwe: ${params.cancelledCount} ama-voucher akhanseliwe anexabiso lokuqala elingu-R${params.cancelledOriginalAmount} (ibhalansi yamanje: R${params.cancelledBalance}).`,
        st: `Li-voucher tsa hao tse khanselitsoeng: ${params.cancelledCount} li-voucher tse khanselitsoeng tsa R${params.cancelledOriginalAmount} (balans ea hajoale: R${params.cancelledBalance}).`
      },
      easypay_vouchers: {
        en: `Your EasyPay vouchers: ${params.totalCount} total vouchers (${params.activeCount} active worth R${params.activeBalance}, ${params.pendingCount} pending worth R${params.pendingBalance}, ${params.expiredCount} expired worth R${params.expiredBalance}, ${params.cancelledCount} cancelled with original value R${params.cancelledOriginalAmount}). Total current balance: R${params.totalBalance}.`,
        af: `Jou EasyPay vouchers: ${params.totalCount} totale vouchers (${params.activeCount} aktief ter waarde van R${params.activeBalance}, ${params.pendingCount} hangende ter waarde van R${params.pendingBalance}, ${params.expiredCount} vervalle ter waarde van R${params.expiredBalance}, ${params.cancelledCount} gekanselleer met oorspronklike waarde R${params.cancelledOriginalAmount}). Totale huidige balans: R${params.totalBalance}.`,
        zu: `Ama-voucher akho e-EasyPay: ${params.totalCount} ama-voucher esamba (${params.activeCount} asebenzayo anexabiso elingu-R${params.activeBalance}, ${params.pendingCount} alindileyo anexabiso elingu-R${params.pendingBalance}, ${params.expiredCount} aphelelwe yisikhathi anexabiso elingu-R${params.expiredBalance}, ${params.cancelledCount} akhanseliwe anexabiso lokuqala elingu-R${params.cancelledOriginalAmount}). Ibhalansi esamba yamanje: R${params.totalBalance}.`,
        xh: `Ama-voucher akho e-EasyPay: ${params.totalCount} ama-voucher esamba (${params.activeCount} asebenzayo anexabiso elingu-R${params.activeBalance}, ${params.pendingCount} alindileyo anexabiso elingu-R${params.pendingBalance}, ${params.expiredCount} aphelelwe yisikhathi anexabiso elingu-R${params.expiredBalance}, ${params.cancelledCount} akhanseliwe anexabiso lokuqala elingu-R${params.cancelledOriginalAmount}). Ibhalansi esamba yamanje: R${params.totalBalance}.`,
        st: `Li-voucher tsa hao tsa EasyPay: ${params.totalCount} li-voucher tsa kakaretso (${params.activeCount} tse sebetsang tsa R${params.activeBalance}, ${params.pendingCount} tse lindileng tsa R${params.pendingBalance}, ${params.expiredCount} tse fetileng tsa R${params.expiredBalance}, ${params.cancelledCount} tse khanselitsoeng tsa R${params.cancelledOriginalAmount}). Balans ea kakaretso ea hajoale: R${params.totalBalance}.`
      },
      mm_vouchers: {
        en: `Your MyMoolah vouchers: ${params.totalCount} total vouchers (${params.activeCount} active worth R${params.activeBalance}, ${params.pendingCount} pending worth R${params.pendingBalance}, ${params.expiredCount} expired worth R${params.expiredBalance}, ${params.cancelledCount} cancelled with original value R${params.cancelledOriginalAmount}). Total current balance: R${params.totalBalance}.`,
        af: `Jou MyMoolah vouchers: ${params.totalCount} totale vouchers (${params.activeCount} aktief ter waarde van R${params.activeBalance}, ${params.pendingCount} hangende ter waarde van R${params.pendingBalance}, ${params.expiredCount} vervalle ter waarde van R${params.expiredBalance}, ${params.cancelledCount} gekanselleer met oorspronklike waarde R${params.cancelledOriginalAmount}). Totale huidige balans: R${params.totalBalance}.`,
        zu: `Ama-voucher akho e-MyMoolah: ${params.totalCount} ama-voucher esamba (${params.activeCount} asebenzayo anexabiso elingu-R${params.activeBalance}, ${params.pendingCount} alindileyo anexabiso elingu-R${params.pendingBalance}, ${params.expiredCount} aphelelwe yisikhathi anexabiso elingu-R${params.expiredBalance}, ${params.cancelledCount} akhanseliwe anexabiso lokuqala elingu-R${params.cancelledOriginalAmount}). Ibhalansi esamba yamanje: R${params.totalBalance}.`,
        xh: `Ama-voucher akho e-MyMoolah: ${params.totalCount} ama-voucher esamba (${params.activeCount} asebenzayo anexabiso elingu-R${params.activeBalance}, ${params.pendingCount} alindileyo anexabiso elingu-R${params.pendingBalance}, ${params.expiredCount} aphelelwe yisikhathi anexabiso elingu-R${params.expiredBalance}, ${params.cancelledCount} akhanseliwe anexabiso lokuqala elingu-R${params.cancelledOriginalAmount}). Ibhalansi esamba yamanje: R${params.totalBalance}.`,
        st: `Li-voucher tsa hao tsa MyMoolah: ${params.totalCount} li-voucher tsa kakaretso (${params.activeCount} tse sebetsang tsa R${params.activeBalance}, ${params.pendingCount} tse lindileng tsa R${params.pendingBalance}, ${params.expiredCount} tse fetileng tsa R${params.expiredBalance}, ${params.cancelledCount} tse khanselitsoeng tsa R${params.cancelledOriginalAmount}). Balans ea kakaretso ea hajoale: R${params.totalBalance}.`
      },
      no_easypay_vouchers: {
        en: "You don't have any EasyPay vouchers at the moment.",
        af: "Jy het nie enige EasyPay vouchers op die oomblik nie.",
        zu: "Awunawo ama-voucher e-EasyPay okwamanje.",
        xh: "Awunawo ama-voucher e-EasyPay okwamanje.",
        st: "Ha u na li-voucher tsa EasyPay hajoale."
      },
      no_mm_vouchers: {
        en: "You don't have any MyMoolah vouchers at the moment.",
        af: "Jy het nie enige MyMoolah vouchers op die oomblik nie.",
        zu: "Awunawo ama-voucher e-MyMoolah okwamanje.",
        xh: "Awunawo ama-voucher e-MyMoolah okwamanje.",
        st: "Ha u na li-voucher tsa MyMoolah hajoale."
      },
      kyc_status: {
        en: `Your KYC verification status is ${params.status === 'verified' ? 'complete and verified' : params.status}. ${params.status === 'verified' ? (params.tier === 'tier2' ? 'You are on Tier 2 (Enhanced Verification) with full access to all MyMoolah services.' : 'You are on Tier 1 (Basic Verification) with transaction limits: R5,000.00 per transaction, R30,000.00 monthly. Upload proof of address to upgrade to Tier 2 for higher limits.') : 'You currently have limited access to MyMoolah services.'}`,
        af: `Jou KYC verifikasie status is ${params.status === 'verified' ? 'volledig en geverifieer' : params.status}. ${params.status === 'verified' ? (params.tier === 'tier2' ? 'Jy is op Vlak 2 (Verbeterde Verifikasie) met volle toegang tot alle MyMoolah dienste.' : 'Jy is op Vlak 1 (Basiese Verifikasie) met transaksie limiete: R5,000.00 per transaksie, R30,000.00 maandeliks. Laai bewys van adres op om op te gradeer na Vlak 2 vir hoër limiete.') : 'Jy het tans beperkte toegang tot MyMoolah dienste.'}`,
        zu: `Isimo sakho sokugunyazwa kwe-KYC ${params.status === 'verified' ? 'siqedile futhi sigunyazwe' : params.status}. ${params.status === 'verified' ? (params.tier === 'tier2' ? 'Uku-Tier 2 (Ukugunyazwa Okuthuthukisiwe) ngokufinyelela okuphelele kuzo zonke izinkonzo ze-MyMoolah.' : 'Uku-Tier 1 (Ukugunyazwa Okusisekelo) enemikhawulo yokuthengiselana: R5,000.00 ngokuthengiselana ngakunye, R30,000.00 nyangazonke. Loda ubufakazi bekheli ukuze uthuthukisele ku-Tier 2 ukuze uthole imikhawulo ephezulu.') : 'Okwamanje une-ukufinyelela okulinganiselwe kumisebenzi ye-MyMoolah.'}`,
        xh: `Isimo sakho sokugunyazwa kwe-KYC ${params.status === 'verified' ? 'siqedile kwaye sigunyazwe' : params.status}. ${params.status === 'verified' ? (params.tier === 'tier2' ? 'Uku-Tier 2 (Ukugunyazwa Okuthuthukisiwe) ngokufikelela okupheleleyo kwiinkonzo zonke ze-MyMoolah.' : 'Uku-Tier 1 (Ukugunyazwa Okusisiseko) nemida yokuthengiselana: R5,000.00 ngokuthengiselana ngasinye, R30,000.00 ngenyanga. Layisha ubungqina bedilesi ukuze uphucule uye kwi-Tier 2 ukuze ufumane imida ephezulu.') : 'Okwangoku unofikelelo olulinganiselweyo kwiinkonzo ze-MyMoolah.'}`,
        st: `Boemo ba hao ba ho netefatsoa ha KYC ke ${params.status === 'verified' ? 'bo feditse ebile bo netefatsoa' : params.status}. ${params.status === 'verified' ? (params.tier === 'tier2' ? 'O ho Tier 2 (Ho Netefatsoa ha Ntlafalitsoeng) ka phihlello e felletseng litshebetsong tsohle tsa MyMoolah.' : 'O ho Tier 1 (Ho Netefatsoa ha Base) le mekhawulo ea ho reka: R5,000.00 ka ho reka ka mong, R30,000.00 ka khoeli. Kenya bopaki ba aterese ho ntlafatsa ho Tier 2 bakeng sa mekhawulo e phahameng.') : 'Hajoale o na le ho fihlella ho lekanyetsoang ho litšebeletso tsa MyMoolah.'}`
      },
      financial_summary: {
        en: `Here's your financial overview: Your wallet contains R${params.walletBalance}, you have ${params.activeVouchers} active vouchers worth R${params.activeVoucherValue}, and ${params.pendingVouchers} pending vouchers worth R${params.pendingVoucherValue}. In total, you have ${params.totalVouchers} vouchers and ${params.totalTransactions} transactions.`,
        af: `Finansiële Opsomming: Beursie: R${params.walletBalance}, Aktiewe Vouchers: ${params.activeVouchers} (R${params.activeVoucherValue}), Hangende: ${params.pendingVouchers} (R${params.pendingVoucherValue}), Totale Vouchers: ${params.totalVouchers}, Transaksies: ${params.totalTransactions}, KYC: ${params.kycStatus}.`,
        zu: `Isifinyezo Sezezimali: I-Wallet: R${params.walletBalance}, Ama-Voucher Asebenzayo: ${params.activeVouchers} (R${params.activeVoucherValue}), Alindileyo: ${params.pendingVouchers} (R${params.pendingVoucherValue}), Ama-Voucher Esamba: ${params.totalVouchers}, Ama-Transaksi: ${params.totalTransactions}, I-KYC: ${params.kycStatus}.`,
        xh: `Isifinyezo Sezezimali: I-Wallet: R${params.walletBalance}, Ama-Voucher Asebenzayo: ${params.activeVouchers} (R${params.activeVoucherValue}), Alindileyo: ${params.pendingVouchers} (R${params.pendingVoucherValue}), Ama-Voucher Esamba: ${params.totalVouchers}, Ama-Transaksi: ${params.totalTransactions}, I-KYC: ${params.kycStatus}.`,
        st: `Kakaretso ea Tsa Chelete: Wallet: R${params.walletBalance}, Li-Voucher tse Sebetsang: ${params.activeVouchers} (R${params.activeVoucherValue}), Li lindileng: ${params.pendingVouchers} (R${params.pendingVoucherValue}), Li-Voucher tsa Kakaretso: ${params.totalVouchers}, Li-Transaksi: ${params.totalTransactions}, KYC: ${params.kycStatus}.`
      },
      transaction_summary: {
        en: `Your transaction activity: You've made ${params.totalTransactions} transactions in total, including ${params.receivedCount} incoming payments worth R${params.totalReceived} and ${params.sentCount} outgoing payments worth R${params.totalSent}. Your last transaction was on ${params.lastTransactionDate}.`,
        af: `Transaksie Opsomming: Totaal: ${params.totalTransactions}, Ontvang: ${params.receivedCount} (R${params.totalReceived}), Gestuur: ${params.sentCount} (R${params.totalSent}), Laaste Transaksie: ${params.lastTransactionDate}.`,
        zu: `Isifinyezo Sama-Transaksi: Isamba: ${params.totalTransactions}, Okwamukelwe: ${params.receivedCount} (R${params.totalReceived}), Okuthunyelwe: ${params.sentCount} (R${params.totalSent}), I-Transaksi Yokugcina: ${params.lastTransactionDate}.`,
        xh: `Isifinyezo Sama-Transaksi: Isamba: ${params.totalTransactions}, Okwamukelwe: ${params.receivedCount} (R${params.totalReceived}), Okuthunyelwe: ${params.sentCount} (R${params.totalSent}), I-Transaksi Yokugcina: ${params.lastTransactionDate}.`,
        st: `Kakaretso ea Li-Transaksi: Kakaretso: ${params.totalTransactions}, E amohelletsoeng: ${params.receivedCount} (R${params.totalReceived}), E rometsoeng: ${params.sentCount} (R${params.totalSent}), Transaksi ea ho Qetela: ${params.lastTransactionDate}.`
      },
      no_vouchers: {
        en: "You don't have any active vouchers at the moment.",
        af: "Jy het nie enige aktiewe vouchers op die oomblik nie.",
        zu: "Awunawo ama-voucher asebenzayo okwamanje.",
        xh: "Awunawo ama-voucher asebenzayo okwamanje.",
        st: "Ha u na li-voucher tse sebetsang hajoale."
      },
      last_voucher: {
        en: `Your most recent voucher is a ${params.type} voucher worth R${params.amount}, created on ${params.date}. It's currently ${params.status}.`,
        af: `Jou mees onlangse voucher is 'n ${params.type} voucher ter waarde van R${params.amount}, geskep op ${params.date}. Dit is tans ${params.status}.`,
        zu: `I-voucher yakho yakamuva i-${params.type} voucher enexabiso elingu-R${params.amount}, eyenziwe ngo-${params.date}. Okwamanje isimo sayo ${params.status}.`,
        xh: `I-voucher yakho yakamuva i-${params.type} voucher enexabiso elingu-R${params.amount}, eyenziwe ngo-${params.date}. Okwamanje isimo sayo ${params.status}.`,
        st: `Li-voucher tsa hao tsa hajoale ke ${params.type} voucher tsa R${params.amount}, tse entsoeng ka ${params.date}. Hajoale li na le boemo ba ${params.status}.`
      },
      last_transaction: {
        en: `Your last transaction was a ${params.type} payment of ${params.currency} ${params.amount} to ${params.recipient} on ${params.date}.`,
        af: `Jou laaste transaksie was 'n ${params.type} betaling van ${params.currency} ${params.amount} aan ${params.recipient} op ${params.date}.`,
        zu: `I-transaksi yakho yokugcina kwakuyi-${params.type} payment ka-${params.currency} ${params.amount} ku-${params.recipient} ngo-${params.date}.`,
        xh: `I-transaksi yakho yokugcina kwakuyi-${params.type} payment ka-${params.currency} ${params.amount} ku-${params.recipient} ngo-${params.date}.`,
        st: `Transaksi ea hao ea ho qetela e ne e le ${params.type} payment ea ${params.currency} ${params.amount} ho ${params.recipient} ka ${params.date}.`
      },
      user_profile: {
        en: `Your profile: ${params.firstName} ${params.lastName}, email: ${params.email}, phone: ${params.phone}, KYC status: ${params.kycStatus}, account created: ${params.accountDate}.`,
        af: `Jou profiel: ${params.firstName} ${params.lastName}, e-pos: ${params.email}, telefoon: ${params.phone}, KYC status: ${params.kycStatus}, rekening geskep: ${params.accountDate}.`,
        zu: `Iphrofayili yakho: ${params.firstName} ${params.lastName}, i-imeyili: ${params.email}, ifoni: ${params.phone}, isimo se-KYC: ${params.kycStatus}, i-akhawunti eyenziwe: ${params.accountDate}.`,
        xh: `Iphrofayili yakho: ${params.firstName} ${params.lastName}, i-imeyili: ${params.email}, ifoni: ${params.phone}, isimo se-KYC: ${params.kycStatus}, i-akhawunti eyenziwe: ${params.accountDate}.`,
        st: `Profil ea hao: ${params.firstName} ${params.lastName}, e-imeile: ${params.email}, fono: ${params.phone}, boemo ba KYC: ${params.kycStatus}, akhaonto e entsoeng: ${params.accountDate}.`
      },
      no_transactions: {
        en: "You don't have any transactions yet.",
        af: "Jy het nog nie enige transaksies nie.",
        zu: "Awunawo ama-transaksi okwamanje.",
        xh: "Awunawo ama-transaksi okwamanje.",
        st: "Ha u na li-transaksi hajoale."
      },
      wallet_not_found: {
        en: "Wallet not found. Please contact support.",
        af: "Beursie nie gevind nie. Kontak asseblief ondersteuning.",
        zu: "I-wallet ayitholakali. Sicela uxhumane noxhaso.",
        xh: "I-wallet ayitholakali. Sicela uxhumane noxhaso.",
        st: "Wallet ha e fumanehe. Ke kopa u khutlele ho tšehetsa."
      },
      user_not_found: {
        en: "User not found. Please contact support.",
        af: "Gebruiker nie gevind nie. Kontak asseblief ondersteuning.",
        zu: "Umsebenzisi akatholakali. Sicela uxhumane noxhaso.",
        xh: "Umsebenzisi akatholakali. Sicela uxhumane noxhaso.",
        st: "Mosebedisi ha a fumanehe. Ke kopa u khutlele ho tšehetsa."
      },
      query_not_understood: {
        en: "I didn't understand your question. Please rephrase it.",
        af: "Ek het nie jou vraag verstaan nie. Herskryf dit asseblief.",
        zu: "Angizwanga umbuzo wakho. Sicela uwubhale kabusha.",
        xh: "Andiqondanga umbuzo wakho. Sicela uwubhale kabusha.",
        st: "Ha ke utloisise potso ea hao. Ke kopa u e ngole hape."
      },
      error_occurred: {
        en: "An error occurred. Please try again.",
        af: "'n Fout het voorgekom. Probeer asseblief weer.",
        zu: "Kwenzeka iphutha. Sicela uzame futhi.",
        xh: "Kwenzeka iphutha. Sicela uzame futhi.",
        st: "Ho etsahetse phoso. Ke kopa u leke hape."
      },
      ai_unavailable: {
        en: "AI service is temporarily unavailable. Please try again later.",
        af: "AI diens is tydelik nie beskikbaar nie. Probeer asseblief later weer.",
        zu: "Inkonzo ye-AI ayitholakali okwamanje. Sicela uzame futhi kamuva.",
        xh: "Inkonzo ye-AI ayitholakali okwamanje. Sicela uzame futhi kamuva.",
        st: "Tshebeletso ea AI ha e fumanehe hajoale. Ke kopa u leke hape hamorao."
      },
      no_active_vouchers: {
        en: "You don't have any active or pending vouchers at the moment.",
        af: "Jy het nie enige aktiewe of hangende vouchers op die oomblik nie.",
        zu: "Awunawo ama-voucher asebenzayo okwamanje okanye alindileyo.",
        xh: "Awunawo ama-voucher asebenzayo okwamanje okanye alindileyo.",
        st: "Ha u na li-voucher tse sebetsang hajoale okanye alindileyo."
      },
      transactions_on_date: {
        en: `Your transactions on ${params.date}: ${params.count} transactions totaling R${params.totalAmount}.\n\n${params.transactionList}`,
        af: `Jou transaksies op ${params.date}: ${params.count} transaksies totaal R${params.totalAmount}.\n\n${params.transactionList}`,
        zu: `Ama-transaksi akho ngo-${params.date}: ${params.count} ama-transaksi esamba R${params.totalAmount}.\n\n${params.transactionList}`,
        xh: `Ama-transaksi akho ngo-${params.date}: ${params.count} ama-transaksi esamba R${params.totalAmount}.\n\n${params.transactionList}`,
        st: `Li-transaksi tsa hao ka ${params.date}: ${params.count} li-transaksi tsa kakaretso R${params.totalAmount}.\n\n${params.transactionList}`
      },
      no_transactions_on_date: {
        en: `You don't have any transactions on ${params.date}.`,
        af: `Jy het nie enige transaksies op ${params.date} nie.`,
        zu: `Awunawo ama-transaksi ngo-${params.date}.`,
        xh: `Awunawo ama-transaksi ngo-${params.date}.`,
        st: `Ha u na li-transaksi ka ${params.date}.`
      },
      date_not_understood: {
        en: "I couldn't understand the date format. Please try: 'transactions on 23 Aug 2025'",
        af: "Ek kon nie die datum formaat verstaan nie. Probeer: 'transaksies op 23 Aug 2025'",
        zu: "Angizwanga uhlobo lwosuku. Zama: 'ama-transaksi ngo-23 Aug 2025'",
        xh: "Andiqondanga uhlobo lwosuku. Zama: 'ama-transaksi ngo-23 Aug 2025'",
        st: "Ha ke utloisise sebopeho sa letsatsi. Leka: 'li-transaksi ka 23 Aug 2025'"
      }
    };

    const response = responses[key]?.[language] || responses[key]?.en || 'Response not available';
    return response;
  }

  /**
   * 🏦 BANKING-GRADE: Get Last Transaction
   * Direct database query - NO JavaScript calculations
   */
  async getLastTransactionResponse(userId, language) {
    try {
      const { Transaction } = models;
      
      // Single query to get the most recent transaction
      // Only use columns that actually exist in the transactions table
      const lastTransaction = await Transaction.findOne({
        where: { userId },
        attributes: ['id', 'type', 'amount', 'description', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        raw: true
      });

      if (!lastTransaction) {
        return {
          text: this.getLocalizedResponse('no_transactions', language),
          context: { transactionFound: false },
          suggestions: ['Make your first transaction', 'Check wallet balance']
        };
      }

      const transactionDate = new Date(lastTransaction.createdAt).toLocaleDateString();
      const amount = parseFloat(lastTransaction.amount).toLocaleString();
      
      return {
        text: this.getLocalizedResponse('last_transaction', language, {
          type: lastTransaction.type || 'payment',
          amount: amount,
          currency: 'ZAR',
          recipient: lastTransaction.description || 'recipient',
          date: transactionDate,
          description: lastTransaction.description || 'transaction'
        }),
        context: { 
          transactionFound: true,
          transaction: {
            id: lastTransaction.id,
            type: lastTransaction.type,
            amount: lastTransaction.amount,
            status: lastTransaction.status
          }
        },
        suggestions: ['View transaction history', 'Check wallet balance', 'Make another transaction']
      };
    } catch (error) {
      console.error('Error getting last transaction:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get Transactions by Date
   * Direct database query - NO JavaScript calculations
   */
  async getTransactionsByDateResponse(userId, language, message) {
    try {
      const { Transaction } = models;
      
      // Extract date from message
      const dateMatch = message.match(/(\d{1,2})\s*(aug|sept|oct|nov|dec|jan|feb|mar|apr|may|jun|jul)\w*\s*(\d{4})/i);
      if (!dateMatch) {
        return {
          text: this.getLocalizedResponse('date_not_understood', language),
          context: { dateParsed: false },
          suggestions: ['Try: "transactions on 23 Aug 2025"', 'Check transaction history']
        };
      }

      const day = parseInt(dateMatch[1]);
      const month = dateMatch[2].toLowerCase();
      const year = parseInt(dateMatch[3]);
      
      // Convert month name to number
      const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sept': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      
      const monthNum = monthMap[month];
      if (monthNum === undefined) {
        return {
          text: this.getLocalizedResponse('date_not_understood', language),
          context: { dateParsed: false },
          suggestions: ['Try: "transactions on 23 Aug 2025"', 'Check transaction history']
        };
      }

      // Create date range for the specific day
      const startDate = new Date(year, monthNum, day, 0, 0, 0);
      const endDate = new Date(year, monthNum, day, 23, 59, 59);
      
      // Query transactions for the specific date
      const transactions = await Transaction.findAll({
        where: { 
          userId,
          createdAt: {
            [Sequelize.Op.between]: [startDate, endDate]
          }
        },
        attributes: ['id', 'type', 'amount', 'description', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        raw: true
      });

      if (!transactions || transactions.length === 0) {
        const formattedDate = startDate.toLocaleDateString();
        return {
          text: this.getLocalizedResponse('no_transactions_on_date', language, { date: formattedDate }),
          context: { transactionsFound: false, date: formattedDate },
          suggestions: ['Check other dates', 'View transaction history', 'Make a new transaction']
        };
      }

      // Format transactions for response
      const transactionList = transactions.map(t => {
        const time = new Date(t.createdAt).toLocaleTimeString();
        const amount = parseFloat(t.amount).toLocaleString();
        return `• ${t.type} payment of R${amount} at ${time}`;
      }).join('\n');

      const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const formattedDate = startDate.toLocaleDateString();
      
      return {
        text: this.getLocalizedResponse('transactions_on_date', language, {
          date: formattedDate,
          count: transactions.length,
          totalAmount: totalAmount.toLocaleString(),
          transactionList: transactionList
        }),
        context: { 
          transactionsFound: true,
          date: formattedDate,
          count: transactions.length,
          totalAmount: totalAmount,
          transactions: transactions
        },
        suggestions: ['View transaction history', 'Check other dates', 'Download statement']
      };
    } catch (error) {
      console.error('Error getting transactions by date:', error);
      return null;
    }
  }

  /**
   * �� BANKING-GRADE: Get EasyPay Vouchers
   * Direct database query - NO JavaScript calculations
   */
  async getEasyPayVouchersResponse(userId, language) {
    try {
      const { sequelize } = models;
      
      // Query EasyPay vouchers specifically
      const easypayVouchers = await sequelize.query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
          
          COALESCE(SUM(CASE WHEN status = 'active' THEN balance ELSE 0 END), 0) as active_balance,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN balance ELSE 0 END), 0) as pending_balance,
          COALESCE(SUM(CASE WHEN status = 'expired' THEN balance ELSE 0 END), 0) as expired_balance,
          COALESCE(SUM(CASE WHEN status = 'cancelled' THEN "originalAmount" ELSE 0 END), 0) as cancelled_original_amount,
          
          COALESCE(SUM(balance), 0) as total_balance,
          COALESCE(SUM("originalAmount"), 0) as total_original_amount
        FROM vouchers 
        WHERE "userId" = :userId AND "voucherType" LIKE 'easypay%'
      `, {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      });

      if (!easypayVouchers || easypayVouchers.length === 0) {
        return {
          text: this.getLocalizedResponse('no_easypay_vouchers', language),
          context: { hasEasyPayVouchers: false },
          suggestions: ['Purchase EasyPay vouchers', 'Check all vouchers', 'View voucher types']
        };
      }

      const vouchers = easypayVouchers[0];
      
      return {
        text: this.getLocalizedResponse('easypay_vouchers', language, {
          totalCount: vouchers.total_count || 0,
          activeCount: vouchers.active_count || 0,
          pendingCount: vouchers.pending_count || 0,
          expiredCount: vouchers.expired_count || 0,
          cancelledCount: vouchers.cancelled_count || 0,
          activeBalance: parseFloat(vouchers.active_balance || 0).toLocaleString(),
          pendingBalance: parseFloat(vouchers.pending_balance || 0).toLocaleString(),
          expiredBalance: parseFloat(vouchers.expired_balance || 0).toLocaleString(),
          cancelledOriginalAmount: parseFloat(vouchers.cancelled_original_amount || 0).toLocaleString(),
          totalBalance: parseFloat(vouchers.total_balance || 0).toLocaleString(),
          totalOriginalAmount: parseFloat(vouchers.total_original_amount || 0).toLocaleString()
        }),
        context: { 
          hasEasyPayVouchers: true,
          totalCount: vouchers.total_count,
          activeCount: vouchers.active_count,
          pendingCount: vouchers.pending_count,
          expiredCount: vouchers.expired_count,
          cancelledCount: vouchers.cancelled_count,
          activeBalance: vouchers.active_balance,
          pendingBalance: vouchers.pending_balance,
          expiredBalance: vouchers.expired_balance,
          cancelledOriginalAmount: vouchers.cancelled_original_amount,
          totalBalance: vouchers.total_balance,
          totalOriginalAmount: vouchers.total_original_amount
        },
        suggestions: ['View all vouchers', 'Purchase EasyPay vouchers', 'Check voucher status']
      };
    } catch (error) {
      console.error('Error getting EasyPay vouchers:', error);
      return null;
    }
  }

  /**
   * 🏦 BANKING-GRADE: Get MM Vouchers
   * Direct database query - NO JavaScript calculations
   */
  async getMMVouchersResponse(userId, language) {
    try {
      const { sequelize } = models;
      
      // Query MM vouchers specifically (non-EasyPay)
      const mmVouchers = await sequelize.query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
          
          COALESCE(SUM(CASE WHEN status = 'active' THEN balance ELSE 0 END), 0) as active_balance,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN balance ELSE 0 END), 0) as pending_balance,
          COALESCE(SUM(CASE WHEN status = 'expired' THEN balance ELSE 0 END), 0) as expired_balance,
          COALESCE(SUM(CASE WHEN status = 'cancelled' THEN "originalAmount" ELSE 0 END), 0) as cancelled_original_amount,
          
          COALESCE(SUM(balance), 0) as total_balance,
          COALESCE(SUM("originalAmount"), 0) as total_original_amount
        FROM vouchers 
        WHERE "userId" = :userId AND "voucherType" NOT LIKE 'easypay%'
      `, {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      });

      if (!mmVouchers || mmVouchers.length === 0) {
        return {
          text: this.getLocalizedResponse('no_mm_vouchers', language),
          context: { hasMMVouchers: false },
          suggestions: ['Purchase MM vouchers', 'Check all vouchers', 'View voucher types']
        };
      }

      const vouchers = mmVouchers[0];
      
      return {
        text: this.getLocalizedResponse('mm_vouchers', language, {
          totalCount: vouchers.total_count || 0,
          activeCount: vouchers.active_count || 0,
          pendingCount: vouchers.pending_count || 0,
          expiredCount: vouchers.expired_count || 0,
          cancelledCount: vouchers.cancelled_count || 0,
          activeBalance: parseFloat(vouchers.active_balance || 0).toLocaleString(),
          pendingBalance: parseFloat(vouchers.pending_balance || 0).toLocaleString(),
          expiredBalance: parseFloat(vouchers.expired_balance || 0).toLocaleString(),
          cancelledOriginalAmount: parseFloat(vouchers.cancelled_original_amount || 0).toLocaleString(),
          totalBalance: parseFloat(vouchers.total_balance || 0).toLocaleString(),
          totalOriginalAmount: parseFloat(vouchers.total_original_amount || 0).toLocaleString()
        }),
        context: { 
          hasMMVouchers: true,
          totalCount: vouchers.total_count,
          activeCount: vouchers.active_count,
          pendingCount: vouchers.pending_count,
          expiredCount: vouchers.expired_count,
          cancelledCount: vouchers.cancelled_count,
          activeBalance: vouchers.active_balance,
          pendingBalance: vouchers.pending_balance,
          expiredBalance: vouchers.expired_balance,
          cancelledOriginalAmount: vouchers.cancelled_original_amount,
          totalBalance: vouchers.total_balance,
          totalOriginalAmount: vouchers.total_original_amount
        },
        suggestions: ['View all vouchers', 'Purchase MM vouchers', 'Check voucher status']
      };
    } catch (error) {
      console.error('Error getting MM vouchers:', error);
      return null;
    }
  }
}

module.exports = BankingGradeAISupportService;
