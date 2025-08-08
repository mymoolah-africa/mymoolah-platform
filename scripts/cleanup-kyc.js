#!/usr/bin/env node

/**
 * MyMoolah KYC Data Cleanup Script
 * ===================================
 * 
 * Purpose: Clean up KYC data for testing and demo purposes
 * 
 * This script removes all KYC records for a specified user and resets their
 * KYC status to 'not_started', allowing them to test the KYC upload process
 * from scratch.
 *
 * Usage:
 *   node scripts/cleanup-kyc.js [USER_ID]
 *
 * Examples:
 *   node scripts/cleanup-kyc.js 7          # Clean up KYC data for user ID 7
 *   node scripts/cleanup-kyc.js             # Show usage and available users
 *
 * Requirements:
 *   - Node.js must be installed
 *   - Database file must exist at data/mymoolah.db
 *   - Script must be run from the project root directory
 *
 * Safety Features:
 *   - Confirms user ID exists before deletion
 *   - Shows user details before cleanup
 *   - Requires confirmation for deletion
 *   - Provides detailed feedback on operations
 *   - Validates database file exists
 *
 * Author: MyMoolah Development Team
 * Created: 2024
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Database file path
const DB_FILE = path.join(__dirname, '..', 'data', 'mymoolah.db');

// SQLite3 module (you may need to install it: npm install sqlite3)
let sqlite3;
try {
    sqlite3 = require('sqlite3').verbose();
} catch (error) {
    console.error(`${colors.red}[ERROR]${colors.reset} sqlite3 module not found.`);
    console.error('Please install it with: npm install sqlite3');
    process.exit(1);
}

// Function to print colored output
function printStatus(message) {
    console.log(`${colors.green}[INFO]${colors.reset} ${message}`);
}

function printWarning(message) {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function printError(message) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function printHeader(title) {
    console.log(`${colors.blue}=============================================================================${colors.reset}`);
    console.log(`${colors.blue}${title}${colors.reset}`);
    console.log(`${colors.blue}=============================================================================${colors.reset}`);
}

// Function to check if database file exists
function checkDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        printError(`Database file not found at: ${DB_FILE}`);
        printError('Please run this script from the project root directory.');
        process.exit(1);
    }
}

// Function to show usage
function showUsage() {
    printHeader('MyMoolah KYC Data Cleanup Script');
    console.log('');
    console.log('Usage: node scripts/cleanup-kyc.js [USER_ID]');
    console.log('');
    console.log('Options:');
    console.log('  USER_ID    The ID of the user whose KYC data should be cleaned up');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/cleanup-kyc.js 7          # Clean up KYC data for user ID 7');
    console.log('  node scripts/cleanup-kyc.js             # Show this help and list available users');
    console.log('');
    console.log('Safety Features:');
    console.log('  - Confirms user exists before deletion');
    console.log('  - Shows user details before cleanup');
    console.log('  - Requires confirmation for deletion');
    console.log('  - Provides detailed feedback on operations');
    console.log('');
}

// Function to create database connection
function createDbConnection() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_FILE, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(db);
            }
        });
    });
}

// Function to run database query
function runQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Function to run database update
function runUpdate(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

// Function to list available users
async function listUsers() {
    try {
        const db = await createDbConnection();
        
        printHeader('Available Users');
        console.log('');
        console.log('Users with KYC data:');
        console.log('===================');
        
        // Get users with KYC data
        const usersWithKyc = await runQuery(db, `
            SELECT DISTINCT u.id, u.firstName, u.lastName, u.kycStatus, COUNT(k.id) as kyc_records 
            FROM users u 
            LEFT JOIN kyc k ON u.id = k.userId 
            WHERE k.id IS NOT NULL 
            GROUP BY u.id 
            ORDER BY u.id
        `);
        
        if (usersWithKyc.length === 0) {
            console.log('No users with KYC data found.');
        } else {
            usersWithKyc.forEach(user => {
                console.log(`ID: ${user.id} | Name: ${user.firstName} ${user.lastName} | KYC Status: ${user.kycStatus} | Records: ${user.kyc_records}`);
            });
        }
        
        console.log('');
        console.log('All users:');
        console.log('==========');
        
        const allUsers = await runQuery(db, 'SELECT id, firstName, lastName, kycStatus FROM users ORDER BY id');
        allUsers.forEach(user => {
            console.log(`ID: ${user.id} | Name: ${user.firstName} ${user.lastName} | KYC Status: ${user.kycStatus}`);
        });
        
        db.close();
    } catch (error) {
        printError(`Failed to list users: ${error.message}`);
        process.exit(1);
    }
}

// Function to validate user ID
async function validateUser(userId) {
    try {
        const db = await createDbConnection();
        const users = await runQuery(db, 'SELECT COUNT(*) as count FROM users WHERE id = ?', [userId]);
        db.close();
        
        if (users[0].count === 0) {
            printError(`User ID ${userId} does not exist in the database.`);
            return false;
        }
        
        return true;
    } catch (error) {
        printError(`Failed to validate user: ${error.message}`);
        return false;
    }
}

// Function to get user details
async function getUserDetails(userId) {
    try {
        const db = await createDbConnection();
        const users = await runQuery(db, 'SELECT id, firstName, lastName, kycStatus FROM users WHERE id = ?', [userId]);
        db.close();
        
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        printError(`Failed to get user details: ${error.message}`);
        return null;
    }
}

// Function to get KYC record count
async function getKycCount(userId) {
    try {
        const db = await createDbConnection();
        const result = await runQuery(db, 'SELECT COUNT(*) as count FROM kyc WHERE userId = ?', [userId]);
        db.close();
        
        return result[0].count;
    } catch (error) {
        printError(`Failed to get KYC count: ${error.message}`);
        return 0;
    }
}

// Function to ask for confirmation
function askForConfirmation(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

// Function to cleanup KYC data
async function cleanupKyc(userId) {
    try {
        printHeader(`KYC Data Cleanup for User ID ${userId}`);
        
        // Get user details
        const userDetails = await getUserDetails(userId);
        if (!userDetails) {
            printError(`Could not retrieve user details for ID ${userId}`);
            return false;
        }
        
        // Get KYC record count
        const kycCount = await getKycCount(userId);
        
        console.log('');
        console.log('User Details:');
        console.log('=============');
        console.log(`ID: ${userDetails.id}`);
        console.log(`Name: ${userDetails.firstName} ${userDetails.lastName}`);
        console.log(`Current KYC Status: ${userDetails.kycStatus}`);
        console.log(`KYC Records to Delete: ${kycCount}`);
        console.log('');
        
        // Confirm deletion
        const confirmed = await askForConfirmation('Do you want to proceed with KYC data cleanup? (y/N): ');
        
        if (!confirmed) {
            printWarning('Cleanup cancelled by user.');
            return true;
        }
        
        console.log('');
        printStatus('Starting KYC data cleanup...');
        
        const db = await createDbConnection();
        
        // Delete KYC records
        const deletedRecords = await runUpdate(db, 'DELETE FROM kyc WHERE userId = ?', [userId]);
        
        if (deletedRecords === kycCount) {
            printStatus(`Successfully deleted ${deletedRecords} KYC records.`);
        } else {
            printWarning(`Deleted ${deletedRecords} records (expected ${kycCount}).`);
        }
        
        // Reset user KYC status
        const statusUpdated = await runUpdate(db, 'UPDATE users SET kycStatus = ? WHERE id = ?', ['not_started', userId]);
        
        if (statusUpdated === 1) {
            printStatus('Successfully reset KYC status to \'not_started\'.');
        } else {
            printError('Failed to reset KYC status.');
            db.close();
            return false;
        }
        
        db.close();
        
        // Verify cleanup
        console.log('');
        printStatus('Verifying cleanup...');
        
        const remainingRecords = await getKycCount(userId);
        const newUserDetails = await getUserDetails(userId);
        
        console.log('');
        console.log('Cleanup Results:');
        console.log('================');
        console.log(`Remaining KYC Records: ${remainingRecords}`);
        console.log(`New KYC Status: ${newUserDetails.kycStatus}`);
        
        if (remainingRecords === 0 && newUserDetails.kycStatus === 'not_started') {
            printStatus('✅ KYC cleanup completed successfully!');
            console.log('');
            console.log(`User ${newUserDetails.firstName} ${newUserDetails.lastName} (ID: ${newUserDetails.id}) can now:`);
            console.log('- Access the KYC upload page again');
            console.log('- Upload new identity documents');
            console.log('- Go through the complete KYC process from scratch');
        } else {
            printError('❌ KYC cleanup verification failed!');
            return false;
        }
        
        return true;
    } catch (error) {
        printError(`Failed to cleanup KYC data: ${error.message}`);
        return false;
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    // Check prerequisites
    checkDatabase();
    
    // If no arguments provided, show usage and list users
    if (args.length === 0) {
        showUsage();
        console.log('');
        await listUsers();
        process.exit(0);
    }
    
    // Get user ID from argument
    const userId = args[0];
    
    // Validate user ID is numeric
    if (!/^\d+$/.test(userId)) {
        printError('User ID must be a positive integer.');
        process.exit(1);
    }
    
    // Validate user exists
    if (!(await validateUser(userId))) {
        console.log('');
        await listUsers();
        process.exit(1);
    }
    
    // Perform cleanup
    const success = await cleanupKyc(userId);
    process.exit(success ? 0 : 1);
}

// Run main function
if (require.main === module) {
    main().catch(error => {
        printError(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    cleanupKyc,
    getUserDetails,
    getKycCount,
    validateUser,
    listUsers
};
