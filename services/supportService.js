/**
 * 🏦 Unified Support Service (Banking-Grade)
 *
 * Composition of:
 * - bankingGradeSupportService.js  → rate limiting, health, metrics, knowledge base
 * - aiSupportService.js           → rich pattern matching + simple/complex query routing
 *
 * This file is the SINGLE entrypoint for all support queries.
 * routes/support.js → controllers/supportController.js → SupportService.processSupportQuery
 */

const BankingGradeSupportService = require('./bankingGradeSupportService');
const BankingGradeAISupportService = require('./aiSupportService');

class SupportService {
  constructor() {
    this.bankingService = new BankingGradeSupportService();
    this.aiService = new BankingGradeAISupportService();

    // Allow model override, default to gpt-4o as per platform standard
    this.model =
      process.env.SUPPORT_AI_MODEL && process.env.SUPPORT_AI_MODEL.trim().length > 0
        ? process.env.SUPPORT_AI_MODEL.trim()
        : 'gpt-4o';
  }

  /**
   * 🎯 Main entrypoint used by SupportController
   *
   * - Enforces banking-grade rate limiting
   * - Hits knowledge base first (zero AI cost)
   * - Falls back to AI support service (pattern matching → GPT-4oo)
   * - Wraps response in banking-grade ISO20022 / Mojaloop-compatible envelope
   */
  async processSupportQuery(message, userId, language = 'en', context = {}) {
    const startTime = Date.now();
    const queryId = this.bankingService.generateQueryId
      ? this.bankingService.generateQueryId()
      : `query_${startTime}_${Math.random().toString(36).slice(2, 11)}`;

    try {
      // 🔒 Banking-grade rate limiting (100 queries/hour per user)
      if (this.bankingService.enforceRateLimit) {
        await this.bankingService.enforceRateLimit(userId);
      }

      // 🌍 AI-First: Detect language and translate to English ONCE
      // This translation is reused by both KB search and pattern matching
      let detectedLanguage = language;
      let englishMessage = message;
      
      if (this.bankingService.detectAndTranslate) {
        const translation = await this.bankingService.detectAndTranslate(message);
        detectedLanguage = translation.language || language;
        englishMessage = translation.englishText || message;
        console.log(`🌍 Language: ${detectedLanguage}, English: "${englishMessage}"`);
      }

      // 🧠 1) Knowledge base lookup with RAG (semantic search)
      if (this.bankingService.findKnowledgeBaseAnswer) {
        // Pass both original and English for better matching
        const kbHit = await this.bankingService.findKnowledgeBaseAnswer(englishMessage, detectedLanguage);
        if (kbHit) {
          const responseTime = Date.now() - startTime;
          this._updatePerformance(responseTime, true);
          return this._wrapKnowledgeBaseResult(kbHit, queryId, responseTime);
        }
      }

      // 🤖 2) AI support service (pattern matching on English + GPT-4oo)
      // Pass userId and English translation into context
      const enrichedContext = {
        ...(context || {}),
        userId,
        originalMessage: message,
        detectedLanguage,
      };

      // Use English message for pattern matching (simplified, no multi-language patterns needed)
      const aiResult = await this.aiService.processChatMessage(
        englishMessage,  // Use English for pattern matching
        detectedLanguage,  // But respond in user's language
        enrichedContext
      );

      const responseTime = Date.now() - startTime;
      this._updatePerformance(responseTime, true);

      // 🧠 Auto-Learning: Store successful AI answers in KB with embeddings
      if (aiResult?.text && !aiResult?.context?.error) {
        this._autoLearnFromAI(message, aiResult.text, language).catch(err => {
          console.warn('⚠️ Auto-learning failed (non-blocking):', err.message);
        });
      }

      return this._wrapAiResult(aiResult, queryId, responseTime);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this._updatePerformance(responseTime, false);
      console.error('❌ Unified SupportService error:', error);

      if (this.bankingService.handleError) {
        return this.bankingService.handleError(error, queryId);
      }

      // Fallback error envelope if banking service handler changes
      return {
        success: false,
        queryId,
        message:
          "I'm experiencing technical difficulties. Please contact our support team for immediate assistance.",
        data: null,
        timestamp: new Date().toISOString(),
        compliance: {
          iso20022: true,
          mojaloop: true,
          auditTrail: true,
        },
        performance: {
          responseTime,
          cacheHit: false,
          rateLimitRemaining: 0,
        },
      };
    }
  }

  /**
   * 📊 Proxy to underlying banking-grade metrics
   */
  getPerformanceMetrics() {
    if (this.bankingService.getPerformanceMetrics) {
      return this.bankingService.getPerformanceMetrics();
    }
    return {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRatio: 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🏥 Health Check – reuses banking-grade healthCheck
   */
  async healthCheck() {
    if (this.bankingService.healthCheck) {
      return this.bankingService.healthCheck();
    }
    return {
      status: 'unknown',
      services: {
        redis: 'unknown',
        database: 'unknown',
        openai: 'unknown',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🧠 Expose discovered capabilities from codebase sweep
   * (used by docs/AI_SUPPORT_SYSTEM.md design)
   */
  getDiscoveredCapabilities() {
    if (this.aiService.getDiscoveredCapabilities) {
      return this.aiService.getDiscoveredCapabilities();
    }
    return null;
  }

  /**
   * 🔧 Internal: update performance metrics via banking service
   */
  _updatePerformance(responseTime, success) {
    if (this.bankingService.updatePerformanceMetrics) {
      this.bankingService.updatePerformanceMetrics(responseTime, success);
    }
  }

  /**
   * 🔄 Wrap knowledge base result (AiKnowledgeBase) into controller-friendly envelope
   */
  _wrapKnowledgeBaseResult(kbResult, queryId, responseTime) {
    return {
      success: true,
      queryId,
      message: kbResult.message,
      data: kbResult.data,
      timestamp: kbResult.timestamp || new Date().toISOString(),
      compliance: kbResult.compliance || {
        iso20022: true,
        mojaloop: true,
        auditTrail: true,
      },
      performance: {
        responseTime,
        cacheHit: false,
        rateLimitRemaining: 0,
      },
    };
  }

  /**
   * 🔄 Wrap aiSupportService result into controller-friendly envelope
   */
  _wrapAiResult(aiResult, queryId, responseTime) {
    // aiResult shape from aiSupportService:
    // { text, context, suggestions }
    const text = aiResult?.text || "I'm here to help! Please try again.";
    const context = aiResult?.context || {};
    const suggestions = aiResult?.suggestions || [];

    return {
      success: true,
      queryId,
      message: text,
      data: {
        context,
        suggestions,
      },
      timestamp: new Date().toISOString(),
      compliance: {
        iso20022: true,
        mojaloop: true,
        auditTrail: true,
      },
      performance: {
        responseTime,
        cacheHit: false,
        rateLimitRemaining: 0,
      },
    };
  }

  /**
   * 🧠 Auto-Learning: Store successful AI answers in knowledge base
   * Runs asynchronously (non-blocking) to not slow down responses
   */
  async _autoLearnFromAI(question, answer, language = 'en') {
    try {
      if (this.bankingService.storeAiAnswerInKnowledgeBase) {
        await this.bankingService.storeAiAnswerInKnowledgeBase(
          question,
          answer,
          'AI_GENERATED',
          language
        );
      }
    } catch (error) {
      // Non-blocking - just log the error
      console.warn('⚠️ Auto-learning error:', error.message);
    }
  }
}

module.exports = SupportService;


