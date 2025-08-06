const KYCService = require('../services/kycService');
const Wallet = require('../models/Wallet');
const path = require('path');
const fs = require('fs').promises;

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
        return res.status(500).json({
          error: 'KYC_PROCESSING_ERROR',
          message: result.error
        });
      }

      // Store KYC record
      const kycRecord = {
        userId: userId,
        documentType: 'identity',
        documentUrl: documentUrl,
        status: result.validation.isValid ? 'validated' : 'failed',
        ocrResults: result.ocrResults,
        validationDetails: result.validation,
        submittedAt: new Date()
      };

      if (result.validation.isValid) {
        // Auto-approve if validation passes
        const wallet = await Wallet.getWalletByUserId(userId);
        if (wallet) {
          await Wallet.verifyKYC(wallet.walletId, 'ai_system');
        }

        return res.json({
          success: true,
          message: 'KYC verification successful',
          status: 'approved',
          walletVerified: true
        });
      } else {
        return res.json({
          success: false,
          message: 'Document validation failed',
          status: 'failed',
          issues: result.validation.issues,
          acceptedDocuments: result.acceptedDocuments,
          retryCount: 1
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
      console.log('🔍 KYC uploadDocuments called');
      console.log('📝 Request body:', req.body);
      console.log('📁 Request files:', req.files);
      
      const { userId } = req.body;
      const files = req.files;

      if (!userId) {
        console.error('❌ No userId provided');
        return res.status(400).json({
          error: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        });
      }

      if (!files || !files.identityDocument || !files.addressDocument) {
        console.error('❌ Missing files:', { files: !!files, identity: !!files?.identityDocument, address: !!files?.addressDocument });
        return res.status(400).json({
          error: 'DOCUMENTS_REQUIRED',
          message: 'Please upload both identity and address documents'
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
      const addressFile = files.addressDocument[0];

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

      // Process address document
      const addressUrl = `/uploads/kyc/${userId}_proof_of_address_${Date.now()}.${addressFile.originalname.split('.').pop()}`;
      
      try {
        await fs.writeFile(path.join(uploadDir, path.basename(addressUrl)), addressFile.buffer);
        console.log('✅ Address file saved');
      } catch (fileError) {
        console.error('❌ Address file save failed:', fileError);
        return res.status(500).json({
          error: 'FILE_SAVE_ERROR',
          message: 'Error saving address document'
        });
      }

      console.log('✅ Files saved, processing OCR...');

      // Process both documents
      try {
        const identityResult = await KYCService.processKYCSubmission(userId, 'id_document', identityUrl);
        const addressResult = await KYCService.processKYCSubmission(userId, 'proof_of_address', addressUrl);

        console.log('✅ OCR results:', { identity: identityResult.success, address: addressResult.success });

        if (!identityResult.success || !addressResult.success) {
          console.error('❌ OCR processing failed');
          return res.status(500).json({
            error: 'KYC_PROCESSING_ERROR',
            message: 'Error processing documents'
          });
        }

        // Check if both documents are valid
        const identityValid = identityResult.validation.isValid;
        const addressValid = addressResult.validation.isValid;

        console.log('✅ Validation results:', { identityValid, addressValid });

        if (identityValid && addressValid) {
          // Auto-approve if both documents are valid
          const wallet = await Wallet.getWalletByUserId(userId);
          if (wallet) {
            await Wallet.verifyKYC(wallet.walletId, 'ai_system');
          }

          return res.json({
            success: true,
            message: 'KYC verification successful',
            status: 'approved',
            walletVerified: true,
            identityValid: true,
            addressValid: true
          });
        } else {
          // Return issues for failed documents
          const issues = [];
          if (!identityValid) {
            issues.push(...identityResult.validation.issues);
          }
          if (!addressValid) {
            issues.push(...addressResult.validation.issues);
          }

          return res.json({
            success: false,
            message: 'Document validation failed',
            status: 'failed',
            issues,
            identityValid,
            addressValid,
            acceptedDocuments: {
              identity: KYCService.getAcceptedDocuments('id_document'),
              address: KYCService.getAcceptedDocuments('proof_of_address')
            }
          });
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
  }

  // Get KYC status
  async getKYCStatus(req, res) {
    try {
      const { userId } = req.params;
      const wallet = await Wallet.getWalletByUserId(userId);
      
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