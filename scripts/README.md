# MyMoolah Scripts Directory

This directory contains utility scripts for managing and testing the MyMoolah platform.

## Available Scripts

### cleanup-kyc.js
**Purpose**: Clean up KYC data for testing and demo purposes

**Description**: 
This script removes all KYC records for a specified user and resets their KYC status to 'not_started', allowing them to test the KYC upload process from scratch.

**Usage**:
```bash
# Clean up KYC data for a specific user
node scripts/cleanup-kyc.js [USER_ID]

# Show help and list available users
node scripts/cleanup-kyc.js
```

**Examples**:
```bash
# Clean up KYC data for user ID 7
node scripts/cleanup-kyc.js 7

# Show usage and list all users
node scripts/cleanup-kyc.js
```

**Features**:
- ✅ Validates user exists before deletion
- ✅ Shows user details before cleanup
- ✅ Requires confirmation for deletion
- ✅ Provides detailed feedback on operations
- ✅ Validates database file exists
- ✅ Color-coded output for better readability
- ✅ Comprehensive error handling
- ✅ Verification of cleanup results
- ✅ Uses Node.js for better integration with the project

**Safety Features**:
- Confirms user ID exists before deletion
- Shows user details before cleanup
- Requires confirmation for deletion
- Provides detailed feedback on operations
- Validates database file exists

**Requirements**:
- Node.js must be installed
- sqlite3 npm package must be installed (`npm install sqlite3`)
- Database file must exist at `data/mymoolah.db`
- Script must be run from the project root directory

**What it does**:
1. Validates the user ID exists in the database
2. Shows current user details and KYC status
3. Displays how many KYC records will be deleted
4. Asks for confirmation before proceeding
5. Deletes all KYC records for the specified user
6. Resets the user's KYC status to 'not_started'
7. Verifies the cleanup was successful
8. Provides a summary of what the user can now do

**Output Example**:
```
=============================================================================
KYC Data Cleanup for User ID 7
=============================================================================

User Details:
=============
ID: 7
Name: Andre Botes
Current KYC Status: verified
KYC Records to Delete: 2

Do you want to proceed with KYC data cleanup? (y/N): y

[INFO] Starting KYC data cleanup...
[INFO] Successfully deleted 2 KYC records.
[INFO] Successfully reset KYC status to 'not_started'.

[INFO] Verifying cleanup...

Cleanup Results:
================
Remaining KYC Records: 0
New KYC Status: not_started

[INFO] ✅ KYC cleanup completed successfully!

User Andre Botes (ID: 7) can now:
- Access the KYC upload page again
- Upload new identity documents
- Go through the complete KYC process from scratch
```

## Running Scripts

All scripts should be run from the project root directory:

```bash
cd /path/to/mymoolah
node scripts/cleanup-kyc.js [options]
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

## File Structure

```
scripts/
├── README.md           # This documentation file
├── cleanup-kyc.js     # KYC data cleanup script (Node.js)
└── [future scripts]   # Additional utility scripts
```

## Troubleshooting

**Common Issues**:

1. **sqlite3 module not found**: Install the sqlite3 package
   ```bash
   npm install sqlite3
   ```

2. **Database Not Found**: Ensure you're running from the project root
   ```bash
   pwd  # Should show /path/to/mymoolah
   ls data/mymoolah.db  # Should exist
   ```

3. **Node.js Not Found**: Install Node.js
   ```bash
   # macOS
   brew install node
   
   # Ubuntu/Debian
   sudo apt-get install nodejs npm
   ```

4. **User Not Found**: Check available users
   ```bash
   node scripts/cleanup-kyc.js  # Lists all users
   ```

5. **Permission Denied**: Make sure the script is executable (if needed)
   ```bash
   chmod +x scripts/cleanup-kyc.js
   ```

## Installation

Before using the scripts, ensure you have the required dependencies:

```bash
# Install sqlite3 package if not already installed
npm install sqlite3
```

## Contributing

When adding new scripts:

1. Follow the existing documentation format
2. Include comprehensive error handling
3. Add appropriate tests
4. Update this README with new script details
5. Use Node.js for better project integration
6. Ensure scripts are properly documented

---

**Last Updated**: 2024
**Version**: 2.0.0 