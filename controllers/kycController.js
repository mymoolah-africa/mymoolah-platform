const KYCService = require('../services/kycService');
const { sequelize } = require('../models');
const Wallet = require('../models/Wallet')(sequelize, require('sequelize').DataTypes);
const notificationService = require('../services/notificationService');
const { getWalletDefaults, getLimitsForTier } = require('../config/kycTierLimits');
const path = require('path');
const fs = require('fs').promises;



class KYCController {
  // Upload KYC document
  async uploadDocument(req, res) {
    try {
      const userId = req.user?.id || req.body.userId;
      const { documentType } = req.body;
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
        const wallet = await Wallet.findOne({ where: { userId: userId } });
        if (wallet) {
          await wallet.verifyKYC('ai_system');
        }

        const { User } = require('../models');
        const user = await User.findByPk(userId);
        if (user) {
          let newTier;
          if (documentType === 'id_document') {
            newTier = (user.kyc_tier != null && user.kyc_tier >= 1) ? user.kyc_tier : 1;
            await user.update({ kycStatus: 'verified', kyc_tier: newTier });
          } else if (documentType === 'proof_of_address' && user.kyc_tier >= 1) {
            newTier = 2;
            await user.update({ kyc_tier: newTier });
          }

          if (newTier !== undefined && wallet) {
            const newLimits = getWalletDefaults(newTier);
            await wallet.update({
              dailyLimit: newLimits.dailyLimit,
              monthlyLimit: newLimits.monthlyLimit,
            });
          }
        }

        return res.json({
          success: true,
          message: 'KYC verification successful',
          status: 'approved',
          walletVerified: true,
          kycRecordId: kycRecord.id,
          kycTier: user ? user.kyc_tier : null
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

      

      // Check what the user has provided and what they need
      const hasIdentity = files && files.identityDocument;
      const hasAddress = files && files.addressDocument;

      if (!hasIdentity && !hasAddress) {
        return res.status(400).json({
          error: 'DOCUMENTS_REQUIRED',
          message: 'Please upload at least one document'
        });
      }

      // If no identity document, check if user already has Tier 1+ (ID already verified)
      if (!hasIdentity) {
        const { User } = require('../models');
        const existingUser = await User.findByPk(userId);
        if (!existingUser || existingUser.kyc_tier == null || existingUser.kyc_tier < 1) {
          return res.status(400).json({
            error: 'IDENTITY_REQUIRED',
            message: 'Please upload your ID document (SA ID or Passport)'
          });
        }
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

      const identityFile = hasIdentity ? files.identityDocument[0] : null;
      const addressFile = hasAddress ? files.addressDocument[0] : null;

      const uploadDir = path.join(__dirname, '../uploads/kyc');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (dirError) {
        console.error('❌ Upload directory creation failed:', dirError);
        return res.status(500).json({
          error: 'FILE_SYSTEM_ERROR',
          message: 'Error creating upload directory'
        });
      }

      // Save identity document if provided
      let identityUrl = null;
      if (identityFile) {
        identityUrl = `/uploads/kyc/${userId}_id_document_${Date.now()}.${identityFile.originalname.split('.').pop()}`;
        try {
          await fs.writeFile(path.join(uploadDir, path.basename(identityUrl)), identityFile.buffer);
        } catch (fileError) {
          console.error('❌ Identity file save failed:', fileError);
          return res.status(500).json({
            error: 'FILE_SAVE_ERROR',
            message: 'Error saving identity document'
          });
        }
      }

      // Save address document if provided
      let addressUrl = null;
      if (addressFile) {
        addressUrl = `/uploads/kyc/${userId}_proof_of_address_${Date.now()}.${addressFile.originalname.split('.').pop()}`;
        try {
          await fs.writeFile(path.join(uploadDir, path.basename(addressUrl)), addressFile.buffer);
        } catch (fileError) {
          console.error('❌ Address file save failed:', fileError);
          return res.status(500).json({
            error: 'FILE_SAVE_ERROR',
            message: 'Error saving address document'
          });
        }
      }

      // Set user status to 'under_review' BEFORE responding so the frontend
      // polling loop sees a pollable status immediately
      try {
        const { sequelize: seq, Kyc: KycReset } = require('../models');
        await seq.query(
          'UPDATE users SET "kycStatus" = $1, "updatedAt" = NOW() WHERE id = $2',
          { bind: ['under_review', userId] }
        );
        await KycReset.update(
          { status: 'pending', rejectionReason: null, reviewedAt: null },
          { where: { userId } }
        ).catch(() => {});
      } catch (resetErr) {
        console.warn('⚠️  Non-fatal: failed to reset kycStatus before 202:', resetErr.message);
      }

      // Return immediately to prevent mobile app timeout (10s), process async
      res.status(202).json({
        success: true,
        message: 'KYC document(s) uploaded successfully. Processing in background...',
        status: 'processing',
        documentUrl: identityUrl,
        addressDocumentUrl: addressUrl,
        checkStatusEndpoint: `/api/v1/kyc/status/${userId}`,
        userId: userId,
        pollInterval: 2000,
        estimatedProcessingTime: addressUrl ? 20000 : 10000
      });

      // --- Helper: persist KYC rejection (user status + KYC record + notification) ---
      async function persistKycRejection(uid, reason, docType) {
        const { Kyc: KycModel, sequelize: seq } = require('../models');
        const dbDocType = docType === 'proof_of_address' ? 'utility_bill' : 'id_card';

        // 1. Set user.kycStatus to 'rejected' via direct SQL (avoids Sequelize staleness)
        try {
          await seq.query(
            'UPDATE users SET "kycStatus" = $1, "updatedAt" = NOW() WHERE id = $2',
            { bind: ['rejected', uid] }
          );
        } catch (err) {
          console.error('❌ Failed to set user.kycStatus to rejected:', err.message);
        }

        // 2. Upsert KYC record with rejection reason
        try {
          const existing = await KycModel.findOne({ where: { userId: uid }, order: [['createdAt', 'DESC']] });
          if (existing) {
            await existing.update({ status: 'rejected', rejectionReason: reason, reviewedAt: new Date() });
          } else {
            await KycModel.create({
              userId: uid, documentType: dbDocType, documentNumber: 'REJECTED',
              status: 'rejected', rejectionReason: reason,
              submittedAt: new Date(), reviewedAt: new Date()
            });
          }
        } catch (err) {
          console.error('❌ Failed to upsert KYC record:', err.message);
        }

        // 3. User notification
        try {
          await notificationService.createNotification(uid, 'maintenance', 'KYC Verification Failed',
            reason, { severity: 'warning', category: 'transaction', source: 'system' });
        } catch (err) {
          console.error('❌ Failed to create KYC failure notification:', err.message);
        }
      }

      // Process async (don't await - let it run in background)
      (async () => {
        try {
          const { User, Kyc, sequelize } = require('../models');
          const user = await User.findByPk(userId);
          const wallet = await Wallet.findOne({ where: { userId: userId } });
          let currentTier = user?.kyc_tier ?? null;

          // kycStatus and KYC record already reset to 'under_review'/'pending'
          // before the 202 response (see above)

          // --- Phase 1: Process identity document if provided ---
          if (identityUrl) {
            const identityResult = await KYCService.processKYCSubmission(userId, 'id_document', identityUrl, parseInt(retryCount));

            if (!identityResult.success) {
              const reason = identityResult.message || identityResult.validation?.issues?.join('. ') || 'Document validation failed. Please try again with a clearer image.';
              console.log('❌ KYC ID validation failed:', identityResult.validation?.issues);
              await persistKycRejection(userId, reason, 'id_document');
              return;
            }

            const identityValid = identityResult.success &&
                                 (identityResult.validation.isValid || identityResult.status === 'approved');

            if (identityValid) {
              if (wallet) {
                await wallet.verifyKYC('ai_system');
                const tier1Limits = getWalletDefaults(1);
                await wallet.update({
                  dailyLimit: tier1Limits.dailyLimit,
                  monthlyLimit: tier1Limits.monthlyLimit,
                });
              }
              currentTier = 1;
              if (user) {
                // Only set kycStatus to 'verified' now if there's no POA to process.
                // Otherwise defer until all phases complete so the frontend keeps polling.
                if (!addressUrl) {
                  await user.update({ kycStatus: 'verified', kyc_tier: 1 });
                } else {
                  await user.update({ kyc_tier: 1 });
                }
              }
              console.log('✅ User KYC: Tier 1 (ID verified)');
            } else {
              const reason = identityResult.message || identityResult.validation?.issues?.join('. ') || 'Document validation failed. Please try again with a clearer image.';
              console.log('❌ KYC validation failed:', identityResult.validation?.issues);
              await persistKycRejection(userId, reason, 'id_document');
              return;
            }
          }

          // --- Phase 2: Process address document if provided (requires Tier 1+) ---
          if (addressUrl && currentTier != null && currentTier >= 1) {
            try {
              const addressResult = await KYCService.processKYCSubmission(userId, 'proof_of_address', addressUrl, 0);
              const addressValid = addressResult.success &&
                                  (addressResult.validation.isValid || addressResult.status === 'approved');
              if (addressValid) {
                currentTier = 2;
                if (user) {
                  await user.update({ kyc_tier: 2 });
                }
                if (wallet) {
                  const tier2Limits = getWalletDefaults(2);
                  await wallet.update({
                    dailyLimit: tier2Limits.dailyLimit,
                    monthlyLimit: tier2Limits.monthlyLimit,
                  });
                }
                console.log('✅ User KYC: Tier 2 (ID + POA verified)');
              } else {
                const reason = addressResult.message || addressResult.validation?.issues?.join('. ') || 'Address document validation failed. Please upload a clear utility bill or bank statement.';
                console.log('❌ POA validation failed:', addressResult.validation?.issues);
                await persistKycRejection(userId, reason, 'proof_of_address');
                return;
              }
            } catch (poaError) {
              console.error('❌ POA processing error:', poaError.message);
              await persistKycRejection(userId, 'Address document processing failed. Please try again.', 'proof_of_address');
              return;
            }
          }

          // --- All phases passed — finalize kycStatus ---
          // Use direct SQL: the Sequelize `user` instance is stale (loaded before
          // the frontend POST that may have overwritten kycStatus to 'documents_uploaded').
          await sequelize.query(
            'UPDATE users SET "kycStatus" = $1, "updatedAt" = NOW() WHERE id = $2',
            { bind: ['verified', userId] }
          );

          const tierLabels = { 0: 'Tier 0 (basic)', 1: 'Tier 1 (ID verified)', 2: 'Tier 2 (fully verified)' };
          const tierLabel = tierLabels[currentTier] || `Tier ${currentTier}`;
          try {
            await notificationService.createNotification(userId, 'txn_wallet_credit', 'KYC Verification Successful',
              `Your documents have been verified successfully (${tierLabel}). Your wallet is now activated.`,
              { severity: 'info', category: 'transaction', source: 'system' });
          } catch (notifError) {
            console.warn('⚠️  Failed to create KYC success notification:', notifError.message);
          }
        } catch (kycError) {
          console.error('❌ KYC processing error (async):', kycError);
          console.error('❌ KYC async stack:', kycError?.stack);
          try {
            await persistKycRejection(userId,
              'Document processing encountered an error. Please try uploading again.',
              identityUrl ? 'id_document' : 'proof_of_address');
          } catch (recoveryErr) {
            console.error('❌ KYC error recovery also failed:', recoveryErr.message);
            // Last resort: raw SQL so the user is never stuck at under_review
            try {
              const { sequelize: fallbackSeq } = require('../models');
              await fallbackSeq.query(
                'UPDATE users SET "kycStatus" = $1, "updatedAt" = NOW() WHERE id = $2',
                { bind: ['rejected', userId] }
              );
            } catch (_) { /* truly nothing left to try */ }
          }
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

      // Get user to check kycStatus (frontend checks this, not just wallet.kycVerified)
      const { User, Kyc } = require('../models');
      const user = await User.findByPk(userId);
      
      // Get KYC record if exists (only select columns that exist in database)
      // Note: Database has ocrResults, not ocrData. Also some columns may not exist.
      let kycRecord = null;
      try {
        kycRecord = await Kyc.findOne({ 
          where: { userId: userId },
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'userId', 'documentType', 'documentNumber', 'status', 'submittedAt', 'reviewedAt', 'reviewerNotes', 'rejectionReason', 'createdAt', 'updatedAt']
        });
      } catch (kycError) {
        // If KYC table query fails, continue without kycRecord
        console.warn('⚠️  Could not fetch KYC record:', kycError.message);
      }
      
      let finalKycStatus = user?.kycStatus || (wallet.kycVerified ? 'verified' : (kycRecord ? kycRecord.status : 'not_started'));

      // Self-healing: wallet is verified + tier >= 1, but kycStatus is stale
      // (race condition: 429 storm caused retry upload that overwrote verified status)
      if (wallet.kycVerified && user?.kyc_tier >= 1
          && finalKycStatus !== 'verified' && finalKycStatus !== 'rejected') {
        console.log('🔧 Self-healing: wallet verified + tier', user.kyc_tier, 'but kycStatus is', finalKycStatus, '— correcting to verified');
        finalKycStatus = 'verified';
        if (user) {
          user.update({ kycStatus: 'verified' }).catch(err => console.error('Self-heal user.kycStatus update failed:', err.message));
        }
      }

      // Self-healing: KYC record rejected but user.kycStatus not updated
      if (kycRecord?.status === 'rejected' && kycRecord?.rejectionReason
          && finalKycStatus !== 'rejected' && finalKycStatus !== 'verified'
          && finalKycStatus !== 'documents_uploaded') {
        console.log('🔧 Self-healing: KYC record is rejected but user.kycStatus is', finalKycStatus, '— correcting to rejected');
        finalKycStatus = 'rejected';
        if (user) {
          user.update({ kycStatus: 'rejected' }).catch(err => console.error('Self-heal user.kycStatus update failed:', err.message));
        }
      }

      // Self-healing: under_review stuck for more than 5 minutes
      // (async OCR processing crashed without recovery — user should retry)
      if (finalKycStatus === 'under_review') {
        const checkTime = kycRecord?.updatedAt || kycRecord?.createdAt || user?.updatedAt;
        if (checkTime) {
          const elapsedMs = Date.now() - new Date(checkTime).getTime();
          const STALE_THRESHOLD_MS = 5 * 60 * 1000;
          if (elapsedMs > STALE_THRESHOLD_MS) {
            const mins = Math.round(elapsedMs / 60000);
            console.log('🔧 Self-healing: under_review stuck for', mins, 'min — setting rejected for retry');
            finalKycStatus = 'rejected';
            const staleMsg = 'Document processing timed out. Please try uploading again.';
            if (user) {
              user.update({ kycStatus: 'rejected' }).catch(err =>
                console.error('Self-heal stale under_review user update failed:', err.message));
            }
            if (kycRecord && kycRecord.status !== 'rejected') {
              kycRecord.update({
                status: 'rejected',
                rejectionReason: staleMsg,
                reviewedAt: new Date()
              }).catch(err =>
                console.error('Self-heal stale under_review KYC record failed:', err.message));
            }
          }
        }
      }

      const isVerified = finalKycStatus === 'verified' || wallet.kycVerified === true;

      const currentKycTier = user?.kyc_tier != null ? user.kyc_tier : null;
      const tierLimits = getLimitsForTier(currentKycTier);
      
      res.json({
        success: true,
        kycVerified: wallet.kycVerified || false,
        kycVerifiedAt: wallet.kycVerifiedAt || null,
        kycVerifiedBy: wallet.kycVerifiedBy || null,
        walletId: wallet.walletId,
        kycStatus: finalKycStatus,
        kycTier: currentKycTier,
        tierLimits: {
          label: tierLimits.label,
          singleTransactionLimit: tierLimits.singleTransactionLimit,
          dailyLimit: tierLimits.dailyLimit,
          monthlyLimit: tierLimits.monthlyLimit,
          maxBalance: tierLimits.maxBalance,
          canSendMoney: tierLimits.canSendMoney,
          canWithdrawCash: tierLimits.canWithdrawCash,
          canTransferInternational: tierLimits.canTransferInternational,
        },
        isComplete: isVerified,
        shouldNavigate: isVerified,
        kycRecord: kycRecord ? {
          status: kycRecord.status,
          documentType: kycRecord.documentType,
          submittedAt: kycRecord.submittedAt,
          reviewedAt: kycRecord.reviewedAt,
          rejectionReason: kycRecord.rejectionReason || null
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

      const wallet = await Wallet.findOne({ where: { walletId } });
      if (!wallet) {
        return res.status(404).json({
          error: 'WALLET_NOT_FOUND',
          message: 'Wallet not found'
        });
      }
      await wallet.verifyKYC(verifiedBy || 'support_team');

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