/**
 * Referral Routes - MyMoolah Treasury Platform
 * 
 * API routes for referral program
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const auth = require('../middleware/auth');
const { verifyCloudSchedulerToken } = require('../middleware/cloudSchedulerAuth');

/**
 * @route   POST /api/v1/referrals/scheduled-payout
 * @desc    Cloud Scheduler-triggered daily referral payout. Runs synchronously
 *          within the HTTP request so Cloud Run keeps the instance alive.
 *          Authenticated via GCP OIDC token (not JWT).
 * @access  Cloud Scheduler only (OIDC token)
 */
router.post('/scheduled-payout', verifyCloudSchedulerToken, async (req, res) => {
  const startTime = Date.now();
  const triggeredBy = req.schedulerAuth
    ? req.schedulerAuth.email
    : 'unknown';

  console.log(`💰 Cloud Scheduler referral payout triggered by: ${triggeredBy}`);

  try {
    const referralPayoutService = require('../services/referralPayoutService');
    const result = await referralPayoutService.processDailyPayouts();

    const durationMs = Date.now() - startTime;
    console.log(`✅ Cloud Scheduler referral payout completed in ${durationMs}ms`);

    res.json({
      success: true,
      message: 'Referral payout completed',
      data: {
        durationMs,
        triggeredBy,
        completedAt: new Date().toISOString(),
        ...result,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`❌ Cloud Scheduler referral payout failed after ${durationMs}ms:`, error.message);

    res.status(500).json({
      success: false,
      error: 'Referral payout failed',
      errorCode: 'REFERRAL_PAYOUT_FAILED',
      message: 'Referral operation could not be completed. Please try again.',
      data: { durationMs, triggeredBy },
    });
  }
});

// All remaining routes require JWT authentication
router.use(auth);

/**
 * @route   GET /api/v1/referrals/dashboard
 * @desc    Get combined referral dashboard data (code, stats, recent earnings)
 * @access  Private
 */
router.get('/dashboard', referralController.getDashboard.bind(referralController));

/**
 * @route   GET /api/v1/referrals/my-code
 * @desc    Get user's referral code
 * @access  Private
 */
router.get('/my-code', referralController.getMyReferralCode.bind(referralController));

/**
 * @route   POST /api/v1/referrals/send-invite
 * @desc    Send referral invitation via SMS
 * @access  Private
 * @body    { phoneNumber: string (E.164), language?: string }
 */
router.post('/send-invite', referralController.sendInvite.bind(referralController));

/**
 * @route   POST /api/v1/referrals/invite
 * @desc    Send referral invitation via SMS (alias for frontend)
 * @access  Private
 * @body    { phoneNumber: string (E.164), language?: string }
 */
router.post('/invite', referralController.sendInvite.bind(referralController));

/**
 * @route   GET /api/v1/referrals/stats
 * @desc    Get user's referral statistics
 * @access  Private
 */
router.get('/stats', referralController.getMyStats.bind(referralController));

/**
 * @route   GET /api/v1/referrals/earnings
 * @desc    Get user's referral earnings (current month)
 * @access  Private
 */
router.get('/earnings', referralController.getMyEarnings.bind(referralController));

/**
 * @route   GET /api/v1/referrals/network
 * @desc    Get user's referral network (all levels)
 * @access  Private
 */
router.get('/network', referralController.getMyNetwork.bind(referralController));

/**
 * @route   GET /api/v1/referrals/pending
 * @desc    Get pending earnings summary
 * @access  Private
 */
router.get('/pending', referralController.getPendingEarnings.bind(referralController));

module.exports = router;

