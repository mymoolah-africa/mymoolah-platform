const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// GET: list beneficiaries for current user
router.get('/', auth, async (req, res) => {
  try {
    const { Beneficiary } = require('../models');
    const list = await Beneficiary.findAll({
      where: { userId: req.user.id },
      order: [['lastPaidAt', 'DESC'], ['updatedAt', 'DESC']],
    });
    res.json({ success: true, data: { beneficiaries: list } });
  } catch (e) {
    console.error('Beneficiaries GET error', e);
    res.status(500).json({ success: false, message: 'Failed to load beneficiaries' });
  }
});

// POST: add or update a beneficiary
router.post('/', auth, async (req, res) => {
  try {
    const { Beneficiary } = require('../models');
    const { name, identifier, accountType, bankName } = req.body;
    if (!name || !identifier || !accountType) {
      return res.status(400).json({ success: false, message: 'name, identifier, accountType required' });
    }
    const [row] = await Beneficiary.findOrCreate({
      where: { userId: req.user.id, identifier, accountType },
      defaults: { name, bankName: bankName || null, lastPaidAt: null, timesPaid: 0 },
    });
    if (row.name !== name || row.bankName !== (bankName || null)) {
      await row.update({ name, bankName: bankName || null });
    }
    res.json({ success: true, data: row });
  } catch (e) {
    console.error('Beneficiaries POST error', e);
    res.status(500).json({ success: false, message: 'Failed to save beneficiary' });
  }
});

module.exports = router;
