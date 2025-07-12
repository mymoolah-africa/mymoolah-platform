const express = require('express');
const router = express.Router();

// GET all service providers
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Service providers retrieved successfully',
    data: {
      serviceProviders: [
        { id: 1, name: 'MyMoolah', type: 'wallet', isActive: true },
        { id: 2, name: 'EasyPay', type: 'payment', isActive: true },
        { id: 3, name: 'Mercury', type: 'payment', isActive: true }
      ]
    }
  });
});

// GET service provider by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: 'Service provider retrieved successfully',
    data: { id: parseInt(id), name: 'Sample Provider', type: 'payment', isActive: true }
  });
});

module.exports = router; 