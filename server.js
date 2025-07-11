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

// Import routes
const authRoutes = require('./routes/auth.js');
const walletRoutes = require('./routes/wallets.js');
const easyPayRoutes = require('./routes/easypay.js');

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/billpayment/v1', easyPayRoutes);

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
      easyPay: '/billpayment/v1',
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
      easyPay: '/billpayment/v1',
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
      easyPay: '/billpayment/v1',
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
    console.log(`💰 EasyPay API: http://localhost:${port}/billpayment/v1`);
    console.log(`🔗 Health Check: http://localhost:${port}/health`);
    console.log(`🧪 Test Endpoint: http://localhost:${port}/test`);
  });
}

module.exports = app; // Export the app for testing