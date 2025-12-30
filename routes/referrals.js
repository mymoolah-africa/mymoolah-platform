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

// All routes require authentication
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

