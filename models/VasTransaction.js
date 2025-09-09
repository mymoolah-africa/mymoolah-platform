'use strict';

module.exports = (sequelize, DataTypes) => {
  const VasTransaction = sequelize.define('VasTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User who made the transaction'
    },
    beneficiaryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Beneficiary ID if applicable'
    },
    vasType: {
      type: DataTypes.ENUM('airtime', 'data', 'electricity', 'bill_payment'),
      allowNull: false,
      comment: 'Type of VAS transaction'
    },
    supplierId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Supplier identifier (flash, mobilemart, etc.)'
    },
    supplierProductId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Product ID from supplier'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Transaction amount in cents'
    },
    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Mobile number or account identifier'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Transaction status'
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Unique transaction reference'
    },
    supplierReference: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference from supplier'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional transaction metadata'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if transaction failed'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When transaction was processed'
    }
  }, {
    tableName: 'vas_transactions',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['beneficiaryId'] },
      { fields: ['vasType'] },
      { fields: ['supplierId'] },
      { fields: ['status'] },
      { fields: ['reference'] },
      { fields: ['createdAt'] }
    ]
  });

  VasTransaction.associate = function(models) {
    // Define associations here if needed
    VasTransaction.belongsTo(models.User, { foreignKey: 'userId' });
    VasTransaction.belongsTo(models.Beneficiary, { foreignKey: 'beneficiaryId' });
  };

  return VasTransaction;
};
