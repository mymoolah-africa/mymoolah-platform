'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const saltRounds = 12;
    const hashedPassword = bcrypt.hashSync('Demo123!', saltRounds);
    
    await queryInterface.bulkInsert('users', [
      {
        email: 'john.doe@mymoolah.com',
        password_hash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '27821234567',
        accountNumber: '27821234567',
        balance: 5000.00,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'jane.smith@mymoolah.com',
        password_hash: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '27831234567',
        accountNumber: '27831234567',
        balance: 2500.00,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'mike.wilson@mymoolah.com',
        password_hash: hashedPassword,
        firstName: 'Mike',
        lastName: 'Wilson',
        phoneNumber: '27841234567',
        accountNumber: '27841234567',
        balance: 10000.00,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'sarah.jones@mymoolah.com',
        password_hash: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Jones',
        phoneNumber: '27851234567',
        accountNumber: '27851234567',
        balance: 750.00,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'demo.user@mymoolah.com',
        password_hash: hashedPassword,
        firstName: 'Demo',
        lastName: 'User',
        phoneNumber: '27861234567',
        accountNumber: '27861234567',
        balance: 1500.00,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};