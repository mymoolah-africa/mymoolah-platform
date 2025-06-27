const express = require('express');
const router = express.Router();

// In-memory KYC store for demo purposes
let kycRecords = [];

// Upload a KYC document (demo: just store metadata)
router.post('/upload', (req, res) => {
  const { user_id, doc_type, doc_url } = req.body;
  if (!user_id || !doc_type || !doc_url) {
    return res.status(400).json({ error: 'user_id, doc_type, and doc_url are required' });
  }
  const record = {
    user_id,
    doc_type,
    doc_url,
    status: 'pending',
    uploaded_at: new Date().toISOString()
  };
  kycRecords.push(record);
  res.status(201).json({ kyc: record });
});

// Get KYC status for a user
router.get('/:user_id', (req, res) => {
  const { user_id } = req.params;
  const records = kycRecords.filter(r => r.user_id == user_id);
  if (records.length === 0) {
    return res.status(404).json({ error: 'No KYC records found for this user' });
  }
  res.json({ kyc: records });
});

module.exports = router;