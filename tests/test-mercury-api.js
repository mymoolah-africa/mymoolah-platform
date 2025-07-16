const axios = require('axios');
const SecureTokenService = require('./services/secureTokenService');

const BASE_URL = 'http://localhost:5050/api/v1/mercury';
const secureTokenService = new SecureTokenService('@tcjAwn$5B9Aet91');

/**
 * Test Mercury API endpoints with secure token functionality
 */

async function testMercuryAPI() {
    console.log('=== MyMoolah Mercury API Test ===\n');

    try {
        // Test 1: Credit Transfer Request
        console.log('1. Testing Credit Transfer Request:');
        const creditTransferRequest = {
            "subscriberID": "910",
            "primaryHostReference": "2023083100001",
            "secondaryHostReference": "78602467923",
            "creationDateTime": "2023-10-03T11:27:53.015708",
            "transactionIdentifier": "1A66C164-0EDA-4170-8D13-FBF9E495B680",
            "transactionUETR": "a1182b47-12ec-3655-8a94-8bb3d95bea55",
            "transactionType": "PBAC",
            "transactionAmount": 100.00,
            "transactionReference": "Micheal Block 230930",
            "payerDetails": {
                "partyName": "King Price Gauteng"
            },
            "payerAccountDetail": {
                "partyAccountIdentification": "78602467923",
                "partyAccountType": "1",
                "partyAccountName": "King Price Gauteng"
            },
            "payeeDetails": {
                "partyName": "Micheal Block",
                "partyIdentification": {
                    "partyPrivateIdentification": "7001012293083"
                },
                "partyContactDetail": {
                    "partyMobileNumber": "+27-717654321",
                    "partyEmailAddress": "michealb@kingprice.co.za"
                }
            },
            "payeeAccountDetail": {
                "partyAccountIdentification": "1268602123",
                "partyAccountType": "2",
                "partyAccountBank": "ABSAZAJJ",
                "partyAccountName": "Micheal Block"
            }
        };

        // Generate secure token
        const creditTransferToken = secureTokenService.generateCreditTransferToken(creditTransferRequest);
        const creditTransferPayload = {
            secureToken: creditTransferToken,
            ...creditTransferRequest
        };

        console.log('Generated Token:', creditTransferToken);
        
        const creditTransferResponse = await axios.post(`${BASE_URL}/credit-transfer`, creditTransferPayload);
        console.log('Response:', JSON.stringify(creditTransferResponse.data, null, 2));

        console.log('\n' + '='.repeat(50) + '\n');

        // Test 2: List All Banks Request
        console.log('2. Testing List All Banks Request:');
        const listBanksRequest = {
            "subscriberID": "910",
            "creationDateTime": "2023-10-03T11:27:53.015708",
            "transactionIdentifier": "54000001"
        };

        // Generate secure token
        const listBanksToken = secureTokenService.generateListBanksToken(listBanksRequest);
        const listBanksPayload = {
            secureToken: listBanksToken,
            ...listBanksRequest
        };

        console.log('Generated Token:', listBanksToken);
        
        const listBanksResponse = await axios.post(`${BASE_URL}/list-banks`, listBanksPayload);
        console.log('Response:', JSON.stringify(listBanksResponse.data, null, 2));

        console.log('\n' + '='.repeat(50) + '\n');

        // Test 3: Payment Status Request
        console.log('3. Testing Payment Status Request:');
        const paymentStatusRequest = {
            "subscriberID": "910",
            "primaryHostReference": "2023083100001",
            "secondaryHostReference": "78602467923",
            "creationDateTime": "2023-10-03T11:27:53.015708",
            "transactionIdentifier": "1A66C164-0EDA-4170-8D13-FBF9E495B680",
            "originalTransactionIdentifier": "CAE4F68F-BFB1-4FB2-B2B0-4AA94096142E",
            "originalUETR": "a1182b47-12ec-3655-8a94-8bb3d95bea55"
        };

        // Generate secure token
        const paymentStatusToken = secureTokenService.generatePaymentStatusToken(paymentStatusRequest);
        const paymentStatusPayload = {
            secureToken: paymentStatusToken,
            ...paymentStatusRequest
        };

        console.log('Generated Token:', paymentStatusToken);
        
        const paymentStatusResponse = await axios.post(`${BASE_URL}/payment-status`, paymentStatusPayload);
        console.log('Response:', JSON.stringify(paymentStatusResponse.data, null, 2));

        console.log('\n' + '='.repeat(50) + '\n');

        // Test 4: Payment Status Report
        console.log('4. Testing Payment Status Report:');
        const paymentStatusReport = {
            "subscriberID": "910",
            "primaryHostReference": "2023083100001",
            "secondaryHostReference": "78602467923",
            "messageIdentification": "20231003_BKSV_PSRPT_000000000000002",
            "creationDateTime": "2023-10-03T11:27:55.015708",
            "transactionIdentifier": "54000000000000001",
            "originalProcessingTransactionId": "CAE4F68F-BFB1-4FB2-B2B0-4AA94096142E",
            "originalTransactionIdentifier": "1A66C164-0EDA-4170-8D13-FBF9E495B680",
            "originalUETR": "a1182b47-12ec-3655-8a94-8bb3d95bea55",
            "transactionStatus": "ACCC",
            "transactionStatusDescription": "Transaction completed successfully"
        };

        // Generate secure token
        const paymentStatusReportToken = secureTokenService.generatePaymentStatusReportToken(paymentStatusReport);
        const paymentStatusReportPayload = {
            secureToken: paymentStatusReportToken,
            ...paymentStatusReport
        };

        console.log('Generated Token:', paymentStatusReportToken);
        
        const paymentStatusReportResponse = await axios.post(`${BASE_URL}/payment-status-report`, paymentStatusReportPayload);
        console.log('Response:', JSON.stringify(paymentStatusReportResponse.data, null, 2));

        console.log('\n=== All Tests Completed Successfully ===');

    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    }
}

// Test error cases
async function testErrorCases() {
    console.log('\n=== Testing Error Cases ===\n');

    try {
        // Test 1: Missing secure token
        console.log('1. Testing missing secure token:');
        const creditTransferRequest = {
            "subscriberID": "910",
            "creationDateTime": "2023-10-03T11:27:53.015708",
            "transactionIdentifier": "1A66C164-0EDA-4170-8D13-FBF9E495B680"
        };

        const response = await axios.post(`${BASE_URL}/credit-transfer`, creditTransferRequest);
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('Expected error for missing secure token:', error.response.data);
    }

    try {
        // Test 2: Invalid secure token
        console.log('\n2. Testing invalid secure token:');
        const creditTransferRequest = {
            "secureToken": "invalid-token",
            "subscriberID": "910",
            "creationDateTime": "2023-10-03T11:27:53.015708",
            "transactionIdentifier": "1A66C164-0EDA-4170-8D13-FBF9E495B680"
        };

        const response = await axios.post(`${BASE_URL}/credit-transfer`, creditTransferRequest);
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('Expected error for invalid secure token:', error.response.data);
    }

    try {
        // Test 3: Missing required fields
        console.log('\n3. Testing missing required fields:');
        const creditTransferRequest = {
            "secureToken": "some-token",
            "subscriberID": "910"
            // Missing other required fields
        };

        const response = await axios.post(`${BASE_URL}/credit-transfer`, creditTransferRequest);
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('Expected error for missing required fields:', error.response.data);
    }
}

// Run tests
if (require.main === module) {
    testMercuryAPI().then(() => {
        return testErrorCases();
    }).catch(error => {
        console.error('Test execution failed:', error);
    });
}

module.exports = { testMercuryAPI, testErrorCases }; 