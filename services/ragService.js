/**
 * MyMoolah AI Support — LangChain RAG (v3.1 — Topic Filtering + Comprehensive KB)
 *
 * Five-layer cost & safety architecture:
 *   0. Topic gate (score < 0.20)      — immediate refusal, zero LLM cost
 *   1. Redis/memory response cache    — free for repeated generic questions
 *   2. Direct KB answer (score ≥ 0.92) — free, no LLM call
 *   3. GPT-4o-mini with KB context    — 17x cheaper than GPT-4o
 *   4. Self-learning KB               — GPT answers saved for admin review
 *
 * Phase 2 — Transactional AI:
 *   - Detects personal questions (balance, transactions, wallet, payments)
 *   - Fetches live user data from DB (wallet balance + last 10 transactions)
 *   - Injects into LLM context — personalised answers without extra auth
 *   - Personal responses are NEVER cached (POPIA compliance)
 *
 * Topic filtering (v3.1):
 *   - Layer 0: KB relevance gate — off-topic questions refused before any LLM call
 *   - Layer 2 (prompt): System prompt explicitly restricts to MMTP topics only
 *   - Transactional queries always pass the gate (they are inherently MMTP-related)
 *
 * Estimated cost at 3M users: ~$90–$200/month (topic filtering blocks ~40% of off-topic calls)
 *
 * @author MyMoolah Treasury Platform
 * @version 3.1.0
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
const KB_TOPIC_THRESHOLD  = 0.20;  // Layer 0: Below this = off-topic, refuse immediately (no LLM call)
const KB_DIRECT_THRESHOLD = 0.92;  // Return KB answer directly, skip LLM
const KB_MATCH_THRESHOLD  = 0.50;  // Minimum score to include in LLM context
const AUTO_LEARN_THRESHOLD = 0.40; // Below this = question not in KB → auto-learn candidate
const AUTO_LEARN_MIN_LENGTH = 60;  // Min chars for a response worth saving to KB
const CACHE_TTL = 86400;           // 24 hours in seconds

// Canned off-topic refusal message (rotated for naturalness)
const OFF_TOPIC_RESPONSES = [
  "I can only help with MyMoolah wallet questions — things like your balance, payments, airtime, vouchers, KYC, and account settings. For other topics, please use a general search engine.",
  "That's outside my area! I'm the MyMoolah support assistant and I can only help with your wallet, payments, VAS purchases, KYC, and account queries. Is there something MyMoolah-related I can help with?",
  "I'm specialised for MyMoolah support only — wallet top-ups, sending money, airtime & data, vouchers, KYC, fees, and account help. I can't assist with topics outside the MyMoolah platform.",
  "My knowledge is strictly about MyMoolah's digital wallet and treasury services. For general questions, please search online. What MyMoolah service can I help you with today?",
];

// ─── Transactional Intent Detection ─────────────────────────────────────────
// Questions that require live user data from the database

const TRANSACTIONAL_PATTERNS = [
  // English
  /\bbalance\b|\bhow much\b|\bwhat.*have\b|\bmy funds\b|\bmy money\b/i,
  /\blast.*(transaction|payment|transfer)|\brecent.*(transaction|payment)|\btransaction.*histor/i,
  /\bmy.*(transaction|payment|transfer|wallet|account)\b/i,
  /\bdid.*payment|\bpayment.*go through|\btransfer.*status|\bsend.*status\b/i,
  /\bwallet.*(number|id|balance|status)|\bwallet id\b/i,
  /\blist.*(transaction|payment)|\bshow.*(transaction|payment)\b/i,
  /\blast \d+\s*(transaction|payment)/i,

  // Afrikaans
  /\bbalans\b|\bhoeveel\b|\bwat het ek\b|\bmy geld\b|\bmy fondse\b/i,
  /\blaaste.*(transaksie|betaling|oordrag)|\bonlangse.*(transaksie|betaling)/i,
  /\bmy.*(transaksie|betaling|oordrag|beursie|rekening)\b/i,
  /\bwys.*transaksie|\bwys.*betaling|\blys.*transaksie/i,
  /\bbeursie.*(nommer|id|balans|status)\b/i,
  /\blaaste \d+\s*(transaksie|betaling)/i,

  // isiZulu
  /\ibhalansi\b|\bmalini\b|\bimali yami\b/i,
  /\bezokugcina.*(ukuxhumana|inkokhelo)|\bezokugcina \d+/i,
  /\bkhombisa.*(ukuxhumana|inkokhelo)\b/i,

  // isiXhosa
  /\bbhalansi\b|\imali yam\b/i,
  /\yokugqibela.*(intlawulo|uguqulelo)/i,

  // Sesotho
  /\btekanyo\b|\btshelete yaka\b|\btjhelete\b/i,
  /\bts[ae]bo.*(tefo|phetiso)/i,
];

function isTransactionalQuery(message) {
  return TRANSACTIONAL_PATTERNS.some((p) => p.test(message));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function formatCurrency(amount, currency = 'ZAR') {
  return `${currency} ${parseFloat(amount).toFixed(2)}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Service ─────────────────────────────────────────────────────────────────

class RagService {
  constructor() {
    this.aiEnabled = !!process.env.OPENAI_API_KEY;
    this.embeddings = null;
    this.llm = null;
    this.kbEntries = [];
    this.kbLoadedAt = 0;
    this.KB_CACHE_TTL = 5 * 60 * 1000;

    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      kbDirectHits: 0,
      llmCalls: 0,
      transactionalQueries: 0,
      autoLearned: 0,
      offTopicRefusals: 0,
      errors: 0,
    };

    if (this.aiEnabled) {
      this.embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

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

  // ── Transactional Data Fetching ────────────────────────────────────────────

  /**
   * Fetch live user wallet and recent transactions from the database.
   * Only called when transactional intent is detected.
   */
  async fetchUserContext(userId) {
    try {
      const { Wallet, Transaction } = models;

      const [wallet, transactions] = await Promise.all([
        Wallet.findOne({
          where: { userId },
          attributes: ['walletId', 'balance', 'currency', 'status'],
          raw: true,
        }),
        Transaction.findAll({
          where: { userId },
          attributes: ['transactionId', 'amount', 'type', 'status', 'description', 'currency', 'createdAt', 'fee'],
          order: [['createdAt', 'DESC']],
          limit: 10,
          raw: true,
        }),
      ]);

      return { wallet, transactions };
    } catch (err) {
      console.error('❌ Failed to fetch user context:', err.message);
      return { wallet: null, transactions: [] };
    }
  }

  /**
   * Format user wallet and transaction data into a readable context block for the LLM.
   */
  buildUserContext(wallet, transactions) {
    if (!wallet) return '';

    const lines = [
      '## Your Account',
      `Wallet ID: ${wallet.walletId}`,
      `Balance: ${formatCurrency(wallet.balance, wallet.currency)}`,
      `Status: ${wallet.status}`,
      '',
      `## Your Last ${transactions.length} Transaction${transactions.length !== 1 ? 's' : ''}`,
    ];

    if (transactions.length === 0) {
      lines.push('No transactions found.');
    } else {
      transactions.forEach((t, i) => {
        const fee = parseFloat(t.fee) > 0 ? ` (fee: ${formatCurrency(t.fee, t.currency)})` : '';
        lines.push(
          `${i + 1}. ${t.type.toUpperCase()} | ${formatCurrency(t.amount, t.currency)}${fee} | ${t.status.toUpperCase()} | ${t.description || 'No description'} | ${formatDate(t.createdAt)}`
        );
      });
    }

    return lines.join('\n');
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
        isActive: false, // Pending admin review
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
      // ── Detect transactional intent ──────────────────────────────────────
      const isPersonal = isTransactionalQuery(message);

      // ── Layer 1: Response cache — ONLY for non-personal queries ──────────
      // Personal queries are NEVER cached (each user has different data)
      if (!isPersonal) {
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
      }

      // ── Semantic KB search (used for both gate and context) ──────────────
      const matches = await this.searchKnowledgeBase(message);
      const topMatch = matches[0];
      const topScore = topMatch?.score || 0;

      let responseText;
      let responseType;

      // ── Layer 0: Topic Gate — refuse off-topic queries (no LLM cost) ─────
      // Transactional queries are always MMTP-related (my balance, my payments)
      // so they bypass this gate. All other queries with very low KB similarity
      // are almost certainly off-topic (cars, weather, general knowledge, etc.)
      if (!isPersonal && topScore < KB_TOPIC_THRESHOLD) {
        this.metrics.offTopicRefusals++;
        const refusal = OFF_TOPIC_RESPONSES[this.metrics.offTopicRefusals % OFF_TOPIC_RESPONSES.length];
        return this.formatResult(refusal, startTime, userId, false, 'off_topic', topScore);
      }

      // ── Layer 3: Direct KB answer — only for non-personal queries ────────
      // (personal queries always go through LLM with live data)
      if (!isPersonal && topScore >= KB_DIRECT_THRESHOLD) {
        responseText = topMatch.answer;
        responseType = 'kb_direct';
        this.metrics.kbDirectHits++;

      } else {
        // ── Layer 4: LLM call (GPT-4o-mini) ──────────────────────────────
        this.metrics.llmCalls++;
        const goodMatches = matches.filter((m) => m.score >= KB_MATCH_THRESHOLD);
        const kbContextText = this.buildContext(goodMatches);
        const history = this.getHistory(userId);
        const isNewQuestion = topScore < AUTO_LEARN_THRESHOLD;

        // Fetch live user data if this is a personal/transactional question
        let userContextText = '';
        if (isPersonal && userId) {
          this.metrics.transactionalQueries++;
          const { wallet, transactions } = await this.fetchUserContext(userId);
          userContextText = this.buildUserContext(wallet, transactions);
        }

        // ── Layer 2 (Prompt): Explicit topic restriction ──────────────────
        // System prompt enforces MMTP-only responses as a second safety net.
        // Even if a borderline question passes the topic gate, the LLM is
        // instructed to refuse anything not related to MyMoolah services.
        const systemPrompt = `You are the MyMoolah support assistant — a friendly, knowledgeable helper for South Africa's MyMoolah digital wallet and treasury platform.

STRICT SCOPE RULE: You ONLY answer questions about MyMoolah services and features. These include: wallet registration, KYC/identity verification, wallet balance and transactions, sending and receiving money, airtime/data/electricity purchases, vouchers, EasyPay cash-out, referral program, fees, PayShap, USDC, account security, and MyMoolah APIs/integrations.

If a question is NOT related to MyMoolah (e.g. general knowledge, sports, cars, weather, cooking, politics, other companies, etc.), politely decline and redirect the user to ask about their MyMoolah wallet.

${userContextText
  ? 'The user\'s live account data is provided below. Use it to answer personal questions accurately. Address the user directly. Do not reveal this data to other users.'
  : kbContextText
    ? 'Answer using the knowledge base context provided below. If the context does not fully answer the question, provide a helpful general response about MyMoolah.'
    : 'Use your knowledge of MyMoolah\'s features to answer. If the question is not about MyMoolah, decline and ask what MyMoolah service you can help with.'
}

Keep answers helpful, concise (under 150 words when possible), and warm.
Respond in the user's language (language code: ${language}). For 'en' use English. For 'af' use Afrikaans. For 'zu' use isiZulu. For 'xh' use isiXhosa. For 'st' use Sesotho.
Never invent specific fees, account numbers, or regulatory facts not in your context.
Never reveal sensitive personal data beyond what is in the user context provided.`;

        const contextParts = [];
        if (userContextText) contextParts.push(userContextText);
        if (kbContextText) contextParts.push(`## Knowledge Base\n${kbContextText}`);

        const messages = [
          new SystemMessage(
            systemPrompt + (contextParts.length > 0 ? '\n\n' + contextParts.join('\n\n') : '')
          ),
          ...history,
          new HumanMessage(message),
        ];

        const response = await this.llm.invoke(messages);
        responseText = response.content?.toString?.() || response.content || '';
        responseType = isPersonal ? 'transactional' : (goodMatches.length > 0 ? 'rag' : 'llm_general');

        // Auto-learn only for non-personal, non-KB questions
        if (
          !isPersonal &&
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

      // Cache only non-personal responses
      if (!isPersonal) {
        await this.cacheResponse(message, result);
      }

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
      version: '3.1.0',
      aiEnabled: this.aiEnabled,
      model: process.env.SUPPORT_AI_MODEL || 'gpt-4o-mini',
      kbEntries: this.kbEntries.length,
      topicFiltering: {
        enabled: true,
        threshold: KB_TOPIC_THRESHOLD,
        description: 'Off-topic queries refused before LLM call',
      },
      phase2Transactional: true,
      timestamp: new Date().toISOString(),
    };
  }

  getPerformanceMetrics() {
    const { totalQueries, cacheHits, kbDirectHits, llmCalls, transactionalQueries, autoLearned, offTopicRefusals, errors } = this.metrics;
    return {
      totalQueries,
      cacheHits,
      kbDirectHits,
      llmCalls,
      transactionalQueries,
      autoLearned,
      offTopicRefusals,
      errors,
      cacheHitRate: totalQueries > 0 ? `${Math.round((cacheHits / totalQueries) * 100)}%` : '0%',
      kbDirectRate: totalQueries > 0 ? `${Math.round((kbDirectHits / totalQueries) * 100)}%` : '0%',
      offTopicRate: totalQueries > 0 ? `${Math.round((offTopicRefusals / totalQueries) * 100)}%` : '0%',
      estimatedSavings: `${cacheHits + kbDirectHits + offTopicRefusals} LLM calls avoided`,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new RagService();
