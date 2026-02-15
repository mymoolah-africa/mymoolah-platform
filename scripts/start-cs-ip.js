#!/usr/bin/env node
require("dotenv").config();
const { spawn } = require("child_process");

function configureDatabaseUrl(url) {
  try {
    const u = new URL(url);
    
    // If using Cloud SQL Auth Proxy (127.0.0.1:6543), disable SSL
    if (u.hostname === '127.0.0.1' && u.port === '6543') {
      u.searchParams.set("sslmode", "disable");
      u.searchParams.delete("ssl");
      console.log('ℹ️  Using Cloud SQL Auth Proxy - SSL disabled');
      return u.toString();
    }
    
    // For direct connections, enable SSL
    u.searchParams.set("ssl", "true");
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    console.error("Invalid DATABASE_URL");
    process.exit(1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

process.env.DATABASE_URL = configureDatabaseUrl(process.env.DATABASE_URL);
process.env.PGSSLMODE = process.env.DATABASE_URL.includes('sslmode=disable') ? "disable" : "no-verify";
// Do NOT set NODE_TLS_REJECT_UNAUTHORIZED=0 - it disables cert verification for ALL TLS (nodemailer, APIs, etc).
// DB SSL is handled by pg via PGSSLMODE/sslmode. For direct Cloud SQL with sslmode=require, use no-verify above.

const child = spawn("node", ["server.js"], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code));
