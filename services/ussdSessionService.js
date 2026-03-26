'use strict';

const SESSION_PREFIX = 'ussd:session:';
const SESSION_TTL = parseInt(process.env.USSD_SESSION_TTL || '180', 10);

let redis = null;
let usingMemory = false;
const memoryStore = new Map();
const memoryTimers = new Map();

function getRedis() {
  if (redis) return redis;
  if (!process.env.REDIS_URL) {
    if (!usingMemory) {
      console.warn('[USSD-SESSION] REDIS_URL not set — using in-memory session store (not shared across instances)');
      usingMemory = true;
    }
    return null;
  }
  const Redis = require('ioredis');
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 3000)),
    lazyConnect: false,
  });
  redis.on('error', (err) => console.error('[USSD-SESSION] Redis error:', err.message));
  return redis;
}

function sessionKey(sessionId) {
  return `${SESSION_PREFIX}${sessionId}`;
}

function memorySet(key, value, ttlSeconds) {
  memoryStore.set(key, value);
  if (memoryTimers.has(key)) clearTimeout(memoryTimers.get(key));
  memoryTimers.set(key, setTimeout(() => {
    memoryStore.delete(key);
    memoryTimers.delete(key);
  }, ttlSeconds * 1000));
}

function memoryDel(key) {
  memoryStore.delete(key);
  if (memoryTimers.has(key)) {
    clearTimeout(memoryTimers.get(key));
    memoryTimers.delete(key);
  }
}

async function createSession(sessionId, msisdn, networkId) {
  const session = {
    sessionId,
    msisdn,
    networkId: String(networkId),
    userId: null,
    menuState: 'WELCOME',
    pinVerified: false,
    data: {},
    createdAt: Date.now(),
  };

  const client = getRedis();
  if (client) {
    await client.set(sessionKey(sessionId), JSON.stringify(session), 'EX', SESSION_TTL);
  } else {
    memorySet(sessionKey(sessionId), JSON.stringify(session), SESSION_TTL);
  }
  return session;
}

async function getSession(sessionId) {
  const client = getRedis();
  let raw;
  if (client) {
    raw = await client.get(sessionKey(sessionId));
  } else {
    raw = memoryStore.get(sessionKey(sessionId)) || null;
  }
  if (!raw) return null;
  return JSON.parse(raw);
}

async function updateSession(sessionId, updates) {
  const session = await getSession(sessionId);
  if (!session) return null;

  const merged = { ...session, ...updates };
  if (updates.data) {
    merged.data = { ...session.data, ...updates.data };
  }

  const client = getRedis();
  if (client) {
    const ttl = await client.ttl(sessionKey(sessionId));
    const remainingTtl = ttl > 0 ? ttl : SESSION_TTL;
    await client.set(sessionKey(sessionId), JSON.stringify(merged), 'EX', remainingTtl);
  } else {
    memorySet(sessionKey(sessionId), JSON.stringify(merged), SESSION_TTL);
  }
  return merged;
}

async function destroySession(sessionId) {
  const client = getRedis();
  if (client) {
    await client.del(sessionKey(sessionId));
  } else {
    memoryDel(sessionKey(sessionId));
  }
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  destroySession,
  SESSION_TTL,
};
