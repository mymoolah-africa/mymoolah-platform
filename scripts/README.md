# MyMoolah Scripts Directory

This directory contains utility scripts for managing and maintaining the MyMoolah platform.

## Available Scripts

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

#### `reset-kyc-user1.js`

**Purpose**: Reset KYC status for user ID 1 using direct database connection.

**Usage**:
```bash
node scripts/reset-kyc-user1.js
```

**What it does**:
- Connects to database using existing models setup
- Deletes all KYC records for user ID 1
- Resets wallet KYC verification
- Resets user KYC status to `not_started`

**Requirements**:
- Database connection configured in `.env`
- Cloud SQL Auth Proxy running (if in Codespaces)

**Status**: ⚠️ **MAY HANG** - Use `reset-kyc-via-api.sh` instead if connection issues occur

---

#### `reset-my-kyc.js`

**Purpose**: Reset KYC status for user ID 1 with phone number verification (local development).

**Usage**:
```bash
node scripts/reset-my-kyc.js
```

**What it does**:
- Verifies user exists and phone number matches
- Deletes all KYC records
- Resets wallet and user KYC status

**Requirements**:
- Local database connection
- Phone number verification (safety check)

**Status**: ⚠️ **LOCAL ONLY** - Requires local database connection

---

#### `reset-kyc-codespaces.js`

**Purpose**: Reset KYC status using Codespaces-compatible database connection.

**Usage**:
```bash
node scripts/reset-kyc-codespaces.js
```

**Status**: ⚠️ **ALTERNATIVE** - Use `reset-kyc-via-api.sh` instead

---

### `cleanup-kyc.js` (DEPRECATED - SQLite only)

**Status**: ❌ **REMOVED** - This script was SQLite-specific and has been removed as we now use PostgreSQL exclusively.

**Previous Purpose**: Cleaned up KYC data for users in the SQLite database.

**Replacement**: Use `reset-kyc-via-api.sh` for PostgreSQL operations.

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
├── seed-*.js          # Database seeding scripts
├── git-sync-local.sh  # Git synchronization script
└── [future scripts]   # Additional utility scripts
```

## Troubleshooting

**Common Issues**:

1. **Database Connection**: Ensure PostgreSQL is running and accessible
   ```bash
   # Check if Cloud SQL Proxy is running
   lsof -i :5433
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
- **Connection**: Via Cloud SQL Proxy on localhost:5433
- **Models**: Sequelize ORM with PostgreSQL dialect
- **Scripts**: Use Sequelize models instead of direct SQLite queries 