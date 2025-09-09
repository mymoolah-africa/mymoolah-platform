/**
 * Zapper API Service - MyMoolah Treasury Platform
 * 
 * Handles authentication and API calls to the Zapper platform
 * Based on official documentation: https://zapper.gitbook.io/zapper-platform
 */

const axios = require('axios');

class ZapperService {
  constructor() {
    this.baseURL = process.env.ZAPPER_API_URL || 'https://api.zapper.com/v1';
    this.orgId = process.env.ZAPPER_ORG_ID;
    this.apiToken = process.env.ZAPPER_API_TOKEN;
    this.xApiKey = process.env.ZAPPER_X_API_KEY;
    this.identityToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders(includeIdentityToken = true) {
    const headers = {
      'x-api-key': this.xApiKey,
      'Content-Type': 'application/json'
    };

    if (includeIdentityToken && this.identityToken) {
      headers['Authorization'] = `Bearer ${this.identityToken}`;
    }

    return headers;
  }

  /**
   * Check if identity token is valid
   */
  isTokenValid() {
    if (!this.identityToken || !this.tokenExpiry) {
      return false;
    }
    return Date.now() < this.tokenExpiry;
  }

  /**
   * Service account login to get identity token
   */
  async authenticate() {
    try {
      if (this.isTokenValid()) {
        return this.identityToken;
      }

      const response = await axios.post(
        `${this.baseURL}/auth/service/login`,
        {
          apiToken: this.apiToken,
          organisationId: this.orgId
        },
        {
          headers: this.getAuthHeaders(false)
        }
      );

      this.identityToken = response.data;
      // Set expiry to 14 minutes (slightly less than 15 minutes for safety)
      this.tokenExpiry = Date.now() + (14 * 60 * 1000);

      
      return this.identityToken;

    } catch (error) {
      console.error('❌ Zapper authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zapper API');
    }
  }

  /**
   * Register a customer with Zapper
   */
  async registerCustomer(userId) {
    try {
      await this.authenticate();

      const response = await axios.post(
        `${this.baseURL}/auth/customers/register`,
        { userId },
        {
          headers: this.getAuthHeaders()
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Zapper customer registration failed:', error.response?.data || error.message);
      throw new Error('Failed to register customer with Zapper');
    }
  }

  /**
   * Customer login with Zapper
   */
  async customerLogin(email, password) {
    try {
      await this.authenticate();

      const response = await axios.post(
        `${this.baseURL}/auth/customers/login`,
        { email, password },
        {
          headers: this.getAuthHeaders()
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Zapper customer login failed:', error.response?.data || error.message);
      throw new Error('Failed to login customer with Zapper');
    }
  }

  /**
   * Decode Zapper QR code
   */
  async decodeQRCode(qrCode) {
    try {
      await this.authenticate();

      const response = await axios.post(
        `${this.baseURL}/codes/decode`,
        { code: qrCode },
        {
          headers: this.getAuthHeaders()
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Zapper QR decode failed:', error.response?.data || error.message);
      throw new Error('Failed to decode QR code with Zapper');
    }
  }

  /**
   * Validate wallet at merchant
   */
  async validateWallet(merchantId, walletId, amount) {
    try {
      await this.authenticate();

      const response = await axios.post(
        `${this.baseURL}/merchants/${merchantId}/validate-wallet`,
        {
          walletId,
          amount
        },
        {
          headers: this.getAuthHeaders()
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Zapper wallet validation failed:', error.response?.data || error.message);
      throw new Error('Failed to validate wallet with Zapper');
    }
  }

  /**
   * Process wallet payment at merchant
   */
  async processWalletPayment(merchantId, paymentData) {
    try {
      await this.authenticate();

      const response = await axios.post(
        `${this.baseURL}/merchants/${merchantId}/process-payment`,
        paymentData,
        {
          headers: this.getAuthHeaders()
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Zapper payment processing failed:', error.response?.data || error.message);
      throw new Error('Failed to process payment with Zapper');
    }
  }

  /**
   * Generate QR code for voucher
   */
  async generateQRCode(voucherData) {
    try {
      await this.authenticate();

      const response = await axios.post(
        `${this.baseURL}/consumer/generate-qr`,
        voucherData,
        {
          headers: this.getAuthHeaders()
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Zapper QR generation failed:', error.response?.data || error.message);
      throw new Error('Failed to generate QR code with Zapper');
    }
  }

  /**
   * Request payment processing
   */
  async requestPayment(paymentRequest) {
    try {
      await this.authenticate();

      const response = await axios.post(
        `${this.baseURL}/payment/request`,
        paymentRequest,
        {
          headers: this.getAuthHeaders()
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Zapper payment request failed:', error.response?.data || error.message);
      throw new Error('Failed to request payment with Zapper');
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    try {
      await this.authenticate();

      const response = await axios.get(
        `${this.baseURL}/payment/status/${paymentId}`,
        {
          headers: this.getAuthHeaders()
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Zapper payment status check failed:', error.response?.data || error.message);
      throw new Error('Failed to get payment status from Zapper');
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        headers: this.getAuthHeaders(false)
      });

      return {
        status: 'healthy',
        service: 'Zapper API',
        timestamp: new Date().toISOString(),
        data: response.data
      };

    } catch (error) {
      console.error('❌ Zapper health check failed:', error.response?.data || error.message);
      return {
        status: 'unhealthy',
        service: 'Zapper API',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus() {
    try {
      const health = await this.healthCheck();
      const isAuthenticated = this.isTokenValid();

      return {
        service: 'Zapper API',
        status: health.status === 'healthy' ? 'operational' : 'degraded',
        authentication: isAuthenticated ? 'authenticated' : 'not_authenticated',
        features: {
          qrDecoding: true,
          walletValidation: true,
          paymentProcessing: true,
          qrGeneration: true,
          customerManagement: true
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Zapper service status check failed:', error.message);
      return {
        service: 'Zapper API',
        status: 'unavailable',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = ZapperService;
