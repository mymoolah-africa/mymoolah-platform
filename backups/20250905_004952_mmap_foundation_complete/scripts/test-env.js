#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 Environment Variables Test');
console.log('=' .repeat(50));

console.log('PEACH_BASE_AUTH:', process.env.PEACH_BASE_AUTH);
console.log('PEACH_BASE_CHECKOUT:', process.env.PEACH_BASE_CHECKOUT);
console.log('PEACH_CLIENT_ID:', process.env.PEACH_CLIENT_ID);
console.log('PEACH_CLIENT_SECRET:', process.env.PEACH_CLIENT_SECRET ? '[HIDDEN]' : 'undefined');
console.log('PEACH_MERCHANT_ID:', process.env.PEACH_MERCHANT_ID);
console.log('PEACH_ENTITY_ID_PSH:', process.env.PEACH_ENTITY_ID_PSH);
console.log('PEACH_ENABLE_TEST_MODE:', process.env.PEACH_ENABLE_TEST_MODE);

console.log('\n📋 Summary:');
console.log('Total Peach Payments env vars:', Object.keys(process.env).filter(key => key.startsWith('PEACH_')).length);
console.log('Entity ID loaded:', process.env.PEACH_ENTITY_ID_PSH ? 'YES' : 'NO');
console.log('Expected Entity ID: 8ac7a4ca98972c34019899445be504d8');
console.log('Actual Entity ID:', process.env.PEACH_ENTITY_ID_PSH);
console.log('Match:', process.env.PEACH_ENTITY_ID_PSH === '8ac7a4ca98972c34019899445be504d8' ? '✅ YES' : '❌ NO');


