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
          quickAccessServices: ['airtime', 'vouchers'],
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

      // Get available services list - SINGLE SOURCE OF TRUTH from TransactPage
      // Organized by type groups: Active services first, then Coming Soon services
      const availableServices = [
        // ===== ACTIVE SERVICES (Alphabetical) =====
        {
          id: 'airtime-data',
          name: 'Airtime & Data',
          description: 'Purchase Airtime & Data with AI-powered best deals',
          category: 'utility',
          available: true,
          comingSoon: false
        },
        {
          id: 'bill-payments',
          name: 'Bill Payments',
          description: 'Pay municipal and service bills',
          category: 'utility',
          available: true,
          comingSoon: false
        },
        {
          id: 'cashout-easypay',
          name: 'Cash-out at EasyPay',
          description: 'Cash-out vouchers for EasyPay store withdrawal',
          category: 'payment',
          available: true,
          comingSoon: false
        },
        {
          id: 'electricity',
          name: 'Electricity & Water',
          description: 'Pay your utility bills quickly',
          category: 'utility',
          available: true,
          comingSoon: false
        },
        {
          id: 'flash-eezicash',
          name: 'Cash-out at Flash',
          description: 'eeziCash vouchers for instant cash withdrawal',
          category: 'payment',
          available: true,
          comingSoon: false
        },
        {
          id: 'qr-scan',
          name: 'Scan QR to Pay',
          description: 'Pay merchants by scanning QR codes',
          category: 'payment',
          available: true,
          comingSoon: false
        },
        {
          id: 'request-money',
          name: 'Request Money',
          description: 'Request payment from MyMoolah users or bank accounts',
          category: 'payment',
          available: true,
          comingSoon: false
        },
        {
          id: 'send-money',
          name: 'Pay Beneficiary',
          description: 'Transfer money to MyMoolah users or bank accounts',
          category: 'payment',
          available: true,
          comingSoon: false
        },
        {
          id: 'tap-to-add-money',
          name: 'Tap to Add Money',
          description: 'Tap your card on device with Halo.Go to add money to your wallet',
          category: 'payment',
          available: true,
          comingSoon: false
        },
        {
          id: 'topup-easypay',
          name: 'Top-up at EasyPay',
          description: 'Create top-up request, pay at EasyPay, get money in wallet',
          category: 'payment',
          available: true,
          comingSoon: false
        },
        {
          id: 'vouchers',
          name: 'Vouchers',
          description: 'Buy and send digital vouchers',
          category: 'digital',
          available: true,
          comingSoon: false
        },
        {
          id: 'watch-to-earn',
          name: 'Watch to Earn',
          description: 'Watch videos and earn wallet credits',
          category: 'loyalty',
          available: true,
          comingSoon: false
        },
        // ===== COMING SOON SERVICES (Alphabetical) =====
        {
          id: 'atm-cashsend',
          name: 'ATM Cash Send',
          description: 'Send cash vouchers for ATM withdrawal',
          category: 'payment',
          available: false,
          comingSoon: true
        },
        {
          id: 'loyalty',
          name: 'Rewards Program',
          description: 'Cashback deals and special offers',
          category: 'loyalty',
          available: false,
          comingSoon: true
        },
        {
          id: 'mmcash-retail',
          name: 'Cash-out at Retail',
          description: 'MMCash vouchers for retail partner cash-out',
          category: 'payment',
          available: false,
          comingSoon: true
        },
        {
          id: 'promotions',
          name: 'Promotions',
          description: 'Exclusive deals and discounts',
          category: 'loyalty',
          available: false,
          comingSoon: true
        }
      ];

      // Map services with enabled status and filter out coming soon services from enabled list
      const servicesWithStatus = availableServices.map(service => ({
        ...service,
        enabled: userSettings.quickAccessServices.includes(service.id) && !service.comingSoon
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
