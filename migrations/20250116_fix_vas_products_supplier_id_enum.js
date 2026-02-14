'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Fixing vas_products.supplierId: Converting ENUM to STRING...');
    
    // Check if vas_products table exists (fresh DBs may not have it yet)
    const [tables] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'vas_products'
    `);
    if (!tables || tables.length === 0) {
      console.log('⚠️ vas_products table does not exist yet, skipping...');
      return;
    }
    
    // Check if column exists and is ENUM
    const tableDescription = await queryInterface.describeTable('vas_products');
    
    if (!tableDescription.supplierId) {
      console.log('⚠️ vas_products.supplierId column does not exist, skipping...');
      return;
    }
    
    // If it's already a STRING type, no need to change
    if (tableDescription.supplierId.type === 'character varying' || 
        tableDescription.supplierId.type === 'varchar' ||
        tableDescription.supplierId.type.includes('character')) {
      console.log('✅ vas_products.supplierId is already STRING type, no change needed');
      return;
    }
    
    // Convert ENUM to STRING
    // First, we need to alter the column type
    // PostgreSQL requires dropping the enum constraint first
    try {
      // Get the enum type name
      const [enumInfo] = await queryInterface.sequelize.query(`
        SELECT t.typname as enum_name
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        JOIN pg_attribute a ON a.atttypid = t.oid
        JOIN pg_class c ON a.attrelid = c.oid
        WHERE c.relname = 'vas_products' 
        AND a.attname = 'supplierId'
        LIMIT 1
      `);
      
      if (enumInfo && enumInfo.length > 0) {
        const enumName = enumInfo[0].enum_name;
        console.log(`📝 Found ENUM type: ${enumName}, converting to STRING...`);
        
        // Alter column to TEXT first (to break enum constraint)
        await queryInterface.sequelize.query(`
          ALTER TABLE vas_products 
          ALTER COLUMN "supplierId" TYPE TEXT USING "supplierId"::TEXT
        `);
        
        // Then alter to VARCHAR(50) to match model
        await queryInterface.changeColumn('vas_products', 'supplierId', {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Supplier identifier (flash, mobilemart, etc.)'
        });
        
        console.log('✅ Successfully converted vas_products.supplierId from ENUM to STRING(50)');
      } else {
        // Column might already be STRING or enum constraint doesn't exist
        console.log('⚠️ No ENUM constraint found, attempting direct conversion...');
        await queryInterface.changeColumn('vas_products', 'supplierId', {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Supplier identifier (flash, mobilemart, etc.)'
        });
        console.log('✅ Successfully converted vas_products.supplierId to STRING(50)');
      }
    } catch (error) {
      console.error('❌ Error converting vas_products.supplierId:', error.message);
      // If the error is about the column already being the right type, that's fine
      if (error.message.includes('already') || error.message.includes('same type')) {
        console.log('✅ Column is already the correct type');
      } else {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverting would require knowing the original enum values
    // For safety, we'll just log a warning
    console.log('⚠️ Reverting vas_products.supplierId to ENUM is not supported');
    console.log('⚠️ Manual intervention required if rollback is needed');
  }
};

