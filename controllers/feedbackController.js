'use strict';

const FeedbackService = require('../services/feedbackService');
const { FeedbackSubmission, FeedbackCategory, FeedbackAiInsight, FeedbackContentGeneration, FeedbackAnalytics } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

class FeedbackController {
  constructor() {
    this.feedbackService = new FeedbackService();
  }

  /**
   * Submit new feedback
   */
  async submitFeedback(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { title, description, categoryId, priority, tags, metadata } = req.body;
      const userId = req.user?.id || null;

      // Get category details
      const category = await FeedbackCategory.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }

      // Create feedback submission
      const feedback = await FeedbackSubmission.create({
        userId,
        categoryId,
        title,
        description,
        priority: priority || 3,
        tags: tags || [],
        metadata: metadata || {}
      });

      // Load category for AI analysis
      feedback.category = category;

      // AI Analysis
      const aiAnalysis = await this.feedbackService.analyzeFeedback(feedback);
      
      // Store AI insights
      await FeedbackAiInsight.create({
        feedbackId: feedback.id,
        insightType: 'sentiment',
        content: {
          sentiment: aiAnalysis.sentiment,
          confidence: aiAnalysis.sentimentConfidence,
          topics: aiAnalysis.topics,
          keywords: aiAnalysis.keywords,
          userJourney: aiAnalysis.userJourney,
          businessImpact: aiAnalysis.businessImpact
        },
        confidence: aiAnalysis.sentimentConfidence,
        model: 'gpt-5'
      });

      // Update feedback with AI analysis
      await feedback.update({
        sentiment: aiAnalysis.sentiment,
        aiAnalysis: {
          priority: aiAnalysis.priority,
          priorityReason: aiAnalysis.priorityReason,
          topics: aiAnalysis.topics,
          keywords: aiAnalysis.keywords
        }
      });

      // Generate marketing content
      const blogContent = await this.feedbackService.generateMarketingContent(
        feedback, 
        aiAnalysis, 
        'blog_post'
      );

      const seoContent = await this.feedbackService.generateSEOContent(feedback, aiAnalysis);

      // Store generated content
      await FeedbackContentGeneration.bulkCreate([
        {
          feedbackId: feedback.id,
          contentType: 'blog_post',
          title: blogContent.content.split('\n')[0] || 'Blog Post',
          content: blogContent.content,
          keywords: blogContent.keywords,
          seoScore: blogContent.seoScore,
          platform: 'blog',
          status: 'draft'
        },
        {
          feedbackId: feedback.id,
          contentType: 'seo_meta',
          title: seoContent.title,
          content: JSON.stringify(seoContent),
          keywords: seoContent.focusKeywords,
          seoScore: seoContent.seoScore,
          platform: 'seo',
          status: 'draft'
        }
      ]);

      // Update analytics
      await this.updateAnalytics(feedback.categoryId, aiAnalysis);

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          feedback: {
            id: feedback.id,
            title: feedback.title,
            status: feedback.status,
            priority: feedback.priority,
            sentiment: feedback.sentiment
          },
          aiAnalysis: {
            sentiment: aiAnalysis.sentiment,
            topics: aiAnalysis.topics,
            keywords: aiAnalysis.keywords
          },
          contentGenerated: {
            blogPost: blogContent.seoScore,
            seoOptimization: seoContent.seoScore
          }
        }
      });

    } catch (error) {
      console.error('Feedback submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all feedback submissions with pagination and filters
   */
  async getFeedback(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        categoryId,
        priority,
        sentiment,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};
      const order = [[sortBy, sortOrder.toUpperCase()]];

      // Apply filters
      if (status) where.status = status;
      if (categoryId) where.categoryId = categoryId;
      if (priority) where.priority = priority;
      if (sentiment) where.sentiment = sentiment;
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { tags: { [Op.overlap]: [search] } }
        ];
      }

      const { count, rows: feedback } = await FeedbackSubmission.findAndCountAll({
        where,
        include: [
          {
            model: FeedbackCategory,
            as: 'category',
            attributes: ['id', 'name', 'color', 'icon']
          },
          {
            model: FeedbackAiInsight,
            as: 'aiInsights',
            where: { insightType: 'sentiment' },
            required: false,
            limit: 1,
            order: [['createdAt', 'DESC']]
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
          feedback,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get feedback by ID with full details
   */
  async getFeedbackById(req, res) {
    try {
      const { id } = req.params;

      const feedback = await FeedbackSubmission.findByPk(id, {
        include: [
          {
            model: FeedbackCategory,
            as: 'category',
            attributes: ['id', 'name', 'color', 'icon', 'description']
          },
          {
            model: FeedbackAiInsight,
            as: 'aiInsights',
            attributes: ['insightType', 'content', 'confidence', 'model', 'createdAt']
          },
          {
            model: FeedbackContentGeneration,
            as: 'contentGenerations',
            attributes: ['contentType', 'title', 'content', 'keywords', 'seoScore', 'platform', 'status', 'createdAt']
          }
        ]
      });

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: 'Feedback not found'
        });
      }

      res.json({
        success: true,
        data: feedback
      });

    } catch (error) {
      console.error('Get feedback by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'reviewing', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const feedback = await FeedbackSubmission.findByPk(id);
      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: 'Feedback not found'
        });
      }

      await feedback.update({ status });

      res.json({
        success: true,
        message: 'Feedback status updated successfully',
        data: { status: feedback.status }
      });

    } catch (error) {
      console.error('Update feedback status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get feedback categories
   */
  async getCategories(req, res) {
    try {
      const categories = await FeedbackCategory.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'description', 'icon', 'color'],
        order: [['name', 'ASC']]
      });

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Generate additional content for feedback
   */
  async generateContent(req, res) {
    try {
      const { id } = req.params;
      const { contentType, platform } = req.body;

      const feedback = await FeedbackSubmission.findByPk(id, {
        include: [
          {
            model: FeedbackCategory,
            as: 'category'
          },
          {
            model: FeedbackAiInsight,
            as: 'aiInsights',
            where: { insightType: 'sentiment' },
            required: false,
            limit: 1
          }
        ]
      });

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: 'Feedback not found'
        });
      }

      // Get AI analysis
      const aiInsight = feedback.aiInsights[0];
      if (!aiInsight) {
        return res.status(400).json({
          success: false,
          message: 'AI analysis not available for this feedback'
        });
      }

      const analysis = aiInsight.content;

      let generatedContent;
      switch (contentType) {
        case 'social_media':
          generatedContent = await this.feedbackService.generateSocialMediaContent(
            feedback, 
            analysis, 
            platform || 'twitter'
          );
          break;
        case 'marketing_copy':
          generatedContent = await this.feedbackService.generateMarketingContent(
            feedback, 
            analysis, 
            'marketing_copy'
          );
          break;
        default:
          generatedContent = await this.feedbackService.generateMarketingContent(
            feedback, 
            analysis, 
            contentType
          );
      }

      // Store generated content
      const contentRecord = await FeedbackContentGeneration.create({
        feedbackId: feedback.id,
        contentType,
        title: generatedContent.title || `${contentType} content`,
        content: generatedContent.content,
        keywords: generatedContent.keywords || [],
        seoScore: generatedContent.seoScore || 0,
        platform: platform || contentType,
        status: 'draft'
      });

      res.json({
        success: true,
        message: 'Content generated successfully',
        data: {
          content: generatedContent,
          contentId: contentRecord.id
        }
      });

    } catch (error) {
      console.error('Generate content error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get feedback analytics
   */
  async getAnalytics(req, res) {
    try {
      const { period = '30', categoryId } = req.query;
      const days = parseInt(period);

      const where = {};
      if (categoryId) where.categoryId = categoryId;

      // Get analytics for the specified period
      const analytics = await FeedbackAnalytics.findAll({
        where: {
          ...where,
          date: {
            [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        },
        include: [
          {
            model: FeedbackCategory,
            as: 'category',
            attributes: ['name', 'color']
          }
        ],
        order: [['date', 'ASC']]
      });

      // Calculate summary statistics
      const summary = {
        totalSubmissions: analytics.reduce((sum, a) => sum + a.totalSubmissions, 0),
        avgPriority: analytics.length > 0 ? 
          analytics.reduce((sum, a) => sum + parseFloat(a.avgPriority), 0) / analytics.length : 0,
        sentimentDistribution: {},
        topKeywords: [],
        contentGenerated: analytics.reduce((sum, a) => sum + a.contentGenerated, 0),
        avgSEOScore: 0
      };

      // Aggregate sentiment distribution
      analytics.forEach(day => {
        if (day.sentimentDistribution) {
          Object.entries(day.sentimentDistribution).forEach(([sentiment, count]) => {
            summary.sentimentDistribution[sentiment] = 
              (summary.sentimentDistribution[sentiment] || 0) + count;
          });
        }
      });

      // Get top keywords
      const allKeywords = analytics
        .flatMap(day => day.topKeywords || [])
        .reduce((acc, keyword) => {
          acc[keyword] = (acc[keyword] || 0) + 1;
          return acc;
        }, {});

      summary.topKeywords = Object.entries(allKeywords)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword]) => keyword);

      res.json({
        success: true,
        data: {
          analytics,
          summary,
          period: days
        }
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update analytics for a category
   */
  async updateAnalytics(categoryId, aiAnalysis) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let analytics = await FeedbackAnalytics.findOne({
        where: { date: today, categoryId }
      });

      if (!analytics) {
        analytics = await FeedbackAnalytics.create({
          date: today,
          categoryId,
          totalSubmissions: 0,
          avgPriority: 0,
          sentimentDistribution: {},
          topKeywords: [],
          contentGenerated: 0,
          seoImpact: {}
        });
      }

      // Update statistics
      const currentTotal = analytics.totalSubmissions;
      const currentAvgPriority = parseFloat(analytics.avgPriority);
      
      analytics.totalSubmissions = currentTotal + 1;
      analytics.avgPriority = ((currentAvgPriority * currentTotal) + aiAnalysis.priority) / analytics.totalSubmissions;

      // Update sentiment distribution
      const sentiment = aiAnalysis.sentiment;
      analytics.sentimentDistribution[sentiment] = 
        (analytics.sentimentDistribution[sentiment] || 0) + 1;

      // Update keywords
      const existingKeywords = analytics.topKeywords || [];
      const newKeywords = aiAnalysis.keywords || [];
      const allKeywords = [...existingKeywords, ...newKeywords];
      
      // Count keyword frequency and keep top 20
      const keywordCounts = allKeywords.reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {});
      
      analytics.topKeywords = Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([keyword]) => keyword);

      // Update content generated count
      analytics.contentGenerated += 2; // Blog post + SEO content

      await analytics.save();

    } catch (error) {
      console.error('Update analytics error:', error);
    }
  }

  /**
   * Get content generation history
   */
  async getContentHistory(req, res) {
    try {
      const { page = 1, limit = 20, contentType, status } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (contentType) where.contentType = contentType;
      if (status) where.status = status;

      const { count, rows: content } = await FeedbackContentGeneration.findAndCountAll({
        where,
        include: [
          {
            model: FeedbackSubmission,
            as: 'feedback',
            attributes: ['id', 'title', 'categoryId'],
            include: [
              {
                model: FeedbackCategory,
                as: 'category',
                attributes: ['name', 'color']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          content,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get content history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = FeedbackController;
