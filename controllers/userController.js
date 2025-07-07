const { User, Wallet } = require('../models');

class UserController {
  constructor() {
    // No need to instantiate - Sequelize models are static
  }

  // Get all users
  async getAllUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'email', 'firstName', 'lastName', 'phoneNumber', 'accountNumber', 'balance', 'status', 'kycStatus', 'createdAt'],
        include: [{
          model: Wallet,
          as: 'wallet',
          attributes: ['walletId', 'balance', 'currency', 'status']
        }]
      });
      
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
      const user = await User.findByPk(id, {
        include: [{
          model: Wallet,
          as: 'wallet',
          attributes: ['walletId', 'balance', 'currency', 'status']
        }]
      });
      
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
      
      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      await user.update({
        firstName,
        lastName,
        phoneNumber
      });
      
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
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'active' } });
      const verifiedUsers = await User.count({ where: { kycStatus: 'verified' } });
      
      const stats = {
        totalUsers,
        activeUsers,
        verifiedUsers,
        pendingKYC: totalUsers - verifiedUsers
      };
      
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
      
      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      await user.update({ status });
      
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

  // Get authenticated user's profile
  async getMe(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId, {
        include: [{
          model: Wallet,
          as: 'wallet',
          attributes: ['walletId', 'balance', 'currency', 'status']
        }]
      });
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Only return safe fields
      const { id, email, firstName, lastName, phoneNumber, accountNumber, balance, status, kycStatus, createdAt, updatedAt, wallet } = user;
      res.json({
        success: true,
        data: { id, email, firstName, lastName, phoneNumber, accountNumber, balance, status, kycStatus, createdAt, updatedAt, wallet }
      });
    } catch (error) {
      console.error('❌ Error in getMe:', error);
      res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
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
  updateUserStatus: userController.updateUserStatus.bind(userController),
  getMe: userController.getMe.bind(userController)
};