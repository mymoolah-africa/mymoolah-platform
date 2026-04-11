const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// GET: list beneficiaries for current user with optional filtering
router.get('/', auth, async (req, res) => {
  try {
    const { Beneficiary } = require('../models');
    const { type, search } = req.query;
    
    let whereClause = { userId: req.user.id };
    
    // Filter by type if provided
    if (type && type !== 'all') {
      whereClause.accountType = type;
    }
    
    // Add search functionality
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { identifier: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ];
    }
    
    const list = await Beneficiary.findAll({
      where: whereClause,
      order: [['lastPaidAt', 'DESC'], ['updatedAt', 'DESC']],
    });
    
    res.json({ success: true, data: { beneficiaries: list } });
  } catch (e) {
    console.error('Beneficiary list error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to load beneficiaries', errorCode: 'BENEFICIARY_LIST_FAILED', message: 'Could not load your beneficiaries. Please try again.' });
  }
});

// GET: search beneficiaries
router.get('/search', auth, async (req, res) => {
  try {
    const { Beneficiary } = require('../models');
    const { q, type } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { beneficiaries: [] } });
    }
    
    let whereClause = { 
      userId: req.user.id,
      [require('sequelize').Op.or]: [
        { name: { [require('sequelize').Op.iLike]: `%${q}%` } },
        { identifier: { [require('sequelize').Op.iLike]: `%${q}%` } }
      ]
    };
    
    if (type && type !== 'all') {
      whereClause.accountType = type;
    }
    
    const results = await Beneficiary.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC']],
      limit: 10
    });
    
    res.json({ success: true, data: { beneficiaries: results } });
  } catch (e) {
    console.error('Beneficiary search error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to search beneficiaries', errorCode: 'BENEFICIARY_LIST_FAILED', message: 'Could not search beneficiaries. Please try again.' });
  }
});

// POST: add or update a beneficiary
router.post('/', auth, async (req, res) => {
  try {
    const { Beneficiary } = require('../models');
    const { name, identifier, accountType, bankName, metadata, msisdn } = req.body;
    
    if (!name || !identifier || !accountType) {
      return res.status(400).json({ 
        success: false, 
        message: 'name, identifier, accountType required' 
      });
    }
    
    // Validate accountType
    const validTypes = ['mymoolah', 'bank', 'airtime', 'data', 'electricity', 'biller'];
    if (!validTypes.includes(accountType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid accountType' 
      });
    }
    
    // Set msisdn based on accountType (banking-grade rule)
    // - mymoolah/airtime/data: msisdn is REQUIRED and equals the mobile number (identifier)
    // - electricity/biller: msisdn MUST be NULL (non-mobile identifiers like meter/account numbers)
    // - bank: msisdn optional; keep null unless explicitly provided
    let beneficiaryMsisdn = msisdn ?? null;
    if (beneficiaryMsisdn === null) {
      if (accountType === 'mymoolah' || accountType === 'airtime' || accountType === 'data') {
        beneficiaryMsisdn = identifier;
      } else if (accountType === 'electricity' || accountType === 'biller') {
        beneficiaryMsisdn = null;
      } else if (accountType === 'bank') {
        beneficiaryMsisdn = null;
      }
    }
    
    const [row] = await Beneficiary.findOrCreate({
      where: { userId: req.user.id, identifier, accountType },
      defaults: { 
        name, 
        msisdn: beneficiaryMsisdn,
        bankName: bankName || null, 
        metadata: metadata || null,
        lastPaidAt: null, 
        timesPaid: 0 
      },
    });
    
    // Update if different
    const needsUpdate = row.name !== name || 
                       row.msisdn !== beneficiaryMsisdn ||
                       row.bankName !== (bankName || null) ||
                       JSON.stringify(row.metadata) !== JSON.stringify(metadata || null);
    
    if (needsUpdate) {
      await row.update({ 
        name, 
        msisdn: beneficiaryMsisdn,
        bankName: bankName || null,
        metadata: metadata || null
      });
    }
    
    res.json({ success: true, data: row });
  } catch (e) {
    console.error('Beneficiary save error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to save beneficiary', errorCode: 'BENEFICIARY_SAVE_FAILED', message: 'Could not save beneficiary. Please try again.' });
  }
});

// PUT: update a specific beneficiary
router.put('/:id', auth, async (req, res) => {
  try {
    const { Beneficiary } = require('../models');
    const { id } = req.params;
    const { name, identifier, bankName, metadata, msisdn } = req.body;
    
    const beneficiary = await Beneficiary.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!beneficiary) {
      return res.status(404).json({ 
        success: false, 
        message: 'Beneficiary not found' 
      });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (identifier) updateData.identifier = identifier;
    if (msisdn) updateData.msisdn = msisdn;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (metadata !== undefined) updateData.metadata = metadata;
    
    await beneficiary.update(updateData);
    
    res.json({ success: true, data: beneficiary });
  } catch (e) {
    console.error('Beneficiary update error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to update beneficiary', errorCode: 'BENEFICIARY_UPDATE_FAILED', message: 'Could not update beneficiary. Please try again.' });
  }
});

// DELETE: remove a beneficiary
router.delete('/:id', auth, async (req, res) => {
  try {
    const { Beneficiary } = require('../models');
    const { id } = req.params;
    
    const beneficiary = await Beneficiary.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!beneficiary) {
      return res.status(404).json({ 
        success: false, 
        message: 'Beneficiary not found' 
      });
    }
    
    await beneficiary.destroy();
    
    res.json({ success: true, message: 'Beneficiary deleted successfully' });
  } catch (e) {
    console.error('Beneficiary delete error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to delete beneficiary', errorCode: 'BENEFICIARY_DELETE_FAILED', message: 'Could not delete beneficiary. Please try again.' });
  }
});

module.exports = router;
