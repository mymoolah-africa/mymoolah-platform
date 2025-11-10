#!/usr/bin/env node
/**
 * Debug MobileMart URL Construction
 * 
 * Shows exactly how URLs are being constructed
 */

require('dotenv').config();
const MobileMartAuthService = require('../services/mobilemartAuthService');

const authService = new MobileMartAuthService();

console.log('\n🔍 URL Construction Debug:\n');
console.log(`Base URL: ${authService.baseUrl}`);
console.log(`API URL: ${authService.apiUrl}`);
console.log(`Token URL: ${authService.tokenUrl}\n`);

console.log('Testing endpoint: /airtime/products');
console.log(`Full URL would be: ${authService.apiUrl}/airtime/products\n`);

console.log('Testing endpoint: /v1/airtime/products');
console.log(`Full URL would be: ${authService.apiUrl}/v1/airtime/products\n`);

console.log('✅ Correct endpoint format: /airtime/products (apiUrl already includes /v1)');

