const express = require('express');
const router = express.Router();

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  PEACH PAYMENTS — ARCHIVED (2026-03-21)                            ║
 * ║                                                                      ║
 * ║  All PayShap RPP/RTP routes are DECOMMISSIONED.                     ║
 * ║  PayShap Request-to-Pay now uses Standard Bank directly:            ║
 * ║    POST /api/v1/standardbank/payshap/rtp                            ║
 * ║                                                                      ║
 * ║  The Peach agreement was cancelled. Code is preserved below         ║
 * ║  (commented out) for potential future reactivation.                  ║
 * ║                                                                      ║
 * ║  TO REACTIVATE:                                                      ║
 * ║  1. Obtain new Peach Payments credentials                           ║
 * ║  2. Set PEACH_INTEGRATION_ARCHIVED=false in env                     ║
 * ║  3. Set PEACH_* env vars (see .env.codespaces for names)            ║
 * ║  4. Uncomment routes below                                          ║
 * ║  5. Update frontend RequestMoneyPage.tsx endpoint if needed         ║
 * ║  6. Test in UAT before enabling in production                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

router.get('/status', (req, res) => {
  res.json({
    status: 'archived',
    reason: 'Peach Payments agreement cancelled. PayShap RTP uses Standard Bank directly via /api/v1/standardbank/payshap/rtp',
    archivedDate: '2026-03-21',
    reactivation: 'See routes/peach.js header comments for reactivation steps',
  });
});

// ──────────────────────────────────────────────────────────────────────
// ALL ROUTES BELOW ARE ARCHIVED — DO NOT UNCOMMENT WITHOUT APPROVAL
// ──────────────────────────────────────────────────────────────────────

// const auth = require('../middleware/auth');
// const peachController = require('../controllers/peachController');
// const rawBodyMiddleware = express.raw({ type: 'application/json', limit: '10mb' });
//
// router.get('/health', peachController.healthCheck);
// router.get('/methods', peachController.getPaymentMethods);
// router.get('/payshap/test-scenarios', peachController.getPayShapTestScenarios);
// router.post('/payshap/rpp', auth, peachController.initiatePayShapRpp);
// router.post('/payshap/rtp', auth, peachController.initiatePayShapRtp);
// router.post('/request-money', auth, peachController.requestMoneyViaPayShap);
// router.post('/test/rpp', peachController.initiatePayShapRpp);
// router.post('/test/rtp', peachController.initiatePayShapRtp);
// router.post('/test/request-money', peachController.requestMoneyViaPayShap);
// router.get('/payments/:merchantTransactionId', auth, peachController.getPaymentStatus);
// router.delete('/payments/:merchantTransactionId', auth, peachController.cancelPayment);
// router.get('/users/:userId/payments', auth, peachController.getUserPayments);
// router.post('/webhook', rawBodyMiddleware, peachController.handleWebhook);
// router.post('/poll-status', peachController.pollPaymentStatus);

module.exports = router;


