const express = require('express');
const router = express.Router();
const voucherTypeController = require('../controllers/voucherTypeController');

// Get all voucher types
router.get('/', voucherTypeController.getAllVoucherTypes);

// Get voucher type by name
router.get('/:typeName', voucherTypeController.getVoucherType);

// Create new voucher type
router.post('/', voucherTypeController.createVoucherType);

// Update voucher type
router.put('/:typeName', voucherTypeController.updateVoucherType);

// Delete voucher type (soft delete)
router.delete('/:typeName', voucherTypeController.deleteVoucherType);

// Validate voucher data against type rules
router.post('/validate', voucherTypeController.validateVoucherData);

module.exports = router; 