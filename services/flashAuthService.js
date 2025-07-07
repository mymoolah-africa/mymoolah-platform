/**
 * Flash Authentication Service - MyMoolah Treasury Platform
 * 
 * Handles OAuth 2.0 authentication for Flash Partner API v4
 * Manages token generation, caching, and refresh logic
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const axios = require('axios');
const crypto = require('crypto');

class FlashAuthService {
    constructor() {
        this.baseUrl = process.env.FLASH_API_URL || 'https://api.flashswitch.flash-group.com';
        this.tokenUrl = `${this.baseUrl}/token`;
        this.apiVersion = 'v4';
        this.apiUrl = `${this.baseUrl}/${this.apiVersion}`;
        
        // Token management
        this.accessToken = null;
        this.tokenExpiry = null;
        this.tokenRefreshBuffer = 300; // 5 minutes buffer before expiry
        
        // API credentials
        this.consumerKey = process.env.FLASH_CONSUMER_KEY;
        this.consumerSecret = process.env.FLASH_CONSUMER_SECRET;
        
        // Validation
        this.validateCredentials();
        
        console.log('✅ Flash Auth Service: Initialized');
    }

    /**
     * Validate required credentials
     */
    validateCredentials() {
        if (!this.consumerKey || !this.consumerSecret) {
            console.error('❌ Flash Auth Service: Missing FLASH_CONSUMER_KEY or FLASH_CONSUMER_SECRET environment variables');
            throw new Error('Flash API credentials not configured');
        }
    }

    /**
     * Generate Base64 encoded credentials for Basic Auth
     * @returns {string} Base64 encoded consumer-key:consumer-secret
     */
    generateBasicAuthHeader() {
        const credentials = `${this.consumerKey}:${this.consumerSecret}`;
        return Buffer.from(credentials).toString('base64');
    }

    /**
     * Request new access token from Flash API
     * @returns {Promise<Object>} Token response with access_token and expires_in
     */
    async requestAccessToken() {
        try {
            console.log('🔄 Flash Auth Service: Requesting new access token...');
            
            const response = await axios.post(this.tokenUrl, 
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${this.generateBasicAuthHeader()}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );

            if (response.status !== 200) {
                throw new Error(`Token request failed with status ${response.status}`);
            }

            const tokenData = response.data;
            
            if (!tokenData.access_token || !tokenData.expires_in) {
                throw new Error('Invalid token response from Flash API');
            }

            // Set token expiry time (subtract buffer time)
            const expiryTime = Date.now() + (tokenData.expires_in * 1000) - (this.tokenRefreshBuffer * 1000);
            
            this.accessToken = tokenData.access_token;
            this.tokenExpiry = expiryTime;

            console.log('✅ Flash Auth Service: New access token obtained');
            return tokenData;

        } catch (error) {
            console.error('❌ Flash Auth Service: Error requesting access token:', error.message);
            throw new Error(`Failed to obtain Flash access token: ${error.message}`);
        }
    }

    /**
     * Check if current token is valid and not expired
     * @returns {boolean} True if token is valid
     */
    isTokenValid() {
        return this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry;
    }

    /**
     * Get valid access token (request new one if needed)
     * @returns {Promise<string>} Valid access token
     */
    async getAccessToken() {
        if (!this.isTokenValid()) {
            await this.requestAccessToken();
        }
        return this.accessToken;
    }

    /**
     * Generate headers for Flash API requests
     * @returns {Promise<Object>} Headers object with Authorization and Accept
     */
    async generateRequestHeaders() {
        const accessToken = await this.getAccessToken();
        
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    /**
     * Make authenticated request to Flash API
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {Object} data - Request body (for POST/PUT requests)
     * @returns {Promise<Object>} Flash API response
     */
    async makeAuthenticatedRequest(method, endpoint, data = null) {
        try {
            const headers = await this.generateRequestHeaders();
            const url = `${this.apiUrl}${endpoint}`;
            
            const config = {
                method: method.toLowerCase(),
                url: url,
                headers: headers,
                timeout: 30000
            };

            if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
                config.data = data;
            }

            console.log(`🔄 Flash Auth Service: Making ${method.toUpperCase()} request to ${endpoint}`);
            
            const response = await axios(config);
            
            // Check for Flash API error response
            if (response.data && response.data.responseCode !== undefined && response.data.responseCode !== 0) {
                throw new Error(`Flash API Error: ${response.data.responseMessage || 'Unknown error'} (Code: ${response.data.responseCode})`);
            }

            return response.data;

        } catch (error) {
            console.error(`❌ Flash Auth Service: Error making request to ${endpoint}:`, error.message);
            
            // If it's an authentication error, try to refresh token and retry once
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                console.log('🔄 Flash Auth Service: Authentication error, refreshing token and retrying...');
                this.accessToken = null; // Force token refresh
                this.tokenExpiry = null;
                
                try {
                    const headers = await this.generateRequestHeaders();
                    const url = `${this.apiUrl}${endpoint}`;
                    
                    const config = {
                        method: method.toLowerCase(),
                        url: url,
                        headers: headers,
                        timeout: 30000
                    };

                    if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
                        config.data = data;
                    }

                    const retryResponse = await axios(config);
                    
                    if (retryResponse.data && retryResponse.data.responseCode !== undefined && retryResponse.data.responseCode !== 0) {
                        throw new Error(`Flash API Error: ${retryResponse.data.responseMessage || 'Unknown error'} (Code: ${retryResponse.data.responseCode})`);
                    }

                    return retryResponse.data;

                } catch (retryError) {
                    throw new Error(`Flash API request failed after token refresh: ${retryError.message}`);
                }
            }
            
            throw error;
        }
    }

    /**
     * Generate unique reference for Flash API requests
     * @param {string} prefix - Optional prefix for the reference
     * @returns {string} Unique reference string
     */
    generateReference(prefix = 'MM') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * Validate reference format (only alphanumeric, -, ., = allowed)
     * @param {string} reference - Reference to validate
     * @returns {boolean} True if valid
     */
    validateReference(reference) {
        const referencePattern = /^[a-zA-Z0-9\-\.=]+$/;
        return referencePattern.test(reference);
    }

    /**
     * Validate amount (must be positive integer in cents)
     * @param {number} amount - Amount to validate
     * @returns {boolean} True if valid
     */
    validateAmount(amount) {
        return Number.isInteger(amount) && amount > 0;
    }

    /**
     * Validate account number (alphanumeric only)
     * @param {string} accountNumber - Account number to validate
     * @returns {boolean} True if valid
     */
    validateAccountNumber(accountNumber) {
        const accountPattern = /^[a-zA-Z0-9]+$/;
        return accountPattern.test(accountNumber);
    }

    /**
     * Validate mobile number (11 digits, 27 country code, no leading 0)
     * @param {string} mobileNumber - Mobile number to validate
     * @returns {boolean} True if valid
     */
    validateMobileNumber(mobileNumber) {
        const mobilePattern = /^27[1-9][0-9]{8}$/;
        return mobilePattern.test(mobileNumber);
    }

    /**
     * Validate metadata (up to 9 properties, 10 chars name, 43 chars value)
     * @param {Object} metadata - Metadata to validate
     * @returns {boolean} True if valid
     */
    validateMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return true; // Optional field
        }

        const keys = Object.keys(metadata);
        if (keys.length > 9) {
            return false;
        }

        return keys.every(key => {
            return key.length <= 10 && 
                   typeof metadata[key] === 'string' && 
                   metadata[key].length <= 43;
        });
    }

    /**
     * Health check for Flash authentication
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const token = await this.getAccessToken();
            return {
                status: 'healthy',
                tokenValid: this.isTokenValid(),
                tokenExpiry: this.tokenExpiry,
                apiUrl: this.apiUrl
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                apiUrl: this.apiUrl
            };
        }
    }
}

module.exports = FlashAuthService; 