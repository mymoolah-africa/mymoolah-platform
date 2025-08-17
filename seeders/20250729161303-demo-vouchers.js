'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('vouchers', [
      {
        voucherId: 'VOUCH20250729123456',
        userId: 1,
        type: 'airtime',
        amount: 100.00,
        description: 'MTN Airtime Voucher',
        status: 'active',
        expiryDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2025-07-25T10:00:00Z'),
        updatedAt: new Date('2025-07-25T10:00:00Z')
      },
      {
        voucherId: 'VOUCH20250729123457',
        userId: 2,
        type: 'data',
        amount: 50.00,
        description: 'Vodacom Data Bundle',
        status: 'active',
        expiryDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2025-07-24T14:00:00Z'),
        updatedAt: new Date('2025-07-24T14:00:00Z')
      },
      {
        voucherId: 'VOUCH20250729123458',
        userId: 3,
        type: 'gift',
        amount: 500.00,
        description: 'Woolworths Gift Card',
        status: 'redeemed',
        expiryDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2025-07-23T09:00:00Z'),
        updatedAt: new Date('2025-07-23T09:00:00Z')
      },
      {
        voucherId: 'VOUCH20250729123459',
        userId: 4,
        type: 'airtime',
        amount: 200.00,
        description: 'Cell C Airtime Voucher',
        status: 'expired',
        expiryDate: new Date('2025-06-30T23:59:59Z'),
        createdAt: new Date('2025-06-15T11:00:00Z'),
        updatedAt: new Date('2025-06-15T11:00:00Z')
      },
      {
        voucherId: 'VOUCH20250729123460',
        userId: 5,
        type: 'data',
        amount: 75.00,
        description: 'Telkom Data Bundle',
        status: 'active',
        expiryDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2025-07-22T16:00:00Z'),
        updatedAt: new Date('2025-07-22T16:00:00Z')
      },
      {
        voucherId: 'VOUCH20250729123461',
        userId: 1,
        type: 'gift',
        amount: 1000.00,
        description: 'Pick n Pay Gift Card',
        status: 'active',
        expiryDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2025-07-21T13:00:00Z'),
        updatedAt: new Date('2025-07-21T13:00:00Z')
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('vouchers', null, {});
  }
};