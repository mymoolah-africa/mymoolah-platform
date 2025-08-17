'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('kyc', [
      {
        userId: 1,
        documentType: 'identity_document',
        documentNumber: 'ID123456789',
        status: 'verified',
        submittedAt: new Date('2025-07-15T10:00:00Z'),
        reviewedAt: new Date('2025-07-16T14:30:00Z'),
        reviewerNotes: 'Documents verified successfully',
        createdAt: new Date('2025-07-15T10:00:00Z'),
        updatedAt: new Date('2025-07-16T14:30:00Z')
      },
      {
        userId: 2,
        documentType: 'identity_document',
        documentNumber: 'ID987654321',
        status: 'verified',
        submittedAt: new Date('2025-07-14T09:00:00Z'),
        reviewedAt: new Date('2025-07-15T11:20:00Z'),
        reviewerNotes: 'All documents approved',
        createdAt: new Date('2025-07-14T09:00:00Z'),
        updatedAt: new Date('2025-07-15T11:20:00Z')
      },
      {
        userId: 3,
        documentType: 'identity_document',
        documentNumber: 'ID456789123',
        status: 'verified',
        submittedAt: new Date('2025-07-13T16:00:00Z'),
        reviewedAt: new Date('2025-07-14T10:15:00Z'),
        reviewerNotes: 'Verification completed',
        createdAt: new Date('2025-07-13T16:00:00Z'),
        updatedAt: new Date('2025-07-14T10:15:00Z')
      },
      {
        userId: 4,
        documentType: 'identity_document',
        documentNumber: 'ID789123456',
        status: 'processing',
        submittedAt: new Date('2025-07-20T12:00:00Z'),
        reviewedAt: null,
        reviewerNotes: null,
        createdAt: new Date('2025-07-20T12:00:00Z'),
        updatedAt: new Date('2025-07-20T12:00:00Z')
      },
      {
        userId: 5,
        documentType: 'identity_document',
        documentNumber: 'ID321654987',
        status: 'pending',
        submittedAt: null,
        reviewedAt: null,
        reviewerNotes: null,
        createdAt: new Date('2025-07-21T08:00:00Z'),
        updatedAt: new Date('2025-07-21T08:00:00Z')
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('kyc', null, {});
  }
};