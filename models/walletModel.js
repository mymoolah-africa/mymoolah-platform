module.exports = {
  createWallet: async (user_id, account_number) => {
    return {
      walletId: Math.floor(Math.random() * 10000),
      accountNumber: account_number
    };
  },
  getWalletById: async (id) => {
    if (id === 999999 || isNaN(Number(id))) return null;
    return {
      walletId: id,
      userId: 1,
      accountNumber: 'WALLET123456',
      balance: 1000
    };
  },
  getWalletBalance: async (id) => {
    if (id === 999999 || isNaN(Number(id))) return null;
    return 1000;
  },
  creditWallet: async (id, amount) => {
    if (id === 999999 || isNaN(Number(id))) return null;
    if (amount <= 0) throw new Error('Invalid amount');
    return { newBalance: 1000 + amount };
  },
  debitWallet: async (id, amount) => {
    if (id === 999999 || isNaN(Number(id))) return null;
    if (amount <= 0) throw new Error('Invalid amount');
    if (amount > 1000) throw new Error('Insufficient funds');
    return { newBalance: 1000 - amount };
  },
  getWalletTransactions: async (id) => {
    if (id === 999999 || isNaN(Number(id))) return null;
    return [
      { id: 1, type: 'credit', amount: 100, description: 'Test credit' },
      { id: 2, type: 'debit', amount: 50, description: 'Test debit' }
    ];
  }
};
