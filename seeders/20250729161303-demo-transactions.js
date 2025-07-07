'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('transactions', [
      {
        walletId: 'WAL20250729123456JOHN',
        type: 'transfer',
        amount: 500.00,
        description: 'Transfer to Jane Smith',
        status: 'completed',
        createdAt: new Date('2025-07-25T10:30:00Z'),
        updatedAt: new Date('2025-07-25T10:30:00Z')
      },
      {
        walletId: 'WAL20250729123457JANE',
        type: 'deposit',
        amount: 1000.00,
        description: 'Bank deposit',
        status: 'completed',
        createdAt: new Date('2025-07-24T14:15:00Z'),
        updatedAt: new Date('2025-07-24T14:15:00Z')
      },
      {
        walletId: 'WAL20250729123458MIKE',
        type: 'withdrawal',
        amount: 2000.00,
        description: 'ATM withdrawal',
        status: 'completed',
        createdAt: new Date('2025-07-23T09:45:00Z'),
        updatedAt: new Date('2025-07-23T09:45:00Z')
      },
      {
        walletId: 'WAL20250729123459SARAH',
        type: 'transfer',
        amount: 150.00,
        description: 'Payment for services',
        status: 'completed',
        createdAt: new Date('2025-07-22T16:20:00Z'),
        updatedAt: new Date('2025-07-22T16:20:00Z')
      },
      {
        walletId: 'WAL20250729123460DEMO',
        type: 'deposit',
        amount: 500.00,
        description: 'Demo deposit',
        status: 'completed',
        createdAt: new Date('2025-07-21T11:00:00Z'),
        updatedAt: new Date('2025-07-21T11:00:00Z')
      },
      {
        walletId: 'WAL20250729123456JOHN',
        type: 'transfer',
        amount: 750.00,
        description: 'Payment to Mike Wilson',
        status: 'pending',
        createdAt: new Date('2025-07-20T13:30:00Z'),
        updatedAt: new Date('2025-07-20T13:30:00Z')
      },
      {
        walletId: 'WAL20250729123458MIKE',
        type: 'deposit',
        amount: 3000.00,
        description: 'Salary deposit',
        status: 'completed',
        createdAt: new Date('2025-07-19T08:00:00Z'),
        updatedAt: new Date('2025-07-19T08:00:00Z')
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('transactions', null, {});
  }
};