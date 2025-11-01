#!/usr/bin/env node
// Codespaces auto-start without Cloud SQL proxy.
// Keeps .env intact, only adjusts DB TLS for this process.

require('dotenv').config();
const { spawn } = require('child_process');

function ensureSslTrue(url) {
  try {
    const u = new URL(url);
    // force ssl=true
    const params = u.searchParams;
    params.set('ssl', 'true');
    // remove sslmode if present to avoid conflicts
    params.delete('sslmode');
    u.search = params.toString();
    return u.toString();
  } catch (e) {
    console.error('Invalid DATABASE_URL. Please confirm it is a valid Postgres URL.');
    process.exit(1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment (.env).');
  process.exit(1);
}

process.env.DATABASE_URL = ensureSslTrue(process.env.DATABASE_URL);
process.env.PGSSLMODE = 'no-verify';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const child = spawn('node', ['server.js'], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code));


