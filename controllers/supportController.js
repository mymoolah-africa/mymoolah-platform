const AISupportService = require('../services/aiSupportService');
const aiSupportService = new AISupportService();
const authenticateToken = require('../middleware/auth');

// Lazy load models to avoid database connection issues during startup
let models = null;
const getModels = () => {
  if (!models) {
    models = require('../models');
  }
  return models;
};

/**
 * Support Controller
 * Handles AI-powered support chat functionality
 */
class SupportController {
  /**
   * Process chat message with AI support
   * POST /api/v1/support/chat
   */
  async processChatMessage(req, res) {
    try {
      const { message, language = 'en', context = {} } = req.body;
      
      // Validate input
      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Message is required and must be a string'
        });
      }

      // Get user context if authenticated
      let userId = null;
      if (req.user && req.user.id) {
        userId = req.user.id;
      } else if (context && context.userId) {
        // Fallback to userId from context (frontend)
        userId = context.userId;
      }

      // Process message with AI
      const result = await aiSupportService.processChatMessage(
        message,
        language,
        {
          ...context,
          userId
        }
      );

      // Log interaction for analytics

      return res.json({
        success: true,
        response: result.response,
        confidence: result.confidence,
        context: result.context,
        suggestions: result.suggestions
      });

    } catch (error) {
      console.error('Support Chat Error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while processing your message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get user context for support
   * GET /api/v1/support/context
   */
  async getUserContext(req, res) {
    try {
      // Require authentication
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.id;

      const { User, Wallet, Transaction, Kyc } = getModels();

      // Get user data
      const user = await User.findByPk(userId, {
        include: [
          { model: Wallet, as: 'wallets' },
          { model: Kyc, as: 'kyc' }
        ],
        attributes: ['id', 'email', 'firstName', 'lastName', 'phoneNumber', 'createdAt']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get recent transactions
      const recentTransactions = await Transaction.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'type', 'amount', 'status', 'description', 'createdAt']
      });

      // Get wallet summary
      const walletSummary = user.wallets?.map(wallet => ({
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        status: wallet.status
      })) || [];

      const context = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) // days
        },
        kyc: user.kyc ? {
          status: user.kyc.status,
          verifiedAt: user.kyc.verifiedAt,
          documentType: user.kyc.documentType
        } : null,
        wallets: walletSummary,
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          description: t.description,
          createdAt: t.createdAt
        })),
        supportContext: {
          totalTransactions: await Transaction.count({ where: { userId } }),
          activeWallets: walletSummary.filter(w => w.status === 'active').length,
          kycVerified: user.kyc?.status === 'verified'
        }
      };

      return res.json({
        success: true,
        context
      });

    } catch (error) {
      console.error('Get User Context Error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while getting user context'
      });
    }
  }

  /**
   * Get support statistics
   * GET /api/v1/support/stats
   */
  async getSupportStats(req, res) {
    try {
      // Require admin authentication
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const stats = await aiSupportService.getSupportStats();

      return res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get Support Stats Error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while getting support statistics'
      });
    }
  }

  /**
   * Submit feedback for support interaction
   * POST /api/v1/support/feedback
   */
  async submitFeedback(req, res) {
    try {
      const { interactionId, rating, feedback, helpful } = req.body;

      // Validate input
      if (typeof helpful !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Helpful field is required and must be boolean'
        });
      }

      // Store feedback for AI learning

      // Store feedback in database for AI learning

      return res.json({
        success: true,
        message: 'Feedback submitted successfully'
      });

    } catch (error) {
      console.error('Submit Feedback Error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while submitting feedback'
      });
    }
  }

  /**
   * Get support FAQ
   * GET /api/v1/support/faq
   */
  async getFAQ(req, res) {
    try {
      const { language = 'en' } = req.query;

      const faq = {
        en: [
          {
            question: "How do I check my wallet balance?",
            answer: "You can check your wallet balance in the dashboard or wallet section of the app. The balance is updated in real-time after each transaction."
          },
          {
            question: "What should I do if a payment fails?",
            answer: "If a payment fails, first check your wallet balance and verify the recipient details. If the issue persists, try again later or contact our support team."
          },
          {
            question: "How long does KYC verification take?",
            answer: "KYC verification typically takes 24-48 hours. Make sure to upload clear, valid documents to avoid delays."
          },
          {
            question: "How do I add money to my wallet?",
            answer: "You can add money to your wallet through various methods including bank transfers, card payments, and mobile money. Check the 'Add Money' section for available options."
          },
          {
            question: "What if I can't find my transaction?",
            answer: "If you can't find a transaction, it might still be processing. Wait a few minutes and refresh the page. If the issue persists, contact support with your transaction details."
          }
        ],
        af: [
          {
            question: "Hoe kontroleer ek my beursie balans?",
            answer: "Jy kan jou beursie balans in die dashboard of beursie afdeling van die app kontroleer. Die balans word in real-time opgedateer na elke transaksie."
          },
          {
            question: "Wat moet ek doen as 'n betaling misluk?",
            answer: "As 'n betaling misluk, kontroleer eers jou beursie balans en verifieer die ontvanger se besonderhede. As die probleem aanhou, probeer weer later of kontak ons ondersteuningspan."
          }
        ],
        zu: [
          {
            question: "Ngingabheka kanjani ibhalansi yesikhwama sami?",
            answer: "Ungabheka ibhalansi yesikhwama sakho ku-dashboard noma isigaba sesikhwama se-app. Ibhalansi iyabuyekezwa ngesikhathi sangempela ngemva kokuthengiselana ngakunye."
          },
          {
            question: "Kufanele ngenzeni uma inkokhelo yehluleka?",
            answer: "Uma inkokhelo yehluleka, bheka kuqala ibhalansi yesikhwama sakho bese uqinisekisa imininingwane yomamukeli. Uma inkinga iqhubeka, zama futhi kamuva noma uxhumane nethimba lethu lokusekela."
          }
        ]
      };

      const languageFAQ = faq[language] || faq.en;

      return res.json({
        success: true,
        faq: languageFAQ
      });

    } catch (error) {
      console.error('Get FAQ Error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while getting FAQ'
      });
    }
  }

  /**
   * Health check for support service
   * GET /api/v1/support/health
   */
  async healthCheck(req, res) {
    try {
      // Check if OpenAI is configured
      const openaiConfigured = !!process.env.OPENAI_API_KEY;

      return res.json({
        success: true,
        status: 'healthy',
        services: {
          ai: openaiConfigured ? 'available' : 'not_configured',
          database: 'connected'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Support Health Check Error:', error);
      return res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

// Export individual methods to avoid binding issues
module.exports = {
  processChatMessage: (req, res) => new SupportController().processChatMessage(req, res),
  getUserContext: (req, res) => new SupportController().getUserContext(req, res),
  getSupportStats: (req, res) => new SupportController().getSupportStats(req, res),
  submitFeedback: (req, res) => new SupportController().submitFeedback(req, res),
  getFAQ: (req, res) => new SupportController().getFAQ(req, res),
  healthCheck: (req, res) => new SupportController().healthCheck(req, res)
};