# MyMoolah Scripts Directory

This directory contains utility scripts for managing and maintaining the MyMoolah platform.

## Available Scripts

### User Lookup Scripts

#### `lookup-user.js` ⭐ **RECOMMENDED**

**Purpose**: Comprehensive user lookup by phone number, name, or user ID.

**Usage**:
```bash
node scripts/lookup-user.js` <phone|name|userId>
```

**Examples**:
```bash
node scripts/lookup-user.js 0686772469
node scripts/lookup-user.js "Denise Botes"
node scripts/lookup-user.js 8
```

**Status**: ✅ **ACTIVE** - Main user lookup script

---

### KYC Status Scripts

#### `check-kyc-status.js` ⭐ **RECOMMENDED**

**Purpose**: Comprehensive KYC status check showing user KYC status, wallet verification, and KYC records.

**Usage**:
```bash
node scripts/check-kyc-status.js <identifier>
```

**Examples**:
```bash
node scripts/check-kyc-status.js 0686772469
node scripts/check-kyc-status.js "Denise Botes"
node scripts/check-kyc-status.js 8
```

**Status**: ✅ **ACTIVE** - Main KYC status check script

---

### Password Management Scripts

#### `change-user-password.js`

**Purpose**: Change user password by phone number, name, or user ID.

**Usage**:
```bash
node scripts/change-user-password.js <identifier> <newPassword>
```

**Examples**:
```bash
node scripts/change-user-password.js 0686772469 "NewPassword123!"
node scripts/change-user-password.js "Denise Botes" "NewPassword123!"
node scripts/change-user-password.js 8 "NewPassword123!"
```

**Status**: ✅ **ACTIVE**

---

#### `verify-password.js`

**Purpose**: Verify if a password matches the stored hash.

**Usage**:
```bash
node scripts/verify-password.js <identifier> <password>
```

**Status**: ✅ **ACTIVE**

---

### KYC Reset Scripts

#### `reset-kyc-via-api.sh` ⭐ **RECOMMENDED**

**Purpose**: Reset KYC status for a user via API endpoint (uses existing backend database connection).

**Usage**:
```bash
# Reset KYC for user ID 1 (default)
./scripts/reset-kyc-via-api.sh

# Or use curl directly
curl -X POST http://localhost:3001/api/v1/kyc/reset/1 \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json"
```

**What it does**:
- Deletes all KYC records for the specified user
- Resets wallet KYC verification to `false`
- Resets user KYC status to `not_started`

**Requirements**:
- Backend server must be running
- `ADMIN_API_KEY` environment variable set (or any value if not set)

**Example Output**:
```json
{"success":true,"message":"KYC reset completed","data":{"userId":1,"deleted":0}}
```

**Status**: ✅ **ACTIVE** - Recommended method for resetting KYC in Codespaces

---

### Start Scripts

#### `one-click-restart-and-start.sh` ⭐ **RECOMMENDED**

**Purpose**: One-command script to restart proxy and backend in Codespaces.

**Usage**:
```bash
./scripts/one-click-restart-and-start.sh
```

**What it does**:
- Stops existing proxy and backend processes
- Starts Cloud SQL Auth Proxy
- Starts Redis (Docker or local)
- Starts backend server

**Status**: ✅ **ACTIVE** - Main entry point for Codespaces

---

#### `start-codespace-with-proxy.sh`

**Purpose**: Comprehensive startup script with proxy, Redis, and backend.

**Usage**:
```bash
./scripts/start-codespace-with-proxy.sh
```

**Status**: ✅ **ACTIVE** - Used by one-click-restart-and-start.sh

---

### MobileMart Test Scripts

#### `test-mobilemart-uat-complete.js` ⭐ **RECOMMENDED**

**Purpose**: Comprehensive MobileMart UAT testing script.

**Status**: ✅ **ACTIVE**

---

#### `test-mobilemart-uat-credentials.js`

**Purpose**: Test MobileMart UAT credentials.

**Status**: ✅ **ACTIVE**

---

## Running Scripts

All scripts should be run from the project root directory:

```bash
cd /path/to/mymoolah
node scripts/[script-name].js [options]
```

## Script Development Guidelines

When adding new scripts to this directory:

1. **Documentation**: Include comprehensive header documentation
2. **Error Handling**: Implement proper error checking and validation
3. **User Feedback**: Provide clear, colored output for better UX
4. **Safety**: Include confirmation prompts for destructive operations
5. **Validation**: Check prerequisites and validate inputs
6. **Testing**: Test scripts thoroughly before committing
7. **Node.js**: Use Node.js for better integration with the project
8. **Database**: Use PostgreSQL via Sequelize models, not direct SQLite

## File Structure

```
scripts/
├── README.md           # This documentation file
├── lookup-user.js      # User lookup utility
├── check-kyc-status.js # KYC status check utility
├── change-user-password.js # Password change utility
├── verify-password.js  # Password verification utility
├── reset-kyc-via-api.sh # KYC reset via API
├── one-click-restart-and-start.sh # Main startup script
├── start-codespace-with-proxy.sh # Comprehensive startup script
├── seed-*.js          # Database seeding scripts
└── test-*.js          # Test scripts
```

## Troubleshooting

**Common Issues**:

1. **Database Connection**: Ensure PostgreSQL is running and accessible
   ```bash
   # Check if Cloud SQL Proxy is running
   lsof -i :6543
   ```

2. **Environment Variables**: Ensure .env file is properly configured
   ```bash
   # Check DATABASE_URL in .env
   grep DATABASE_URL .env
   ```

3. **Node.js Not Found**: Install Node.js
   ```bash
   node --version
   ```

4. **Dependencies**: Install required packages
   ```bash
   npm install
   ```

## Database Operations

For PostgreSQL operations, use the Sequelize models:

```javascript
const { sequelize, User, Wallet } = require('../models');

// Example: Get user by ID
const user = await User.findByPk(1);
console.log(user.toJSON());
```

## Migration from SQLite

All SQLite-specific scripts have been removed. The platform now uses PostgreSQL exclusively:

- **Database**: PostgreSQL (Google Cloud SQL)
- **Connection**: Via Cloud SQL Proxy on localhost:6543
- **Models**: Sequelize ORM with PostgreSQL dialect
- **Scripts**: Use Sequelize models instead of direct SQLite queries
