const KYCService = require('../services/kycService');
const { sequelize } = require('../models');
const Wallet = require('../models/Wallet')(sequelize, require('sequelize').DataTypes);
const path = require('path');
const fs = require('fs').promises;

console.log('🔍 KYCService imported:', typeof KYCService);
console.log('🔍 KYCService.processKYCSubmission:', typeof KYCService.processKYCSubmission);

class KYCController {
  // Upload KYC document
  async uploadDocument(req, res) {
    try {
      const { userId, documentType } = req.body;
      const documentFile = req.file;

      if (!documentFile) {
        return res.status(400).json({
          error: 'DOCUMENT_REQUIRED',
          message: 'Please upload a document'
        });
      }

      if (!['id_document', 'proof_of_address'].includes(documentType)) {
        return res.status(400).json({
          error: 'INVALID_DOCUMENT_TYPE',
          message: 'Invalid document type. Must be id_document or proof_of_address'
        });
      }

      // Create secure document URL (in production, upload to cloud storage)
      const documentUrl = `/uploads/kyc/${userId}_${documentType}_${Date.now()}.${documentFile.originalname.split('.').pop()}`;
      
      // Save file to uploads directory
      const uploadDir = path.join(__dirname, '../uploads/kyc');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, path.basename(documentUrl)), documentFile.buffer);

      // Process KYC submission
      const result = await KYCService.processKYCSubmission(userId, documentType, documentUrl);

      if (!result.success) {
        return res.status(200).json(result);
      }

      // Store KYC record - FIXED: Actually save to database
      const { Kyc } = require('../models');
      const kycRecord = await Kyc.create({
        userId: userId,
        documentType: documentType === 'id_document' ? 'id_card' : 'passport', // FIXED: Use correct ENUM values
        documentNumber: result.ocrResults?.idNumber || 'N/A',
        documentImageUrl: documentUrl,
        ocrData: result.ocrResults,
        status: result.validation.isValid ? 'approved' : 'rejected', // FIXED: Use correct ENUM values
        submittedAt: new Date(),
        isAutomated: true,
        verificationScore: result.validation.confidence / 100 // Convert percentage to decimal
      });

      console.log('✅ KYC record saved to database:', kycRecord.id);

      if (result.validation.isValid) {
        // Auto-approve if validation passes
        const wallet = await Wallet.findOne({ where: { userId: userId } });
        if (wallet) {
          await wallet.verifyKYC('ai_system');
        }

        return res.json({
          success: true,
          message: 'KYC verification successful',
          status: 'approved',
          walletVerified: true,
          kycRecordId: kycRecord.id
        });
      } else {
        return res.json({
          success: false,
          message: 'Document validation failed',
          status: 'failed',
          issues: result.validation.issues,
          acceptedDocuments: result.acceptedDocuments,
          retryCount: 1,
          kycRecordId: kycRecord.id
        });
      }

    } catch (error) {
      console.error('❌ Error uploading KYC document:', error);
      res.status(500).json({
        error: 'UPLOAD_ERROR',
        message: 'Error uploading document'
      });
    }
  }

  // Upload both KYC documents (identity and address)
  async uploadDocuments(req, res) {
    try {
      console.log('🚀 KYC uploadDocuments STARTED');
      console.log('🔍 KYC uploadDocuments called');
      console.log('📝 Request body:', req.body);
      console.log('📁 Request files:', req.files);
      console.log('👤 Authenticated user:', req.user);
      console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
      
      // Use authenticated user ID instead of request body for security
      const userId = req.user.id;
      const { retryCount = 0 } = req.body;
      const files = req.files;

      if (!userId) {
        console.error('❌ No authenticated user ID found');
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      console.log('✅ Using authenticated user ID:', userId);
      console.log('📋 Files received:', files ? Object.keys(files) : 'No files');
      console.log('📋 Identity document:', files?.identityDocument ? 'Present' : 'Missing');

      if (!files || !files.identityDocument) {
        console.error('❌ Missing identity document:', { files: !!files, identity: !!files?.identityDocument });
        return res.status(400).json({
          error: 'DOCUMENTS_REQUIRED',
          message: 'Please upload your ID document (SA ID or Passport)'
        });
      }

      console.log('✅ Files received, processing...');

      // Test basic file operations first
      try {
        const testDir = path.join(__dirname, '../uploads/test');
        await fs.mkdir(testDir, { recursive: true });
        console.log('✅ Directory creation test passed');
      } catch (dirError) {
        console.error('❌ Directory creation failed:', dirError);
        return res.status(500).json({
          error: 'FILE_SYSTEM_ERROR',
          message: 'Error creating upload directory'
        });
      }

      const identityFile = files.identityDocument[0];
      // Address document requirement is masked for now
      // const addressFile = files.addressDocument[0];

      // Process identity document
      const identityUrl = `/uploads/kyc/${userId}_id_document_${Date.now()}.${identityFile.originalname.split('.').pop()}`;
      const uploadDir = path.join(__dirname, '../uploads/kyc');
      
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(path.join(uploadDir, path.basename(identityUrl)), identityFile.buffer);
        console.log('✅ Identity file saved');
      } catch (fileError) {
        console.error('❌ Identity file save failed:', fileError);
        return res.status(500).json({
          error: 'FILE_SAVE_ERROR',
          message: 'Error saving identity document'
        });
      }

      // Process address document (masked for now)
      // const addressUrl = `/uploads/kyc/${userId}_proof_of_address_${Date.now()}.${addressFile.originalname.split('.').pop()}`;
      // 
      // try {
      //   await fs.writeFile(path.join(uploadDir, path.basename(addressUrl)), addressFile.buffer);
      //   console.log('✅ Address file saved');
      // } catch (fileError) {
      //   console.error('❌ Address file save failed:', fileError);
      //   return res.status(500).json({
      //     error: 'FILE_SAVE_ERROR',
      //     message: 'Error saving address document'
      //   });
      // }

      console.log('✅ Files saved, processing OCR...');

      // Process identity document only (POA masked for now)
      try {
        console.log('🔍 Calling KYCService.processKYCSubmission...');
        const identityResult = await KYCService.processKYCSubmission(userId, 'id_document', identityUrl, parseInt(retryCount));
        console.log('🔍 KYCService returned:', identityResult);
        // const addressResult = await KYCService.processKYCSubmission(userId, 'proof_of_address', addressUrl);

        console.log('✅ OCR results:', { identity: identityResult.success, retryCount });

        if (!identityResult.success) {
          // Return structured validation outcome to the frontend (no server error)
          return res.status(200).json(identityResult);
        }

        // Check if identity document is valid - use the success field from KYC service
        const identityValid = identityResult.success && identityResult.validation.isValid;
        // const addressValid = addressResult.validation.isValid;

        console.log('✅ Validation results:', { identityValid, retryCount });

        if (identityValid) {
          // Auto-approve if identity document is valid (POA requirement masked)
          const wallet = await Wallet.findOne({ where: { userId: userId } });
          if (wallet) {
            await wallet.verifyKYC('ai_system');
          }

          return res.json({
            success: true,
            message: 'KYC verification successful',
            status: 'approved',
            walletVerified: true,
            identityValid: true,
            addressValid: true // Always true since POA is masked
          });
        } else {
          // Handle retry logic
          const currentRetryCount = parseInt(retryCount) || 0;
          const canRetry = currentRetryCount < 1;
          
          if (canRetry) {
            // First failure - allow retry
            return res.json({
              success: false,
              message: identityResult.message || 'Identity document validation failed. Please try again with a clearer image.',
              status: 'retry',
              issues: identityResult.validation.issues,
              identityValid,
              addressValid: true, // Always true since POA is masked
              retryCount: currentRetryCount + 1,
              canRetry: true,
              acceptedDocuments: {
                identity: KYCService.getAcceptedDocuments('id_document'),
                address: ['Proof of address requirement is temporarily disabled']
              }
            });
          } else {
            // Second failure - escalate to support
            console.log('🚨 KYC failed after retry, escalating to support for user:', userId);
            
            return res.json({
              success: false,
              message: identityResult.message || 'Document validation failed after retry. Please contact support for manual verification.',
              status: 'failed',
              issues: identityResult.validation.issues,
              identityValid,
              addressValid: true, // Always true since POA is masked
              retryCount: currentRetryCount + 1,
              canRetry: false,
              escalateToSupport: true,
              acceptedDocuments: {
                identity: KYCService.getAcceptedDocuments('id_document'),
                address: ['Proof of address requirement is temporarily disabled']
              }
            });
          }
        }
      } catch (kycError) {
        console.error('❌ KYC processing error:', kycError);
        return res.status(500).json({
          error: 'KYC_PROCESSING_ERROR',
          message: 'Error processing KYC documents',
          details: kycError.message
        });
      }

    } catch (error) {
      console.error('❌ Error uploading KYC documents:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({
        error: 'UPLOAD_ERROR',
        message: 'Error uploading documents',
        details: error.message
      });
    }
    
    console.log('🏁 KYC uploadDocuments COMPLETED');
  }

  // Get KYC status
  async getKYCStatus(req, res) {
    try {
      const { userId } = req.params;
      const wallet = await Wallet.findOne({ where: { userId: userId } });
      
      if (!wallet) {
        return res.status(404).json({
          error: 'WALLET_NOT_FOUND',
          message: 'Wallet not found'
        });
      }

      const kycDetails = await Wallet.getKYCVerificationDetails(wallet.walletId);
      
      res.json({
        success: true,
        kycVerified: kycDetails.kycVerified,
        kycVerifiedAt: kycDetails.kycVerifiedAt,
        kycVerifiedBy: kycDetails.kycVerifiedBy,
        walletId: wallet.walletId
      });

    } catch (error) {
      console.error('❌ Error getting KYC status:', error);
      res.status(500).json({
        error: 'KYC_STATUS_ERROR',
        message: 'Error getting KYC status'
      });
    }
  }

  // Manual KYC verification (for support team)
  async manualVerifyKYC(req, res) {
    try {
      const { walletId, verifiedBy } = req.body;
      
      if (!walletId) {
        return res.status(400).json({
          error: 'WALLET_ID_REQUIRED',
          message: 'Wallet ID is required'
        });
      }

      await Wallet.verifyKYC(walletId, verifiedBy || 'support_team');

      res.json({
        success: true,
        message: 'KYC manually verified',
        walletId,
        verifiedBy: verifiedBy || 'support_team'
      });

    } catch (error) {
      console.error('❌ Error manual KYC verification:', error);
      res.status(500).json({
        error: 'MANUAL_VERIFICATION_ERROR',
        message: 'Error during manual verification'
      });
    }
  }

  // Get accepted document types
  async getAcceptedDocuments(req, res) {
    try {
      const { documentType } = req.params;
      
      const acceptedDocuments = KYCService.getAcceptedDocuments(documentType);
      
      res.json({
        success: true,
        documentType,
        acceptedDocuments
      });

    } catch (error) {
      console.error('❌ Error getting accepted documents:', error);
      res.status(500).json({
        error: 'DOCUMENTS_ERROR',
        message: 'Error getting accepted documents'
      });
    }
  }
}

module.exports = new KYCController(); 