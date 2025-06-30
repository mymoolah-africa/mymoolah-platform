const kycModel = require('../models/kycModel');

exports.submitKyc = async (req, res) => {
  try {
    const { user_id, document_type, document_url } = req.body;
    if (!user_id || !document_type || !document_url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await kycModel.submitKyc(user_id, document_type, document_url);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getKycStatus = async (req, res) => {
  try {
    const userId = req.params.userId;
    const status = await kycModel.getKycStatus(userId);
    if (!status) return res.status(404).json({ error: 'No KYC record found' });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateKycStatus = async (req, res) => {
  try {
    const { user_id, status, reviewer_id, notes } = req.body;
    if (!user_id || !status || !reviewer_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await kycModel.updateKycStatus(user_id, status, reviewer_id, notes || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};