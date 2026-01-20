/**
 * Ad Controller for Watch to Earn
 * 
 * HTTP API endpoints for ad viewing and engagement.
 * Handles user requests to view ads, complete views, and record engagements.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

const adService = require('../services/adService');
const engagementService = require('../services/engagementService');
const { sendErrorResponse, ERROR_CODES } = require('../utils/errorHandler');

class AdController {
  /**
   * GET /api/v1/ads/available
   * Get available ads for authenticated user
   */
  async getAvailableAds(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'];

    try {
      const userId = req.user.id;
      
      const ads = await adService.getAvailableAds(userId);

      res.json({
        success: true,
        data: ads,
        count: ads.length
      });
    } catch (error) {
      console.error('❌ Error in getAvailableAds:', error);
      return sendErrorResponse(
        res,
        ERROR_CODES.DATABASE_ERROR,
        'Failed to fetch available ads',
        requestId,
        error
      );
    }
  }

  /**
   * POST /api/v1/ads/:id/start
   * Record that user started watching an ad
   */
  async startView(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'];

    try {
      const userId = req.user.id;
      const campaignId = req.params.id;

      const view = await adService.startView(userId, campaignId);

      res.json({
        success: true,
        data: {
          viewId: view.id,
          campaignId: view.campaignId,
          startedAt: view.startedAt
        }
      });
    } catch (error) {
      console.error('❌ Error in startView:', error);
      
      if (error.message.includes('already watched')) {
        return sendErrorResponse(
          res,
          ERROR_CODES.DUPLICATE_REQUEST,
          error.message,
          requestId
        );
      }

      return sendErrorResponse(
        res,
        ERROR_CODES.DATABASE_ERROR,
        'Failed to start ad view',
        requestId,
        error
      );
    }
  }

  /**
   * POST /api/v1/ads/:id/complete
   * Complete ad view and credit user wallet
   */
  async completeView(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'];

    try {
      const userId = req.user.id;
      const campaignId = req.params.id;
      const { viewId, watchDuration } = req.body;

      // Validate required fields
      if (!viewId) {
        return sendErrorResponse(
          res,
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'viewId is required',
          requestId
        );
      }

      if (!watchDuration || watchDuration <= 0) {
        return sendErrorResponse(
          res,
          ERROR_CODES.INVALID_FORMAT,
          'watchDuration must be a positive number',
          requestId
        );
      }

      const result = await adService.completeView(userId, campaignId, viewId, watchDuration);

      // Convert Decimal to number for formatting
      const rewardAmount = parseFloat(result.rewardAmount) || 0;

      res.json({
        success: true,
        message: `You earned R${rewardAmount.toFixed(2)}!`,
        data: {
          ...result,
          rewardAmount: rewardAmount
        }
      });
    } catch (error) {
      console.error('❌ Error in completeView:', error.message);
      console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

      if (error.message.includes('not watched completely')) {
        return sendErrorResponse(
          res,
          ERROR_CODES.INVALID_FORMAT,
          error.message,
          requestId
        );
      }

      if (error.message.includes('insufficient')) {
        return sendErrorResponse(
          res,
          ERROR_CODES.INSUFFICIENT_BALANCE,
          'Merchant has insufficient ad budget. This ad is no longer available.',
          requestId
        );
      }

      if (error.message.includes('not found') || error.message.includes('already completed')) {
        return sendErrorResponse(
          res,
          ERROR_CODES.NOT_FOUND,
          error.message,
          requestId
        );
      }

      return sendErrorResponse(
        res,
        ERROR_CODES.DATABASE_ERROR,
        `Failed to complete ad view: ${error.message}`,
        requestId,
        error
      );
    }
  }

  /**
   * POST /api/v1/ads/:id/engage
   * Record engagement (lead capture) for Engagement ads
   * Sends user details to merchant and credits R1.00 bonus
   */
  async recordEngagement(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'];

    try {
      const userId = req.user.id;
      const campaignId = req.params.id;
      const { viewId } = req.body;

      // Validate required fields
      if (!viewId) {
        return sendErrorResponse(
          res,
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'viewId is required',
          requestId
        );
      }

      const result = await engagementService.recordEngagement(userId, campaignId, viewId);

      res.json({
        success: true,
        message: `You earned R${result.bonusAmount.toFixed(2)} bonus! The merchant will contact you soon.`,
        data: result
      });
    } catch (error) {
      console.error('❌ Error in recordEngagement:', error);

      if (error.message.includes('already recorded')) {
        return sendErrorResponse(
          res,
          ERROR_CODES.DUPLICATE_REQUEST,
          'You have already engaged with this ad',
          requestId
        );
      }

      if (error.message.includes('only allowed for Engagement ads')) {
        return sendErrorResponse(
          res,
          ERROR_CODES.INVALID_FORMAT,
          'This ad does not support engagement actions',
          requestId
        );
      }

      if (error.message.includes('not completed')) {
        return sendErrorResponse(
          res,
          ERROR_CODES.INVALID_FORMAT,
          error.message,
          requestId
        );
      }

      return sendErrorResponse(
        res,
        ERROR_CODES.DATABASE_ERROR,
        'Failed to record engagement',
        requestId,
        error
      );
    }
  }

  /**
   * GET /api/v1/ads/history
   * Get user's ad view history
   */
  async getViewHistory(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'];

    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;

      const history = await adService.getUserViewHistory(userId, limit);

      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      console.error('❌ Error in getViewHistory:', error);
      return sendErrorResponse(
        res,
        ERROR_CODES.DATABASE_ERROR,
        'Failed to fetch view history',
        requestId,
        error
      );
    }
  }
}

module.exports = new AdController();
