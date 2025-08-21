const { Op } = require('sequelize');
const { validateMobileNumber } = require('../utils/validation');

/**
 * Airtime & Data Services Controller
 * Handles airtime and data purchase functionality with dynamic supplier integration
 */

// Get available airtime networks and products
exports.getAirtimeNetworks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get networks from database
    const AirtimeNetwork = require('../models').sequelize.define('AirtimeNetwork', {
      id: {
        type: require('sequelize').DataTypes.STRING,
        primaryKey: true
      },
      name: {
        type: require('sequelize').DataTypes.STRING,
        allowNull: false
      },
      logo: {
        type: require('sequelize').DataTypes.STRING
      },
      commission: {
        type: require('sequelize').DataTypes.DECIMAL(5, 2),
        allowNull: false
      },
      preferred: {
        type: require('sequelize').DataTypes.BOOLEAN,
        defaultValue: false
      },
      voucherAvailable: {
        type: require('sequelize').DataTypes.BOOLEAN,
        defaultValue: true
      },
      topUpAvailable: {
        type: require('sequelize').DataTypes.BOOLEAN,
        defaultValue: true
      },
      available: {
        type: require('sequelize').DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      tableName: 'airtime_networks',
      timestamps: true
    });

    const networks = await AirtimeNetwork.findAll({
      where: { available: true },
      order: [['preferred', 'DESC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        networks: networks.map(network => ({
          id: network.id,
          name: network.name,
          logo: network.logo,
          available: network.available,
          voucherAvailable: network.voucherAvailable,
          topUpAvailable: network.topUpAvailable,
          preferred: network.preferred
        })),
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching airtime networks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch airtime networks.' 
    });
  }
};

// Get airtime voucher values for a specific network
exports.getAirtimeVoucherValues = async (req, res) => {
  try {
    const { networkId } = req.params;
    const userId = req.user.id;

    // Validate network
    const validNetworks = ['vodacom', 'mtn', 'cellc', 'telkom', 'econet', 'worldcall'];
    if (!validNetworks.includes(networkId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network specified.'
      });
    }

    // Standard voucher values (3x3 grid)
    const voucherValues = [
      { value: 2.00, available: true, promotional: false },
      { value: 5.00, available: true, promotional: false },
      { value: 10.00, available: true, promotional: false },
      { value: 12.00, available: true, promotional: false },
      { value: 20.00, available: true, promotional: false },
      { value: 29.00, available: true, promotional: false },
      { value: 55.00, available: true, promotional: false },
      { value: 110.00, available: true, promotional: false },
      { value: 275.00, available: true, promotional: false }
    ];

    // Get network-specific promotions from supplier APIs
    const promotions = await getNetworkPromotions(networkId);

    res.json({
      success: true,
      data: {
        networkId,
        networkName: getNetworkName(networkId),
        voucherValues,
        promotions,
        type: 'voucher',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching airtime voucher values:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch voucher values.' 
    });
  }
};

// Get airtime top-up values for a specific network
exports.getAirtimeTopUpValues = async (req, res) => {
  try {
    const { networkId } = req.params;
    const userId = req.user.id;

    // Validate network (only 4 networks support top-up)
    const validTopUpNetworks = ['vodacom', 'mtn', 'cellc', 'telkom'];
    if (!validTopUpNetworks.includes(networkId)) {
      return res.status(400).json({
        success: false,
        message: 'Top-up not available for this network.'
      });
    }

    // Standard top-up values (3x4 grid)
    const topUpValues = [
      { value: 2.00, available: true, promotional: false },
      { value: 5.00, available: true, promotional: false },
      { value: 10.00, available: true, promotional: false },
      { value: 15.00, available: true, promotional: false },
      { value: 20.00, available: true, promotional: false },
      { value: 25.00, available: true, promotional: false },
      { value: 30.00, available: true, promotional: false },
      { value: 50.00, available: true, promotional: false },
      { value: 100.00, available: true, promotional: false },
      { value: 150.00, available: true, promotional: false },
      { value: 200.00, available: true, promotional: false },
      { value: 250.00, available: true, promotional: false }
    ];

    // Get network-specific promotions
    const promotions = await getNetworkPromotions(networkId);

    res.json({
      success: true,
      data: {
        networkId,
        networkName: getNetworkName(networkId),
        topUpValues,
        promotions,
        type: 'topup',
        customAmount: {
          min: 2.00,
          max: 1000.00,
          available: true
        },
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching airtime top-up values:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch top-up values.' 
    });
  }
};

// Get eeziAirtime values (Flash exclusive)
exports.getEeziAirtimeValues = async (req, res) => {
  try {
    const userId = req.user.id;

    // eeziAirtime values (3x6 grid)
    const eeziValues = [
      { value: 2.00, available: true, promotional: false },
      { value: 3.00, available: true, promotional: false },
      { value: 5.00, available: true, promotional: false },
      { value: 7.00, available: true, promotional: false },
      { value: 10.00, available: true, promotional: false },
      { value: 12.00, available: true, promotional: false },
      { value: 15.00, available: true, promotional: false },
      { value: 20.00, available: true, promotional: false },
      { value: 30.00, available: true, promotional: false },
      { value: 35.00, available: true, promotional: false },
      { value: 40.00, available: true, promotional: false },
      { value: 50.00, available: true, promotional: false },
      { value: 60.00, available: true, promotional: false },
      { value: 70.00, available: true, promotional: false },
      { value: 80.00, available: true, promotional: false },
      { value: 90.00, available: true, promotional: false },
      { value: 100.00, available: true, promotional: false },
      { value: 150.00, available: true, promotional: false }
    ];

    // Get Flash-specific promotions
    const promotions = await getFlashPromotions();

    res.json({
      success: true,
      data: {
        type: 'eeziAirtime',
        supplier: 'Flash',
        eeziValues,
        promotions,
        customAmount: {
          min: 2.00,
          max: 1000.00,
          available: true
        },
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching eeziAirtime values:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch eeziAirtime values.' 
    });
  }
};

// Get Global Services (Airtime, Data, Electricity)
exports.getGlobalServices = async (req, res) => {
  try {
    const userId = req.user.id;

    const globalServices = [
      {
        id: 'global-airtime',
        name: 'Global Airtime',
        description: 'International airtime top-up',
        type: 'topup',
        supplier: 'Flash',
        available: true,
        icon: 'phone'
      },
      {
        id: 'global-data',
        name: 'Global Data',
        description: 'International data bundles',
        type: 'data',
        supplier: 'Flash',
        available: true,
        icon: 'wifi'
      },
      {
        id: 'global-electricity',
        name: 'Global Electricity',
        description: 'International electricity tokens',
        type: 'electricity',
        supplier: 'Flash',
        available: true,
        icon: 'zap'
      }
    ];

    res.json({
      success: true,
      data: {
        services: globalServices,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching global services:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch global services.' 
    });
  }
};

// Purchase airtime voucher
exports.purchaseAirtimeVoucher = async (req, res) => {
  try {
    const userId = req.user.id;
    const { networkId, amount, recipientPhone } = req.body;

    // Validate input
    if (!networkId || !amount || amount < 2 || amount > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network or amount specified.'
      });
    }

    // Validate mobile number if provided
    if (recipientPhone && !validateMobileNumber(recipientPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format.'
      });
    }

    // Get user wallet balance
    const wallet = await require('../models').Wallet.findOne({
      where: { userId }
    });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance.'
      });
    }

    // Process purchase through preferred supplier
    const purchaseResult = await processAirtimePurchase({
      userId,
      networkId,
      amount,
      type: 'voucher',
      recipientPhone
    });

    res.json({
      success: true,
      data: purchaseResult
    });
  } catch (error) {
    console.error('Error purchasing airtime voucher:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process airtime purchase.' 
    });
  }
};

// Purchase airtime top-up
exports.purchaseAirtimeTopUp = async (req, res) => {
  try {
    const userId = req.user.id;
    const { networkId, amount, recipientPhone } = req.body;

    // Validate input
    if (!networkId || !amount || !recipientPhone) {
      return res.status(400).json({
        success: false,
        message: 'Network, amount, and recipient phone are required.'
      });
    }

    if (amount < 2 || amount > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be between R2.00 and R1,000.00.'
      });
    }

    // Validate mobile number
    if (!validateMobileNumber(recipientPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format.'
      });
    }

    // Get user wallet balance
    const wallet = await require('../models').Wallet.findOne({
      where: { userId }
    });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance.'
      });
    }

    // Process top-up purchase
    const purchaseResult = await processAirtimePurchase({
      userId,
      networkId,
      amount,
      type: 'topup',
      recipientPhone
    });

    res.json({
      success: true,
      data: purchaseResult
    });
  } catch (error) {
    console.error('Error purchasing airtime top-up:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process top-up purchase.' 
    });
  }
};

// Purchase eeziAirtime
exports.purchaseEeziAirtime = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, recipientPhone } = req.body;

    // Validate input
    if (!amount || amount < 2 || amount > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be between R2.00 and R1,000.00.'
      });
    }

    if (!recipientPhone) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number is required.'
      });
    }

    // Validate mobile number
    if (!validateMobileNumber(recipientPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format.'
      });
    }

    // Get user wallet balance
    const wallet = await require('../models').Wallet.findOne({
      where: { userId }
    });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance.'
      });
    }

    // Process eeziAirtime purchase (Flash exclusive)
    const purchaseResult = await processEeziAirtimePurchase({
      userId,
      amount,
      recipientPhone
    });

    res.json({
      success: true,
      data: purchaseResult
    });
  } catch (error) {
    console.error('Error purchasing eeziAirtime:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process eeziAirtime purchase.' 
    });
  }
};

// Test endpoint to verify seeded data
exports.testAirtimeData = async (req, res) => {
  try {
    const { sequelize } = require('../models');
    
    // Test networks
    const AirtimeNetwork = sequelize.define('AirtimeNetwork', {
      id: { type: require('sequelize').DataTypes.STRING, primaryKey: true },
      name: { type: require('sequelize').DataTypes.STRING, allowNull: false },
      logo: { type: require('sequelize').DataTypes.STRING },
      commission: { type: require('sequelize').DataTypes.DECIMAL(5, 2), allowNull: false },
      preferred: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: false },
      voucherAvailable: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: true },
      topUpAvailable: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: true },
      available: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: true }
    }, { tableName: 'airtime_networks', timestamps: true });

    // Test products
    const AirtimeProduct = sequelize.define('AirtimeProduct', {
      id: { type: require('sequelize').DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      networkId: { type: require('sequelize').DataTypes.STRING, allowNull: false },
      productType: { type: require('sequelize').DataTypes.ENUM('voucher', 'topup', 'eezi', 'global'), allowNull: false },
      value: { type: require('sequelize').DataTypes.DECIMAL(10, 2), allowNull: false },
      available: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: true },
      promotional: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: false },
      commission: { type: require('sequelize').DataTypes.DECIMAL(5, 2), allowNull: false },
      supplier: { type: require('sequelize').DataTypes.STRING, defaultValue: 'Flash' }
    }, { tableName: 'airtime_products', timestamps: true });

    // Test promotions
    const AirtimePromotion = sequelize.define('AirtimePromotion', {
      id: { type: require('sequelize').DataTypes.STRING, primaryKey: true },
      title: { type: require('sequelize').DataTypes.STRING, allowNull: false },
      description: { type: require('sequelize').DataTypes.TEXT },
      discountPercentage: { type: require('sequelize').DataTypes.DECIMAL(5, 2), allowNull: false },
      validUntil: { type: require('sequelize').DataTypes.DATE, allowNull: false },
      networkId: { type: require('sequelize').DataTypes.STRING },
      minAmount: { type: require('sequelize').DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      active: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: true }
    }, { tableName: 'airtime_promotions', timestamps: true });

    // Test global services
    const GlobalService = sequelize.define('GlobalService', {
      id: { type: require('sequelize').DataTypes.STRING, primaryKey: true },
      name: { type: require('sequelize').DataTypes.STRING, allowNull: false },
      description: { type: require('sequelize').DataTypes.TEXT },
      type: { type: require('sequelize').DataTypes.STRING, allowNull: false },
      supplier: { type: require('sequelize').DataTypes.STRING, defaultValue: 'Flash' },
      commission: { type: require('sequelize').DataTypes.DECIMAL(5, 2), allowNull: false },
      available: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: true },
      icon: { type: require('sequelize').DataTypes.STRING }
    }, { tableName: 'global_services', timestamps: true });

    // Fetch data
    const networks = await AirtimeNetwork.findAll();
    const products = await AirtimeProduct.findAll({ limit: 10 });
    const promotions = await AirtimePromotion.findAll();
    const globalServices = await GlobalService.findAll();

    res.json({
      success: true,
      data: {
        networks: {
          count: networks.length,
          sample: networks.slice(0, 3).map(n => ({
            id: n.id,
            name: n.name,
            commission: n.commission,
            preferred: n.preferred
          }))
        },
        products: {
          count: await AirtimeProduct.count(),
          sample: products.map(p => ({
            id: p.id,
            networkId: p.networkId,
            productType: p.productType,
            value: p.value,
            commission: p.commission
          }))
        },
        promotions: {
          count: promotions.length,
          sample: promotions.map(p => ({
            id: p.id,
            title: p.title,
            discountPercentage: p.discountPercentage,
            networkId: p.networkId
          }))
        },
        globalServices: {
          count: globalServices.length,
          sample: globalServices.map(g => ({
            id: g.id,
            name: g.name,
            type: g.type,
            commission: g.commission
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error testing airtime data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test airtime data.',
      error: error.message
    });
  }
};

// Helper functions
function getNetworkName(networkId) {
  const networkNames = {
    vodacom: 'Vodacom',
    mtn: 'MTN',
    cellc: 'CellC',
    telkom: 'Telkom',
    econet: 'EcoNet',
    worldcall: 'WorldCall'
  };
  return networkNames[networkId] || networkId;
}

async function getNetworkPromotions(networkId) {
  // TODO: Integrate with supplier APIs to get real promotions
  return [];
}

async function getFlashPromotions() {
  // TODO: Integrate with Flash API to get real promotions
  return [];
}

async function processAirtimePurchase(purchaseData) {
  // TODO: Integrate with actual supplier APIs
  // For now, simulate successful purchase
  
  const { userId, networkId, amount, type, recipientPhone } = purchaseData;
  
  // Create transaction record
  const transaction = await require('../models').Transaction.create({
    userId,
    type: 'airtime_purchase',
    amount: -amount, // Debit from wallet
    description: `${type === 'voucher' ? 'Airtime Voucher' : 'Airtime Top-Up'} - ${getNetworkName(networkId)}`,
    status: 'completed',
    metadata: {
      networkId,
      type,
      recipientPhone,
      supplier: 'Flash', // Default supplier for now
      reference: `AIR-${Date.now()}`
    }
  });

  // Update wallet balance
  await require('../models').Wallet.decrement('balance', {
    by: amount,
    where: { userId }
  });

  // Generate PIN for voucher purchases
  let pin = null;
  if (type === 'voucher') {
    pin = generateVoucherPin();
    
    // Store PIN securely for notification delivery
    await require('../models').Notification.create({
      userId,
      type: 'airtime_voucher',
      title: 'Airtime Voucher PIN',
      message: `Your ${getNetworkName(networkId)} airtime voucher PIN is: ${pin}`,
      data: {
        pin,
        networkId,
        amount,
        reference: transaction.metadata.reference
      },
      status: 'unread'
    });
  }

  return {
    transactionId: transaction.id,
    status: 'completed',
    amount,
    networkId,
    type,
    recipientPhone,
    pin,
    reference: transaction.metadata.reference,
    completedAt: new Date().toISOString()
  };
}

async function processEeziAirtimePurchase(purchaseData) {
  // TODO: Integrate with Flash API for eeziAirtime
  // For now, simulate successful purchase
  
  const { userId, amount, recipientPhone } = purchaseData;
  
  // Create transaction record
  const transaction = await require('../models').Transaction.create({
    userId,
    type: 'eezi_airtime',
    amount: -amount, // Debit from wallet
    description: `eeziAirtime Top-Up - ${recipientPhone}`,
    status: 'completed',
    metadata: {
      type: 'eeziAirtime',
      recipientPhone,
      supplier: 'Flash',
      reference: `EEZI-${Date.now()}`
    }
  });

  // Update wallet balance
  await require('../models').Wallet.decrement('balance', {
    by: amount,
    where: { userId }
  });

  // Send notification
  await require('../models').Notification.create({
    userId,
    type: 'eezi_airtime',
    title: 'eeziAirtime Purchase Complete',
    message: `Your eeziAirtime top-up of R${amount.toFixed(2)} to ${recipientPhone} has been processed.`,
    data: {
      amount,
      recipientPhone,
      reference: transaction.metadata.reference
    },
    status: 'unread'
  });

  return {
    transactionId: transaction.id,
    status: 'completed',
    amount,
    recipientPhone,
    reference: transaction.metadata.reference,
    completedAt: new Date().toISOString()
  };
}

function generateVoucherPin() {
  // Generate a random 16-digit PIN
  return Math.random().toString().slice(2, 18);
}
