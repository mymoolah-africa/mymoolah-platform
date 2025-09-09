'use strict';

const UserFavoritesService = require('../services/userFavoritesService');
const { validationResult } = require('express-validator');

class UserFavoritesController {
  constructor() {
    this.favoritesService = new UserFavoritesService();
  }

  /**
   * Get user's favorites
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserFavorites(req, res) {
    try {
      const userId = req.user.id;
      
      const favorites = await this.favoritesService.getUserFavorites(userId);
      
      res.json({
        success: true,
        data: {
          favorites,
          count: favorites.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting user favorites:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get favorites',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Add product to favorites
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addToFavorites(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const userId = req.user.id;
      const { productId } = req.body;

      const favorite = await this.favoritesService.addToFavorites(userId, productId);
      
      res.json({
        success: true,
        data: {
          favorite,
          message: 'Product added to favorites',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error adding to favorites:', error);
      
      if (error.message === 'Maximum of 12 favorites allowed per user') {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to add to favorites',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Remove product from favorites
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeFromFavorites(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const userId = req.user.id;
      const { productId } = req.body;

      const removed = await this.favoritesService.removeFromFavorites(userId, productId);
      
      res.json({
        success: true,
        data: {
          removed,
          message: removed ? 'Product removed from favorites' : 'Product not found in favorites',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove from favorites',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle favorite status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async toggleFavorite(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const userId = req.user.id;
      const { productId } = req.body;

      const result = await this.favoritesService.toggleFavorite(userId, productId);
      
      res.json({
        success: true,
        data: {
          ...result,
          message: result.isFavorite ? 'Product added to favorites' : 'Product removed from favorites',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      
      if (error.message === 'Maximum of 12 favorites allowed per user') {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to toggle favorite',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if product is favorite
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkFavorite(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      const isFavorite = await this.favoritesService.isFavorite(userId, parseInt(productId));
      
      res.json({
        success: true,
        data: {
          isFavorite,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error checking favorite status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check favorite status',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get favorites count
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFavoritesCount(req, res) {
    try {
      const userId = req.user.id;
      
      const count = await this.favoritesService.getFavoritesCount(userId);
      
      res.json({
        success: true,
        data: {
          count,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting favorites count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get favorites count',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = UserFavoritesController;





