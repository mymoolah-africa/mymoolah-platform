# MyMoolah Development Guide

**Version**: 1.0.0  
**Last Updated**: July 12, 2025  
**Project Status**: Production Ready

## 🎯 Overview

This guide provides comprehensive development guidelines for the MyMoolah Wallet Platform. The system is built on Node.js with Express.js, using SQLite for data persistence and JWT for authentication.

## 🏗️ Architecture Overview

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt, express-validator, CORS
- **Testing**: Jest, Supertest
- **Documentation**: Markdown + OpenAPI

### Project Structure
```
mymoolah/
├── controllers/     # Business logic controllers
├── models/         # Database models and schemas
├── routes/         # API route definitions
├── middleware/     # Custom middleware (auth, validation)
├── services/       # External service integrations
├── docs/          # Comprehensive documentation
├── scripts/       # Utility scripts
├── data/          # SQLite database files
├── server.js      # Main application entry point
├── package.json   # Dependencies and scripts
└── README.md      # Project overview
```

## 🔧 Development Environment Setup

### Prerequisites
```bash
# Required Node.js version
node --version  # Should be v18.0.0 or higher

# Required npm version
npm --version   # Should be v8.0.0 or higher
```

### Local Development Setup
```bash
# Navigate to project directory
cd /Users/andremacbookpro/mymoolah

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run init-db

# Start development server
npm start
```

### Environment Variables
```bash
# Required for development
PORT=5050
NODE_ENV=development
JWT_SECRET=your-development-jwt-secret
DATABASE_URL=sqlite:./data/mymoolah.db

# Optional
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000
```

## 📁 Code Organization

### Controllers (`/controllers`)
Controllers handle business logic and HTTP request/response processing.

#### Controller Structure
```javascript
// Example: authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

class AuthController {
  async register(req, res) {
    try {
      // Business logic here
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new AuthController();
```

#### Controller Guidelines
- Use async/await for database operations
- Implement proper error handling
- Return consistent response format
- Validate input data
- Use appropriate HTTP status codes

### Models (`/models`)
Models define database schema and provide data access methods.

#### Model Structure
```javascript
// Example: User.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

class User {
  static async create(userData) {
    // Database operation
  }

  static async findByEmail(email) {
    // Database query
  }

  static async update(id, data) {
    // Update operation
  }
}

module.exports = User;
```

#### Model Guidelines
- Use static methods for database operations
- Implement proper error handling
- Use parameterized queries to prevent SQL injection
- Include data validation
- Follow consistent naming conventions

### Routes (`/routes`)
Routes define API endpoints and connect them to controllers.

#### Route Structure
```javascript
// Example: auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');

// GET /api/v1/auth/profile
router.get('/profile', authMiddleware, authController.getProfile);

// POST /api/v1/auth/register
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], authController.register);

module.exports = router;
```

#### Route Guidelines
- Use descriptive route names
- Implement input validation
- Apply appropriate middleware
- Group related endpoints
- Use RESTful conventions

### Middleware (`/middleware`)
Middleware provides cross-cutting concerns like authentication and validation.

#### Middleware Structure
```javascript
// Example: auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
```

## 🔐 Authentication & Security

### JWT Implementation
```javascript
// Token generation
const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Token verification
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### Password Security
```javascript
// Password hashing
const hashedPassword = await bcrypt.hash(password, 10);

// Password verification
const isValid = await bcrypt.compare(password, hashedPassword);
```

### Input Validation
```javascript
// Using express-validator
const { body, validationResult } = require('express-validator');

const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim()
];
```

## 🗄️ Database Development

### SQLite Schema
```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  phoneNumber TEXT,
  status TEXT DEFAULT 'active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wallets table
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  userId INTEGER NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Database Operations
```javascript
// Example database operation
const db = new sqlite3.Database('./data/mymoolah.db');

const createUser = (userData) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO users (email, password, firstName, lastName)
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [userData.email, userData.password, userData.firstName, userData.lastName], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
};
```

## 🧪 Testing Strategy

### Unit Testing
```javascript
// Example test: test-auth.js
const request = require('supertest');
const app = require('../server');

describe('Authentication Endpoints', () => {
  test('POST /api/v1/auth/register - should register new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Integration Testing
```javascript
// Example integration test
describe('Wallet Operations', () => {
  let authToken;
  let walletId;

  beforeAll(async () => {
    // Setup: Create user and get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    authToken = loginResponse.body.data.token;
  });

  test('Complete wallet workflow', async () => {
    // Create wallet
    const createResponse = await request(app)
      .post('/api/v1/wallets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ currency: 'USD' });
    
    walletId = createResponse.body.data.id;
    expect(createResponse.status).toBe(200);

    // Credit wallet
    const creditResponse = await request(app)
      .put(`/api/v1/wallets/${walletId}/credit`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 100.00 });
    
    expect(creditResponse.status).toBe(200);
    expect(creditResponse.body.data.newBalance).toBe(100.00);
  });
});
```

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

# Run tests in watch mode
npm run test:watch
```

## 🔄 API Development

### Adding New Endpoints

#### 1. Create Controller Method
```javascript
// controllers/userController.js
async getUsers(req, res) {
  try {
    const users = await User.findAll();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

#### 2. Create Route
```javascript
// routes/users.js
router.get('/', authMiddleware, userController.getUsers);
```

#### 3. Register Route in Server
```javascript
// server.js
const userRoutes = require('./routes/users.js');
app.use('/api/v1/users', userRoutes);
```

#### 4. Add Documentation
```markdown
### Get All Users
**GET** `/api/v1/users`

Get list of all users.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...]
  }
}
```
```

### API Response Standards
```javascript
// Success response
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}

// Error response
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## 🚀 Deployment Guidelines

### Development Deployment
```bash
# Start development server
npm start

# Or with nodemon for auto-restart
npm run dev
```

### Production Deployment
```bash
# Set production environment
NODE_ENV=production

# Install production dependencies
npm install --production

# Start with PM2
pm2 start server.js --name mymoolah-api

# Monitor application
pm2 monit
```

### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
PORT=5050
JWT_SECRET=your-production-secret
DATABASE_URL=sqlite:/path/to/production/mymoolah.db
LOG_LEVEL=error
```

## 🔧 Debugging & Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Kill processes on port 5050
pkill -f "node server.js"

# Or use different port
PORT=5051 npm start
```

#### 2. Database Connection Issues
```bash
# Check database file
ls -la data/mymoolah.db

# Reinitialize database
rm data/mymoolah.db
npm run init-db
```

#### 3. JWT Token Issues
```bash
# Verify JWT secret
echo $JWT_SECRET

# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# Set log level
LOG_LEVEL=debug npm start
```

## 📊 Performance Optimization

### Database Optimization
```javascript
// Use prepared statements
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
stmt.get(userId);

// Use transactions for multiple operations
db.serialize(() => {
  db.run('BEGIN TRANSACTION');
  // Multiple operations
  db.run('COMMIT');
});
```

### Caching Strategy
```javascript
// Simple in-memory cache
const cache = new Map();

const getCachedData = (key) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  // Fetch from database and cache
};
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});

app.use('/api/v1/auth', authLimiter);
```

## 🔒 Security Best Practices

### Input Validation
```javascript
// Always validate input
const { body, validationResult } = require('express-validator');

const validateInput = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### SQL Injection Prevention
```javascript
// Use parameterized queries
const query = 'SELECT * FROM users WHERE email = ?';
db.get(query, [email], (err, row) => {
  // Handle result
});
```

### XSS Prevention
```javascript
// Sanitize output
const sanitizeHtml = require('sanitize-html');

const cleanData = sanitizeHtml(userInput, {
  allowedTags: [],
  allowedAttributes: {}
});
```

## 📚 Code Style Guidelines

### Naming Conventions
- **Files**: camelCase (e.g., `userController.js`)
- **Classes**: PascalCase (e.g., `UserController`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Database tables**: snake_case (e.g., `user_profiles`)

### Code Organization
```javascript
// File structure
const express = require('express');
const router = express.Router();

// Import dependencies
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Route definitions
router.post('/register', authController.register);
router.post('/login', authController.login);

// Export
module.exports = router;
```

### Error Handling
```javascript
// Consistent error handling
const handleError = (res, error, statusCode = 500) => {
  console.error('Error:', error);
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};
```

## 🔄 Version Control

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-wallet-feature

# Make changes and commit
git add .
git commit -m "Add new wallet balance tracking feature"

# Push to remote
git push origin feature/new-wallet-feature

# Create pull request
# Merge after review
```

### Commit Message Convention
```
type(scope): description

Examples:
feat(auth): add JWT token refresh endpoint
fix(wallet): resolve balance calculation bug
docs(api): update authentication documentation
test(transactions): add integration tests
```

## 📖 Documentation Standards

### Code Documentation
```javascript
/**
 * Create a new wallet for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with wallet details
 */
async createWallet(req, res) {
  // Implementation
}
```

### API Documentation
```markdown
### Create Wallet
**POST** `/api/v1/wallets`

Create a new wallet for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currency": "USD",
  "initialBalance": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet created successfully",
  "data": {
    "id": "WAL123456",
    "balance": 0,
    "currency": "USD"
  }
}
```
```

## 🎯 Development Checklist

### Before Starting
- [ ] Read the [API Documentation](./API_DOCUMENTATION.md)
- [ ] Review the [Project Status](./PROJECT_STATUS.md)
- [ ] Set up development environment
- [ ] Initialize database
- [ ] Run existing tests

### During Development
- [ ] Follow coding standards
- [ ] Write tests for new features
- [ ] Update documentation
- [ ] Test API endpoints
- [ ] Check error handling

### Before Committing
- [ ] Run all tests
- [ ] Check code formatting
- [ ] Update documentation
- [ ] Test API functionality
- [ ] Review changes

### Before Deploying
- [ ] Run production tests
- [ ] Check security measures
- [ ] Verify environment variables
- [ ] Test database migrations
- [ ] Monitor application logs

## 🆘 Getting Help

### Resources
- [API Documentation](./API_DOCUMENTATION.md)
- [Setup Guide](./SETUP_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Security Guide](./SECURITY.md)

### Support Channels
1. Check the troubleshooting section
2. Review error logs
3. Test with curl commands
4. Open an issue for bugs

---

**MyMoolah Development Guide v1.0.0** - Comprehensive development guidelines for the MyMoolah Wallet Platform. 