// Load environment variables first
require('dotenv').config();

const OpenAI = require('openai');

// Lazy load models to avoid database connection issues
let models = null;
const getModels = () => {
  if (!models) {
    try {
      // Ensure environment is loaded
      if (!process.env.DATABASE_URL) {
        console.warn('DATABASE_URL not available, models cannot be loaded');
        return null;
      }
      
      models = require('../models');
      // Models loaded successfully in AI service
    } catch (error) {
      console.warn('Models not available in AI service:', error.message);
      return null;
    }
  }
  return models;
};

class AISupportService {
  constructor() {
    // OpenAI API key loaded
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Initialize knowledge base
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  /**
   * Initialize the AI knowledge base with MyMoolah platform information
   */
  initializeKnowledgeBase() {
    return {
      platform: {
        name: 'MyMoolah',
        description: 'South African fintech treasury platform built on Mojaloop standards',
        features: [
          'Digital wallet management',
          'Money transfers and payments',
          'KYC verification',
          'Voucher system',
          'Multi-provider integrations (Flash, MobileMart, EasyPay, dtMercury, Peach)',
          'Compliance and security'
        ]
      },
      commonIssues: {
        'payment_failed': {
          causes: ['Insufficient balance', 'Invalid recipient details', 'Network issues', 'Provider downtime'],
          solutions: ['Check wallet balance', 'Verify recipient information', 'Try again later', 'Contact support']
        },
        'kyc_pending': {
          causes: ['Document upload incomplete', 'Verification in progress', 'Document quality issues'],
          solutions: ['Upload clear, valid documents', 'Wait for verification', 'Check document requirements']
        },
        'transaction_not_found': {
          causes: ['Transaction still processing', 'Wrong transaction ID', 'Network delay'],
          solutions: ['Wait a few minutes', 'Check transaction ID', 'Refresh the page']
        }
      },
      apiEndpoints: {
        'wallet': '/api/v1/wallets',
        'transactions': '/api/v1/transactions',
        'kyc': '/api/v1/kyc',
        'vouchers': '/api/v1/vouchers',
        'users': '/api/v1/users'
      }
    };
  }

  /**
   * Process a support chat message
   */
  async processChatMessage(message, language = 'en', context = {}) {
    try {
          // Processing AI service request
      
      // Analyze user message to understand what they need
      const messageAnalysis = await this.analyzeMessage(message, language);
      // Message analysis completed
      
      // Get user context if available
      const userContext = await this.getUserContext(context.userId);
      
      // Generate response based on message analysis and available data
      const response = await this.generateResponse(message, messageAnalysis, language, {
        ...context,
        userContext
      });
      
      // Store interaction for learning
      await this.storeInteraction(message, response, messageAnalysis, context);
      
      return {
        response: response.text,
        confidence: response.confidence,
        context: response.context,
        suggestions: response.suggestions
      };
    } catch (error) {
      console.error('AI Support Service Error:', error);
      return {
        response: this.getFallbackResponse(language),
        confidence: 0.5,
        context: {},
        suggestions: []
      };
    }
  }

  /**
   * Analyze user message and determine what data sources to explore
   */
  async analyzeMessage(message, language) {
    const prompt = `
      Analyze this user message and determine what information they need.
      Language: ${language}
      Message: "${message}"
      
      Instead of classifying into predefined categories, identify:
      1. What specific data/information the user is requesting
      2. What data sources in the MyMoolah platform might contain this information
      3. What APIs, database tables, or external services might be relevant
      
      Focus on understanding the user's actual need, not fitting it into a predefined box.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Message analysis error:', error);
      return 'general_inquiry';
    }
  }

  /**
   * Get user context for personalized responses
   */
  async getUserContext(userId) {
    if (!userId) {
              // No userId provided for context
      return null;
    }

    try {
              // Loading models for user context
      const models = getModels();
      if (!models) {
        // Models not available for user context
        // Return minimal context if models not available
        return {
          user: { id: userId },
          wallet: null,
          recentTransactions: []
        };
      }

              // Models loaded, querying database for user context
      const { User, Wallet, Transaction, Kyc } = models;
      
      const user = await User.findByPk(userId, {
        include: [
          { model: Wallet, as: 'wallet' }
        ],
        attributes: ['id', 'email', 'firstName', 'lastName', 'kycStatus']
      });

      if (!user) {
        // User not found for provided ID
        return null;
      }

              // User found, retrieving transaction data
      const recentTransactions = await Transaction.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      // Get voucher balance from database
      let voucherBalance = null;
      try {
        const { Voucher } = models;
        
        if (!Voucher) {
          // Voucher model not available
          return context;
        }
        
        // Fetching vouchers for user
        
        const activeVouchers = await Voucher.findAll({
          where: { 
            userId,
            status: ['active', 'pending_payment']
          },
          attributes: ['id', 'voucherType', 'status', 'balance', 'originalAmount']
        });
        
        // Vouchers retrieved successfully
        
        if (activeVouchers.length > 0) {
          const activeBalance = activeVouchers
            .filter(v => v.status === 'active')
            .reduce((sum, v) => sum + parseFloat(v.balance || 0), 0);
          
          const pendingBalance = activeVouchers
            .filter(v => v.status === 'pending_payment')
            .reduce((sum, v) => sum + parseFloat(v.originalAmount || 0), 0);
          
          voucherBalance = {
            active: {
              count: activeVouchers.filter(v => v.status === 'active').length,
              value: activeBalance
            },
            pending: {
              count: activeVouchers.filter(v => v.status === 'pending_payment').length,
              value: pendingBalance
            },
            total: {
              count: activeVouchers.length,
              value: activeBalance + pendingBalance
            }
          };
          
          // Voucher balance calculated successfully
        } else {
          // No active vouchers found for user
        }
      } catch (error) {
        // Could not fetch voucher balance from database
        console.error('Full error:', error);
      }

               const context = {
           user: {
             id: user.id,
             email: user.email,
             kycStatus: user.kycStatus || 'pending',
             kycTier: this.determineKycTier(user.kycStatus, user.wallet),
             walletCount: user.wallet ? 1 : 0
           },
                     wallet: user.wallet ? {
               balance: user.wallet.balance,
               currency: user.wallet.currency
             } : null,
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          createdAt: t.createdAt
        })),
        voucherBalance: voucherBalance
      };

      // User context retrieved successfully

      return context;
    } catch (error) {
      console.error('❌ getUserContext: Error getting user context:', error);
      return null;
    }
  }

  /**
   * Generate AI response based on message analysis and context
   */
  async generateResponse(message, messageAnalysis, language, context) {
    const systemPrompt = this.buildSystemPrompt(messageAnalysis, language, context);
    
    const userPrompt = `
      User message: "${message}"
      Current page: ${context.currentPage || 'unknown'}
      User context: ${JSON.stringify(context.userContext || {})}
      
      Provide a helpful, accurate response in ${language === 'en' ? 'English' : language === 'af' ? 'Afrikaans' : language === 'zu' ? 'isiZulu' : language === 'xh' ? 'isiXhosa' : language === 'st' ? 'Sesotho' : 'English'}.
      Be concise, friendly, and professional.
      If you need more information, ask specific questions.
      If the issue requires human intervention, suggest contacting support.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const response = completion.choices[0].message.content;
      
      return {
        text: response,
        confidence: this.calculateConfidence(messageAnalysis, context),
        context: { messageAnalysis, userContext: context.userContext },
        suggestions: this.generateSuggestions(messageAnalysis, context)
      };
    } catch (error) {
      console.error('Response generation error:', error);
      return {
        text: this.getFallbackResponse(language),
        confidence: 0.5,
        context: { messageAnalysis },
        suggestions: []
      };
    }
  }

  /**
   * Build system prompt with MyMoolah knowledge
   */
  buildSystemPrompt(messageAnalysis, language, context) {
    const basePrompt = `
      You are an AI support assistant for MyMoolah, a South African fintech treasury platform.
      
      Platform Information:
      - MyMoolah is a digital wallet and payment platform
      - Built on Mojaloop standards for interoperability
      - Supports multiple payment providers (Flash, MobileMart, EasyPay, dtMercury, Peach)
      - Includes KYC verification, voucher system, and compliance features
      
      Current User Context:
      ${JSON.stringify(context.userContext || {}, null, 2)}
      
      User KYC Status: ${context.userContext?.user?.kycStatus || 'unknown'}
      User KYC Tier: ${context.userContext?.user?.kycTier || 'unknown'}
      User Voucher Balance: ${context.userContext?.voucherBalance ? JSON.stringify(context.userContext.voucherBalance) : 'unknown'}
      
      Message Analysis: ${messageAnalysis}
      Language: ${language}
      
      Guidelines:
      1. Be helpful, accurate, and professional
      2. Use the user's preferred language
      3. Provide specific, actionable advice
      4. If you don't know something, say so and suggest contacting support
      5. For technical issues, provide step-by-step guidance
      6. For account issues, ask for specific details
      7. Always prioritize security and compliance
    `;

          // Dynamic response based on message analysis and available data
      return basePrompt + `
        Available Data Sources:
        - User wallet balance and transaction history
        - Voucher balance (active and pending)
        - KYC verification status and tier information
        - Recent transaction details
        
        Response Guidelines:
        - Use available user data to provide accurate information
        - If user asks about data you have access to, provide it
        - If user asks about data you don't have, suggest where they can find it
        - Be specific and use actual numbers from their account
        - Always provide actionable next steps
        
        Example Responses:
        - "Your wallet balance is R{amount}" (when wallet data available)
        - "You have {count} active vouchers worth R{amount}" (when voucher data available)
        - "Your KYC status is {status} with tier {tier}" (when KYC data available)
        
        Be conversational and helpful, using the actual data from their account.
      `;
  }

  /**
   * Calculate response confidence
   */
  calculateConfidence(messageAnalysis, context) {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence if we have user context
    if (context.userContext) {
      confidence += 0.1;
    }
    
    // Increase confidence if we have relevant data
    if (context.userContext?.wallet || context.userContext?.voucherBalance) {
      confidence += 0.1;
    }
    
    // Decrease confidence for complex or unclear requests
    if (messageAnalysis.includes('complex') || messageAnalysis.includes('unclear')) {
      confidence -= 0.1;
    }
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Generate context-aware suggestions
   */
  generateSuggestions(messageAnalysis, context) {
    const suggestions = [];
    
    // Generate suggestions based on available data and user needs
    if (context.userContext?.wallet) {
      suggestions.push('Check recent transactions', 'View transaction history');
    }
    
    if (context.userContext?.voucherBalance) {
      suggestions.push('View voucher history', 'Purchase new vouchers');
    }
    
    if (context.userContext?.user?.kycStatus === 'pending') {
      suggestions.push('Upload KYC documents', 'Check verification status');
    }
    
    // Add general suggestions
    suggestions.push('Check your dashboard', 'Contact support');
    
    // Limit to 4 suggestions
    return suggestions.slice(0, 4);
  }

  /**
   * Get fallback response when AI fails
   */
  getFallbackResponse(language) {
    const responses = {
      en: "I'm sorry, I'm having trouble processing your request right now. Please try again or contact our support team for immediate assistance.",
      af: "Ek is jammer, ek het probleme om jou versoek nou te verwerk. Probeer asseblief weer of kontak ons ondersteuningspan vir onmiddellike hulp.",
      zu: "Ngiyaxolisa, nginenkinga yokucubungula isicelo sakho manje. Ngicela uzame futhi noma uxhumane nethimba lethu lokusekela ukuze uthole usizo olusheshayo.",
      xh: "Ndixolisa, ndinengxaki yokucubungula isicelo sakho ngoku. Ngicela uzame kwakhona okanye uxhumane nethimba lethu lokuxhasa ukuze ufumane uncedo olukhawulezileyo.",
      st: "Ke kopa tshwarelo, ke na le bothata ba ho sebetsa kopo ya hao hona joale. Ka kopo leka hape kapa ikopanye le sehlopha sa rona sa ho theha u thuso ka potlako."
    };
    
    return responses[language] || responses.en;
  }

  /**
   * Store interaction for learning
   */
  async storeInteraction(message, response, intent, context) {
    try {
      // Store in database for learning (implement later)
      // Storing interaction for learning
    } catch (error) {
      console.error('Error storing interaction:', error);
    }
  }

  /**
   * Determine KYC tier based on verification status and wallet data
   * 
   * Tier Rules:
   * Tier 0: No verification - can do any transaction except money sends
   * Tier 1: ID document verified - can send up to R4,999.99 per transaction, R29,999.99 per month
   * Tier 2: ID + POA verified - unlimited up to R100,000.00 per transaction, R500,000.00 per month
   */
  determineKycTier(kycStatus, wallet) {
    // Check if user has basic KYC verification (ID document)
    if (kycStatus === 'verified' && wallet && wallet.kycVerified) {
      // Check if user has enhanced verification (POA document)
              // POA document verification check
        // Currently, all verified users are treated as Tier 1
        // To implement Tier 2, we need to check for POA document verification
      return 'tier1';
    }
    
    // No verification or verification failed
    return 'tier0';
  }

  /**
   * Get support statistics
   */
  async getSupportStats() {
    try {
      // Implement support statistics
      return {
        totalInteractions: 0,
        averageResponseTime: 0,
        satisfactionRate: 0,
        commonIssues: []
      };
    } catch (error) {
      console.error('Error getting support stats:', error);
      return null;
    }
  }
}

module.exports = AISupportService;
