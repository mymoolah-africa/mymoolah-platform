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

  // Update authenticated user's profile
  async updateMe(req, res) {
    try {
      const userId = req.user && req.user.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { firstName, lastName, phoneNumber } = req.body || {};

      // Disallow phone number changes via this endpoint for security
      if (typeof phoneNumber !== 'undefined') {
        return res.status(400).json({ success: false, message: 'Phone number cannot be changed' });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const updates = {};
      if (typeof firstName === 'string') updates.firstName = firstName.trim();
      if (typeof lastName === 'string') updates.lastName = lastName.trim();

      await user.update(updates);

      const { id, email, phoneNumber: pn, accountNumber, status, kycStatus, createdAt, updatedAt } = user;
      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { id, email, firstName: user.firstName, lastName: user.lastName, phoneNumber: pn, accountNumber, status, kycStatus, createdAt, updatedAt }
      });
    } catch (error) {
      console.error('❌ Error in updateMe:', error);
      return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
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
      // Always fetch fresh data (no caching) to ensure KYC status is up-to-date
      const user = await User.findByPk(userId, {
        include: [{
          model: Wallet,
          as: 'wallet',
          attributes: ['walletId', 'balance', 'currency', 'status', 'kycVerified', 'kycVerifiedAt', 'kycVerifiedBy']
        }]
      });
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Reload user to ensure we have the latest kycStatus from database
      await user.reload();
      
      // Only return safe fields
      const { id, email, firstName, lastName, phoneNumber, accountNumber, balance, status, kycStatus, createdAt, updatedAt, wallet } = user;
      res.json({
        success: true,
        data: { 
          id, 
          email, 
          firstName, 
          lastName, 
          phoneNumber, 
          accountNumber, 
          balance, 
          status, 
          kycStatus: kycStatus || (wallet?.kycVerified ? 'verified' : 'not_started'), // Fallback to wallet status if user status is null
          createdAt, 
          updatedAt, 
          wallet 
        }
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
  updateMe: userController.updateMe.bind(userController),
  getUserStats: userController.getUserStats.bind(userController),
  updateUserStatus: userController.updateUserStatus.bind(userController),
  getMe: userController.getMe.bind(userController)
};