'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('wallets', [
      {
        walletId: 'WAL20250729123456JOHN',
        userId: 1,
        balance: 5000.00,
        status: 'active',
        account_number: '27821234567',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        walletId: 'WAL20250729123457JANE',
        userId: 2,
        balance: 2500.00,
        status: 'active',
        account_number: '27831234567',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        walletId: 'WAL20250729123458MIKE',
        userId: 3,
        balance: 10000.00,
        status: 'active',
        account_number: '27841234567',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        walletId: 'WAL20250729123459SARAH',
        userId: 4,
        balance: 750.00,
        status: 'active',
        account_number: '27851234567',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        walletId: 'WAL20250729123460DEMO',
        userId: 5,
        balance: 1500.00,
        status: 'active',
        account_number: '27861234567',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('wallets', null, {});
  }
};