const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');

// GET /api/v1/easypay/bills/:easyPayNumber
router.get('/bills/:easyPayNumber', async (req, res) => {
  try {
    const bill = await Bill.findByEasyPayNumber(req.params.easyPayNumber);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    res.json(bill);
  } catch (err) {
    console.error('GET /bills/:easyPayNumber error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/v1/easypay/payments
router.post('/payments', async (req, res) => {
  try {
    const {
      easyPayNumber,
      accountNumber,
      amount,
      merchantId,
      terminalId,
      paymentDate,
      reference,
      echoData
    } = req.body;

    // Validate required fields
    if (!easyPayNumber || !accountNumber || !amount || !merchantId || !terminalId || !reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the bill
    const bill = await Bill.findByEasyPayNumber(easyPayNumber);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Create payment
    const payment = await Payment.create({
      easyPayNumber,
      accountNumber,
      amount,
      merchantId,
      terminalId,
      paymentDate: paymentDate || new Date().toISOString(),
      reference,
      echoData: echoData || '',
      billId: bill.id,
      status: 'completed'
    });

    // Update bill status
    await Bill.updateStatus(bill.id, 'paid');

    res.json({ success: true, payment });
  } catch (err) {
    console.error('POST /payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// (Optional) GET /api/v1/easypay/bills
router.get('/bills', async (req, res) => {
  try {
    const bills = await Bill.findAll();
    res.json(bills);
  } catch (err) {
    console.error('GET /bills error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;