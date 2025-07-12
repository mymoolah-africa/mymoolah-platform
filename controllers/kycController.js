const Kyc = require('../models/Kyc');
const kycModel = new Kyc();

// Get all KYC records
exports.getAllKyc = async (req, res) => {
  try {
    kycModel.db.all(`
      SELECT 
        k.id,
        k.userId,
        k.documentType,
        k.documentNumber,
        k.status,
        k.submittedAt,
        k.reviewedAt,
        k.reviewerNotes,
        u.firstName,
        u.lastName,
        u.email
      FROM kyc k
      LEFT JOIN users u ON k.userId = u.id
      ORDER BY k.submittedAt DESC
    `, [], (err, rows) => {
      if (err) {
        console.error('❌ Error getting KYC records:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error', 
          details: err.message 
        });
      }
      res.json({ 
        success: true,
        message: 'KYC records retrieved successfully',
        data: { kyc: rows || [] }
      });
    });
  } catch (error) {
    console.error('❌ Error in getAllKyc:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

// Submit KYC document
exports.submitKyc = async (req, res) => {
  try {
    const { userId, documentType, documentNumber } = req.body;
    const result = await kycModel.submitKyc({ userId, documentType, documentNumber });
    res.json({ 
      success: true,
      message: 'KYC document submitted successfully',
      data: { kycId: result.id }
    });
  } catch (error) {
    console.error('❌ Error in submitKyc:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

// Get KYC status for a user
exports.getKycStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const row = await kycModel.getKycStatus(userId);
    if (!row) {
      return res.status(404).json({ 
        success: false,
        message: 'KYC record not found' 
      });
    }
    res.json({ 
      success: true,
      message: 'KYC status retrieved successfully',
      data: { kyc: row }
    });
  } catch (error) {
    console.error('❌ Error in getKycStatus:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

// Update KYC status (admin function)
exports.updateKycStatus = async (req, res) => {
  try {
    const { kycId, status, reviewerNotes } = req.body;
    const result = await kycModel.updateKycStatus(kycId, status, reviewerNotes);
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'KYC record not found' 
      });
    }
    res.json({ 
      success: true,
      message: 'KYC status updated successfully',
      data: { kycId }
    });
  } catch (error) {
    console.error('❌ Error in updateKycStatus:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
}; 