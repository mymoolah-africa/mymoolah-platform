const SecureTokenService = require('./services/secureTokenService');

/**
 * Test script for Secure Token Service
 * Demonstrates secure token generation and validation according to Mercury specifications
 */

const secureTokenService = new SecureTokenService('@tcjAwn$5B9Aet91');

console.log('=== MyMoolah Secure Token Service Test ===\n');

// Test 1: Credit Transfer Request
console.log('1. Testing Credit Transfer Request Token Generation:');
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

try {
    const creditTransferToken = secureTokenService.generateCreditTransferToken(creditTransferRequest);
    console.log('Generated Token:', creditTransferToken);
    
    // Add token to payload
    const payloadWithToken = secureTokenService.addSecureTokenToPayload(creditTransferRequest);
    console.log('Payload with token:', JSON.stringify(payloadWithToken, null, 2));
    
    // Validate token
    const isValid = secureTokenService.validateSecureToken(payloadWithToken, creditTransferToken);
    console.log('Token validation:', isValid ? 'PASS' : 'FAIL');
} catch (error) {
    console.error('Credit transfer token error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: List All Banks Request
console.log('2. Testing List All Banks Request Token Generation:');
const listBanksRequest = {
    "subscriberID": "910",
    "creationDateTime": "2023-10-03T11:27:53.015708",
    "transactionIdentifier": "54000001"
};

try {
    const listBanksToken = secureTokenService.generateListBanksToken(listBanksRequest);
    console.log('Generated Token:', listBanksToken);
    
    // Add token to payload
    const payloadWithToken = secureTokenService.addSecureTokenToPayload(listBanksRequest);
    console.log('Payload with token:', JSON.stringify(payloadWithToken, null, 2));
    
    // Validate token
    const isValid = secureTokenService.validateSecureToken(payloadWithToken, listBanksToken);
    console.log('Token validation:', isValid ? 'PASS' : 'FAIL');
} catch (error) {
    console.error('List banks token error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Payment Status Request
console.log('3. Testing Payment Status Request Token Generation:');
const paymentStatusRequest = {
    "subscriberID": "910",
    "primaryHostReference": "2023083100001",
    "secondaryHostReference": "78602467923",
    "creationDateTime": "2023-10-03T11:27:53.015708",
    "transactionIdentifier": "1A66C164-0EDA-4170-8D13-FBF9E495B680",
    "originalTransactionIdentifier": "CAE4F68F-BFB1-4FB2-B2B0-4AA94096142E",
    "originalUETR": "a1182b47-12ec-3655-8a94-8bb3d95bea55"
};

try {
    const paymentStatusToken = secureTokenService.generatePaymentStatusToken(paymentStatusRequest);
    console.log('Generated Token:', paymentStatusToken);
    
    // Add token to payload
    const payloadWithToken = secureTokenService.addSecureTokenToPayload(paymentStatusRequest);
    console.log('Payload with token:', JSON.stringify(payloadWithToken, null, 2));
    
    // Validate token
    const isValid = secureTokenService.validateSecureToken(payloadWithToken, paymentStatusToken);
    console.log('Token validation:', isValid ? 'PASS' : 'FAIL');
} catch (error) {
    console.error('Payment status token error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 4: Payment Status Report
console.log('4. Testing Payment Status Report Token Generation:');
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

try {
    const paymentStatusReportToken = secureTokenService.generatePaymentStatusReportToken(paymentStatusReport);
    console.log('Generated Token:', paymentStatusReportToken);
    
    // Add token to payload
    const payloadWithToken = secureTokenService.addSecureTokenToPayload(paymentStatusReport);
    console.log('Payload with token:', JSON.stringify(payloadWithToken, null, 2));
    
    // Validate token
    const isValid = secureTokenService.validateSecureToken(payloadWithToken, paymentStatusReportToken);
    console.log('Token validation:', isValid ? 'PASS' : 'FAIL');
} catch (error) {
    console.error('Payment status report token error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 5: Validation Functions
console.log('5. Testing Validation Functions:');

// UETR validation
const validUETR = "a1182b47-12ec-3655-8a94-8bb3d95bea55";
const invalidUETR = "invalid-uetr";
console.log('UETR Validation:');
console.log(`  Valid UETR "${validUETR}":`, secureTokenService.validateUETR(validUETR) ? 'PASS' : 'FAIL');
console.log(`  Invalid UETR "${invalidUETR}":`, !secureTokenService.validateUETR(invalidUETR) ? 'PASS' : 'FAIL');

// BICFI validation
const validBICFI = "ABSAZAJJ";
const invalidBICFI = "INVALID";
console.log('BICFI Validation:');
console.log(`  Valid BICFI "${validBICFI}":`, secureTokenService.validateBICFI(validBICFI) ? 'PASS' : 'FAIL');
console.log(`  Invalid BICFI "${invalidBICFI}":`, !secureTokenService.validateBICFI(invalidBICFI) ? 'PASS' : 'FAIL');

// Email validation
const validEmail = "test@example.com";
const invalidEmail = "invalid-email";
console.log('Email Validation:');
console.log(`  Valid Email "${validEmail}":`, secureTokenService.validateEmail(validEmail) ? 'PASS' : 'FAIL');
console.log(`  Invalid Email "${invalidEmail}":`, !secureTokenService.validateEmail(invalidEmail) ? 'PASS' : 'FAIL');

// Mobile number validation
const validMobile = "+27-717654321";
const invalidMobile = "invalid-mobile";
console.log('Mobile Number Validation:');
console.log(`  Valid Mobile "${validMobile}":`, secureTokenService.validateMobileNumber(validMobile) ? 'PASS' : 'FAIL');
console.log(`  Invalid Mobile "${invalidMobile}":`, !secureTokenService.validateMobileNumber(invalidMobile) ? 'PASS' : 'FAIL');

// Transaction type validation
console.log('Transaction Type Validation:');
console.log(`  Valid Type "PBPX":`, secureTokenService.validateTransactionType("PBPX") ? 'PASS' : 'FAIL');
console.log(`  Valid Type "PBAC":`, secureTokenService.validateTransactionType("PBAC") ? 'PASS' : 'FAIL');
console.log(`  Invalid Type "INVALID":`, !secureTokenService.validateTransactionType("INVALID") ? 'PASS' : 'FAIL');

// Transaction status validation
console.log('Transaction Status Validation:');
console.log(`  Valid Status "ACCC":`, secureTokenService.validateTransactionStatus("ACCC") ? 'PASS' : 'FAIL');
console.log(`  Valid Status "RJCT":`, secureTokenService.validateTransactionStatus("RJCT") ? 'PASS' : 'FAIL');
console.log(`  Invalid Status "INVALID":`, !secureTokenService.validateTransactionStatus("INVALID") ? 'PASS' : 'FAIL');

console.log('\n=== Test Complete ==='); 