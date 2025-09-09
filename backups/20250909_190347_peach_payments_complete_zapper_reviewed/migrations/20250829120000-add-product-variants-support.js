'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding product variants support...');

    // Step 1: Create product_variants table
    await queryInterface.createTable('product_variants', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to base product'
      },
      supplierId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Supplier providing this variant'
      },
      supplierProductId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Product ID from supplier system'
      },
      denominations: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Available denominations in cents for this supplier'
      },
      pricing: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Pricing information including fees and commissions'
      },
      constraints: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Supplier-specific constraints'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'discontinued', 'maintenance'),
        allowNull: false,
        defaultValue: 'active'
      },
      isPreferred: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the preferred variant for this product'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Sort order for variants of the same product'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional variant metadata'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Step 2: Add indexes for performance
    await queryInterface.addIndex('product_variants', ['productId', 'supplierId'], {
      name: 'idx_product_variants_product_supplier',
      unique: true
    });
    await queryInterface.addIndex('product_variants', ['supplierId', 'status'], {
      name: 'idx_product_variants_supplier_status'
    });
    await queryInterface.addIndex('product_variants', ['isPreferred'], {
      name: 'idx_product_variants_preferred'
    });

    // Step 3: Modify products table to remove supplier-specific fields
    await queryInterface.removeColumn('products', 'supplierId');
    await queryInterface.removeColumn('products', 'supplierProductId');
    await queryInterface.removeColumn('products', 'denominations');
    await queryInterface.removeColumn('products', 'constraints');

    // Step 4: Add new fields to products table
    await queryInterface.addColumn('products', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Product description'
    });
    await queryInterface.addColumn('products', 'category', {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: 'general',
      comment: 'Product category'
    });
    await queryInterface.addColumn('products', 'tags', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Product tags for search and filtering'
    });

    // Step 5: Create product_comparisons table for storing comparison data
    await queryInterface.createTable('product_comparisons', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      denomination: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Denomination in cents'
      },
      comparisonData: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Comparison data for this denomination across suppliers'
      },
      bestVariantId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'product_variants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      lastUpdated: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Step 6: Add indexes for product_comparisons
    await queryInterface.addIndex('product_comparisons', ['productId', 'denomination'], {
      name: 'idx_product_comparisons_product_denomination',
      unique: true
    });
    await queryInterface.addIndex('product_comparisons', ['lastUpdated'], {
      name: 'idx_product_comparisons_last_updated'
    });

    console.log('✅ Product variants support added successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back product variants support...');

    // Step 1: Drop product_comparisons table
    await queryInterface.dropTable('product_comparisons');

    // Step 2: Restore original columns to products table
    await queryInterface.addColumn('products', 'supplierId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    await queryInterface.addColumn('products', 'supplierProductId', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
    await queryInterface.addColumn('products', 'denominations', {
      type: Sequelize.JSONB,
      allowNull: false
    });
    await queryInterface.addColumn('products', 'constraints', {
      type: Sequelize.JSONB,
      allowNull: true
    });

    // Step 3: Remove new columns from products table
    await queryInterface.removeColumn('products', 'description');
    await queryInterface.removeColumn('products', 'category');
    await queryInterface.removeColumn('products', 'tags');

    // Step 4: Drop product_variants table
    await queryInterface.dropTable('product_variants');

    console.log('✅ Product variants support rolled back successfully');
  }
};





