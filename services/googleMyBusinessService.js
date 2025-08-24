'use strict';

const { google } = require('googleapis');
require('dotenv').config();

class GoogleMyBusinessService {
  constructor() {
    this.auth = null;
    this.mybusiness = null;
    this.isConfigured = false;
    this.locationId = process.env.GOOGLE_MY_BUSINESS_LOCATION_ID;
    
    this.initializeAuth();
  }

  /**
   * Initialize Google OAuth authentication
   */
  async initializeAuth() {
    try {
      // Check if we have the required credentials
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log('⚠️ Google My Business API not configured - missing credentials');
        return;
      }

      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
      );

      // If we have a refresh token, use it
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
        
        // Refresh the access token
        await this.refreshAccessToken();
        this.isConfigured = true;
        console.log('✅ Google My Business API configured with refresh token');
      } else {
        console.log('⚠️ Google My Business API requires initial authorization');
      }

    } catch (error) {
      console.error('❌ Error initializing Google My Business API:', error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    try {
      const { credentials } = await this.auth.refreshAccessToken();
      this.auth.setCredentials(credentials);
      
      // Store the new access token and expiry
      if (credentials.access_token) {
        console.log('🔄 Google access token refreshed');
      }
      
      return credentials;
    } catch (error) {
      console.error('❌ Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Get authorization URL for initial setup
   */
  getAuthorizationUrl() {
    if (!this.auth) {
      throw new Error('Google OAuth not initialized');
    }

    const scopes = [
      'https://www.googleapis.com/auth/plus.business.manage',
      'https://www.googleapis.com/auth/plus.me'
    ];

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      
      // Store tokens for future use
      console.log('✅ Authorization successful, tokens received');
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      };
    } catch (error) {
      console.error('❌ Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Initialize My Business API client
   */
  async initializeMyBusinessAPI() {
    try {
      if (!this.auth) {
        throw new Error('Authentication not initialized');
      }

      this.mybusiness = google.mybusiness({
        version: 'v4',
        auth: this.auth
      });

      console.log('✅ Google My Business API client initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing My Business API:', error);
      return false;
    }
  }

  /**
   * Get business locations
   */
  async getLocations() {
    try {
      if (!this.mybusiness) {
        await this.initializeMyBusinessAPI();
      }

      const response = await this.mybusiness.accounts.locations.list({
        parent: 'accounts/' + process.env.GOOGLE_ACCOUNT_ID
      });

      return response.data.locations || [];
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      throw error;
    }
  }

  /**
   * Create a new review (Note: Google My Business API doesn't support creating reviews)
   * This is a limitation - reviews can only be created by users through Google's interface
   */
  async createReview(reviewData) {
    throw new Error('Google My Business API does not support creating reviews programmatically. Reviews must be created by users through Google\'s interface.');
  }

  /**
   * Get existing reviews
   */
  async getReviews(locationId = null) {
    try {
      if (!this.mybusiness) {
        await this.initializeMyBusinessAPI();
      }

      const targetLocationId = locationId || this.locationId;
      if (!targetLocationId) {
        throw new Error('No location ID specified');
      }

      const response = await this.mybusiness.accounts.locations.reviews.list({
        parent: `accounts/${process.env.GOOGLE_ACCOUNT_ID}/locations/${targetLocationId}`
      });

      return response.data.reviews || [];
    } catch (error) {
      console.error('❌ Error fetching reviews:', error);
      throw error;
    }
  }

  /**
   * Respond to an existing review
   */
  async respondToReview(reviewId, responseText, locationId = null) {
    try {
      if (!this.mybusiness) {
        await this.initializeMyBusinessAPI();
      }

      const targetLocationId = locationId || this.locationId;
      if (!targetLocationId) {
        throw new Error('No location ID specified');
      }

      const response = await this.mybusiness.accounts.locations.reviews.updateReply({
        name: `accounts/${process.env.GOOGLE_ACCOUNT_ID}/locations/${targetLocationId}/reviews/${reviewId}`,
        requestBody: {
          comment: responseText
        }
      });

      console.log('✅ Review response posted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error responding to review:', error);
      throw error;
    }
  }

  /**
   * Get business insights and analytics
   */
  async getBusinessInsights(locationId = null) {
    try {
      if (!this.mybusiness) {
        await this.initializeMyBusinessAPI();
      }

      const targetLocationId = locationId || this.locationId;
      if (!targetLocationId) {
        throw new Error('No location ID specified');
      }

      const response = await this.mybusiness.accounts.locations.reportInsights({
        name: `accounts/${process.env.GOOGLE_ACCOUNT_ID}/locations/${targetLocationId}`,
        requestBody: {
          locationMetrics: ['QUERIES_DIRECT', 'QUERIES_INDIRECT', 'VIEWS_MAPS', 'VIEWS_SEARCH'],
          timeRange: {
            startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date().toISOString()
          }
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching business insights:', error);
      throw error;
    }
  }

  /**
   * Check API health and configuration
   */
  async checkHealth() {
    try {
      if (!this.isConfigured) {
        return {
          status: 'not_configured',
          message: 'Google My Business API not configured',
          details: 'Missing credentials or refresh token'
        };
      }

      // Try to get locations to test API connectivity
      const locations = await this.getLocations();
      
      return {
        status: 'healthy',
        message: 'Google My Business API is working',
        details: {
          locationsCount: locations.length,
          configured: this.isConfigured,
          hasAuth: !!this.auth
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Google My Business API error',
        details: error.message
      };
    }
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus() {
    return {
      isConfigured: this.isConfigured,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
      hasLocationId: !!this.locationId,
      hasAccountId: !!process.env.GOOGLE_ACCOUNT_ID
    };
  }

  /**
   * Update business information
   */
  async updateBusinessInfo(updates, locationId = null) {
    try {
      if (!this.mybusiness) {
        await this.initializeMyBusinessAPI();
      }

      const targetLocationId = locationId || this.locationId;
      if (!targetLocationId) {
        throw new Error('No location ID specified');
      }

      const response = await this.mybusiness.accounts.locations.patch({
        name: `accounts/${process.env.GOOGLE_ACCOUNT_ID}/locations/${targetLocationId}`,
        requestBody: updates,
        updateMask: Object.keys(updates).join(',')
      });

      console.log('✅ Business information updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error updating business information:', error);
      throw error;
    }
  }
}

module.exports = GoogleMyBusinessService;
