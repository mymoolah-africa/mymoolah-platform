const { User, UserSettings } = require('../models');

class SettingsController {
  constructor() {
    // No need to instantiate - Sequelize models are static
  }

  // Get user settings
  async getUserSettings(req, res) {
    try {
      const userId = req.user.id;
      
      // Get or create user settings
      let [userSettings, created] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          quickAccessServices: ['send_money', 'vouchers'],
          showBalance: true,
          biometricEnabled: false,
          notificationsEnabled: true,
          dailyTransactionLimit: 5000.00,
          monthlyTransactionLimit: 25000.00,
          shareAnalytics: true,
          darkMode: false,
          language: 'en',
          displayCurrency: 'ZAR'
        }
      });

      // Get available services list
      const availableServices = [
        {
          id: 'send_money',
          name: 'Send Money',
          description: 'Transfer money to banks, wallets, and ATMs',
          category: 'payment',
          available: true,
          comingSoon: false
        },
        {
          id: 'request_money',
          name: 'Request Money',
          description: 'Request payments from friends and family',
          category: 'payment',
          available: false,
          comingSoon: true
        },
        {
          id: 'airtime_data',
          name: 'Airtime & Data',
          description: 'Top up airtime and buy data bundles',
          category: 'utility',
          available: true,
          comingSoon: false
        },
        {
          id: 'electricity',
          name: 'Electricity',
          description: 'Purchase prepaid electricity tokens',
          category: 'utility',
          available: true,
          comingSoon: false
        },
        {
          id: 'bill_payments',
          name: 'Bill Payments',
          description: 'Pay monthly bills and subscriptions',
          category: 'financial',
          available: true,
          comingSoon: false
        },
        {
          id: 'vouchers',
          name: 'Vouchers',
          description: 'Buy and redeem digital vouchers',
          category: 'financial',
          available: true,
          comingSoon: false
        }
      ];

      // Map services with enabled status
      const servicesWithStatus = availableServices.map(service => ({
        ...service,
        enabled: userSettings.quickAccessServices.includes(service.id)
      }));

      res.json({
        success: true,
        message: 'User settings retrieved successfully',
        data: {
          settings: userSettings,
          availableServices: servicesWithStatus,
          enabledServices: userSettings.quickAccessServices
        }
      });
    } catch (error) {
      console.error('❌ Error in getUserSettings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Update user settings
  async updateUserSettings(req, res) {
    try {
      const userId = req.user.id;
      const {
        quickAccessServices,
        showBalance,
        biometricEnabled,
        notificationsEnabled,
        dailyTransactionLimit,
        monthlyTransactionLimit,
        shareAnalytics,
        darkMode,
        language,
        displayCurrency
      } = req.body;

      // Validate quick access services (max 2)
      if (quickAccessServices && quickAccessServices.length > 2) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 2 quick access services allowed'
        });
      }

      // Get or create user settings
      let [userSettings, created] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          quickAccessServices: ['send_money', 'vouchers'],
          showBalance: true,
          biometricEnabled: false,
          notificationsEnabled: true,
          dailyTransactionLimit: 5000.00,
          monthlyTransactionLimit: 25000.00,
          shareAnalytics: true,
          darkMode: false,
          language: 'en',
          displayCurrency: 'ZAR'
        }
      });

      // Update settings
      const updateData = {};
      if (quickAccessServices !== undefined) updateData.quickAccessServices = quickAccessServices;
      if (showBalance !== undefined) updateData.showBalance = showBalance;
      if (biometricEnabled !== undefined) updateData.biometricEnabled = biometricEnabled;
      if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
      if (dailyTransactionLimit !== undefined) updateData.dailyTransactionLimit = dailyTransactionLimit;
      if (monthlyTransactionLimit !== undefined) updateData.monthlyTransactionLimit = monthlyTransactionLimit;
      if (shareAnalytics !== undefined) updateData.shareAnalytics = shareAnalytics;
      if (darkMode !== undefined) updateData.darkMode = darkMode;
      if (language !== undefined) updateData.language = language;
      if (displayCurrency !== undefined) updateData.displayCurrency = displayCurrency;

      await userSettings.update(updateData);

      res.json({
        success: true,
        message: 'User settings updated successfully',
        data: {
          settings: userSettings,
          enabledServices: userSettings.quickAccessServices
        }
      });
    } catch (error) {
      console.error('❌ Error in updateUserSettings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Update quick access services only
  async updateQuickAccessServices(req, res) {
    try {
      const userId = req.user.id;
      const { quickAccessServices } = req.body;

      // Validate input
      if (!Array.isArray(quickAccessServices)) {
        return res.status(400).json({
          success: false,
          message: 'quickAccessServices must be an array'
        });
      }

      if (quickAccessServices.length > 2) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 2 quick access services allowed'
        });
      }

      // Get or create user settings
      let [userSettings, created] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          quickAccessServices: ['send_money', 'vouchers']
        }
      });

      // Update quick access services
      await userSettings.update({ quickAccessServices });

      res.json({
        success: true,
        message: 'Quick access services updated successfully',
        data: {
          enabledServices: userSettings.quickAccessServices
        }
      });
    } catch (error) {
      console.error('❌ Error in updateQuickAccessServices:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Reset user settings to defaults
  async resetUserSettings(req, res) {
    try {
      const userId = req.user.id;

      // Get or create user settings
      let [userSettings, created] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          quickAccessServices: ['send_money', 'vouchers'],
          showBalance: true,
          biometricEnabled: false,
          notificationsEnabled: true,
          dailyTransactionLimit: 5000.00,
          monthlyTransactionLimit: 25000.00,
          shareAnalytics: true,
          darkMode: false,
          language: 'en',
          displayCurrency: 'ZAR'
        }
      });

      // Reset to defaults
      await userSettings.update({
        quickAccessServices: ['send_money', 'vouchers'],
        showBalance: true,
        biometricEnabled: false,
        notificationsEnabled: true,
        dailyTransactionLimit: 5000.00,
        monthlyTransactionLimit: 25000.00,
        shareAnalytics: true,
        darkMode: false,
        language: 'en',
        displayCurrency: 'ZAR'
      });

      res.json({
        success: true,
        message: 'User settings reset to defaults successfully',
        data: {
          settings: userSettings
        }
      });
    } catch (error) {
      console.error('❌ Error in resetUserSettings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
}

module.exports = new SettingsController();
