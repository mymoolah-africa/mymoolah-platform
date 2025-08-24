const aiSupportService = require('../services/aiSupportService');

/**
 * Simplified Support Controller
 * Handles AI-powered support chat functionality without database dependencies
 */
class SupportControllerSimple {
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
      console.log('Support Chat Interaction:', {
        userId,
        message: message.substring(0, 100), // Truncate for logging
        language,
        intent: result.context?.intent,
        confidence: result.confidence,
        timestamp: new Date().toISOString()
      });

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
   * Get user context for support (simplified)
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

      // Return simplified context for now
      const context = {
        user: {
          id: req.user.id,
          email: req.user.email || 'user@example.com',
          accountAge: 1
        },
        kyc: {
          status: 'pending'
        },
        wallets: [],
        recentTransactions: [],
        supportContext: {
          totalTransactions: 0,
          activeWallets: 0,
          kycVerified: false
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
   * Get support statistics (simplified)
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

      const stats = {
        totalInteractions: 0,
        averageResponseTime: 0,
        satisfactionRate: 0,
        commonIssues: []
      };

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
   * Submit feedback for support interaction (simplified)
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

      // Store feedback for AI learning (simplified)
      console.log('Support Feedback:', {
        interactionId,
        rating,
        feedback,
        helpful,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });

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
          database: 'simplified'
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

// Export individual methods
module.exports = {
  processChatMessage: (req, res) => new SupportControllerSimple().processChatMessage(req, res),
  getUserContext: (req, res) => new SupportControllerSimple().getUserContext(req, res),
  getSupportStats: (req, res) => new SupportControllerSimple().getSupportStats(req, res),
  submitFeedback: (req, res) => new SupportControllerSimple().submitFeedback(req, res),
  getFAQ: (req, res) => new SupportControllerSimple().getFAQ(req, res),
  healthCheck: (req, res) => new SupportControllerSimple().healthCheck(req, res)
};
