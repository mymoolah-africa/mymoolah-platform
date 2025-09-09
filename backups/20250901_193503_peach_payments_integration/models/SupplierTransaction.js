'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupplierTransaction extends Model {
    static associate(models) {
      // Define associations here
      SupplierTransaction.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
      SupplierTransaction.belongsTo(models.Supplier, {
        foreignKey: 'supplierId',
        as: 'supplier'
      });
    }

    // Instance methods
    isSuccessful() {
      return this.status === 'success';
    }

    isFailed() {
      return this.status === 'failed';
    }

    isPending() {
      return this.status === 'pending';
    }

    canRetry() {
      return this.isFailed() && this.retryCount < 3;
    }

    shouldRetry() {
      return this.canRetry() && (!this.nextRetryAt || new Date() >= this.nextRetryAt);
    }

    getRetryDelay() {
      // Exponential backoff: 1s, 2s, 4s
      return Math.pow(2, this.retryCount) * 1000;
    }

    getFeesBreakdown() {
      return this.fees || {};
    }

    getErrorDetails() {
      return this.errorData || {};
    }
  }

  SupplierTransaction.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: {
          msg: 'Order ID is required'
        }
      }
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      validate: {
        notNull: {
          msg: 'Supplier ID is required'
        }
      }
    },
    supplierReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: {
          args: [0, 255],
          msg: 'Supplier reference must be between 0 and 255 characters'
        }
      },
      comment: 'Reference from supplier system'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Amount is required'
        },
        min: {
          args: [0],
          msg: 'Amount must be non-negative'
        }
      },
      comment: 'Amount in cents'
    },
    fees: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidFees(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Fees must be an object');
          }
        }
      },
      comment: 'Fee breakdown from supplier'
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        notEmpty: {
          msg: 'Status is required'
        },
        isIn: {
          args: [['pending', 'processing', 'success', 'failed', 'cancelled']],
          msg: 'Invalid status'
        }
      }
    },
    responseData: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidResponseData(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Response data must be an object');
          }
        }
      },
      comment: 'Raw response from supplier'
    },
    errorData: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidErrorData(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Error data must be an object');
          }
        }
      },
      comment: 'Error details if failed'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Retry count must be non-negative'
        },
        max: {
          args: [10],
          msg: 'Retry count cannot exceed 10'
        }
      }
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isFutureDate(value) {
          if (value && new Date(value) <= new Date()) {
            throw new Error('Next retry time must be in the future');
          }
        }
      }
    }
  }, {
    sequelize,
    modelName: 'SupplierTransaction',
    tableName: 'supplier_transactions',
    timestamps: true,
    indexes: [
      {
        name: 'idx_supplier_tx_supplier_ref',
        fields: ['supplierId', 'supplierReference']
      },
      {
        name: 'idx_supplier_tx_order',
        fields: ['orderId']
      },
      {
        name: 'idx_supplier_tx_status',
        fields: ['status']
      },
      {
        name: 'idx_supplier_tx_retry',
        fields: ['status', 'nextRetryAt']
      },
      {
        name: 'idx_supplier_tx_supplier_status',
        fields: ['supplierId', 'status']
      }
    ],
    hooks: {
      beforeCreate: (transaction) => {
        // Sanitize supplier reference
        if (transaction.supplierReference) {
          transaction.supplierReference = transaction.supplierReference.trim();
        }

        // Set initial retry count
        if (transaction.retryCount === undefined) {
          transaction.retryCount = 0;
        }
      },
      beforeUpdate: (transaction) => {
        // Sanitize supplier reference
        if (transaction.supplierReference) {
          transaction.supplierReference = transaction.supplierReference.trim();
        }

        // Calculate next retry time if status is failed and retry count increased
        if (transaction.changed('retryCount') && transaction.status === 'failed') {
          const retryDelay = Math.pow(2, transaction.retryCount) * 1000; // Exponential backoff
          transaction.nextRetryAt = new Date(Date.now() + retryDelay);
        }
      }
    }
  });

  return SupplierTransaction;
};



