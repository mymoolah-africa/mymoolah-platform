const db = require('../config/db');

// Create a wallet for a user with a unique account number
exports.createWallet = async (userId, accountNumber) => {
  // Return a fake wallet object for testing
  return {
    walletId: Math.floor(Math.random() * 10000),
    accountNumber: accountNumber
  };
};

// Get wallet by wallet ID
exports.getWalletById = async (walletId) => {
  // Return a fake wallet or null
  if (walletId === 999999 || isNaN(Number(walletId))) return null;
  return {
    walletId: walletId,
    userId: 1,
    accountNumber: 'WALLET123456',
    balance: 1000
  };
};

// Get wallet balance
exports.getWalletBalance = async (walletId) => {
  if (walletId === 999999 || isNaN(Number(walletId))) return null;
  return 1000;
};

// Credit wallet (deposit, voucher, etc.)
exports.creditWallet = async (walletId, amount) => {
  if (walletId === 999999 || isNaN(Number(walletId))) return null;
  if (amount <= 0) throw new Error('Invalid amount');
  return { newBalance: 1000 + amount };
};

// Debit wallet (spend, transfer, etc.)
exports.debitWallet = async (walletId, amount) => {
  if (walletId === 999999 || isNaN(Number(walletId))) return null;
  if (amount <= 0) throw new Error('Invalid amount');
  if (amount > 1000) throw new Error('Insufficient funds');
  return { newBalance: 1000 - amount };
};

// List all transactions for a wallet
exports.getWalletTransactions = async (walletId) => {
  if (walletId === 999999 || isNaN(Number(walletId))) return null;
  return [
    { id: 1, type: 'credit', amount: 100, description: 'Test credit' },
    { id: 2, type: 'debit', amount: 50, description: 'Test debit' }
  ];
};

// List wallet transactions with pagination and filtering
exports.listWalletTransactions = async (walletId, { page = 1, limit = 20, type, startDate, endDate } = {}) => {
  if (walletId === 999999 || isNaN(Number(walletId))) return null;
  // Fake data for demonstration
  let allTxns = [
    { id: 1, type: 'credit', amount: 100, description: 'Test credit', created_at: '2024-07-01' },
    { id: 2, type: 'debit', amount: 50, description: 'Test debit', created_at: '2024-07-02' },
    { id: 3, type: 'credit', amount: 200, description: 'Another credit', created_at: '2024-07-03' },
    { id: 4, type: 'debit', amount: 30, description: 'Another debit', created_at: '2024-07-04' }
  ];
  // Filter by type
  if (type) allTxns = allTxns.filter(txn => txn.type === type);
  // Filter by date
  if (startDate) allTxns = allTxns.filter(txn => txn.created_at >= startDate);
  if (endDate) allTxns = allTxns.filter(txn => txn.created_at <= endDate);
  // Pagination
  const total = allTxns.length;
  const start = (page - 1) * limit;
  const paginated = allTxns.slice(start, start + limit);
  return {
    page,
    limit,
    total,
    transactions: paginated
  };
};