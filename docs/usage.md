# MyMoolah Platform Usage Guide

## Overview
MyMoolah is a South African fintech wallet platform built on Mojaloop open-source software, focusing on compliance, security, and best practices.

## Current System Status

### Authentication System (Fully Functional)
- **Status**: ✅ Complete and tested
- **Database**: PostgreSQL (Cloud SQL)
- **Features**: User registration, login, JWT authentication
- **Endpoints**: `/api/v1/auth/register`, `/api/v1/auth/login`

### Environment Setup
- **Local Development**: Node.js backend with PostgreSQL via Cloud SQL proxy
- **Cloud Development**: GitHub Codespaces with PostgreSQL
- **Testing Environment**: Docker sandbox with Mojaloop Testing Toolkit

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "createdAt": "2025-01-XX"
  }
}
```

#### Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

## Running the Application

### Local Development
```bash
# Navigate to project directory
cd /path/to/mymoolah

# Install dependencies
npm install

# Start the server
npm start

# Server runs on http://localhost:3000
```

### Testing Authentication
```bash
# Test server connectivity
node test-server.js

# Test authentication endpoints
node test-auth.js

# Test database connectivity
node scripts/api-smoke-test.js
```

### Cloud Development (Codespaces)
```bash
# Server runs on port 3000
# Access via Codespaces URL
```

## Database Management

### PostgreSQL Database
- **Location**: Google Cloud SQL instance `mmtp-pg`
- **Connectivity (local)**: Cloud SQL Auth Proxy on `127.0.0.1:5433`
- **Runtime**: App connects via `DATABASE_URL`

## Security Features

### Password Security
- Passwords hashed using bcryptjs
- Salt rounds: 10
- Secure password validation

### JWT Authentication
- Token-based authentication
- Configurable expiration
- Secure token generation

### Protected Routes
- Middleware-based protection
- Token validation
- User context injection

## Testing

### Automated Tests
- Server connectivity tests
- Authentication endpoint tests
- Database connectivity tests

### Manual Testing
- Postman or curl for API testing
- Browser for UI testing (when available)

## Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

#### Database Issues
```bash
# Check proxy is running on 127.0.0.1:5433
lsof -i :5433 | cat

# Verify connection string
node -e "require('dotenv').config();const{Client}=require('pg');(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:false});await c.connect();console.log('ok');await c.end();})()"
```

#### Authentication Errors
- Verify request format
- Check email/password combination
- Ensure all required fields are provided

## Next Steps

### Planned Features
1. **Wallet Management**: Create, view, and manage wallets
2. **Transaction Processing**: Send and receive money
3. **Balance Tracking**: Real-time balance updates
4. **Transaction History**: Detailed transaction logs
5. **Security Features**: 2FA, biometric authentication

### Development Priorities
1. Complete wallet creation functionality
2. Implement transaction processing
3. Add balance management
4. Integrate with Mojaloop for inter-bank transfers

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in the console
3. Verify environment setup
4. Test with provided test scripts 