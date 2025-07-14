# MyMoolah Setup Guide

**Version**: 1.0.0  
**Last Updated**: July 12, 2025  
**Project Status**: Production Ready

## 🎯 Overview

This guide provides comprehensive setup instructions for the MyMoolah Wallet Platform. The system is now fully functional with all core routes registered and operational.

## 📋 Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (or yarn v1.22.0+)
- **SQLite3**: Built into Node.js (no separate installation needed)
- **Operating System**: macOS, Linux, or Windows
- **Memory**: Minimum 2GB RAM
- **Storage**: Minimum 1GB free space

### Development Tools (Optional)
- **Git**: For version control
- **Postman/Insomnia**: For API testing
- **VS Code**: Recommended IDE
- **Docker**: For containerized deployment

## 🚀 Quick Setup

### 1. Clone Repository
```bash
# Navigate to your development directory
cd /path/to/your/projects

# Clone the repository (replace with actual URL)
git clone <repository-url>
cd mymoolah
```

### 2. Install Dependencies
```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### 3. Environment Configuration
```bash
# Create environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```bash
# Server Configuration
PORT=5050
NODE_ENV=development

# Database Configuration
DATABASE_URL=sqlite:./data/mymoolah.db

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Optional: Logging
LOG_LEVEL=info
```

### 4. Initialize Database
```bash
# Initialize the database with all tables
npm run init-db

# Verify database creation
ls -la data/
```

### 5. Start the Server
```bash
# Start the development server
npm start

# Or run directly
node server.js
```

### 6. Verify Installation
```bash
# Test health endpoint
curl http://localhost:5050/health

# Test API endpoints
curl http://localhost:5050/test
```

## 🔧 Detailed Setup Instructions

### Database Setup

The system uses SQLite for simplicity and development. The database is automatically created when you run the initialization script.

#### Database Schema
The following tables are created:
- **users**: User accounts and authentication
- **wallets**: Digital wallet management
- **transactions**: Payment transaction records
- **kyc**: Know Your Customer data
- **support**: Customer support tickets
- **notifications**: System notifications
- **vouchers**: Digital voucher system
- **voucher_types**: Voucher type configuration

#### Database Location
- **Development**: `./data/mymoolah.db`
- **Production**: Configure via `DATABASE_URL` environment variable

### API Routes Setup

All core routes are automatically registered in `server.js`:

#### Registered Routes
- ✅ `/api/v1/auth` - Authentication endpoints
- ✅ `/api/v1/wallets` - Wallet management
- ✅ `/api/v1/transactions` - Transaction processing
- ✅ `/api/v1/users` - User management
- ✅ `/api/v1/kyc` - KYC processing
- ✅ `/api/v1/support` - Support ticket system
- ✅ `/api/v1/notifications` - Notification system
- ✅ `/api/v1/vouchers` - Voucher management
- ✅ `/api/v1/voucher-types` - Voucher type management
- ✅ `/api/v1/vas` - Value Added Services
- ✅ `/api/v1/merchants` - Merchant management
- ✅ `/api/v1/service-providers` - Service provider management

#### Temporarily Disabled Routes
- ❌ `/billpayment/v1` - EasyPay integration (commented out)
- ❌ `/api/v1/mercury` - Mercury integration (commented out)
- ❌ `/api/v1/easypay-vouchers` - EasyPay vouchers (commented out)

### Security Configuration

#### JWT Authentication
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to your .env file
JWT_SECRET=your-generated-secret-here
```

#### CORS Configuration
CORS is configured for development. For production, update the allowed origins in `server.js`:

```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}));
```

#### Rate Limiting
Rate limiting is configured to prevent abuse:
- Authentication endpoints: 5 requests/minute
- Wallet operations: 10 requests/minute
- Transaction endpoints: 20 requests/minute
- Other endpoints: 30 requests/minute

## 🧪 Testing Setup

### Run All Tests
```bash
# Run complete test suite
npm test

# Run with coverage
npm run test:coverage
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:5050/health

# Test authentication
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Database Testing
```bash
# Test database connection
npm run test:db

# Test models
npm run test:models

# Test controllers
npm run test:controllers
```

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Set production environment
NODE_ENV=production

# Configure production database
DATABASE_URL=sqlite:/path/to/production/mymoolah.db

# Set secure JWT secret
JWT_SECRET=your-production-jwt-secret

# Configure logging
LOG_LEVEL=error
```

### 2. Security Hardening
```bash
# Install security dependencies
npm install helmet express-rate-limit

# Configure HTTPS (recommended)
# Set up SSL certificates
# Configure reverse proxy (nginx/Apache)
```

### 3. Process Management
```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start server.js --name mymoolah-api

# Monitor the application
pm2 monit
```

### 4. Monitoring Setup
```bash
# Install monitoring tools
npm install express-status-monitor

# Configure logging
npm install winston
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes using port 5050
pkill -f "node server.js"

# Or use a different port
PORT=5051 npm start
```

#### Database Connection Issues
```bash
# Check database file permissions
ls -la data/mymoolah.db

# Reinitialize database
rm data/mymoolah.db
npm run init-db
```

#### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### JWT Token Issues
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# Or set log level
LOG_LEVEL=debug npm start
```

## 📊 System Verification

### Health Check
```bash
# Verify server is running
curl http://localhost:5050/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-07-12T18:50:55.677Z",
  "service": "MyMoolah Wallet API",
  "version": "1.0.0"
}
```

### API Endpoint Test
```bash
# Test all registered endpoints
curl http://localhost:5050/test

# Expected response includes all 12 core routes
```

### Database Verification
```bash
# Check database tables
sqlite3 data/mymoolah.db ".tables"

# Expected output:
# users wallets transactions kyc support notifications vouchers voucher_types
```

## 🔄 Development Workflow

### 1. Start Development Server
```bash
# Navigate to project directory
cd /Users/andremacbookpro/mymoolah

# Start server
npm start
```

### 2. Make Changes
- Edit files in the project directory
- Server will restart automatically (if using nodemon)
- Test changes immediately

### 3. Test Changes
```bash
# Run tests
npm test

# Test specific functionality
npm run test:auth
npm run test:wallets
```

### 4. Commit Changes
```bash
# Add changes
git add .

# Commit with descriptive message
git commit -m "Add new feature: wallet balance tracking"

# Push to repository
git push origin main
```

## 📚 Additional Resources

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Security Guide](./SECURITY.md)

### External Resources
- [Express.js Documentation](https://expressjs.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [JWT.io](https://jwt.io/) - JWT token debugging
- [Mojaloop Documentation](https://docs.mojaloop.io/)

## 🆘 Support

### Getting Help
1. Check the [troubleshooting section](#-troubleshooting)
2. Review the [API documentation](./API_DOCUMENTATION.md)
3. Check the [project status](./PROJECT_STATUS.md)
4. Open an issue for bugs or feature requests

### System Status
- ✅ **Server**: Running on port 5050
- ✅ **Database**: SQLite operational
- ✅ **Authentication**: JWT system working
- ✅ **Routes**: All 12 core routes registered
- ✅ **Security**: Rate limiting and validation active

---

**MyMoolah Setup Guide v1.0.0** - Complete setup instructions for the MyMoolah Wallet Platform. 

## 🚀 Integrations

### Flash Integration
- Dynamic, OAuth2-based, fully compliant with Flash Partner API v4
- Endpoints: `/api/v1/flash` (health, product listing, purchase, etc.)
- Conditional loading: Only enabled if credentials are present in `.env`

### MobileMart Integration
- Dynamic, OAuth2-based, robust for fast-changing VAS products
- Endpoints: `/api/v1/mobilemart` (health, product listing, purchase, etc.)
- Conditional loading: Only enabled if credentials are present in `.env`

### EasyPay & Mercury
- Temporarily disabled (masked in code, ready for future re-enabling)
- All code and docs preserved for future work

## 🛠️ Environment Variables

Add these to your `.env` file as needed:

```env
# Flash API
FLASH_API_URL=https://api.flashswitch.flash-group.com
FLASH_CONSUMER_KEY=your_flash_consumer_key_here
FLASH_CONSUMER_SECRET=your_flash_consumer_secret_here

# MobileMart API
MOBILEMART_API_URL=https://api.mobilemart.co.za
MOBILEMART_CLIENT_ID=your_mobilemart_client_id_here
MOBILEMART_CLIENT_SECRET=your_mobilemart_client_secret_here
```

## 📝 Troubleshooting
- If you see a warning about missing Flash or MobileMart credentials, those endpoints will be unavailable until you add the required variables and restart the server.
- All other features remain available. 