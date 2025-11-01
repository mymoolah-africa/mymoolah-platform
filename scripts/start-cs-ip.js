#!/usr/bin/env node
require("dotenv").config();
const { spawn } = require("child_process");

function ensureSslTrue(url) {
  try {
    const u = new URL(url);
    const p = u.searchParams;
    p.set("ssl","true");
    p.delete("sslmode");
    u.search = p.toString();
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

process.env.DATABASE_URL = ensureSslTrue(process.env.DATABASE_URL);
process.env.PGSSLMODE = "no-verify";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const child = spawn("node", ["server.js"], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code));
