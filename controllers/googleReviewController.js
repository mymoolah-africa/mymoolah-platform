'use strict';

const GoogleReviewService = require('../services/googleReviewService');
const GoogleMyBusinessService = require('../services/googleMyBusinessService');
const { FeedbackSubmission, FeedbackGoogleReview, GoogleReviewResponse, GoogleReviewAnalytics } = require('../models');
const { validationResult } = require('express-validator');

class GoogleReviewController {
  constructor() {
    this.reviewService = new GoogleReviewService();
    this.googleAPI = new GoogleMyBusinessService();
  }

  /**
   * Generate Google Review from feedback
   */
  async generateReview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { feedbackId } = req.params;

      // Get feedback with AI analysis
      const feedback = await FeedbackSubmission.findByPk(feedbackId, {
        include: [
          {
            model: FeedbackGoogleReview,
            as: 'googleReviews',
            where: { status: 'generated' },
            required: false
          }
        ]
      });

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: 'Feedback not found'
        });
      }

      // Check if review already exists
      if (feedback.googleReviews && feedback.googleReviews.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Google review already generated for this feedback'
        });
      }

      // Generate review using AI
      const reviewData = await this.reviewService.generateReviewFromFeedback(feedback);

      // Validate review content
      const validation = this.reviewService.validateReviewContent(reviewData.reviewContent);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Generated review violates Google policies',
          violations: validation.violations
        });
      }

      // Store review in database
      const googleReview = await FeedbackGoogleReview.create({
        feedbackId: feedback.id,
        reviewContent: reviewData.reviewContent,
        rating: reviewData.rating,
        status: reviewData.status,
        aiGenerationData: reviewData.aiGenerationData
      });

      // Update analytics
      await this.updateReviewAnalytics(reviewData);

      res.json({
        success: true,
        message: 'Google review generated successfully',
        data: {
          review: {
            id: googleReview.id,
            content: googleReview.reviewContent,
            rating: googleReview.rating,
            status: googleReview.status,
            seoScore: reviewData.aiGenerationData.seoScore,
            keywords: reviewData.aiGenerationData.keywords
          }
        }
      });

    } catch (error) {
      console.error('Error generating Google review:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all generated reviews
   */
  async getReviews(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        rating,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};
      const order = [[sortBy, sortOrder.toUpperCase()]];

      // Apply filters
      if (status) where.status = status;
      if (rating) where.rating = rating;

      const { count, rows: reviews } = await FeedbackGoogleReview.findAndCountAll({
        where,
        include: [
          {
            model: FeedbackSubmission,
            as: 'feedback',
            attributes: ['id', 'title', 'description', 'sentiment']
          }
        ],
        order,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(req, res) {
    try {
      const { id } = req.params;

      const review = await FeedbackGoogleReview.findByPk(id, {
        include: [
          {
            model: FeedbackSubmission,
            as: 'feedback',
            attributes: ['id', 'title', 'description', 'sentiment', 'createdAt']
          },
          {
            model: GoogleReviewResponse,
            as: 'responses',
            attributes: ['responseContent', 'status', 'createdAt']
          }
        ]
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      res.json({
        success: true,
        data: review
      });

    } catch (error) {
      console.error('Error fetching review:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Generate response to existing Google review
   */
  async generateResponse(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { reviewId } = req.params;
      const { reviewContent, reviewRating } = req.body;

      // Generate response using AI
      const responseData = await this.reviewService.generateReviewResponse(reviewContent, reviewRating);

      // Store response in database
      const reviewResponse = await GoogleReviewResponse.create({
        googleReviewId: reviewId,
        responseContent: responseData.responseContent,
        status: 'pending',
        aiGenerationData: responseData.aiGenerationData
      });

      res.json({
        success: true,
        message: 'Review response generated successfully',
        data: {
          response: {
            id: reviewResponse.id,
            content: reviewResponse.responseContent,
            status: reviewResponse.status
          }
        }
      });

    } catch (error) {
      console.error('Error generating review response:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Post review response to Google (if API available)
   */
  async postResponseToGoogle(req, res) {
    try {
      const { responseId } = req.params;

      const response = await GoogleReviewResponse.findByPk(responseId);
      if (!response) {
        return res.status(404).json({
          success: false,
          message: 'Response not found'
        });
      }

      // Check if Google API is configured
      const apiStatus = this.googleAPI.getConfigurationStatus();
      if (!apiStatus.isConfigured) {
        return res.status(400).json({
          success: false,
          message: 'Google My Business API not configured',
          details: apiStatus
        });
      }

      // Post response to Google
      const result = await this.googleAPI.respondToReview(
        response.googleReviewId,
        response.responseContent
      );

      // Update response status
      await response.update({
        status: 'posted',
        postedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Response posted to Google successfully',
        data: {
          response: {
            id: response.id,
            status: response.status,
            postedAt: response.postedAt
          }
        }
      });

    } catch (error) {
      console.error('Error posting response to Google:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get Google API status and configuration
   */
  async getGoogleAPIStatus(req, res) {
    try {
      const health = await this.googleAPI.checkHealth();
      const config = this.googleAPI.getConfigurationStatus();

      res.json({
        success: true,
        data: {
          health,
          configuration: config,
          setupRequired: !config.isConfigured
        }
      });

    } catch (error) {
      console.error('Error checking Google API status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get Google My Business authorization URL
   */
  async getAuthorizationUrl(req, res) {
    try {
      const authUrl = this.googleAPI.getAuthorizationUrl();
      
      res.json({
        success: true,
        data: {
          authorizationUrl: authUrl,
          message: 'Use this URL to authorize Google My Business access'
        }
      });

    } catch (error) {
      console.error('Error generating authorization URL:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Handle Google OAuth callback
   */
  async handleOAuthCallback(req, res) {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code required'
        });
      }

      // Exchange code for tokens
      const tokens = await this.googleAPI.exchangeCodeForTokens(code);

      res.json({
        success: true,
        message: 'Google My Business authorization successful',
        data: {
          message: 'Please save these tokens in your environment variables',
          tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date
          }
        }
      });

    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get review analytics
   */
  async getReviewAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period);

      const analytics = await GoogleReviewAnalytics.findAll({
        where: {
          date: {
            [require('sequelize').Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        },
        order: [['date', 'ASC']]
      });

      // Calculate summary statistics
      const summary = {
        totalReviews: analytics.reduce((sum, a) => sum + a.totalReviews, 0),
        postedReviews: analytics.reduce((sum, a) => sum + a.postedReviews, 0),
        averageRating: analytics.length > 0 ? 
          analytics.reduce((sum, a) => sum + parseFloat(a.averageRating), 0) / analytics.length : 0,
        responseRate: analytics.length > 0 ?
          analytics.reduce((sum, a) => sum + parseFloat(a.responseRate), 0) / analytics.length : 0
      };

      res.json({
        success: true,
        data: {
          analytics,
          summary,
          period: days
        }
      });

    } catch (error) {
      console.error('Error fetching review analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update review analytics
   */
  async updateReviewAnalytics(reviewData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let analytics = await GoogleReviewAnalytics.findOne({
        where: { date: today }
      });

      if (!analytics) {
        analytics = await GoogleReviewAnalytics.create({
          date: today,
          totalReviews: 0,
          postedReviews: 0,
          averageRating: 0,
          ratingDistribution: {},
          responseRate: 0,
          seoImpact: {}
        });
      }

      // Update statistics
      analytics.totalReviews += 1;
      
      // Update rating distribution
      const rating = reviewData.rating;
      analytics.ratingDistribution[rating] = 
        (analytics.ratingDistribution[rating] || 0) + 1;

      // Calculate new average rating
      const totalRatings = Object.values(analytics.ratingDistribution).reduce((sum, count) => sum + count, 0);
      const ratingSum = Object.entries(analytics.ratingDistribution).reduce((sum, [rating, count]) => 
        sum + (parseInt(rating) * count), 0
      );
      analytics.averageRating = totalRatings > 0 ? ratingSum / totalRatings : 0;

      // Update SEO impact
      if (reviewData.aiGenerationData.seoScore) {
        const currentSeo = analytics.seoImpact || {};
        currentSeo.totalReviews = (currentSeo.totalReviews || 0) + 1;
        currentSeo.averageSeoScore = currentSeo.totalReviews > 0 ? 
          ((currentSeo.averageSeoScore || 0) * (currentSeo.totalReviews - 1) + reviewData.aiGenerationData.seoScore) / currentSeo.totalReviews : 
          reviewData.aiGenerationData.seoScore;
        
        // Track keywords
        if (reviewData.aiGenerationData.keywords) {
          currentSeo.keywords = currentSeo.keywords || {};
          reviewData.aiGenerationData.keywords.forEach(keyword => {
            currentSeo.keywords[keyword] = (currentSeo.keywords[keyword] || 0) + 1;
          });
        }
        
        analytics.seoImpact = currentSeo;
      }

      await analytics.save();

    } catch (error) {
      console.error('Error updating review analytics:', error);
    }
  }
}

module.exports = GoogleReviewController;
