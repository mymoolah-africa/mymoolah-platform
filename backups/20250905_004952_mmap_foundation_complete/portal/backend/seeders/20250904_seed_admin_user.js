'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hash password for admin user
    const saltRounds = 12;
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin portal user
    await queryInterface.bulkInsert('portal_users', [
      {
        entityId: 'admin-001',
        entityName: 'MyMoolah Admin',
        entityType: 'admin',
        email: 'admin@mymoolah.africa',
        passwordHash: passwordHash,
        role: 'admin',
        permissions: JSON.stringify({
          'users.create': true,
          'users.read': true,
          'users.update': true,
          'users.delete': true,
          'entities.create': true,
          'entities.read': true,
          'entities.update': true,
          'entities.delete': true,
          'settlements.process': true,
          'settlements.view': true,
          'analytics.view': true,
          'system.settings': true
        }),
        hasDualRole: false,
        dualRoles: JSON.stringify([]),
        isActive: true,
        isVerified: true,
        twoFactorEnabled: false,
        notificationPreferences: JSON.stringify({
          email: true,
          sms: false,
          push: true,
          alerts: true
        }),
        metadata: JSON.stringify({
          createdBy: 'system',
          notes: 'Default admin user for portal access'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // Create sample dual-role entities for testing
    await queryInterface.bulkInsert('dual_role_floats', [
      {
        entityId: 'flash-001',
        entityName: 'Flash VAS',
        entityType: 'supplier',
        roles: JSON.stringify(['supplier', 'merchant']),
        primaryRole: 'supplier',
        supplierFloatBalance: 125000.50,
        supplierCommissionEarned: 15000.25,
        supplierSettlementMethod: 'daily',
        supplierLastSettlementAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        merchantFloatBalance: 87500.25,
        merchantFeesEarned: 8500.75,
        merchantSettlementMethod: 'daily',
        merchantLastSettlementAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        netBalance: 37500.25,
        netSettlementThreshold: 10000.00,
        autoSettlementEnabled: true,
        settlementFrequency: 'daily',
        nextSettlementAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        lastNetSettlementAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'active',
        isActive: true,
        maxSupplierBalance: 500000.00,
        maxMerchantBalance: 200000.00,
        dailyTransactionLimit: 100000.00,
        integrationType: 'api',
        apiEndpoint: 'https://api.flash.co.za/v1',
        webhookUrl: 'https://api.flash.co.za/webhooks/mymoolah',
        bankAccountNumber: '1234567890',
        bankCode: '632005',
        bankName: 'Standard Bank',
        metadata: JSON.stringify({
          contactEmail: 'support@flash.co.za',
          contactPhone: '+27123456789',
          businessRegistration: '2020/123456/07',
          vatNumber: '4123456789'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entityId: 'zapper-001',
        entityName: 'Zapper Payments',
        entityType: 'supplier',
        roles: JSON.stringify(['supplier', 'merchant']),
        primaryRole: 'supplier',
        supplierFloatBalance: 89000.75,
        supplierCommissionEarned: 12000.50,
        supplierSettlementMethod: 'weekly',
        supplierLastSettlementAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        merchantFloatBalance: 95000.00,
        merchantFeesEarned: 9500.00,
        merchantSettlementMethod: 'weekly',
        merchantLastSettlementAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        netBalance: -6000.25,
        netSettlementThreshold: 5000.00,
        autoSettlementEnabled: true,
        settlementFrequency: 'weekly',
        nextSettlementAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lastNetSettlementAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        isActive: true,
        maxSupplierBalance: 300000.00,
        maxMerchantBalance: 150000.00,
        dailyTransactionLimit: 75000.00,
        integrationType: 'webhook',
        apiEndpoint: 'https://api.zapper.co.za/v2',
        webhookUrl: 'https://api.zapper.co.za/webhooks/mymoolah',
        bankAccountNumber: '0987654321',
        bankCode: '632005',
        bankName: 'FNB',
        metadata: JSON.stringify({
          contactEmail: 'support@zapper.co.za',
          contactPhone: '+27987654321',
          businessRegistration: '2019/987654/07',
          vatNumber: '4987654321'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // Create corresponding portal users for the dual-role entities
    const flashPasswordHash = await bcrypt.hash('Flash@123!', saltRounds);
    const zapperPasswordHash = await bcrypt.hash('Zapper@123!', saltRounds);

    await queryInterface.bulkInsert('portal_users', [
      {
        entityId: 'flash-001',
        entityName: 'Flash VAS',
        entityType: 'supplier',
        email: 'admin@flash.co.za',
        passwordHash: flashPasswordHash,
        role: 'admin',
        permissions: JSON.stringify({
          'products.manage': true,
          'transactions.view': true,
          'settlements.view': true,
          'analytics.view': true,
          'merchant.operations': true
        }),
        hasDualRole: true,
        dualRoles: JSON.stringify(['supplier', 'merchant']),
        isActive: true,
        isVerified: true,
        twoFactorEnabled: false,
        notificationPreferences: JSON.stringify({
          email: true,
          sms: true,
          push: true,
          alerts: true
        }),
        metadata: JSON.stringify({
          contactEmail: 'admin@flash.co.za',
          contactPhone: '+27123456789'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entityId: 'zapper-001',
        entityName: 'Zapper Payments',
        entityType: 'supplier',
        email: 'admin@zapper.co.za',
        passwordHash: zapperPasswordHash,
        role: 'admin',
        permissions: JSON.stringify({
          'products.manage': true,
          'transactions.view': true,
          'settlements.view': true,
          'analytics.view': true,
          'merchant.operations': true
        }),
        hasDualRole: true,
        dualRoles: JSON.stringify(['supplier', 'merchant']),
        isActive: true,
        isVerified: true,
        twoFactorEnabled: false,
        notificationPreferences: JSON.stringify({
          email: true,
          sms: true,
          push: true,
          alerts: true
        }),
        metadata: JSON.stringify({
          contactEmail: 'admin@zapper.co.za',
          contactPhone: '+27987654321'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('portal_users', null, {});
    await queryInterface.bulkDelete('dual_role_floats', null, {});
  }
};