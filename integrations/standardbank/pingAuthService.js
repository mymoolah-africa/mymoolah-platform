'use strict';

/**
 * SBSA Ping OAuth 2.0 Authentication Service
 * OneHub Ping Identity - client_credentials grant for RPP/RTP/Proxy APIs
 *
 * Token cache is keyed by scope string to correctly support multiple scopes
 * (RPP, RTP, Proxy Resolution) without cross-contamination.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-21
 */

const axios = require('axios');

const TOKEN_REFRESH_BUFFER_SECONDS = 300; // refresh 5 minutes before expiry

class PingAuthService {
  constructor() {
    this.tokenUrl = process.env.SBSA_PING_TOKEN_URL || 'https://enterprisestssit.standardbank.co.za/as/token.oauth2';
    this.clientId = process.env.SBSA_PING_CLIENT_ID;
    this.clientSecret = process.env.SBSA_PING_CLIENT_SECRET;

    // Map<scope, { accessToken, tokenExpiry }>
    this._tokenCache = new Map();
  }

  /**
   * Get valid access token for given scope (cached per scope, refreshed when near expiry).
   * @param {string} scope - OAuth scope string
   * @returns {Promise<string>} JWT access token
   */
  async getToken(scope) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('SBSA Ping credentials not configured (SBSA_PING_CLIENT_ID, SBSA_PING_CLIENT_SECRET)');
    }

    const normalizedScope = (scope || 'rpp.payments.post rpp.payments.get').trim();
    const cached = this._tokenCache.get(normalizedScope);

    if (cached && cached.tokenExpiry && Date.now() < cached.tokenExpiry) {
      return cached.accessToken;
    }

    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', this.clientId);
    formData.append('client_secret', this.clientSecret);
    formData.append('scope', normalizedScope);

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

      const tokenExpiry = Date.now() + (expiresIn - TOKEN_REFRESH_BUFFER_SECONDS) * 1000;
      this._tokenCache.set(normalizedScope, { accessToken, tokenExpiry });

      return accessToken;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        throw new Error(`SBSA Ping authentication failed (${status}): Invalid credentials or scope`);
      }
      throw new Error(`Failed to obtain SBSA Ping token: ${err.message}`);
    }
  }

  /**
   * Invalidate cached token for a specific scope (or all scopes).
   * @param {string} [scope] - If omitted, clears all cached tokens
   */
  clearToken(scope) {
    if (scope) {
      this._tokenCache.delete(scope.trim());
    } else {
      this._tokenCache.clear();
    }
  }

  /**
   * Check if a valid token exists for the given scope.
   * @param {string} scope
   * @returns {boolean}
   */
  isTokenValid(scope) {
    const cached = this._tokenCache.get((scope || '').trim());
    return !!(cached && cached.tokenExpiry && Date.now() < cached.tokenExpiry);
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
  clearToken: (scope) => getInstance().clearToken(scope),
  getInstance,
};
