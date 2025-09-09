/**
 * MobileMart Authentication Service - MyMoolah Treasury Platform
 * 
 * Handles OAuth 2.0 authentication for MobileMart Fulcrum API
 * Manages token generation, caching, and refresh logic
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const axios = require('axios');

class MobileMartAuthService {
    constructor() {
        this.baseUrl = process.env.MOBILEMART_API_URL || 'https://api.mobilemart.co.za';
        this.tokenUrl = `${this.baseUrl}/oauth/token`;
        this.apiVersion = 'v1';
        this.apiUrl = `${this.baseUrl}/api/${this.apiVersion}`;
        
        // Token management
        this.accessToken = null;
        this.tokenExpiry = null;
        this.tokenRefreshBuffer = 300; // 5 minutes buffer before expiry
        
        // API credentials
        this.clientId = process.env.MOBILEMART_CLIENT_ID;
        this.clientSecret = process.env.MOBILEMART_CLIENT_SECRET;
        
        // Validation
        this.validateCredentials();
        

    }

    /**
     * Validate required credentials
     * Note: In development mode, supplier integrations use database product catalogs
     * Live API credentials are only required when integrations are activated
     */
    validateCredentials() {
        const isLiveIntegration = process.env.MOBILEMART_LIVE_INTEGRATION === 'true';
        
        if (isLiveIntegration && (!this.clientId || !this.clientSecret)) {
            console.error('❌ MobileMart Auth Service: Missing MOBILEMART_CLIENT_ID or MOBILEMART_CLIENT_SECRET environment variables');
            throw new Error('MobileMart API credentials not configured for live integration');
        }
        
        if (!isLiveIntegration) {
            console.log('ℹ️  MobileMart Auth Service: Operating in database mode - using seeded product catalogs');
        }
    }

    /**
     * Request new access token from MobileMart API
     * @returns {Promise<Object>} Token response with access_token and expires_in
     */
    async requestAccessToken() {
        try {

            
            const response = await axios.post(this.tokenUrl, 
                {
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.status !== 200) {
                throw new Error(`Token request failed with status ${response.status}`);
            }

            const tokenData = response.data;
            
            if (!tokenData.access_token || !tokenData.expires_in) {
                throw new Error('Invalid token response from MobileMart API');
            }

            // Set token expiry time (subtract buffer time)
            const expiryTime = Date.now() + (tokenData.expires_in * 1000) - (this.tokenRefreshBuffer * 1000);
            
            this.accessToken = tokenData.access_token;
            this.tokenExpiry = expiryTime;


            return tokenData;

        } catch (error) {
            console.error('❌ MobileMart Auth Service: Error requesting access token:', error.message);
            throw new Error(`Failed to obtain MobileMart access token: ${error.message}`);
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
     * Generate headers for MobileMart API requests
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
     * Make authenticated request to MobileMart API
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {Object} data - Request body (for POST/PUT requests)
     * @returns {Promise<Object>} MobileMart API response
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

    
            
            const response = await axios(config);
            
            // Check for MobileMart API error response
            if (response.data && response.data.errorCode !== undefined && response.data.errorCode !== 0) {
                throw new Error(`MobileMart API Error: ${response.data.errorMessage || 'Unknown error'} (Code: ${response.data.errorCode})`);
            }

            return response.data;

        } catch (error) {
            console.error(`❌ MobileMart Auth Service: Error making request to ${endpoint}:`, error.message);
            
            // If it's an authentication error, try to refresh token and retry once
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    
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
                    
                    if (retryResponse.data && retryResponse.data.errorCode !== undefined && retryResponse.data.errorCode !== 0) {
                        throw new Error(`MobileMart API Error: ${retryResponse.data.errorMessage || 'Unknown error'} (Code: ${retryResponse.data.errorCode})`);
                    }

                    return retryResponse.data;

                } catch (retryError) {
                    throw new Error(`MobileMart API request failed after token refresh: ${retryError.message}`);
                }
            }
            
            throw error;
        }
    }

    /**
     * Health check for MobileMart authentication
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

module.exports = MobileMartAuthService; 