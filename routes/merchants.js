const express = require('express');
const router = express.Router();

// GET all merchants
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Merchants retrieved successfully',
    data: {
      merchants: [
        { id: 1, name: 'Vodacom', category: 'telecom', isActive: true },
        { id: 2, name: 'MTN', category: 'telecom', isActive: true },
        { id: 3, name: 'Checkers', category: 'retail', isActive: true }
      ]
    }
  });
});

// GET merchant by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: 'Merchant retrieved successfully',
    data: { id: parseInt(id), name: 'Sample Merchant', category: 'retail', isActive: true }
  });
});

module.exports = router; 