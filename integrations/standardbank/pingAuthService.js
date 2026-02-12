'use strict';

/**
 * SBSA Ping OAuth 2.0 Authentication Service
 * OneHub Ping Identity - client_credentials grant for RPP/RTP APIs
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const axios = require('axios');

class PingAuthService {
  constructor() {
    this.tokenUrl = process.env.SBSA_PING_TOKEN_URL || 'https://enterprisestssit.standardbank.co.za/as/token.oauth2';
    this.clientId = process.env.SBSA_PING_CLIENT_ID;
    this.clientSecret = process.env.SBSA_PING_CLIENT_SECRET;

    this.accessToken = null;
    this.tokenExpiry = null;
    this.tokenRefreshBuffer = 300; // 5 minutes before expiry
  }

  /**
   * Get valid access token for given scope (request new if needed/cached)
   * @param {string} scope - OAuth scope (e.g. rpp.payments.post rpp.payments.get)
   * @returns {Promise<string>} JWT access token
   */
  async getToken(scope) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('SBSA Ping credentials not configured (SBSA_PING_CLIENT_ID, SBSA_PING_CLIENT_SECRET)');
    }

    if (this.isTokenValid() && this.scope === scope) {
      return this.accessToken;
    }

    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', this.clientId);
    formData.append('client_secret', this.clientSecret);
    formData.append('scope', scope || 'rpp.payments.post rpp.payments.get');

    try {
      const response = await axios.post(this.tokenUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      if (response.status !== 200) {
        throw new Error(`Ping token request failed: ${response.status}`);
      }

      const data = response.data;
      const accessToken = data.access_token || data.token;
      const expiresIn = data.expires_in || 3600;

      if (!accessToken) {
        throw new Error('Invalid Ping token response: no access_token');
      }

      const expiryTime = Date.now() + expiresIn * 1000 - this.tokenRefreshBuffer * 1000;
      this.accessToken = accessToken;
      this.tokenExpiry = expiryTime;
      this.scope = scope;

      return this.accessToken;
    } catch (err) {
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      if (status === 401 || status === 403) {
        throw new Error(`SBSA Ping authentication failed (${status}): Invalid credentials or scope`);
      }
      throw new Error(`Failed to obtain SBSA Ping token: ${err.message}`);
    }
  }

  isTokenValid() {
    return !!this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry;
  }

  clearToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.scope = null;
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new PingAuthService();
  }
  return instance;
}

module.exports = {
  PingAuthService,
  getToken: (scope) => getInstance().getToken(scope),
  getInstance,
};
