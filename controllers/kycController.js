// Get all KYC records
exports.getAllKyc = async (req, res) => {
  try {
    const db = require('../models/User').db;
    db.all(`
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
        data: { kyc: rows }
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
    const db = require('../models/User').db;
    
    db.run(
      'INSERT INTO kyc (userId, documentType, documentNumber, status, submittedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [userId, documentType, documentNumber, 'pending'],
      function(err) {
        if (err) {
          console.error('❌ Error submitting KYC:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
          });
        }
        
        res.json({ 
          success: true,
          message: 'KYC document submitted successfully',
          data: { kycId: this.lastID }
        });
      }
    );
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
    const db = require('../models/User').db;
    
    db.get('SELECT * FROM kyc WHERE userId = ? ORDER BY submittedAt DESC LIMIT 1', [userId], (err, row) => {
      if (err) {
        console.error('❌ Error getting KYC status:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error', 
          details: err.message 
        });
      }
      
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
    const db = require('../models/User').db;
    
    db.run(
      'UPDATE kyc SET status = ?, reviewerNotes = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [status, reviewerNotes, kycId],
      function(err) {
        if (err) {
          console.error('❌ Error updating KYC status:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
          });
        }
        
        if (this.changes === 0) {
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
      }
    );
  } catch (error) {
    console.error('❌ Error in updateKycStatus:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};