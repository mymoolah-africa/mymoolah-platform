'use strict';

const { UserFavorite } = require('../models');
// const { Product, ProductBrand } = require('../models'); // temporarily commented out

class UserFavoritesService {
  /**
   * Add a product to user's favorites
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} - Created favorite
   */
  async addToFavorites(userId, productId) {
    try {
      // Check if already exists
      const existing = await UserFavorite.findOne({
        where: { userId, productId }
      });

      if (existing) {
        return existing; // Already in favorites
      }

      // Check if user has reached the 12 favorites limit
      const currentCount = await UserFavorite.count({
        where: { userId }
      });

      if (currentCount >= 12) {
        throw new Error('Maximum of 12 favorites allowed per user');
      }

      // Create new favorite
      const favorite = await UserFavorite.create({
        userId,
        productId
      });

      return favorite;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove a product from user's favorites
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @returns {Promise<boolean>} - Success status
   */
  async removeFromFavorites(userId, productId) {
    try {
      const deleted = await UserFavorite.destroy({
        where: { userId, productId }
      });

      return deleted > 0;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} - Toggle result
   */
  async toggleFavorite(userId, productId) {
    try {
      const existing = await UserFavorite.findOne({
        where: { userId, productId }
      });

      if (existing) {
        // Remove from favorites
        await this.removeFromFavorites(userId, productId);
        return { isFavorite: false, action: 'removed' };
      } else {
        // Add to favorites
        await this.addToFavorites(userId, productId);
        return { isFavorite: true, action: 'added' };
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }

  /**
   * Get user's favorite products
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of favorite products
   */
  async getUserFavorites(userId) {
    try {
      // Temporarily simplified to avoid association issues
      const favorites = await UserFavorite.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      // Return basic favorite data without product details for now
      return favorites.map(fav => ({
        id: fav.productId, // Use productId directly
        name: `Product ${fav.productId}`, // Placeholder name
        brand: 'Unknown', // Placeholder brand
        category: 'voucher',
        minAmount: 0,
        maxAmount: 0,
        icon: '🎁',
        description: 'Favorite product',
        available: true,
        featured: true,
        denominations: [],
        favoriteId: fav.id
      }));
    } catch (error) {
      console.error('Error getting user favorites:', error);
      throw error;
    }
  }

  /**
   * Check if a product is in user's favorites
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @returns {Promise<boolean>} - Is favorite status
   */
  async isFavorite(userId, productId) {
    try {
      const favorite = await UserFavorite.findOne({
        where: { userId, productId }
      });

      return !!favorite;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  /**
   * Get count of user's favorites
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Favorite count
   */
  async getFavoritesCount(userId) {
    try {
      return await UserFavorite.count({
        where: { userId }
      });
    } catch (error) {
      console.error('Error getting favorites count:', error);
      return 0;
    }
  }

  /**
   * Helper method to get voucher icons
   * @param {string} voucherName - Voucher name
   * @returns {string} - Icon emoji
   */
  getVoucherIcon(voucherName) {
    const iconMap = {
      'MMVoucher': '💰',
      '1Voucher': '🛒',
      'OTT Voucher': '🎬',
      'Betway Voucher': '🎯',
      'HollywoodBets Voucher': '🎰',
      'YesPlay Voucher': '🎲',
      'DStv Voucher': '📺',
      'Netflix Voucher': '🎭',
      'Fifa Mobile Gift Card': '⚽',
      'Intercape Voucher': '🚌',
      'Tenacity Voucher': '🏪',
      'Google Play Voucher': '📱'
    };
    return iconMap[voucherName] || '🎁';
  }
}

module.exports = UserFavoritesService;
