'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if columns already exist before attempting to add them
    const checkColumnExists = async (columnName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'kyc' 
          AND column_name = :columnName
        LIMIT 1
      `, {
        replacements: { columnName },
        type: queryInterface.sequelize.QueryTypes.SELECT
      });
      return results && results.column_name === columnName;
    };

    // Add documentImageUrl column
    try {
      const exists = await checkColumnExists('documentImageUrl');
      if (!exists) {
        await queryInterface.addColumn('kyc', 'documentImageUrl', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added documentImageUrl column');
      } else {
        console.log('⚠️  documentImageUrl column already exists, skipping...');
      }
    } catch (err) {
      if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
        console.warn('⚠️  Permission denied: Cannot add documentImageUrl column. Please run manual SQL script: migrations/20251114193059_add_missing_kyc_columns_manual.sql');
        console.warn('⚠️  System will continue to function, but KYC uploads may fail until columns are added.');
      } else if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  documentImageUrl column already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Add ocrData column (model uses ocrData, but migration might have ocrResults)
    try {
      const exists = await checkColumnExists('ocrData');
      if (!exists) {
        await queryInterface.addColumn('kyc', 'ocrData', {
          type: Sequelize.JSON,
          allowNull: true
        });
        console.log('✅ Added ocrData column');
      } else {
        console.log('⚠️  ocrData column already exists, skipping...');
      }
    } catch (err) {
      if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
        console.warn('⚠️  Permission denied: Cannot add ocrData column');
      } else if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  ocrData column already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Add reviewedBy column
    try {
      const exists = await checkColumnExists('reviewedBy');
      if (!exists) {
        await queryInterface.addColumn('kyc', 'reviewedBy', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added reviewedBy column');
      } else {
        console.log('⚠️  reviewedBy column already exists, skipping...');
      }
    } catch (err) {
      if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
        console.warn('⚠️  Permission denied: Cannot add reviewedBy column');
      } else if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  reviewedBy column already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Add rejectionReason column
    try {
      const exists = await checkColumnExists('rejectionReason');
      if (!exists) {
        await queryInterface.addColumn('kyc', 'rejectionReason', {
          type: Sequelize.TEXT,
          allowNull: true
        });
        console.log('✅ Added rejectionReason column');
      } else {
        console.log('⚠️  rejectionReason column already exists, skipping...');
      }
    } catch (err) {
      if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
        console.warn('⚠️  Permission denied: Cannot add rejectionReason column');
      } else if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  rejectionReason column already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Add verificationScore column
    try {
      const exists = await checkColumnExists('verificationScore');
      if (!exists) {
        await queryInterface.addColumn('kyc', 'verificationScore', {
          type: Sequelize.DECIMAL(3, 2),
          allowNull: true
        });
        console.log('✅ Added verificationScore column');
      } else {
        console.log('⚠️  verificationScore column already exists, skipping...');
      }
    } catch (err) {
      if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
        console.warn('⚠️  Permission denied: Cannot add verificationScore column');
      } else if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  verificationScore column already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Add isAutomated column
    try {
      const exists = await checkColumnExists('isAutomated');
      if (!exists) {
        await queryInterface.addColumn('kyc', 'isAutomated', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
        console.log('✅ Added isAutomated column');
      } else {
        console.log('⚠️  isAutomated column already exists, skipping...');
      }
    } catch (err) {
      if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
        console.warn('⚠️  Permission denied: Cannot add isAutomated column');
        console.warn('⚠️  Please run manual SQL script: migrations/20251114193059_add_missing_kyc_columns_manual.sql');
      } else if (err.message && err.message.includes('already exists')) {
        console.log('⚠️  isAutomated column already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Update status column to ENUM if it's not already
    // Note: This requires admin privileges, so we'll skip if permission denied
    try {
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_kyc_status') THEN
            CREATE TYPE enum_kyc_status AS ENUM ('pending', 'approved', 'rejected', 'under_review');
          END IF;
        END $$;
      `);
      
      await queryInterface.sequelize.query(`
        ALTER TABLE kyc 
        ALTER COLUMN status TYPE enum_kyc_status 
        USING status::text::enum_kyc_status;
      `).catch(err => {
        if (err.message && (err.message.includes('already') || err.message.includes('does not exist'))) {
          console.log('⚠️  Status column type update skipped (may already be correct)');
        } else if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
          console.warn('⚠️  Permission denied: Cannot update status ENUM type');
        } else {
          throw err;
        }
      });
    } catch (err) {
      if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
        console.warn('⚠️  Permission denied: Could not update status ENUM type');
      } else {
        console.log('⚠️  Could not update status ENUM type:', err.message);
      }
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
        } else if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
          console.warn('⚠️  Permission denied: Cannot update documentType ENUM type');
        } else {
          throw err;
        }
      });
    } catch (err) {
      if (err.message && (err.message.includes('permission denied') || err.message.includes('must be owner'))) {
        console.warn('⚠️  Permission denied: Could not update documentType ENUM type');
      } else {
        console.log('⚠️  Could not update documentType ENUM type:', err.message);
      }
      // Continue - the column exists, just might not be ENUM
    }
    
    console.log('✅ Migration completed (some operations may have been skipped due to permissions)');
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
