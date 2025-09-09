'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create product types enum
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_product_types" AS ENUM (
        'airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'cash_out'
      );
    `);

    // Create product status enum
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_product_status" AS ENUM (
        'active', 'inactive', 'discontinued', 'maintenance'
      );
    `);

    // Create order status enum
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_order_status" AS ENUM (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
      );
    `);

    // Create product brands table
    await queryInterface.createTable('product_brands', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      logoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Brand logo URL'
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Product category (gaming, entertainment, transport, etc.)'
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Searchable tags for the brand'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional brand metadata'
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

    // Create products table
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'cash_out'),
        allowNull: false
      },
      supplierId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      brandId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'product_brands',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      supplierProductId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Product ID from supplier system'
      },
      denominations: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Available denominations in cents'
      },
      constraints: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Product constraints (min/max amounts, etc.)'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'discontinued', 'maintenance'),
        allowNull: false,
        defaultValue: 'active'
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether product appears in featured section'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Sort order for featured products'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional product metadata'
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

    // Create orders table
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        defaultValue: Sequelize.UUIDV4,
        comment: 'Public order identifier'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      clientId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'API client ID if applicable'
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      denomination: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Selected denomination in cents'
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total amount charged in cents'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      idempotencyKey: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Idempotency key for safe retries'
      },
      recipient: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Recipient information (email, phone, etc.)'
      },
      commissionDetails: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Commission breakdown and calculations'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional order metadata'
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

    // Create supplier transactions table
    await queryInterface.createTable('supplier_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      supplierId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      supplierReference: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Reference from supplier system'
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Amount in cents'
      },
      fees: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Fee breakdown from supplier'
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending'
      },
      responseData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Raw response from supplier'
      },
      errorData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Error details if failed'
      },
      retryCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      nextRetryAt: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Create indexes for performance
    await queryInterface.addIndex('products', ['supplierId', 'type'], {
      name: 'idx_products_supplier_type'
    });
    await queryInterface.addIndex('products', ['brandId'], {
      name: 'idx_products_brand'
    });
    await queryInterface.addIndex('products', ['isFeatured', 'sortOrder'], {
      name: 'idx_products_featured'
    });
    await queryInterface.addIndex('products', ['status'], {
      name: 'idx_products_status'
    });

    await queryInterface.addIndex('orders', ['userId', 'createdAt'], {
      name: 'idx_orders_user_created'
    });
    await queryInterface.addIndex('orders', ['orderId'], {
      name: 'idx_orders_public_id'
    });
    await queryInterface.addIndex('orders', ['idempotencyKey'], {
      name: 'idx_orders_idempotency'
    });
    await queryInterface.addIndex('orders', ['status'], {
      name: 'idx_orders_status'
    });

    await queryInterface.addIndex('supplier_transactions', ['supplierId', 'supplierReference'], {
      name: 'idx_supplier_tx_supplier_ref'
    });
    await queryInterface.addIndex('supplier_transactions', ['orderId'], {
      name: 'idx_supplier_tx_order'
    });
    await queryInterface.addIndex('supplier_transactions', ['status'], {
      name: 'idx_supplier_tx_status'
    });

    // Create full-text search index for products
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_products_search ON products 
      USING gin(to_tsvector('english', name || ' ' || COALESCE(metadata->>'description', '')));
    `);

    // Create full-text search index for brands
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_brands_search ON product_brands 
      USING gin(to_tsvector('english', name || ' ' || COALESCE(tags::text, '')));
    `);

    console.log('✅ Unified product catalog schema created with banking-grade security and performance standards');
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.dropTable('supplier_transactions');
    await queryInterface.dropTable('orders');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('product_brands');

    // Drop enums
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_product_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_product_types";');

    console.log('✅ Unified product catalog schema dropped');
  }
};





