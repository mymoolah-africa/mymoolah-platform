#!/usr/bin/env node
/*
  MyMoolah API smoke test – runs against a running local backend on http://localhost:3001
  Usage: node scripts/api-smoke-test.js "<MOBILE>" "<PASSWORD>"
*/
const fetch = require('node-fetch');

const BASE = process.env.API_BASE || 'http://localhost:3001';
const PHONE = process.env.MM_PHONE || process.argv[2] || '+27825571055';
const PASS = process.env.MM_PASS || process.argv[3] || 'Password123!';

function log(ok, name, details='') {
  const s = ok ? '✅' : '❌';
  console.log(`${s} ${name}${details ? ' — ' + details : ''}`);
}

async function main() {
  let token = '';
  try {
    // Auth: login
    let res = await fetch(`${BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: PHONE, password: PASS })
    });
    let j = await res.json();
    if (!res.ok || !j.success) throw new Error(j.message || 'login failed');
    token = j.token; log(true, 'auth/login');

    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Verify
    res = await fetch(`${BASE}/api/v1/auth/verify`, { headers: auth });
    log(res.ok, 'auth/verify');

    // Wallet balance
    res = await fetch(`${BASE}/api/v1/wallets/balance`, { headers: auth });
    j = await res.json();
    log(res.ok && j.success, 'wallets/balance', `R ${j?.data?.balance}`);

    // Vouchers list
    res = await fetch(`${BASE}/api/v1/vouchers/`, { headers: auth });
    j = await res.json();
    log(res.ok && j.success, 'vouchers/ list', `${(j.data?.vouchers||[]).length} items`);

    // Voucher balance summary
    res = await fetch(`${BASE}/api/v1/vouchers/balance-summary`, { headers: auth });
    j = await res.json();
    log(res.ok && j.success, 'vouchers/balance-summary', `active R ${j?.data?.active?.value}`);

    // Issue small MMVoucher (R5) and redeem R5 immediately
    res = await fetch(`${BASE}/api/v1/vouchers/issue`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ original_amount: 5, issued_to: 'self', description: 'smoke test' })
    });
    j = await res.json();
    log(res.ok && j.success, 'vouchers/issue');
    const code = j?.data?.voucher_code;

    // Redeem
    res = await fetch(`${BASE}/api/v1/vouchers/redeem`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ voucher_code: code, amount: 5 })
    });
    j = await res.json();
    log(res.ok && j.success, 'vouchers/redeem');

    // Notifications create/list
    res = await fetch(`${BASE}/api/v1/notifications`, {
      method: 'POST', headers: auth, body: JSON.stringify({ title: 'Smoke', message: 'Test' })
    });
    log(res.ok, 'notifications POST');
    res = await fetch(`${BASE}/api/v1/notifications`, { headers: auth });
    log(res.ok, 'notifications GET');

    console.log('\nAll smoke requests sent.');
  } catch (err) {
    log(false, 'smoke test failed', err.message);
    process.exitCode = 1;
  }
}

main();


