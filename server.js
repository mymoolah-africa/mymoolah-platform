// Load environment variables
require('dotenv').config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit();
});

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5050;

// Import core routes
const authRoutes = require('./routes/auth.js');
const walletRoutes = require('./routes/wallets.js');
const transactionRoutes = require('./routes/transactionRoutes.js');
const userRoutes = require('./routes/users.js');
const kycRoutes = require('./routes/kyc.js');
const supportRoutes = require('./routes/support.js');
const notificationRoutes = require('./routes/notifications.js');
const voucherRoutes = require('./routes/vouchers.js');
const voucherTypeRoutes = require('./routes/voucherTypes.js');
const vasRoutes = require('./routes/vas.js');
const merchantRoutes = require('./routes/merchants.js');
const serviceProviderRoutes = require('./routes/serviceproviders.js');
const easyPayRoutes = require('./routes/easypay.js'); // <-- ADD THIS
const easyPayVoucherRoutes = require('./routes/easypayVouchers');

// Conditionally load Flash routes
let flashRoutesLoaded = false;
let flashRoutes;
if (process.env.FLASH_CONSUMER_KEY && process.env.FLASH_CONSUMER_SECRET) {
  flashRoutes = require('./routes/flash.js');
  flashRoutesLoaded = true;
  console.log('✅ Flash routes loaded');
} else {
  console.warn('⚠️  Flash credentials not set. Flash API endpoints will be unavailable.');
}

// Conditionally load MobileMart routes
let mobilemartRoutesLoaded = false;
let mobilemartRoutes;
if (process.env.MOBILEMART_CLIENT_ID && process.env.MOBILEMART_CLIENT_SECRET) {
  mobilemartRoutes = require('./routes/mobilemart.js');
  mobilemartRoutesLoaded = true;
  console.log('✅ MobileMart routes loaded');
} else {
  console.warn('⚠️  MobileMart credentials not set. MobileMart API endpoints will be unavailable.');
}

// Import problematic routes (commented out as requested)
// const easyPayRoutes = require('./routes/easypay.js');
// const mercuryRoutes = require('./routes/mercury.js');
// const easyPayVoucherRoutes = require('./routes/easypayVouchers.js');

// Middleware
app.use(cors());
app.use(express.json());

// Core API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/voucher-types', voucherTypeRoutes);
app.use('/api/v1/vas', vasRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/service-providers', serviceProviderRoutes);
app.use('/api/v1/easypay-vouchers', easyPayVoucherRoutes);
app.use('/billpayment/v1', easyPayRoutes);
if (flashRoutesLoaded) {
  app.use('/api/v1/flash', flashRoutes);
}
if (mobilemartRoutesLoaded) {
  app.use('/api/v1/mobilemart', mobilemartRoutes);
}

// Commented out problematic routes as requested
// app.use('/billpayment/v1', easyPayRoutes);
// app.use('/api/v1/mercury', mercuryRoutes);
// app.use('/api/v1/easypay-vouchers', easyPayVoucherRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'MyMoolah Wallet API',
    version: '1.0.0'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'MyMoolah Wallet API is running!',
    endpoints: {
      auth: '/api/v1/auth',
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions',
      users: '/api/v1/users',
      kyc: '/api/v1/kyc',
      support: '/api/v1/support',
      notifications: '/api/v1/notifications',
      vouchers: '/api/v1/vouchers',
      voucherTypes: '/api/v1/voucher-types',
      vas: '/api/v1/vas',
      merchants: '/api/v1/merchants',
      serviceProviders: '/api/v1/service-providers',
      ...(flashRoutesLoaded ? { flash: '/api/v1/flash' } : {}),
      ...(mobilemartRoutesLoaded ? { mobilemart: '/api/v1/mobilemart' } : {}),
      health: '/health',
      test: '/test'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MyMoolah Wallet API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions',
      users: '/api/v1/users',
      kyc: '/api/v1/kyc',
      support: '/api/v1/support',
      notifications: '/api/v1/notifications',
      vouchers: '/api/v1/vouchers',
      voucherTypes: '/api/v1/voucher-types',
      vas: '/api/v1/vas',
      merchants: '/api/v1/merchants',
      serviceProviders: '/api/v1/service-providers',
      ...(flashRoutesLoaded ? { flash: '/api/v1/flash' } : {}),
      ...(mobilemartRoutesLoaded ? { mobilemart: '/api/v1/mobilemart' } : {}),
      health: '/health',
      test: '/test'
    }
  });
});

// Debug endpoint
app.post('/debug', (req, res) => {
  console.log("Debug endpoint hit", req.body);
  res.json({ 
    message: "Debug route works!",
    receivedData: req.body
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: {
      auth: '/api/v1/auth',
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions',
      users: '/api/v1/users',
      kyc: '/api/v1/kyc',
      support: '/api/v1/support',
      notifications: '/api/v1/notifications',
      vouchers: '/api/v1/vouchers',
      voucherTypes: '/api/v1/voucher-types',
      vas: '/api/v1/vas',
      merchants: '/api/v1/merchants',
      serviceProviders: '/api/v1/service-providers',
      ...(flashRoutesLoaded ? { flash: '/api/v1/flash' } : {}),
      ...(mobilemartRoutesLoaded ? { mobilemart: '/api/v1/mobilemart' } : {}),
      health: '/health',
      test: '/test'
    }
  });
});

// Start server
if (require.main === module) {
  console.log("Starting server...");
  app.listen(port, () => {
    console.log(`🚀 MyMoolah Wallet API server running on port ${port}`);
    console.log(`📡 API Base URL: http://localhost:${port}/api/v1`);
    console.log(`🔗 Health Check: http://localhost:${port}/health`);
    console.log(`🧪 Test Endpoint: http://localhost:${port}/test`);
    console.log(`📋 Available endpoints:`);
    console.log(`   - Auth: /api/v1/auth`);
    console.log(`   - Wallets: /api/v1/wallets`);
    console.log(`   - Transactions: /api/v1/transactions`);
    console.log(`   - Users: /api/v1/users`);
    console.log(`   - KYC: /api/v1/kyc`);
    console.log(`   - Support: /api/v1/support`);
    console.log(`   - Notifications: /api/v1/notifications`);
    console.log(`   - Vouchers: /api/v1/vouchers`);
    console.log(`   - Voucher Types: /api/v1/voucher-types`);
    console.log(`   - VAS: /api/v1/vas`);
    console.log(`   - Merchants: /api/v1/merchants`);
    console.log(`   - Service Providers: /api/v1/service-providers`);
    if (flashRoutesLoaded) {
      console.log(`   - Flash: /api/v1/flash`);
    }
    if (mobilemartRoutesLoaded) {
      console.log(`   - MobileMart: /api/v1/mobilemart`);
    }
  });
}

module.exports = app; // Export the app for testing