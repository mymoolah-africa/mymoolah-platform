const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

class WalletService {
  constructor() {
    this.walletModel = new Wallet();
    this.transactionModel = new Transaction();
  }

  /**
   * Create a transaction and update wallet balance atomically.
   * @param {Object} transactionData - All transaction fields, including userId, walletId, amount, type, etc.
   * @returns {Promise<Object>} - { transaction, wallet }
   */
  async createTransactionAndUpdateWallet(transactionData) {
    // 1. Get wallet
    const wallet = await this.walletModel.getWalletById(transactionData.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    if (wallet.status !== 'active') {
      throw new Error('Wallet is not active');
    }

    // 2. Check transaction limits
    await this.walletModel.checkTransactionLimits(transactionData.walletId, transactionData.amount);

    // 3. Update wallet balance (throws if insufficient funds)
    await this.walletModel.updateBalance(transactionData.walletId, transactionData.amount, transactionData.transactionType);

    // 4. Create transaction record
    const transaction = await this.transactionModel.createTransaction(transactionData);

    // 5. Get updated wallet
    const updatedWallet = await this.walletModel.getWalletById(transactionData.walletId);

    return {
      transaction,
      wallet: updatedWallet
    };
  }
}

module.exports = WalletService;