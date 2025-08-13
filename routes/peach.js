const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const peachController = require('../controllers/peachController');

// Initiate PayShap outbound payment (RPP)
router.post('/payshap/rpp', auth, peachController.initiatePayShapRpp);

module.exports = router;


