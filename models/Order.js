'use strict';
const { Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      // Define associations here
      Order.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Order.belongsTo(models.User, {
        foreignKey: 'clientId',
        as: 'client'
      });
      Order.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
      Order.belongsTo(models.ProductVariant, {
        foreignKey: 'variantId',
        as: 'variant'
      });
      Order.hasMany(models.SupplierTransaction, {
        foreignKey: 'orderId',
        as: 'supplierTransactions'
      });
    }

    // Instance methods
    isCompleted() {
      return this.status === 'completed';
    }

    isFailed() {
      return this.status === 'failed';
    }

    isPending() {
      return ['pending', 'processing'].includes(this.status);
    }

    canBeCancelled() {
      return this.isPending();
    }

    canBeRefunded() {
      return this.isCompleted();
    }

    getAmountInRands() {
      return this.amount / 100;
    }

    getCommissionBreakdown() {
      return this.commissionDetails || {};
    }

    getRecipientInfo() {
      return this.recipient || {};
    }
  }

  Order.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
      validate: {
        notEmpty: {
          msg: 'Order ID is required'
        }
      },
      comment: 'Public order identifier'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      validate: {
        notNull: {
          msg: 'User ID is required'
        }
      }
    },
    clientId: {
      type: DataTypes.INTEGER,
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
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      validate: {
        notNull: {
          msg: 'Product ID is required'
        }
      }
    },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'product_variants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional product variant reference'
    },
    denomination: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Denomination is required'
        },
        min: {
          args: [1],
          msg: 'Denomination must be positive'
        }
      },
      comment: 'Selected denomination in cents'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Amount is required'
        },
        min: {
          args: [1],
          msg: 'Amount must be positive'
        }
      },
      comment: 'Total amount charged in cents'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        notEmpty: {
          msg: 'Order status is required'
        }
      }
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Idempotency key is required'
        },
        len: {
          args: [1, 255],
          msg: 'Idempotency key must be between 1 and 255 characters'
        }
      },
      comment: 'Idempotency key for safe retries'
    },
    recipient: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidRecipient(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Recipient must be an object');
          }
          if (value) {
            const allowedKeys = ['email', 'phone', 'name', 'type'];
            const invalidKeys = Object.keys(value).filter(key => !allowedKeys.includes(key));
            if (invalidKeys.length > 0) {
              throw new Error(`Invalid recipient keys: ${invalidKeys.join(', ')}`);
            }
          }
        }
      },
      comment: 'Recipient information (email, phone, etc.)'
    },
    commissionDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidCommissionDetails(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Commission details must be an object');
          }
        }
      },
      comment: 'Commission breakdown and calculations'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidMetadata(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Metadata must be an object');
          }
        }
      },
      comment: 'Additional order metadata'
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
    indexes: [
      {
        name: 'idx_orders_user_created',
        fields: ['userId', 'createdAt']
      },
      {
        name: 'idx_orders_public_id',
        fields: ['orderId']
      },
      {
        name: 'idx_orders_idempotency',
        fields: ['idempotencyKey']
      },
      {
        name: 'idx_orders_status',
        fields: ['status']
      },
      {
        name: 'idx_orders_client',
        fields: ['clientId']
      },
      {
        name: 'idx_orders_product',
        fields: ['productId']
      },
      {
        name: 'idx_orders_variant',
        fields: ['variantId']
      }
    ],
    hooks: {
      beforeCreate: (order) => {
        // Generate order ID if not provided
        if (!order.orderId) {
          order.orderId = uuidv4();
        }
        
        // Generate idempotency key if not provided
        if (!order.idempotencyKey) {
          order.idempotencyKey = `${order.userId}_${order.productId}_${order.denomination}_${Date.now()}`;
        }

        // Sanitize recipient data
        if (order.recipient) {
          if (order.recipient.email) {
            order.recipient.email = order.recipient.email.toLowerCase().trim();
          }
          if (order.recipient.phone) {
            order.recipient.phone = order.recipient.phone.trim();
          }
        }
      },
      beforeUpdate: (order) => {
        // Sanitize recipient data
        if (order.recipient) {
          if (order.recipient.email) {
            order.recipient.email = order.recipient.email.toLowerCase().trim();
          }
          if (order.recipient.phone) {
            order.recipient.phone = order.recipient.phone.trim();
          }
        }
      }
    }
  });

  return Order;
};





