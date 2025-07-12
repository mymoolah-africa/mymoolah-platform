const User = require('../models/User');

class UserController {
  constructor() {
    this.userModel = new User();
  }

  // Get all users
  async getAllUsers(req, res) {
    try {
      const users = await this.userModel.getAllUsers();
      
      res.json({ 
        success: true,
        message: 'Users retrieved successfully',
        data: { users }
      });
    } catch (error) {
      console.error('❌ Error in getAllUsers:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userModel.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'User retrieved successfully',
        data: { user }
      });
    } catch (error) {
      console.error('❌ Error in getUserById:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      });
    }
  }

  // Update user profile
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, phoneNumber } = req.body;
      
      const result = await this.userModel.updateUser(id, {
        firstName,
        lastName,
        phoneNumber
      });
      
      if (result.changes === 0) {
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
    } catch (error) {
      console.error('❌ Error in updateUser:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      });
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const stats = await this.userModel.getUserStats();
      
      res.json({ 
        success: true,
        message: 'User statistics retrieved successfully',
        data: { stats }
      });
    } catch (error) {
      console.error('❌ Error in getUserStats:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      });
    }
  }

  // Update user status
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const result = await this.userModel.updateUserStatus(id, status);
      
      if (result.changes === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'User status updated successfully',
        data: { userId: id, status }
      });
    } catch (error) {
      console.error('❌ Error in updateUserStatus:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      });
    }
  }
}

// Create instance and export methods
const userController = new UserController();

module.exports = {
  getAllUsers: userController.getAllUsers.bind(userController),
  getUserById: userController.getUserById.bind(userController),
  updateUser: userController.updateUser.bind(userController),
  getUserStats: userController.getUserStats.bind(userController),
  updateUserStatus: userController.updateUserStatus.bind(userController)
};