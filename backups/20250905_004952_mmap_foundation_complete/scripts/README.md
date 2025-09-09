# MyMoolah Scripts Directory

This directory contains utility scripts for managing and maintaining the MyMoolah platform.

## Available Scripts

### `cleanup-kyc.js` (DEPRECATED - SQLite only)

**Status**: ❌ **REMOVED** - This script was SQLite-specific and has been removed as we now use PostgreSQL exclusively.

**Previous Purpose**: Cleaned up KYC data for users in the SQLite database.

**Replacement**: Use direct database queries or API endpoints for PostgreSQL operations.

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