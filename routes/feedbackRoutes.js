'use strict';

const express = require('express');
const { body, query, param } = require('express-validator');
const FeedbackController = require('../controllers/feedbackController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const feedbackController = new FeedbackController();

// Validation middleware
const validateFeedbackSubmission = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Priority must be between 1 and 5'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

const validateFeedbackUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Feedback ID must be a positive integer'),
  body('status')
    .isIn(['pending', 'reviewing', 'in_progress', 'resolved', 'closed'])
    .withMessage('Invalid status value')
];

const validateContentGeneration = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Feedback ID must be a positive integer'),
  body('contentType')
    .isIn(['blog_post', 'social_media', 'marketing_copy', 'feature_announcement'])
    .withMessage('Invalid content type'),
  body('platform')
    .optional()
    .isIn(['twitter', 'linkedin', 'facebook', 'instagram', 'blog', 'seo'])
    .withMessage('Invalid platform')
];

const validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'reviewing', 'in_progress', 'resolved', 'closed'])
    .withMessage('Invalid status value'),
  query('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  query('priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Priority must be between 1 and 5'),
  query('sentiment')
    .optional()
    .isIn(['very_negative', 'negative', 'neutral', 'positive', 'very_positive'])
    .withMessage('Invalid sentiment value'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'priority', 'status', 'sentiment'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
  query('period')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Period must be between 1 and 365 days')
];

// Public routes (no authentication required)
router.get('/categories', feedbackController.getCategories.bind(feedbackController));

// Protected routes (authentication required)
router.use(authenticateToken);

// Feedback submission and management
router.post('/submit', validateFeedbackSubmission, feedbackController.submitFeedback.bind(feedbackController));
router.get('/', validateQueryParams, feedbackController.getFeedback.bind(feedbackController));
router.get('/:id', feedbackController.getFeedbackById.bind(feedbackController));
router.patch('/:id/status', validateFeedbackUpdate, feedbackController.updateFeedbackStatus.bind(feedbackController));

// Content generation
router.post('/:id/generate-content', validateContentGeneration, feedbackController.generateContent.bind(feedbackController));

// Analytics and reporting
router.get('/analytics/summary', validateQueryParams, feedbackController.getAnalytics.bind(feedbackController));
router.get('/content/history', validateQueryParams, feedbackController.getContentHistory.bind(feedbackController));

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Feedback service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
