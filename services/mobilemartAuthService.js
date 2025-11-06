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
        // MobileMart Fulcrum API base URL
        // UAT: https://uat.fulcrumswitch.com
        // PROD: https://fulcrumswitch.com (or provided via env)
        // Note: Use UAT for testing, PROD URL provided after compliance testing
        const defaultBaseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://fulcrumswitch.com' 
            : 'https://uat.fulcrumswitch.com';
        this.baseUrl = process.env.MOBILEMART_API_URL || defaultBaseUrl;
        
        // OAuth token endpoint - MobileMart Fulcrum uses /connect/token (IdentityServer4/OpenIddict pattern)
        // This endpoint accepts POST requests with client_credentials grant type
        this.tokenUrl = process.env.MOBILEMART_TOKEN_URL || `${this.baseUrl}/connect/token`;
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

            
            // Log request details for debugging
            console.log('🔍 MobileMart Token Request:', {
                url: this.tokenUrl,
                method: 'POST',
                grant_type: 'client_credentials',
                client_id: this.clientId?.substring(0, 10) + '...',
                has_secret: !!this.clientSecret
            });
            
            // Try form-urlencoded format (OAuth 2.0 standard)
            const formData = new URLSearchParams();
            formData.append('grant_type', 'client_credentials');
            formData.append('client_id', this.clientId);
            formData.append('client_secret', this.clientSecret);
            
            const response = await axios.post(this.tokenUrl, 
                formData.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    timeout: 10000,
                    // Handle SSL certificate issues (for development/testing)
                    httpsAgent: process.env.NODE_ENV === 'production' ? undefined : 
                        new (require('https').Agent)({ rejectUnauthorized: false }),
                    validateStatus: function (status) {
                        return status >= 200 && status < 600; // Accept all status codes for debugging
                    }
                }
            );

            // Log full response details
            console.log('🔍 MobileMart HTTP Response:', {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                dataType: typeof response.data
            });

            if (response.status !== 200) {
                throw new Error(`Token request failed with status ${response.status}: ${JSON.stringify(response.data)}`);
            }

            const tokenData = response.data;
            
            // Handle empty response or different response formats
            if (!tokenData || (typeof tokenData === 'string' && tokenData.trim() === '')) {
                throw new Error(`Empty response from MobileMart API. Status: ${response.status}, Headers: ${JSON.stringify(response.headers)}`);
            }
            
            // Handle different response formats
            let accessToken, expiresIn;
            if (typeof tokenData === 'string') {
                try {
                    const parsed = JSON.parse(tokenData);
                    accessToken = parsed.access_token || parsed.token || parsed.accessToken;
                    expiresIn = parsed.expires_in || parsed.expires || parsed.expiresIn;
                } catch (e) {
                    throw new Error(`Invalid token response format: ${tokenData}`);
                }
            } else if (typeof tokenData === 'object') {
                accessToken = tokenData.access_token || tokenData.token || tokenData.accessToken;
                expiresIn = tokenData.expires_in || tokenData.expires || tokenData.expiresIn;
            }
            
            if (!accessToken || !expiresIn) {
                throw new Error(`Invalid token response from MobileMart API. Response: ${JSON.stringify(tokenData)}`);
            }

            // Set token expiry time (subtract buffer time)
            const expiryTime = Date.now() + (expiresIn * 1000) - (this.tokenRefreshBuffer * 1000);
            
            this.accessToken = accessToken;
            this.tokenExpiry = expiryTime;

            return {
                access_token: accessToken,
                expires_in: expiresIn,
                token_type: tokenData.token_type || 'Bearer'
            };

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
                timeout: 30000,
                // Handle SSL certificate issues (for development/testing)
                httpsAgent: process.env.NODE_ENV === 'production' ? undefined : 
                    new (require('https').Agent)({ rejectUnauthorized: false })
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
                        timeout: 30000,
                        // Handle SSL certificate issues (for development/testing)
                        httpsAgent: process.env.NODE_ENV === 'production' ? undefined : 
                            new (require('https').Agent)({ rejectUnauthorized: false })
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