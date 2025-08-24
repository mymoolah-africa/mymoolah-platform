/**
 * Minimal Support Controller
 * For testing without any external dependencies
 */

// Health check for support service
const healthCheck = async (req, res) => {
  try {
    const openaiConfigured = !!process.env.OPENAI_API_KEY;

    return res.json({
      success: true,
      status: 'healthy',
      services: {
        ai: openaiConfigured ? 'available' : 'not_configured',
        database: 'minimal'
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
};

// Get support FAQ
const getFAQ = async (req, res) => {
  try {
    const { language = 'en' } = req.query;

    const faq = {
      en: [
        {
          question: "How do I check my wallet balance?",
          answer: "You can check your wallet balance in the dashboard or wallet section of the app."
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
};

// Process chat message
const processChatMessage = async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a string'
      });
    }

    // Simple response for testing
    return res.json({
      success: true,
      response: "I'm here to help! This is a test response.",
      confidence: 0.95,
      context: {},
      suggestions: ['Check balance', 'Recent transactions']
    });
  } catch (error) {
    console.error('Support Chat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your message'
    });
  }
};

// Get user context
const getUserContext = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const context = {
      user: {
        id: req.user.id,
        email: req.user.email || 'user@example.com'
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
};

// Submit feedback
const submitFeedback = async (req, res) => {
  try {
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Helpful field is required and must be boolean'
      });
    }

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
};

// Get support statistics
const getSupportStats = async (req, res) => {
  try {
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
};

// Export all methods
module.exports = {
  healthCheck,
  getFAQ,
  processChatMessage,
  getUserContext,
  submitFeedback,
  getSupportStats
};
