'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORTAL_BACKEND_PORT || 3002;
const HOST = process.env.PORTAL_BACKEND_HOST || 'localhost';

// Test database connection
async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Portal database connection established successfully');
  } catch (error) {
    console.error('❌ Unable to connect to portal database:', error);
    process.exit(1);
  }
}

// Sync database models
async function syncDatabase() {
  try {
    // Since we're using migrations, we don't need to sync
    // The tables already exist from our migration
    console.log('📊 Using existing database schema from migrations');
    console.log('✅ Portal tables are ready');
  } catch (error) {
    console.error('❌ Database sync error:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    // Test database connection
    await testDatabaseConnection();
    
    // Sync database models
    await syncDatabase();
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log('🚀 MyMoolah Portal Backend Server Started');
      console.log(`Server: http://${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`JWT: ${process.env.PORTAL_JWT_SECRET ? 'configured' : process.env.JWT_SECRET ? 'using main JWT_SECRET' : 'NOT CONFIGURED'}`);
      console.log('---');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
      
      server.close((err) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('✅ HTTP server closed');
        
        // Close database connection
        sequelize.close().then(() => {
          console.log('✅ Database connection closed');
          console.log('👋 MyMoolah Portal Backend Server stopped');
          process.exit(0);
        }).catch((err) => {
          console.error('❌ Error closing database connection:', err);
          process.exit(1);
        });
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
