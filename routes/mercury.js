const express = require('express');
const router = express.Router();
const SecureTokenService = require('../services/secureTokenService');
const SecureTokenMiddleware = require('../middleware/secureTokenMiddleware');

const secureTokenService = new SecureTokenService();
const secureTokenMiddleware = new SecureTokenMiddleware();

/**
 * Mercury Credit Transfer Request
 * POST /api/v1/mercury/credit-transfer
 */
router.post('/credit-transfer', secureTokenMiddleware.validateCreditTransferToken.bind(secureTokenMiddleware), async (req, res) => {
    try {
        const {
            subscriberID,
            primaryHostReference,
            secondaryHostReference,
            creationDateTime,
            transactionIdentifier,
            transactionUETR,
            transactionType,
            transactionAmount,
            transactionReference,
            payerDetails,
            payerAccountDetail,
            payeeDetails,
            payeeAccountDetail
        } = req.body;

        // Generate unique processing transaction ID
        const processingTransactionId = generateUUID();

        // Create transaction ledger entry (simulated)
        console.log('Creating transaction ledger entry:', {
            transactionIdentifier,
            processingTransactionId,
            status: 'Awaiting Settlement'
        });

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Return success response
        res.status(200).json({
            messageRequestID: secureTokenMiddleware.generateMessageId('CRTRF'),
            messageResultDetail: {
                resultCode: 'ECL8070000',
                resultDescription: 'SUCCESS',
                resultMessage: '',
                transactionIdentifier,
                processingTransactionId
            }
        });

    } catch (error) {
        console.error('Credit transfer error:', error);
        res.status(200).json({
            messageRequestID: secureTokenMiddleware.generateMessageId('CRTRF'),
            messageResultDetail: {
                resultCode: 'ECL8070005',
                resultDescription: 'ERROR_INTERNAL_SYSTEM_ERROR',
                resultMessage: 'Internal system error during processing',
                transactionIdentifier: req.body.transactionIdentifier || '',
                processingTransactionId: ''
            }
        });
    }
});

/**
 * Mercury List All Banks Request
 * POST /api/v1/mercury/list-banks
 */
router.post('/list-banks', secureTokenMiddleware.validateListBanksToken.bind(secureTokenMiddleware), async (req, res) => {
    try {
        const { subscriberID, creationDateTime, transactionIdentifier } = req.body;

        // Generate unique processing transaction ID
        const processingTransactionId = generateUUID();

        // Simulate bank data retrieval
        const bankDetails = [
            {
                bankId: "39",
                bankName: "STANDARD BANK SOUTH AFRICA",
                bankDefaultBranch: "51001",
                bankBICFI: "SBZAZAJ0",
                bankActive: true
            },
            {
                bankId: "69",
                bankName: "BIDVEST BANK",
                bankDefaultBranch: "462005",
                bankBICFI: "BIDBZAJ0",
                bankActive: true
            },
            {
                bankId: "48",
                bankName: "CAPITEC BANK CPC",
                bankDefaultBranch: "470010",
                bankBICFI: "CABLZAJ0",
                bankActive: true
            },
            {
                bankId: "42",
                bankName: "ABSA BANK",
                bankDefaultBranch: "632005",
                bankBICFI: "ABSAZAJJ",
                bankActive: true
            },
            {
                bankId: "58",
                bankName: "FIRST NATIONAL BANK",
                bankDefaultBranch: "250655",
                bankBICFI: "FIRNZAJJ",
                bankActive: true
            },
            {
                bankId: "12",
                bankName: "NEDBANK",
                bankDefaultBranch: "198765",
                bankBICFI: "NEDSZAJJ",
                bankActive: true
            }
        ];

        // Return success response with bank details
        res.status(200).json({
            messageRequestID: secureTokenMiddleware.generateMessageId('BKLST'),
            messageResultDetail: {
                resultCode: 'ECL8060000',
                resultDescription: 'SUCCESS',
                resultMessage: '',
                transactionIdentifier,
                processingTransactionId
            },
            bankDetails
        });

    } catch (error) {
        console.error('List banks error:', error);
        res.status(200).json({
            messageRequestID: secureTokenMiddleware.generateMessageId('BKLST'),
            messageResultDetail: {
                resultCode: 'ECL8060005',
                resultDescription: 'ERROR_INTERNAL_SYSTEM_ERROR',
                resultMessage: 'Internal system error during processing',
                transactionIdentifier: req.body.transactionIdentifier || '',
                processingTransactionId: ''
            }
        });
    }
});

/**
 * Mercury Payment Status Request
 * POST /api/v1/mercury/payment-status
 */
router.post('/payment-status', secureTokenMiddleware.validatePaymentStatusToken.bind(secureTokenMiddleware), async (req, res) => {
    try {
        const {
            subscriberID,
            primaryHostReference,
            secondaryHostReference,
            creationDateTime,
            transactionIdentifier,
            originalTransactionIdentifier,
            originalUETR
        } = req.body;

        // Generate unique processing transaction ID
        const processingTransactionId = generateUUID();

        // Simulate checking for existing payment status report
        const existingStatusReport = await checkExistingStatusReport(originalUETR);

        if (existingStatusReport) {
            // Return existing status report
            res.status(200).json({
                messageRequestID: secureTokenMiddleware.generateMessageId('PSRQT'),
                messageResultDetail: {
                    resultCode: 'ECL8110000',
                    resultDescription: 'SUCCESS',
                    resultMessage: 'Existing status report found',
                    transactionIdentifier,
                    processingTransactionId
                }
            });
        } else {
            // Simulate sending payment status request to host
            console.log('Sending payment status request to host for UETR:', originalUETR);

            // Return success response (status request sent to host)
            res.status(200).json({
                messageRequestID: secureTokenMiddleware.generateMessageId('PSRQT'),
                messageResultDetail: {
                    resultCode: 'ECL8110000',
                    resultDescription: 'SUCCESS',
                    resultMessage: 'Payment status request sent to host',
                    transactionIdentifier,
                    processingTransactionId
                }
            });
        }

    } catch (error) {
        console.error('Payment status error:', error);
        res.status(200).json({
            messageRequestID: secureTokenMiddleware.generateMessageId('PSRQT'),
            messageResultDetail: {
                resultCode: 'ECL8110005',
                resultDescription: 'ERROR_INTERNAL_SYSTEM_ERROR',
                resultMessage: 'Internal system error during processing',
                transactionIdentifier: req.body.transactionIdentifier || '',
                processingTransactionId: ''
            }
        });
    }
});

/**
 * Mercury Payment Status Report (Out to Client)
 * POST /api/v1/mercury/payment-status-report
 */
router.post('/payment-status-report', async (req, res) => {
    try {
        const {
            secureToken,
            subscriberID,
            primaryHostReference,
            secondaryHostReference,
            messageIdentification,
            creationDateTime,
            transactionIdentifier,
            originalProcessingTransactionId,
            originalTransactionIdentifier,
            originalUETR,
            transactionStatus,
            transactionStatusDescription
        } = req.body;

        // Validate secure token
        const isValid = secureTokenService.validateSecureToken(req.body, secureToken);
        if (!isValid) {
            return res.status(200).json({
                messageRequestID: secureTokenMiddleware.generateMessageId('PSRPT'),
                messageResultDetail: {
                    resultCode: 'ECL7080017',
                    resultDescription: 'ERROR_CRYPTOGRAPHY',
                    resultMessage: 'Invalid Secure Token',
                    processingTransactionId: ''
                }
            });
        }

        // Generate unique processing transaction ID
        const processingTransactionId = generateUUID();

        // Simulate processing payment status report
        console.log('Processing payment status report:', {
            originalUETR,
            transactionStatus,
            transactionStatusDescription
        });

        // Return success response
        res.status(200).json({
            messageRequestID: secureTokenMiddleware.generateMessageId('PSRPT'),
            messageResultDetail: {
                resultCode: 'ECL7080000',
                resultDescription: 'SUCCESS',
                resultMessage: '',
                processingTransactionId
            }
        });

    } catch (error) {
        console.error('Payment status report error:', error);
        res.status(200).json({
            messageRequestID: secureTokenMiddleware.generateMessageId('PSRPT'),
            messageResultDetail: {
                resultCode: 'ECL7080016',
                resultDescription: 'ERROR_INTERNAL_SYSTEM_ERROR',
                resultMessage: 'Internal system error during processing',
                processingTransactionId: ''
            }
        });
    }
});

/**
 * Generate UUID for transaction IDs
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Simulate checking for existing payment status report
 */
async function checkExistingStatusReport(uetr) {
    // Simulate database lookup
    const existingReports = [
        {
            uetr: 'a1182b47-12ec-3655-8a94-8bb3d95bea55',
            status: 'ACCC',
            description: 'Transaction completed successfully'
        }
    ];

    return existingReports.find(report => report.uetr === uetr);
}

module.exports = router; 