/**
 * Payout Incentive Service for Watch to Earn
 * 
 * B2B sales tool: Credits merchant ad float accounts when they make payouts to MyMoolah wallets.
 * Incentivizes new merchants (Betway, Hollywoodbets, etc.) to use MyMoolah as payout channel.
 * 
 * **Business Model**: "Pay your customers via MyMoolah, get free ad budget"
 * Example: Betway pays R200,000 to 1,000 customers → gets R6,000 ad float credit (1,000 free ad views)
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

const { MerchantFloat, Transaction, sequelize } = require('../models');

class PayoutIncentiveService {
  /**
   * Credit merchant ad float account when they make payouts
   * 
   * @param {Object} payoutData - Payout information
   * @param {number} payoutData.amount - Payout amount in Rand
   * @param {string} payoutData.merchantId - Merchant identifier
   * @param {string} payoutData.payoutType - Type of payout (zapper, easypay, batch, etc.)
   * @param {number} payoutData.userId - User who received the payout (optional)
   * @returns {Promise<Object>} Credit result
   */
  async awardAdFloatForPayout(payoutData) {
    try {
      const { amount, merchantId, payoutType, userId } = payoutData;

      // Validate amount
      if (!amount || amount <= 0) {
        console.log('⚠️ Invalid payout amount - skipping ad float credit');
        return { success: false, reason: 'Invalid amount' };
      }

      // Find merchant float
      const merchantFloat = await MerchantFloat.findOne({
        where: { merchantId }
      });

      if (!merchantFloat) {
        console.log(`⚠️ Merchant float not found for ${merchantId} - skipping ad float credit`);
        return { success: false, reason: 'Merchant float not found' };
      }

      // Only credit ad float for active merchants
      if (merchantFloat.status !== 'active' || !merchantFloat.isActive) {
        console.log(`⚠️ Merchant ${merchantId} is not active - skipping ad float credit`);
        return { success: false, reason: 'Merchant not active' };
      }

      // Calculate ad float credit
      // Default: R200 payout = R6.00 ad float credit (1 free ad view)
      const creditRatio = parseFloat(process.env.PAYOUT_TO_AD_FLOAT_RATIO || '200');
      const adFloatCredit = (amount / creditRatio) * 6.00;

      // Only credit if at least R0.01
      if (adFloatCredit < 0.01) {
        console.log(`⚠️ Ad float credit too small (R${adFloatCredit.toFixed(4)}) - skipping`);
        return { success: false, reason: 'Credit amount too small' };
      }

      // Credit merchant ad float account
      await merchantFloat.increment('adFloatBalance', { by: adFloatCredit });

      console.log(
        `✅ Credited R${adFloatCredit.toFixed(2)} to ad float for merchant ${merchantId} ` +
        `(R${amount.toFixed(2)} payout via ${payoutType})`
      );

      // Log ad float credit (for merchant reporting and reconciliation)
      const transactionId = `AD_FLOAT_CREDIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await Transaction.create({
        transactionId,
        userId: userId || null, // Link to user if available
        walletId: null, // No wallet movement (float account only)
        amount: 0, // No wallet movement
        type: 'system',
        status: 'completed',
        description: `Ad Float Credit: R${adFloatCredit.toFixed(2)} (Payout Incentive)`,
        currency: 'ZAR',
        fee: 0,
        metadata: {
          merchantId,
          adFloatCredit,
          payoutAmount: amount,
          payoutType,
          creditRatio,
          incentiveType: 'payout_to_promote',
          isAdFloatCredit: true
        }
      });

      return {
        success: true,
        adFloatCredit,
        merchantId,
        newAdFloatBalance: parseFloat(merchantFloat.adFloatBalance) + adFloatCredit
      };
    } catch (error) {
      console.error('❌ Error awarding ad float credit:', error);
      // Don't throw - this is a non-blocking incentive, shouldn't fail payout
      return { success: false, reason: error.message };
    }
  }

  /**
   * Check if merchant qualifies for payout incentive
   * 
   * @param {string} merchantId - Merchant identifier
   * @returns {Promise<boolean>} Whether merchant qualifies
   */
  async merchantQualifiesForIncentive(merchantId) {
    const merchantFloat = await MerchantFloat.findOne({
      where: { merchantId }
    });

    if (!merchantFloat) {
      return false;
    }

    // Merchant must be active and have ad float account enabled
    return merchantFloat.status === 'active' && merchantFloat.isActive;
  }

  /**
   * Get merchant ad float balance and stats
   * 
   * @param {string} merchantId - Merchant identifier
   * @returns {Promise<Object>} Ad float stats
   */
  async getMerchantAdFloatStats(merchantId) {
    const merchantFloat = await MerchantFloat.findOne({
      where: { merchantId }
    });

    if (!merchantFloat) {
      return null;
    }

    // Count total credits awarded (from Transaction metadata)
    const creditTransactions = await Transaction.findAll({
      where: {
        'metadata.merchantId': merchantId,
        'metadata.isAdFloatCredit': true
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.literal("(metadata->>'adFloatCredit')::numeric")), 'totalCreditsAwarded'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCreditTransactions']
      ]
    });

    return {
      merchantId,
      adFloatBalance: parseFloat(merchantFloat.adFloatBalance),
      adFloatInitialBalance: parseFloat(merchantFloat.adFloatInitialBalance),
      totalCreditsAwarded: parseFloat(creditTransactions[0]?.dataValues?.totalCreditsAwarded || 0),
      totalCreditTransactions: parseInt(creditTransactions[0]?.dataValues?.totalCreditTransactions || 0)
    };
  }
}

module.exports = new PayoutIncentiveService();
