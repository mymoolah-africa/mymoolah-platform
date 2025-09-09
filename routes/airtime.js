const express = require('express');
const router = express.Router();
const controller = require('../controllers/airtimeController');
const authenticateToken = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/v1/airtime/networks - Get available airtime networks
router.get('/networks', controller.getAirtimeNetworks);

// GET /api/v1/airtime/networks/:networkId/voucher-values - Get voucher values for a network
router.get('/networks/:networkId/voucher-values', controller.getAirtimeVoucherValues);

// GET /api/v1/airtime/networks/:networkId/topup-values - Get top-up values for a network
router.get('/networks/:networkId/topup-values', controller.getAirtimeTopUpValues);

// GET /api/v1/airtime/eezi-values - Get eeziAirtime values (Flash exclusive)
router.get('/eezi-values', controller.getEeziAirtimeValues);

// GET /api/v1/airtime/global-services - Get global services (Airtime, Data, Electricity)
router.get('/global-services', controller.getGlobalServices);

// POST /api/v1/airtime/purchase/voucher - Purchase airtime voucher
router.post('/purchase/voucher', controller.purchaseAirtimeVoucher);

// POST /api/v1/airtime/purchase/topup - Purchase airtime top-up
router.post('/purchase/topup', controller.purchaseAirtimeTopUp);

// POST /api/v1/airtime/purchase/eezi - Purchase eeziAirtime
router.post('/purchase/eezi', controller.purchaseEeziAirtime);

// GET /api/v1/airtime/test - Test seeded data (development only)
router.get('/test', controller.testAirtimeData);

module.exports = router;
