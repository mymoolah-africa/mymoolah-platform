const SecureTokenService = require('../services/secureTokenService');

/**
 * Secure Token Middleware for MyMoolah Platform
 * Validates secure tokens for incoming API requests
 */
class SecureTokenMiddleware {
    constructor(subscriberKey = '@tcjAwn$5B9Aet91') {
        this.secureTokenService = new SecureTokenService(subscriberKey);
    }

    /**
     * Middleware to validate secure token for credit transfer requests
     */
    validateCreditTransferToken(req, res, next) {
        try {
            const { secureToken, ...payload } = req.body;

            if (!secureToken) {
                return res.status(400).json({
                    messageRequestID: this.generateMessageId('CRTRF'),
                    messageResultDetail: {
                        resultCode: 'ECL8070004',
                        resultDescription: 'ERROR_REQUIRED_DATA_MISSING',
                        resultMessage: 'The secureToken field is required.',
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            // Validate secure token
            const isValid = this.secureTokenService.validateSecureToken(req.body, secureToken);

            if (!isValid) {
                return res.status(200).json({
                    messageRequestID: this.generateMessageId('CRTRF'),
                    messageResultDetail: {
                        resultCode: 'ECL8070006',
                        resultDescription: 'ERROR_CRYPTOGRAPHY',
                        resultMessage: 'Invalid Secure Token',
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            // Additional validations
            const validationResult = this.validateCreditTransferFields(payload);
            if (!validationResult.isValid) {
                return res.status(200).json({
                    messageRequestID: this.generateMessageId('CRTRF'),
                    messageResultDetail: {
                        resultCode: validationResult.errorCode,
                        resultDescription: validationResult.errorDescription,
                        resultMessage: validationResult.errorMessage,
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Secure token validation error:', error);
            return res.status(200).json({
                messageRequestID: this.generateMessageId('CRTRF'),
                messageResultDetail: {
                    resultCode: 'ECL8070005',
                    resultDescription: 'ERROR_INTERNAL_SYSTEM_ERROR',
                    resultMessage: 'Internal system error during validation',
                    transactionIdentifier: req.body.transactionIdentifier || '',
                    processingTransactionId: ''
                }
            });
        }
    }

    /**
     * Middleware to validate secure token for list banks requests
     */
    validateListBanksToken(req, res, next) {
        try {
            const { secureToken, ...payload } = req.body;

            if (!secureToken) {
                return res.status(400).json({
                    messageRequestID: this.generateMessageId('BKLST'),
                    messageResultDetail: {
                        resultCode: 'ECL8060004',
                        resultDescription: 'ERROR_REQUIRED_DATA_MISSING',
                        resultMessage: 'The secureToken field is required.',
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            // Validate secure token
            const isValid = this.secureTokenService.validateSecureToken(req.body, secureToken);

            if (!isValid) {
                return res.status(200).json({
                    messageRequestID: this.generateMessageId('BKLST'),
                    messageResultDetail: {
                        resultCode: 'ECL8060006',
                        resultDescription: 'ERROR_CRYPTOGRAPHY',
                        resultMessage: 'Invalid Secure Token',
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            // Additional validations
            const validationResult = this.validateListBanksFields(payload);
            if (!validationResult.isValid) {
                return res.status(200).json({
                    messageRequestID: this.generateMessageId('BKLST'),
                    messageResultDetail: {
                        resultCode: validationResult.errorCode,
                        resultDescription: validationResult.errorDescription,
                        resultMessage: validationResult.errorMessage,
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Secure token validation error:', error);
            return res.status(200).json({
                messageRequestID: this.generateMessageId('BKLST'),
                messageResultDetail: {
                    resultCode: 'ECL8060005',
                    resultDescription: 'ERROR_INTERNAL_SYSTEM_ERROR',
                    resultMessage: 'Internal system error during validation',
                    transactionIdentifier: req.body.transactionIdentifier || '',
                    processingTransactionId: ''
                }
            });
        }
    }

    /**
     * Middleware to validate secure token for payment status requests
     */
    validatePaymentStatusToken(req, res, next) {
        try {
            const { secureToken, ...payload } = req.body;

            if (!secureToken) {
                return res.status(400).json({
                    messageRequestID: this.generateMessageId('PSRQT'),
                    messageResultDetail: {
                        resultCode: 'ECL8110004',
                        resultDescription: 'ERROR_REQUIRED_DATA_MISSING',
                        resultMessage: 'The secureToken field is required.',
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            // Validate secure token
            const isValid = this.secureTokenService.validateSecureToken(req.body, secureToken);

            if (!isValid) {
                return res.status(200).json({
                    messageRequestID: this.generateMessageId('PSRQT'),
                    messageResultDetail: {
                        resultCode: 'ECL8110006',
                        resultDescription: 'ERROR_CRYPTOGRAPHY',
                        resultMessage: 'Invalid Secure Token',
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            // Additional validations
            const validationResult = this.validatePaymentStatusFields(payload);
            if (!validationResult.isValid) {
                return res.status(200).json({
                    messageRequestID: this.generateMessageId('PSRQT'),
                    messageResultDetail: {
                        resultCode: validationResult.errorCode,
                        resultDescription: validationResult.errorDescription,
                        resultMessage: validationResult.errorMessage,
                        transactionIdentifier: payload.transactionIdentifier || '',
                        processingTransactionId: ''
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Secure token validation error:', error);
            return res.status(200).json({
                messageRequestID: this.generateMessageId('PSRQT'),
                messageResultDetail: {
                    resultCode: 'ECL8110005',
                    resultDescription: 'ERROR_INTERNAL_SYSTEM_ERROR',
                    resultMessage: 'Internal system error during validation',
                    transactionIdentifier: req.body.transactionIdentifier || '',
                    processingTransactionId: ''
                }
            });
        }
    }

    /**
     * Validate credit transfer request fields
     */
    validateCreditTransferFields(payload) {
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

        // Check required fields
        for (const field of requiredFields) {
            if (!payload[field]) {
                return {
                    isValid: false,
                    errorCode: 'ECL8070004',
                    errorDescription: 'ERROR_REQUIRED_DATA_MISSING',
                    errorMessage: `The ${field} field is required.`
                };
            }
        }

        // Validate field types and formats
        if (!this.secureTokenService.validateUETR(payload.transactionUETR)) {
            return {
                isValid: false,
                errorCode: 'ECL8070003',
                errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                errorMessage: 'Invalid UETR format.'
            };
        }

        if (!this.secureTokenService.validateTransactionType(payload.transactionType)) {
            return {
                isValid: false,
                errorCode: 'ECL8070003',
                errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                errorMessage: 'Invalid transaction type. Must be PBPX or PBAC.'
            };
        }

        if (!this.secureTokenService.validateCreationDateTime(payload.creationDateTime)) {
            return {
                isValid: false,
                errorCode: 'ECL8070003',
                errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                errorMessage: 'Invalid creation date time format.'
            };
        }

        if (typeof payload.transactionAmount !== 'number' || payload.transactionAmount < 0) {
            return {
                isValid: false,
                errorCode: 'ECL8070001',
                errorDescription: 'ERROR_INVALID_FIELD_TYPE',
                errorMessage: 'Transaction amount must be a positive number.'
            };
        }

        // Validate payee account details for PBAC transactions
        if (payload.transactionType === 'PBAC') {
            if (!payload.payeeAccountDetail.partyAccountBank) {
                return {
                    isValid: false,
                    errorCode: 'ECL8070003',
                    errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                    errorMessage: 'Bank BICFI is required for PBAC transactions.'
                };
            }

            if (!this.secureTokenService.validateBICFI(payload.payeeAccountDetail.partyAccountBank)) {
                return {
                    isValid: false,
                    errorCode: 'ECL8070003',
                    errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                    errorMessage: 'Invalid bank BICFI format.'
                };
            }
        }

        // Validate proxy details for PBPX transactions
        if (payload.transactionType === 'PBPX') {
            if (!payload.payeeAccountDetail.partyProxy) {
                return {
                    isValid: false,
                    errorCode: 'ECL8070004',
                    errorDescription: 'ERROR_REQUIRED_DATA_MISSING',
                    errorMessage: 'Proxy identifier is required for PBPX transactions.'
                };
            }

            if (!payload.payeeAccountDetail.partyProxyType) {
                return {
                    isValid: false,
                    errorCode: 'ECL8070004',
                    errorDescription: 'ERROR_REQUIRED_DATA_MISSING',
                    errorMessage: 'Proxy type is required for PBPX transactions.'
                };
            }

            if (!this.secureTokenService.validateProxyType(payload.payeeAccountDetail.partyProxyType)) {
                return {
                    isValid: false,
                    errorCode: 'ECL8070003',
                    errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                    errorMessage: 'Invalid proxy type. Must be MBNO or CUST.'
                };
            }

            if (payload.payeeAccountDetail.partyProxyType === 'MBNO') {
                if (!this.secureTokenService.validateMobileNumber(payload.payeeAccountDetail.partyProxy)) {
                    return {
                        isValid: false,
                        errorCode: 'ECL8070003',
                        errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                        errorMessage: 'Invalid mobile number format for MBNO proxy type.'
                    };
                }
            }
        }

        return { isValid: true };
    }

    /**
     * Validate list banks request fields
     */
    validateListBanksFields(payload) {
        const requiredFields = [
            'subscriberID',
            'creationDateTime',
            'transactionIdentifier'
        ];

        // Check required fields
        for (const field of requiredFields) {
            if (!payload[field]) {
                return {
                    isValid: false,
                    errorCode: 'ECL8060004',
                    errorDescription: 'ERROR_REQUIRED_DATA_MISSING',
                    errorMessage: `The ${field} field is required.`
                };
            }
        }

        // Validate creation date time format
        if (!this.secureTokenService.validateCreationDateTime(payload.creationDateTime)) {
            return {
                isValid: false,
                errorCode: 'ECL8060003',
                errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                errorMessage: 'Invalid creation date time format.'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate payment status request fields
     */
    validatePaymentStatusFields(payload) {
        const requiredFields = [
            'subscriberID',
            'primaryHostReference',
            'secondaryHostReference',
            'creationDateTime',
            'transactionIdentifier',
            'originalTransactionIdentifier',
            'originalUETR'
        ];

        // Check required fields
        for (const field of requiredFields) {
            if (!payload[field]) {
                return {
                    isValid: false,
                    errorCode: 'ECL8110004',
                    errorDescription: 'ERROR_REQUIRED_DATA_MISSING',
                    errorMessage: `The ${field} field is required.`
                };
            }
        }

        // Validate UETR format
        if (!this.secureTokenService.validateUETR(payload.originalUETR)) {
            return {
                isValid: false,
                errorCode: 'ECL8110003',
                errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                errorMessage: 'Invalid original UETR format.'
            };
        }

        // Validate creation date time format
        if (!this.secureTokenService.validateCreationDateTime(payload.creationDateTime)) {
            return {
                isValid: false,
                errorCode: 'ECL8110003',
                errorDescription: 'ERROR_INVALID_FIELD_VALUE',
                errorMessage: 'Invalid creation date time format.'
            };
        }

        return { isValid: true };
    }

    /**
     * Generate message identification
     */
    generateMessageId(serviceCode) {
        const now = new Date();
        const dateStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');
        const timeStr = now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0') + 
                       now.getSeconds().toString().padStart(2, '0');
        const sequence = Math.floor(Math.random() * 999999999999).toString().padStart(12, '0');
        
        return `${dateStr}_SASF_${serviceCode}_902${sequence}`;
    }
}

module.exports = SecureTokenMiddleware; 