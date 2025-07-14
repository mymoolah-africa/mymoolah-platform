# MyMoolah Wallet Platform

A comprehensive fintech wallet platform built on Mojaloop software for closed-loop payment solutions.

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm or yarn
- SQLite3 (for local development)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd mymoolah

# Install dependencies
npm install

# Initialize the database
npm run init-db

# Start the server
npm start
```

### Server Status
- **Port**: 5050 (configurable via PORT environment variable)
- **Base URL**: `http://localhost:5050`
- **API Base**: `http://localhost:5050/api/v1`
- **Health Check**: `http://localhost:5050/health`

## 📋 Project Status

### ✅ Completed Features
- **Authentication System**: Complete user registration, login, and JWT token management
- **Wallet Management**: Full wallet CRUD operations with balance tracking
- **Transaction Processing**: Complete transaction lifecycle management
- **Route Registration**: All core routes properly registered and functional
- **Database Integration**: SQLite database with proper schema and migrations
- **API Documentation**: Comprehensive endpoint documentation
- **Error Handling**: Robust error handling and validation
- **Security**: JWT authentication, input validation, and security middleware

### 🔧 Current Implementation

#### Core Routes (All Registered and Functional)
- `/api/v1/auth` - Authentication endpoints
- `/api/v1/wallets` - Wallet management
- `/api/v1/transactions` - Transaction processing
- `/api/v1/users` - User management
- `/api/v1/kyc` - KYC processing
- `/api/v1/support` - Support ticket system
- `/api/v1/notifications` - Notification system
- `/api/v1/vouchers` - Voucher management
- `/api/v1/voucher-types` - Voucher type management
- `/api/v1/vas` - Value Added Services
- `/api/v1/merchants` - Merchant management
- `/api/v1/service-providers` - Service provider management

#### System Health
- ✅ Server starts successfully
- ✅ All routes properly registered
- ✅ Database connectivity established
- ✅ Authentication system operational
- ✅ Wallet operations functional
- ✅ Transaction processing active

### 🚫 Temporarily Disabled
The following routes have been commented out due to integration issues:
- EasyPay routes (`/billpayment/v1`)
- Mercury routes (`/api/v1/mercury`)
- EasyPay Voucher routes (`/api/v1/easypay-vouchers`)

These can be re-enabled once integration issues are resolved.

## 🚀 Integrations

### Flash Integration
- Dynamic, OAuth2-based, fully compliant with Flash Partner API v4
- Endpoints: `/api/v1/flash` (health, product listing, purchase, etc.)
- Conditional loading: Only enabled if credentials are present in `.env`
- See [FLASH_INTEGRATION.md](./docs/FLASH_INTEGRATION.md)

### MobileMart Integration
- Dynamic, OAuth2-based, robust for fast-changing VAS products
- Endpoints: `/api/v1/mobilemart` (health, product listing, purchase, etc.)
- Conditional loading: Only enabled if credentials are present in `.env`
- See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) and [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)

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

## 🏗️ Architecture

### Backend Structure
```
mymoolah/
├── controllers/     # Business logic controllers
├── models/         # Database models and schemas
├── routes/         # API route definitions
├── middleware/     # Custom middleware
├── services/       # External service integrations
├── docs/          # Comprehensive documentation
└── scripts/       # Utility scripts
```

### Database Schema
- **Users**: User accounts and authentication
- **Wallets**: Digital wallet management
- **Transactions**: Payment transaction records
- **KYC**: Know Your Customer data
- **Support**: Customer support tickets
- **Notifications**: System notifications
- **Vouchers**: Digital voucher system

## 🔐 Security Features

- JWT-based authentication
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Secure password hashing
- Environment variable management

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/profile` - Get user profile

### Wallet Endpoints
- `GET /api/v1/wallets/:id` - Get wallet details
- `POST /api/v1/wallets` - Create new wallet
- `PUT /api/v1/wallets/:id/credit` - Credit wallet
- `PUT /api/v1/wallets/:id/debit` - Debit wallet
- `GET /api/v1/wallets/:id/balance` - Get wallet balance

### Transaction Endpoints
- `GET /api/v1/transactions` - List transactions
- `POST /api/v1/transactions` - Create transaction
- `GET /api/v1/transactions/:id` - Get transaction details
- `PUT /api/v1/transactions/:id/status` - Update transaction status

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:auth
npm run test:wallets
npm run test:transactions

# Run with coverage
npm run test:coverage
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:5050/health

# Test authentication
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚀 Deployment

### Environment Variables
```bash
# Required environment variables
PORT=5050
JWT_SECRET=your-jwt-secret
DATABASE_URL=sqlite:./data/mymoolah.db
NODE_ENV=production
```

### Production Deployment
1. Set up environment variables
2. Initialize database: `npm run init-db`
3. Start server: `npm start`
4. Configure reverse proxy (nginx/Apache)
5. Set up SSL certificates
6. Configure monitoring and logging

## 📖 Documentation

Comprehensive documentation is available in the `docs/` directory:

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Flash Integration](./docs/FLASH_INTEGRATION.md)
- [Setup Guide](./docs/SETUP_GUIDE.md)
- [Development Guide](./docs/DEVELOPMENT_GUIDE.md)
- [Testing Guide](./docs/TESTING_GUIDE.md)
- [Security Guide](./docs/SECURITY.md)
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [Project Status](./docs/PROJECT_STATUS.md)

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](./docs/)
- Review [API documentation](./docs/API_DOCUMENTATION.md)
- Open an issue for bugs or feature requests

## 🔄 Recent Updates (July 2025)
- ✅ Flash and MobileMart integrations: dynamic, robust, production-ready
- ✅ All endpoints and docs updated
- ✅ EasyPay and Mercury integrations masked, ready for future
- ✅ All documentation and troubleshooting up to date

## 📊 System Metrics

- **API Endpoints**: 12 core routes registered
- **Database Tables**: 8 tables created
- **Test Coverage**: Comprehensive test suite
- **Security**: JWT authentication + input validation
- **Performance**: Optimized for production deployment

---

**MyMoolah Wallet Platform** - Building the future of digital payments with Mojaloop technology. 