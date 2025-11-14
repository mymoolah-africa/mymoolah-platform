'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add documentImageUrl column
    await queryInterface.addColumn('kyc', 'documentImageUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }).catch(err => {
      if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  documentImageUrl column already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Add ocrData column (model uses ocrData, but migration might have ocrResults)
    await queryInterface.addColumn('kyc', 'ocrData', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'OCR extracted data from document'
    }).catch(err => {
      if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  ocrData column already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Add reviewedBy column
    await queryInterface.addColumn('kyc', 'reviewedBy', {
      type: Sequelize.STRING,
      allowNull: true
    }).catch(err => {
      if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  reviewedBy column already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Add rejectionReason column
    await queryInterface.addColumn('kyc', 'rejectionReason', {
      type: Sequelize.TEXT,
      allowNull: true
    }).catch(err => {
      if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  rejectionReason column already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Add verificationScore column
    await queryInterface.addColumn('kyc', 'verificationScore', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    }).catch(err => {
      if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  verificationScore column already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Add isAutomated column
    await queryInterface.addColumn('kyc', 'isAutomated', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }).catch(err => {
      if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  isAutomated column already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Update status column to ENUM if it's not already
    // Note: PostgreSQL doesn't support ALTER COLUMN TYPE directly for ENUMs
    // We'll need to check if it's already an ENUM or handle it gracefully
    try {
      // Try to alter status to ENUM (this will fail if already ENUM or if column doesn't support it)
      // For PostgreSQL, we need to create the ENUM type first if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_kyc_status') THEN
            CREATE TYPE enum_kyc_status AS ENUM ('pending', 'approved', 'rejected', 'under_review');
          END IF;
        END $$;
      `);
      
      // Try to alter the column type (will fail gracefully if already correct)
      await queryInterface.sequelize.query(`
        ALTER TABLE kyc 
        ALTER COLUMN status TYPE enum_kyc_status 
        USING status::text::enum_kyc_status;
      `).catch(err => {
        if (err.message && (err.message.includes('already') || err.message.includes('does not exist'))) {
          console.log('⚠️  Status column type update skipped (may already be correct)');
        } else {
          throw err;
        }
      });
    } catch (err) {
      console.log('⚠️  Could not update status ENUM type:', err.message);
      // Continue - the column exists, just might not be ENUM
    }

    // Update documentType to ENUM if it's not already
    try {
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_kyc_document_type') THEN
            CREATE TYPE enum_kyc_document_type AS ENUM ('id_card', 'passport', 'drivers_license', 'utility_bill', 'bank_statement');
          END IF;
        END $$;
      `);
      
      await queryInterface.sequelize.query(`
        ALTER TABLE kyc 
        ALTER COLUMN "documentType" TYPE enum_kyc_document_type 
        USING "documentType"::text::enum_kyc_document_type;
      `).catch(err => {
        if (err.message && (err.message.includes('already') || err.message.includes('does not exist'))) {
          console.log('⚠️  DocumentType column type update skipped (may already be correct)');
        } else {
          throw err;
        }
      });
    } catch (err) {
      console.log('⚠️  Could not update documentType ENUM type:', err.message);
      // Continue - the column exists, just might not be ENUM
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove columns in reverse order
    await queryInterface.removeColumn('kyc', 'isAutomated').catch(() => {});
    await queryInterface.removeColumn('kyc', 'verificationScore').catch(() => {});
    await queryInterface.removeColumn('kyc', 'rejectionReason').catch(() => {});
    await queryInterface.removeColumn('kyc', 'reviewedBy').catch(() => {});
    await queryInterface.removeColumn('kyc', 'ocrData').catch(() => {});
    await queryInterface.removeColumn('kyc', 'documentImageUrl').catch(() => {});
  }
};
