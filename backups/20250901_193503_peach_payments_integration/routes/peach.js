const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const peachController = require('../controllers/peachController');

/**
 * Peach Payments API Routes
 * 
 * Peach Payments offers multiple payment services:
 * - PayShap (RPP & RTP) - South Africa's real-time payment system
 * - Credit/Debit Cards - Visa, Mastercard, American Express
 * - Electronic Funds Transfer (EFT)
 * - Payment Links - Shareable payment URLs
 * - Checkout V2 - Embedded payment forms
 * 
 * Priority: PayShap takes priority as primary payment method
 * dtMercury: PayShap only
 * Peach Payments: Multiple payment services + PayShap
 */

// Health check and service status
router.get('/health', peachController.healthCheck);

// Get available payment methods
router.get('/methods', peachController.getPaymentMethods);

// Get PayShap test scenarios and phone numbers
router.get('/payshap/test-scenarios', peachController.getPayShapTestScenarios);

// PayShap RPP (Rapid Payments Programme - outbound)
router.post('/payshap/rpp', auth, peachController.initiatePayShapRpp);

// PayShap RTP (Request to Pay - inbound)
router.post('/payshap/rtp', auth, peachController.initiatePayShapRtp);

// Client integration payments (for employee payments) - TODO: Implement
// router.post('/client/payments', auth, peachController.initiateClientPayment);

// Payment status and management
router.get('/payments/:merchantTransactionId', auth, peachController.getPaymentStatus);
router.delete('/payments/:merchantTransactionId', auth, peachController.cancelPayment);

// User payment history
router.get('/users/:userId/payments', auth, peachController.getUserPayments);

module.exports = router;


