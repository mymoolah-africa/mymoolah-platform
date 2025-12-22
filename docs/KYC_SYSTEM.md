# KYC Automation System Documentation

## Overview

The MyMoolah KYC (Know Your Customer) automation system provides automated document verification using AI OCR processing. The system ensures compliance with South African financial regulations while providing a seamless user experience.

## Features

### ✅ **Automated Document Processing**
- **AI OCR Processing**: Uses OpenAI GPT-4oo for document text extraction (primary)
- **Tesseract OCR Fallback**: Automatic fallback to Tesseract OCR when OpenAI is unavailable
- **Document Validation**: Validates South African ID documents and proof of address
- **Automatic Approval**: Instantly approves verified documents
- **Retry Logic**: Allows 2 retry attempts before manual review
- **Zero Downtime**: KYC processing works even with invalid OpenAI API keys

### ✅ **Security & Compliance**
- **Secure File Storage**: Documents stored in encrypted storage
- **Audit Trail**: Complete logging of all KYC activities
- **Data Protection**: GDPR/POPIA compliant data handling
- **Access Controls**: Role-based access for document review

### ✅ **User Experience**
- **Real-time Status**: Live KYC verification status
- **Clear Feedback**: Detailed error messages and accepted document types
- **Mobile Friendly**: Responsive upload interface
- **Progress Tracking**: Upload progress and verification status

## System Architecture

### Database Schema

#### Wallets Table (Enhanced)
```sql
ALTER TABLE wallets ADD COLUMN kycVerified BOOLEAN DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN kycVerifiedAt DATETIME;
ALTER TABLE wallets ADD COLUMN kycVerifiedBy VARCHAR(255);
```

#### KYC Table (Enhanced)
```sql
ALTER TABLE kyc ADD COLUMN documentUrl VARCHAR(500);
ALTER TABLE kyc ADD COLUMN ocrAttempts INTEGER DEFAULT 0;
ALTER TABLE kyc ADD COLUMN ocrResults JSON;
ALTER TABLE kyc ADD COLUMN validationStatus ENUM('pending', 'validated', 'failed', 'manual_review');
ALTER TABLE kyc ADD COLUMN validationDetails JSON;
```

### API Endpoints

#### KYC Upload
```
POST /api/v1/kyc/upload
Content-Type: multipart/form-data

Body:
- document: File (JPEG, PNG, PDF, max 5MB)
- documentType: 'id_document' | 'proof_of_address'
- userId: string
```

#### KYC Status
```
GET /api/v1/kyc/status/:userId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "kycVerified": boolean,
  "kycVerifiedAt": "2025-07-29T19:00:00.000Z",
  "kycVerifiedBy": "ai_system",
  "walletId": "WAL-123456789"
}
```

#### Manual Verification (Admin)
```
POST /api/v1/kyc/manual-verify
Authorization: Bearer <token>

Body:
{
  "walletId": "WAL-123456789",
  "verifiedBy": "support_team"
}
```

### Transaction Validation

All debit transactions are automatically validated for KYC verification:

```javascript
// Middleware automatically applied to transaction routes
const checkKYCForDebit = async (req, res, next) => {
  if (req.body.type === 'debit' && !wallet.kycVerified) {
    return res.status(403).json({
      error: 'KYC_VERIFICATION_REQUIRED',
      message: 'KYC verification required for debit transactions'
    });
  }
  next();
};
```

## Document Validation Rules

### ID Documents
- **Accepted Types**: South African ID Book, South African ID Card, South African Passport, South African Driving License, Temporary ID Certificate, International Passport
- **Required Fields**: Full name, ID number, Date of birth
- **Validation**: 13-digit ID number format validation (SA ID), 6-9 alphanumeric passport number format, driver's license format validation
- **Confidence Threshold**: 80% minimum for auto-approval

### South African Driver's License
- **ID Number Format**: May appear as "02/6411055084084" (two digits + "/" + 13-digit ID) OR standard license format "AB123456CD" (2 letters + 6 digits + 2 letters)
- **Name Format**: Usually "INITIALS SURNAME" in CAPS (e.g., "A BOTES" where "A" is initial and "BOTES" is surname)
- **Valid Dates**: Format "dd/mm/yyyy - dd/mm/yyyy" (e.g., "15/01/2020 - 15/01/2030")
- **Validation**: Only the second date (expiry) is validated - license must not be expired (current date < expiry date)
- **Document Type Detection**: Automatically detected using validity period fields (validFrom and expiryDate) - driver's licenses have validity periods, SA IDs don't
- **Format Support**: Accepts both ID number format (13 digits) and license number format (2 letters + 6 digits + 2 letters)

### Proof of Address
- **Accepted Types**: Utility bill, Bank statement, Municipal account, Insurance policy
- **Age Requirement**: Not older than 3 months
- **Required Fields**: Street address, City, Postal code, Province
- **Validation**: South African postal code format (4 digits)
- **Province Validation**: Must be valid South African province

## AI OCR Processing

### OCR Processing Architecture

The KYC system uses a **two-tier OCR processing architecture** with automatic fallback:

1. **Primary OCR (OpenAI GPT-4oo)**: High-accuracy AI-powered document extraction
2. **Fallback OCR (Tesseract)**: Automatic fallback when OpenAI is unavailable

### Fallback Mechanism

The system automatically falls back to Tesseract OCR in the following scenarios:
- **OpenAI API Key Invalid**: When API key is invalid or expired (401 error)
- **OpenAI API Rate Limit**: When API rate limit is exceeded (429 error)
- **Network Errors**: When OpenAI API is unreachable
- **OpenAI Unavailable**: When OpenAI service is temporarily unavailable
- **Content Policy Refusal**: When OpenAI refuses to process document due to content policy (e.g., "I'm sorry, but I can't extract information from this document")

**Enhanced Refusal Detection**:
- **Early Detection**: Checks for refusal messages BEFORE attempting JSON parsing
- **Pattern Matching**: Detects "I'm sorry", "can't extract", "can't assist", "unable" messages
- **Automatic Fallback**: Immediately triggers Tesseract OCR when OpenAI refuses
- **Preserved Flags**: Refusal flags preserved through retry loop for proper fallback triggering

**Benefits**:
- ✅ **Zero Downtime**: KYC processing continues even when OpenAI fails
- ✅ **Automatic Recovery**: No manual intervention required
- ✅ **Reliable Processing**: Tesseract OCR ensures document processing continues
- ✅ **Transparent to Users**: Fallback is seamless and invisible to users
- ✅ **Content Policy Handling**: Automatically handles OpenAI content policy refusals

### OpenAI Integration
```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", url: documentUrl }
    ]
  }]
});
```

### Processing Flow
1. **Document Upload**: User uploads document via frontend
2. **File Validation**: Check file type, size, and format
3. **OCR Processing**: Extract text using AI vision model
4. **Data Validation**: Validate extracted information
5. **Decision Logic**: Auto-approve or request retry
6. **Status Update**: Update wallet KYC status

## Error Handling

### Retry Logic
- **First Attempt**: Process document with AI OCR (OpenAI) or Tesseract (if OpenAI unavailable)
- **Second Attempt**: If validation fails, provide specific feedback
- **Third Attempt**: If still failing, escalate to manual review

### Manual Review Escalation
```javascript
if (validationResult.attempts >= 2) {
  await escalateToManualReview(userId, documentType, ocrResults);
  // Send email to support team
  await sendSupportAlert({
    type: 'KYC_MANUAL_REVIEW',
    userId,
    documentType,
    ocrResults
  });
}
```

## Environment Configuration

### Required Environment Variables
```bash
# OpenAI Configuration (Optional - Tesseract fallback works without it)
OPENAI_API_KEY=your_openai_api_key_here

# Note: KYC processing works without OpenAI API key using Tesseract OCR fallback
# However, OpenAI provides better OCR accuracy for document extraction

# Support Configuration
SUPPORT_EMAIL=kyc-support@mymoolah.africa

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/kyc
```

## Security Considerations

### File Security
- **Encryption**: All documents encrypted at rest
- **Access Control**: Role-based access to documents
- **Retention Policy**: Automatic deletion after verification
- **Audit Logging**: Complete activity tracking

### Data Protection
- **GDPR Compliance**: Right to be forgotten
- **POPIA Compliance**: South African data protection
- **Secure Storage**: Documents stored in secure cloud storage
- **Access Logging**: All document access logged

## Testing

### Manual Testing
1. **Upload Valid ID**: Should auto-approve
2. **Upload Valid POA**: Should auto-approve
3. **Upload Invalid Document**: Should request retry
4. **Exceed Retry Limit**: Should escalate to manual review
5. **Test Debit Transaction**: Should block without KYC

### Automated Testing
```javascript
describe('KYC System', () => {
  test('should auto-approve valid ID document', async () => {
    // Test implementation
  });
  
  test('should block debit without KYC', async () => {
    // Test implementation
  });
});
```

## Monitoring & Alerts

### Key Metrics
- **Success Rate**: Percentage of auto-approvals
- **Processing Time**: Average OCR processing time
- **Error Rate**: Failed document processing rate
- **Manual Review Rate**: Documents requiring manual review

### Alerts
- **High Error Rate**: Alert if >10% documents fail
- **Manual Review Queue**: Alert if queue >50 documents
- **Processing Delays**: Alert if average time >30 seconds

## Document Type Detection

The system automatically detects document types using multiple indicators:

### Detection Logic
1. **Explicit Document Type**: Checks if OCR explicitly identifies document type
2. **ID Number Format**: Analyzes ID number format (13-digit SA ID, 6-9 alphanumeric passport, license format)
3. **Validity Period Fields**: Checks for `validFrom` and `expiryDate` fields (driver's licenses have validity periods, SA IDs don't)
4. **Country of Issue**: Uses country information when available

### Driver's License Detection
- **Primary Indicator**: Presence of both `validFrom` and `expiryDate` fields
- **Secondary Indicator**: ID number format (13-digit ID or license format "AB123456CD")
- **Result**: Correctly distinguishes driver's licenses from SA IDs even when both have 13-digit ID numbers

## Testing Exception (User ID 1)

For testing purposes, user ID 1 has a special exception:
- **ID Validation ACTIVE for**: SA ID cards, old ID books, SA driver's licenses
- **ID Validation SKIPPED for**: Passports only
- **Purpose**: Allows testing passport OCR with different passport formats without ID number matching
- **Note**: This exception is temporary and should be removed once passport validation is confirmed working

## Future Enhancements

### Planned Features
- **Liveness Detection**: Prevent photo spoofing
- **Document Tampering Detection**: Detect edited documents
- **Multi-language Support**: Support for other African languages
- **Real-time Verification**: Instant verification with government APIs

### Integration Opportunities
- **Home Affairs API**: Direct ID verification
- **Postal Service API**: Address validation
- **Banking APIs**: Account verification
- **Credit Bureau**: Additional verification layers

## Support & Maintenance

### Support Team Access
- **Manual Review Interface**: Web-based document review
- **Bulk Operations**: Process multiple documents
- **Override Capabilities**: Manual approval/rejection
- **Audit Reports**: Complete activity reports

### Maintenance Tasks
- **Daily**: Monitor processing queues
- **Weekly**: Review error rates and patterns
- **Monthly**: Update validation rules and AI models
- **Quarterly**: Security audit and compliance review

---

**Version**: 2.4.12  
**Last Updated**: November 15, 2025  
**Maintainer**: MyMoolah Development Team 