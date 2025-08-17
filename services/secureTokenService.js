const crypto = require('crypto');

/**
 * Secure Token Service for MyMoolah Platform
 * Implements Mercury secure token generation and validation according to specifications
 */
class SecureTokenService {
    constructor(subscriberKey = '@tcjAwn$5B9Aet91') {
        this.subscriberKey = subscriberKey;
    }

    /**
     * Remove secureToken field from payload for token generation
     * @param {Object} requestBody - The request payload
     * @returns {string} - Payload without secureToken field
     */
    removeSecureTokenFromPayload(requestBody) {
        if (!requestBody || typeof requestBody !== 'object') {
            throw new Error('Request body must be a valid object');
        }

        // Create a copy of the request body
        const payload = { ...requestBody };
        
        // Remove the secureToken field if it exists
        if (payload.secureToken) {
            delete payload.secureToken;
        }

        return payload;
    }

    /**
     * Generate secure token from payload
     * @param {Object} requestBody - The request payload
     * @returns {string} - Generated secure token
     */
    getSecureTokenForPayload(requestBody) {
        if (!requestBody || typeof requestBody !== 'object') {
            throw new Error('Request body must be a valid object');
        }

        // Step 1: Remove secureToken from payload
        const payloadWithoutToken = this.removeSecureTokenFromPayload(requestBody);
        
        // Step 2: Convert to string and add opening brace
        let requestBodyString = JSON.stringify(payloadWithoutToken);
        
        // Step 3: Remove quotes and spaces as per specification
        // Step 3: Remove quotes, backslashes, and spaces as per specification
        requestBodyString = requestBodyString.replace(/"/g, '').replace(/\\/g, '').replace(/\s/g, '');
        
        // Step 4: Prepend subscriber key and trim
        const sourceString = this.subscriberKey + requestBodyString;
        
        // Step 5: Generate hash
        const hash = this.getHash(sourceString, this.subscriberKey);
        
        return hash;
    }

    /**
     * Generate HMAC-SHA256 hash
     * @param {string} data - Data to hash
     * @param {string} secret - Secret key
     * @returns {string} - Hexadecimal hash string
     */
    getHash(data, secret) {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(data);
        const hashBytes = hmac.digest();
        
        // Convert to hexadecimal string
        let digest = '';
        for (const byte of hashBytes) {
            digest += byte.toString(16).padStart(2, '0');
        }
        
        return digest;
    }

    /**
     * Validate secure token against payload
     * @param {Object} requestBody - The request payload
     * @param {string} secureToken - The secure token to validate
     * @returns {boolean} - True if token is valid, false otherwise
     */
    validateSecureToken(requestBody, secureToken) {
        try {
            const generatedToken = this.getSecureTokenForPayload(requestBody);
            return generatedToken === secureToken;
        } catch (error) {
            console.error('Error validating secure token:', error);
            return false;
        }
    }

    /**
     * Add secure token to payload
     * @param {Object} payload - The payload to add token to
     * @returns {Object} - Payload with secure token added
     */
    addSecureTokenToPayload(payload) {
        const secureToken = this.getSecureTokenForPayload(payload);
        return {
            secureToken,
            ...payload
        };
    }

    /**
     * Generate secure token for credit transfer request
     * @param {Object} creditTransferRequest - Credit transfer request payload
     * @returns {string} - Generated secure token
     */
    generateCreditTransferToken(creditTransferRequest) {
        const requiredFields = [
            'subscriberID',
            'primaryHostReference',
            'secondaryHostReference',
            'creationDateTime',
            'transactionIdentifier',
            'transactionUETR',
            'transactionType',
            'transactionAmount',
            'transactionReference',
            'payerDetails',
            'payerAccountDetail',
            'payeeDetails',
            'payeeAccountDetail'
        ];

        // Validate required fields
        for (const field of requiredFields) {
            if (!creditTransferRequest[field]) {
                throw new Error(`Required field missing: ${field}`);
            }
        }

        return this.getSecureTokenForPayload(creditTransferRequest);
    }

    /**
     * Generate secure token for list all banks request
     * @param {Object} listBanksRequest - List banks request payload
     * @returns {string} - Generated secure token
     */
    generateListBanksToken(listBanksRequest) {
        const requiredFields = [
            'subscriberID',
            'creationDateTime',
            'transactionIdentifier'
        ];

        // Validate required fields
        for (const field of requiredFields) {
            if (!listBanksRequest[field]) {
                throw new Error(`Required field missing: ${field}`);
            }
        }

        return this.getSecureTokenForPayload(listBanksRequest);
    }

    /**
     * Generate secure token for payment status request
     * @param {Object} paymentStatusRequest - Payment status request payload
     * @returns {string} - Generated secure token
     */
    generatePaymentStatusToken(paymentStatusRequest) {
        const requiredFields = [
            'subscriberID',
            'primaryHostReference',
            'secondaryHostReference',
            'creationDateTime',
            'transactionIdentifier',
            'originalTransactionIdentifier',
            'originalUETR'
        ];

        // Validate required fields
        for (const field of requiredFields) {
            if (!paymentStatusRequest[field]) {
                throw new Error(`Required field missing: ${field}`);
            }
        }

        return this.getSecureTokenForPayload(paymentStatusRequest);
    }

    /**
     * Generate secure token for payment status report
     * @param {Object} paymentStatusReport - Payment status report payload
     * @returns {string} - Generated secure token
     */
    generatePaymentStatusReportToken(paymentStatusReport) {
        const requiredFields = [
            'subscriberID',
            'messageIdentification',
            'creationDateTime',
            'transactionIdentifier',
            'originalProcessingTransactionId',
            'originalTransactionIdentifier',
            'originalUETR',
            'transactionStatus',
            'transactionStatusDescription'
        ];

        // Validate required fields
        for (const field of requiredFields) {
            if (!paymentStatusReport[field]) {
                throw new Error(`Required field missing: ${field}`);
            }
        }

        return this.getSecureTokenForPayload(paymentStatusReport);
    }

    /**
     * Validate UETR format
     * @param {string} uetr - UETR to validate
     * @returns {boolean} - True if valid UETR format
     */
    validateUETR(uetr) {
        const uetrPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
        return uetrPattern.test(uetr);
    }

    /**
     * Validate BICFI format
     * @param {string} bicfi - BICFI to validate
     * @returns {boolean} - True if valid BICFI format
     */
    validateBICFI(bicfi) {
        const bicfiPattern = /^[A-Z0-9]{4,4}[A-Z]{2,2}[A-Z0-9]{2,2}([A-Z0-9]{3,3}){0,1}$/;
        return bicfiPattern.test(bicfi);
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email format
     */
    validateEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    /**
     * Validate mobile number format
     * @param {string} mobileNumber - Mobile number to validate
     * @returns {boolean} - True if valid mobile number format
     */
    validateMobileNumber(mobileNumber) {
        const mobilePattern = /^\+[0-9]{1,3}-[0-9()+\-]{1,30}$/;
        return mobilePattern.test(mobileNumber);
    }

    /**
     * Validate creation date time format
     * @param {string} creationDateTime - DateTime to validate
     * @returns {boolean} - True if valid datetime format
     */
    validateCreationDateTime(creationDateTime) {
        const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/;
        return dateTimePattern.test(creationDateTime);
    }

    /**
     * Validate transaction type
     * @param {string} transactionType - Transaction type to validate
     * @returns {boolean} - True if valid transaction type
     */
    validateTransactionType(transactionType) {
        return ['PBPX', 'PBAC'].includes(transactionType);
    }

    /**
     * Validate transaction status
     * @param {string} transactionStatus - Transaction status to validate
     * @returns {boolean} - True if valid transaction status
     */
    validateTransactionStatus(transactionStatus) {
        return ['ACCP', 'RJCT', 'ACCC', 'PDNG', 'CANC'].includes(transactionStatus);
    }

    /**
     * Validate proxy type
     * @param {string} proxyType - Proxy type to validate
     * @returns {boolean} - True if valid proxy type
     */
    validateProxyType(proxyType) {
        return ['MBNO', 'CUST'].includes(proxyType);
    }
}

module.exports = SecureTokenService; 