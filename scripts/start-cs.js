#!/usr/bin/env node
/*
  Secure Codespaces start wrapper:
  - Ensures Cloud SQL is accessed via 127.0.0.1:5433 (proxy)
  - Leaves all other env from .env intact (JWT, OpenAI, etc.)
*/
const { spawn } = require('child_process');

function buildLocalDatabaseUrl(originalUrl) {
  try {
    const u = new URL(originalUrl);
    // Keep credentials and db name, switch host/port to proxy
    u.hostname = '127.0.0.1';
    u.port = '5433';
    // Remove ssl query params; proxy is plain to localhost
    u.search = '';
    return u.toString();
  } catch (e) {
    console.error('Invalid DATABASE_URL. Please set a valid Postgres URL in .env.');
    process.exit(1);
  }
}

const original = process.env.DATABASE_URL;
if (!original) {
  console.error('DATABASE_URL is not set in environment.');
  process.exit(1);
}

const localUrl = buildLocalDatabaseUrl(original);
process.env.DATABASE_URL = localUrl;

// Start server without insecure TLS overrides
const child = spawn('node', ['server.js'], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code));


