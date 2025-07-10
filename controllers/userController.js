const { User } = require('../models/User');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const db = require('../models/User').db;
    db.all('SELECT id, firstName, lastName, email, walletId, createdAt FROM users', [], (err, rows) => {
      if (err) {
        console.error('❌ Error getting users:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error', 
          details: err.message 
        });
      }
      res.json({ 
        success: true,
        message: 'Users retrieved successfully',
        data: { users: rows }
      });
    });
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../models/User').db;
    
    db.get('SELECT id, firstName, lastName, email, walletId, createdAt FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('❌ Error getting user:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error', 
          details: err.message 
        });
      }
      
      if (!row) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'User retrieved successfully',
        data: { user: row }
      });
    });
  } catch (error) {
    console.error('❌ Error in getUserById:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

// Update user profile
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;
    const db = require('../models/User').db;
    
    db.run(
      'UPDATE users SET firstName = ?, lastName = ?, email = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [firstName, lastName, email, id],
      function(err) {
        if (err) {
          console.error('❌ Error updating user:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
          });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ 
            success: false,
            message: 'User not found' 
          });
        }
        
        res.json({ 
          success: true,
          message: 'User updated successfully',
          data: { userId: id }
        });
      }
    );
  } catch (error) {
    console.error('❌ Error in updateUser:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};