'use strict';

const Redis = require('ioredis');

const SESSION_PREFIX = 'ussd:session:';
const SESSION_TTL = parseInt(process.env.USSD_SESSION_TTL || '180', 10);

let redis = null;

function getRedis() {
  if (redis) return redis;
  if (!process.env.REDIS_URL) return null;
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    enableOfflineQueue: false,
  });
  redis.on('error', (err) => console.error('[USSD-SESSION] Redis error:', err.message));
  return redis;
}

function sessionKey(sessionId) {
  return `${SESSION_PREFIX}${sessionId}`;
}

async function createSession(sessionId, msisdn, networkId) {
  const client = getRedis();
  if (!client) throw new Error('Redis not available for USSD sessions');

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

  await client.set(sessionKey(sessionId), JSON.stringify(session), 'EX', SESSION_TTL);
  return session;
}

async function getSession(sessionId) {
  const client = getRedis();
  if (!client) return null;

  const raw = await client.get(sessionKey(sessionId));
  if (!raw) return null;

  return JSON.parse(raw);
}

async function updateSession(sessionId, updates) {
  const client = getRedis();
  if (!client) throw new Error('Redis not available for USSD sessions');

  const session = await getSession(sessionId);
  if (!session) return null;

  const merged = { ...session, ...updates };
  if (updates.data) {
    merged.data = { ...session.data, ...updates.data };
  }

  const ttl = await client.ttl(sessionKey(sessionId));
  const remainingTtl = ttl > 0 ? ttl : SESSION_TTL;
  await client.set(sessionKey(sessionId), JSON.stringify(merged), 'EX', remainingTtl);
  return merged;
}

async function destroySession(sessionId) {
  const client = getRedis();
  if (!client) return;
  await client.del(sessionKey(sessionId));
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  destroySession,
  SESSION_TTL,
};
