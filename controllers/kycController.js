const KYCService = require('../services/kycService');
const { sequelize } = require('../models');
const Wallet = require('../models/Wallet')(sequelize, require('sequelize').DataTypes);
const notificationService = require('../services/notificationService');
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

      

      if (!files || !files.identityDocument) {
        console.error('❌ Missing identity document:', { files: !!files, identity: !!files?.identityDocument });
        return res.status(400).json({
          error: 'DOCUMENTS_REQUIRED',
          message: 'Please upload your ID document (SA ID or Passport)'
        });
      }

      

      // Test basic file operations first
      try {
        const testDir = path.join(__dirname, '../uploads/test');
        await fs.mkdir(testDir, { recursive: true });

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

      

      // Process identity document only (POA masked for now)
      // Return immediately to prevent mobile app timeout (10s), process async
      res.status(202).json({
        success: true,
        message: 'KYC document uploaded successfully. Processing in background...',
        status: 'processing',
        documentUrl: identityUrl,
        checkStatusEndpoint: `/api/v1/kyc/status/${userId}`,
        userId: userId
      });

      // Process async (don't await - let it run in background)
      (async () => {
        try {
          const identityResult = await KYCService.processKYCSubmission(userId, 'id_document', identityUrl, parseInt(retryCount));

        // const addressResult = await KYCService.processKYCSubmission(userId, 'proof_of_address', addressUrl);



          if (!identityResult.success) {
            console.log('❌ KYC validation failed:', identityResult.validation.issues);
            // Store result in database for user to check later
            // For now, just log - user can retry
            return;
          }

          // Check if identity document is valid - use the success field from KYC service
          // Also check if status is 'approved' (handles tolerantNameMatch case)
          const identityValid = identityResult.success && 
                               (identityResult.validation.isValid || identityResult.status === 'approved');

          if (identityValid) {
            // Auto-approve if identity document is valid (POA requirement masked)
            const wallet = await Wallet.findOne({ where: { userId: userId } });
            if (wallet) {
              await wallet.verifyKYC('ai_system');
              console.log('✅ Wallet KYC verified automatically');
              
              // Create notification for user
              try {
                await notificationService.createNotification(
                  userId,
                  'txn_wallet_credit', // Using existing type
                  'KYC Verification Successful',
                  'Your identity document has been verified successfully. Your wallet is now fully activated.',
                  {
                    severity: 'info',
                    category: 'transaction',
                    source: 'system'
                  }
                );
                console.log('✅ KYC verification notification created');
              } catch (notifError) {
                console.warn('⚠️  Failed to create KYC notification:', notifError.message);
              }
            }
          } else {
            console.log('⚠️  KYC validation failed - user can retry:', identityResult.validation.issues);
            
            // Create notification for validation failure
            try {
              await notificationService.createNotification(
                userId,
                'maintenance', // Using maintenance type for failures
                'KYC Verification Failed',
                identityResult.message || 'Document validation failed. Please try again with a clearer image.',
                {
                  severity: 'warning',
                  category: 'transaction',
                  source: 'system'
                }
              );
            } catch (notifError) {
              console.warn('⚠️  Failed to create KYC failure notification:', notifError.message);
            }
          }
        } catch (kycError) {
          console.error('❌ KYC processing error (async):', kycError);
          // Error logged - user can retry upload
        }
      })();
      
      return; // Response already sent above

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
      // Use authenticated user ID if no userId param provided
      const userId = req.params.userId || (req.user && req.user.id);
      
      if (!userId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      const wallet = await Wallet.findOne({ where: { userId: userId } });
      
      if (!wallet) {
        return res.status(404).json({
          error: 'WALLET_NOT_FOUND',
          message: 'Wallet not found'
        });
      }

      // Get KYC record if exists
      const { Kyc } = require('../models');
      const kycRecord = await Kyc.findOne({ 
        where: { userId: userId },
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        kycVerified: wallet.kycVerified || false,
        kycVerifiedAt: wallet.kycVerifiedAt || null,
        kycVerifiedBy: wallet.kycVerifiedBy || null,
        walletId: wallet.walletId,
        kycStatus: kycRecord ? kycRecord.status : 'not_started',
        kycRecord: kycRecord ? {
          status: kycRecord.status,
          documentType: kycRecord.documentType,
          submittedAt: kycRecord.submittedAt,
          reviewedAt: kycRecord.reviewedAt
        } : null
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