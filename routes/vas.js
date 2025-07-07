const express = require('express');
const router = express.Router();

// GET all VAS services
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VAS services retrieved successfully',
    data: {
      services: [
        { id: 1, name: 'Airtime', category: 'telecom', isActive: true },
        { id: 2, name: 'Data Bundle', category: 'telecom', isActive: true },
        { id: 3, name: 'Electricity', category: 'utilities', isActive: true }
      ]
    }
  });
});

// GET VAS service by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: 'VAS service retrieved successfully',
    data: { id: parseInt(id), name: 'Sample VAS', category: 'utilities', isActive: true }
  });
});

module.exports = router; 