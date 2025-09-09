'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const GoogleReviewController = require('../controllers/googleReviewController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const googleReviewController = new GoogleReviewController();

// Validation middleware
const validateFeedbackId = [
  param('feedbackId').isInt().withMessage('Feedback ID must be a valid integer')
];

const validateReviewResponse = [
  body('reviewContent').notEmpty().withMessage('Review content is required'),
  body('reviewRating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'generated', 'posted', 'failed', 'rejected']).withMessage('Invalid status'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  query('sortBy').optional().isIn(['createdAt', 'rating', 'status']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
];

const validatePeriod = [
  query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Period must be between 1 and 365 days')
];

// Public routes (no authentication required)
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Google Reviews API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Protected routes (authentication required)
router.use(authenticateToken);

// Review Generation
router.post('/generate/:feedbackId', 
  validateFeedbackId,
  googleReviewController.generateReview.bind(googleReviewController)
);

// Review Management
router.get('/reviews', 
  validatePagination,
  googleReviewController.getReviews.bind(googleReviewController)
);

router.get('/reviews/:id', 
  [param('id').isInt().withMessage('Review ID must be a valid integer')],
  googleReviewController.getReviewById.bind(googleReviewController)
);

// Review Responses
router.post('/reviews/:reviewId/response', 
  [
    param('reviewId').isInt().withMessage('Review ID must be a valid integer'),
    ...validateReviewResponse
  ],
  googleReviewController.generateResponse.bind(googleReviewController)
);

router.post('/responses/:responseId/post', 
  [param('responseId').isInt().withMessage('Response ID must be a valid integer')],
  googleReviewController.postResponseToGoogle.bind(googleReviewController)
);

// Google API Management
router.get('/google/status', 
  googleReviewController.getGoogleAPIStatus.bind(googleReviewController)
);

router.get('/google/auth-url', 
  googleReviewController.getAuthorizationUrl.bind(googleReviewController)
);

router.get('/google/callback', 
  googleReviewController.handleOAuthCallback.bind(googleReviewController)
);

// Analytics
router.get('/analytics', 
  validatePeriod,
  googleReviewController.getReviewAnalytics.bind(googleReviewController)
);

// Batch Operations
router.post('/batch/generate', 
  [
    body('feedbackIds').isArray({ min: 1 }).withMessage('At least one feedback ID is required'),
    body('feedbackIds.*').isInt().withMessage('All feedback IDs must be valid integers')
  ],
  async (req, res) => {
    try {
      const { feedbackIds } = req.body;
      const results = [];
      
      for (const feedbackId of feedbackIds) {
        try {
          const result = await googleReviewController.generateReview({
            params: { feedbackId },
            body: req.body
          }, {
            json: (data) => results.push({ feedbackId, success: true, data }),
            status: (code) => ({ json: (data) => results.push({ feedbackId, success: false, status: code, data }) })
          });
        } catch (error) {
          results.push({ 
            feedbackId, 
            success: false, 
            error: error.message 
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      res.json({
        success: true,
        message: `Batch review generation completed. ${successCount} successful, ${failureCount} failed.`,
        data: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
          results
        }
      });
      
    } catch (error) {
      console.error('Error in batch review generation:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during batch operation'
      });
    }
  }
);

// Review Quality Management
router.post('/reviews/:id/validate', 
  [param('id').isInt().withMessage('Review ID must be a valid integer')],
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const review = await require('../models').FeedbackGoogleReview.findByPk(id);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }
      
      // Validate review content
      const validation = googleReviewController.reviewService.validateReviewContent(review.reviewContent);
      
      // Update review status based on validation
      if (!validation.isValid) {
        await review.update({ 
          status: 'rejected',
          errorMessage: `Validation failed: ${validation.violations.join(', ')}`
        });
      }
      
      res.json({
        success: true,
        data: {
          reviewId: id,
          isValid: validation.isValid,
          violations: validation.violations,
          status: review.status
        }
      });
      
    } catch (error) {
      console.error('Error validating review:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// SEO Optimization
router.get('/seo/keywords', 
  async (req, res) => {
    try {
      const analytics = await require('../models').GoogleReviewAnalytics.findAll({
        where: {
          date: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        attributes: ['seoImpact']
      });
      
      // Aggregate keywords from all analytics
      const keywordStats = {};
      analytics.forEach(analytic => {
        if (analytic.seoImpact && analytic.seoImpact.keywords) {
          Object.entries(analytic.seoImpact.keywords).forEach(([keyword, count]) => {
            keywordStats[keyword] = (keywordStats[keyword] || 0) + count;
          });
        }
      });
      
      // Sort keywords by frequency
      const sortedKeywords = Object.entries(keywordStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([keyword, count]) => ({ keyword, count }));
      
      res.json({
        success: true,
        data: {
          topKeywords: sortedKeywords,
          totalKeywords: Object.keys(keywordStats).length,
          period: '30 days'
        }
      });
      
    } catch (error) {
      console.error('Error fetching SEO keywords:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Google Reviews API Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;
