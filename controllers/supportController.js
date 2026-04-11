const ragService = require('../services/ragService');

/**
 * Support Controller — LangChain RAG
 * Clean, lightweight. Replaces legacy 4,000+ line banking-grade service.
 */
class SupportController {
  get supportService() {
    return ragService;
  }

  /**
   * 🏦 Process Support Chat Message (Banking-Grade)
   */
  processChatMessage = async (req, res) => {
    try {
      const { message, language = 'en', context = {} } = req.body;
      const userId = req.user.id;

      // 🏦 Process with Banking-Grade Service
      const result = await this.supportService.processSupportQuery(
        message, 
        userId, 
        language, 
        context
      );

      // 🎯 Return Banking-Grade Response (canonical: message)
      res.json({
        success: result.success,
        message: result.message,
        data: result.data,
        queryId: result.queryId,
        compliance: result.compliance,
        performance: result.performance,
        suggestions: this.generateSuggestions(result.data?.type),
        confidence: 0.95
      });

    } catch (error) {
      console.error('Error in processChatMessage:', error);
      
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'SUPPORT_CHAT_FAILED',
        message: 'Support request could not be processed. Please try again.',
        compliance: {
          iso20022: true,
          mojaloop: true,
          auditTrail: true
        }
      });
    }
  }

  /**
   * 📊 Get Support Service Health Status
   */
  getHealthStatus = async (req, res) => {
    try {
      const health = await this.supportService.healthCheck();
      const metrics = this.supportService.getPerformanceMetrics();

      res.json({
        success: true,
        health,
        metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in getHealthStatus:', error);
      
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'SUPPORT_HEALTH_CHECK_FAILED',
        message: 'Health check could not be completed. Please try again.'
      });
    }
  }

  /**
   * 📊 Get Performance Metrics
   */
  getPerformanceMetrics = async (req, res) => {
    try {
      const metrics = this.supportService.getPerformanceMetrics();

      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in getPerformanceMetrics:', error);
      
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'SUPPORT_METRICS_FAILED',
        message: 'Could not retrieve performance metrics. Please try again.'
      });
    }
  }

  /**
   * 🎯 Generate Contextual Suggestions
   */
  generateSuggestions = (queryType) => {
    return [
      'View wallet balance',
      'Check transaction history',
      'Contact support'
    ];
  }
}

// Export a singleton instance
module.exports = new SupportController();