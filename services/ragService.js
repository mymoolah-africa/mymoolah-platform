/**
 * MyMoolah AI Support — LangChain RAG (v2)
 *
 * Cost-optimised RAG service with four layers:
 *   1. Redis/memory response cache    — free for repeated questions
 *   2. Direct KB answer (score ≥ 0.92) — free, no LLM call
 *   3. GPT-4o-mini with KB context    — 17x cheaper than GPT-4o
 *   4. Self-learning KB               — GPT answers saved for admin review
 *
 * Estimated cost at 3M users: ~$150–$360/month (vs $30k with GPT-4o, no cache)
 *
 * @author MyMoolah Treasury Platform
 * @version 2.0.0
 */

require('dotenv').config();
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const { OpenAIEmbeddings } = require('@langchain/openai');
const crypto = require('crypto');
const models = require('../models');

// Lazy-load caching service (graceful if unavailable)
let cachingService = null;
try {
  cachingService = require('./cachingService');
} catch (e) {
  console.warn('⚠️ RAG: cachingService unavailable — response caching disabled');
}

// In-memory conversation history per user (last 10 messages)
const conversationHistory = new Map();
const MAX_HISTORY = 10;

// Thresholds
const KB_DIRECT_THRESHOLD = 0.92;  // Return KB answer directly, skip LLM
const KB_MATCH_THRESHOLD = 0.50;   // Minimum score to include in LLM context
const AUTO_LEARN_THRESHOLD = 0.40; // Below this = question not in KB → auto-learn candidate
const AUTO_LEARN_MIN_LENGTH = 60;  // Min chars for a response worth saving to KB
const CACHE_TTL = 86400;           // 24 hours in seconds

// ─── Helpers ────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

function hashQuestion(question) {
  return crypto
    .createHash('md5')
    .update(question.toLowerCase().trim())
    .digest('hex')
    .slice(0, 16);
}

// ─── Service ─────────────────────────────────────────────────────────────────

class RagService {
  constructor() {
    this.aiEnabled = !!process.env.OPENAI_API_KEY;
    this.embeddings = null;
    this.llm = null;
    this.kbEntries = [];
    this.kbLoadedAt = 0;
    this.KB_CACHE_TTL = 5 * 60 * 1000; // 5 min in-process KB refresh

    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      kbDirectHits: 0,
      llmCalls: 0,
      autoLearned: 0,
      errors: 0,
    };

    if (this.aiEnabled) {
      this.embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Default to gpt-4o-mini (17x cheaper than gpt-4o, sufficient for support)
      const model = process.env.SUPPORT_AI_MODEL || 'gpt-4o-mini';
      this.llm = new ChatOpenAI({
        modelName: model,
        temperature: 0.3,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      console.log(`✅ RAG Service initialized (OpenAI + LangChain) [model: ${model}]`);
    } else {
      console.warn('⚠️ RAG Service: OPENAI_API_KEY not set — AI disabled');
    }
  }

  // ── Knowledge Base ─────────────────────────────────────────────────────────

  async loadKnowledgeBase() {
    if (Date.now() - this.kbLoadedAt < this.KB_CACHE_TTL && this.kbEntries.length > 0) {
      return this.kbEntries;
    }
    try {
      const { AiKnowledgeBase } = models;
      const rows = await AiKnowledgeBase.findAll({
        where: { isActive: true },
        attributes: ['id', 'question', 'answer', 'embedding', 'category'],
        raw: true,
      });
      this.kbEntries = rows.filter((r) => {
        const emb = r.embedding;
        return Array.isArray(emb) && emb.length > 100 && typeof emb[0] === 'number';
      });
      this.kbLoadedAt = Date.now();
      console.log(`📚 Loaded ${this.kbEntries.length} KB entries (OpenAI embeddings)`);
      return this.kbEntries;
    } catch (err) {
      console.error('❌ Failed to load knowledge base:', err.message);
      this.kbEntries = [];
      return [];
    }
  }

  async searchKnowledgeBase(question, k = 5) {
    const entries = await this.loadKnowledgeBase();
    if (entries.length === 0) return [];

    const qEmbedding = await this.embeddings.embedQuery(question);
    const scored = entries.map((e) => ({
      ...e,
      score: cosineSimilarity(qEmbedding, e.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  buildContext(matches) {
    if (!matches || matches.length === 0) return '';
    return matches.map((m, i) => `[${i + 1}] Q: ${m.question}\nA: ${m.answer}`).join('\n\n');
  }

  // ── Conversation History ───────────────────────────────────────────────────

  getHistory(userId) {
    let history = conversationHistory.get(userId) || [];
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY);
      conversationHistory.set(userId, history);
    }
    return history;
  }

  addToHistory(userId, role, content) {
    let history = this.getHistory(userId);
    const msg = role === 'human' ? new HumanMessage(content) : new AIMessage(content);
    history.push(msg);
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    conversationHistory.set(userId, history);
  }

  // ── Response Cache ─────────────────────────────────────────────────────────

  async getCachedResponse(question) {
    if (!cachingService) return null;
    try {
      return await cachingService.get(`support:chat:${hashQuestion(question)}`);
    } catch (e) {
      return null;
    }
  }

  async cacheResponse(question, response) {
    if (!cachingService) return;
    try {
      await cachingService.set(`support:chat:${hashQuestion(question)}`, response, CACHE_TTL);
    } catch (e) {
      // Cache errors are non-fatal
    }
  }

  // ── Self-Learning KB ───────────────────────────────────────────────────────

  async autoLearnFromResponse(question, answer, language = 'en') {
    try {
      const { AiKnowledgeBase } = models;
      const embedding = await this.embeddings.embedQuery(question);

      await AiKnowledgeBase.create({
        faqId: `AUTO-${Date.now()}`,
        audience: 'end-user',
        category: 'auto_learned',
        question,
        answer,
        language,
        isActive: false, // Pending admin review — set to true in portal to activate
        embedding,
        confidenceScore: 0.70,
      });

      this.metrics.autoLearned++;
      console.log(`🧠 Auto-learned new KB entry (pending review): "${question.slice(0, 60)}"`);
    } catch (err) {
      console.error('❌ Auto-learn save failed:', err.message);
    }
  }

  // ── Main Query ─────────────────────────────────────────────────────────────

  async processSupportQuery(message, userId, language = 'en', context = {}) {
    return this.processQuery(message, userId, language);
  }

  async processQuery(message, userId, language = 'en') {
    const startTime = Date.now();
    this.metrics.totalQueries++;

    if (!this.aiEnabled) {
      return this.formatResult(
        'AI support is temporarily unavailable. Please contact our support team.',
        startTime, userId
      );
    }

    try {
      // ── Layer 1: Response cache (Redis / in-memory) ──────────────────────
      const cached = await this.getCachedResponse(message);
      if (cached) {
        this.metrics.cacheHits++;
        return {
          ...cached,
          queryId: `rag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          performance: { responseTime: Date.now() - startTime, source: 'cache' },
          data: { type: 'cache' },
        };
      }

      // ── Layer 2: Semantic KB search ──────────────────────────────────────
      const matches = await this.searchKnowledgeBase(message);
      const topMatch = matches[0];
      const topScore = topMatch?.score || 0;

      let responseText;
      let responseType;

      // ── Layer 3: Direct KB answer (no LLM call) ──────────────────────────
      if (topScore >= KB_DIRECT_THRESHOLD) {
        responseText = topMatch.answer;
        responseType = 'kb_direct';
        this.metrics.kbDirectHits++;

      } else {
        // ── Layer 4: LLM call (GPT-4o-mini) ──────────────────────────────
        this.metrics.llmCalls++;
        const goodMatches = matches.filter((m) => m.score >= KB_MATCH_THRESHOLD);
        const contextText = this.buildContext(goodMatches);
        const history = this.getHistory(userId);
        const isNewQuestion = topScore < AUTO_LEARN_THRESHOLD;

        const systemPrompt = `You are a friendly MyMoolah support assistant for a South African digital wallet and treasury platform.
${contextText
    ? 'Answer based on the knowledge base context below. If the answer is not in the context, use your general knowledge about digital wallets and South African banking.'
    : 'Use your general knowledge about digital wallets and South African banking to answer helpfully.'
}
Keep answers helpful, concise (under 100 words when possible), and warm.
Respond in the user's language (language code: ${language}). For 'en' use English. For 'af' use Afrikaans. For 'zu' use isiZulu. For 'xh' use isiXhosa. For 'st' use Sesotho. For other codes, use English.
Never invent specific fees, account numbers, or regulatory facts.`;

        const messages = [
          new SystemMessage(
            systemPrompt + (contextText ? `\n\n## Knowledge base context\n${contextText}` : '')
          ),
          ...history,
          new HumanMessage(message),
        ];

        const response = await this.llm.invoke(messages);
        responseText = response.content?.toString?.() || response.content || '';
        responseType = goodMatches.length > 0 ? 'rag' : 'llm_general';

        // Self-learning: save to KB (isActive=false) if question was not in KB
        // and the answer is substantive (not a generic fallback)
        if (
          isNewQuestion &&
          responseText.length >= AUTO_LEARN_MIN_LENGTH &&
          !responseText.toLowerCase().includes('contact our support')
        ) {
          this.autoLearnFromResponse(message, responseText, language).catch(() => {});
        }
      }

      this.addToHistory(userId, 'human', message);
      this.addToHistory(userId, 'assistant', responseText);

      const result = this.formatResult(responseText, startTime, userId, false, responseType, topScore);

      // Cache for next user asking the same question
      await this.cacheResponse(message, result);

      return result;

    } catch (err) {
      this.metrics.errors++;
      console.error('❌ RAG error:', err.message);
      return this.formatResult(
        "I'm having trouble right now. Please try again or contact our support team.",
        startTime, userId, true
      );
    }
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatResult(message, startTime, userId, isError = false, type = 'rag', confidence = null) {
    return {
      success: !isError,
      message,
      data: { type },
      queryId: `rag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      compliance: { iso20022: true, mojaloop: true },
      performance: { responseTime: Date.now() - startTime },
      ...(confidence !== null && { confidence: Math.round(confidence * 100) / 100 }),
      suggestions: ['View wallet balance', 'Check transaction history', 'Contact support'],
    };
  }

  // ── Health & Metrics ───────────────────────────────────────────────────────

  async healthCheck() {
    return {
      status: this.aiEnabled ? 'healthy' : 'degraded',
      aiEnabled: this.aiEnabled,
      model: process.env.SUPPORT_AI_MODEL || 'gpt-4o-mini',
      kbEntries: this.kbEntries.length,
      timestamp: new Date().toISOString(),
    };
  }

  getPerformanceMetrics() {
    const { totalQueries, cacheHits, kbDirectHits, llmCalls, autoLearned, errors } = this.metrics;
    return {
      totalQueries,
      cacheHits,
      kbDirectHits,
      llmCalls,
      autoLearned,
      errors,
      cacheHitRate: totalQueries > 0 ? `${Math.round((cacheHits / totalQueries) * 100)}%` : '0%',
      kbDirectRate: totalQueries > 0 ? `${Math.round((kbDirectHits / totalQueries) * 100)}%` : '0%',
      estimatedSavings: `${cacheHits + kbDirectHits} LLM calls avoided`,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new RagService();
