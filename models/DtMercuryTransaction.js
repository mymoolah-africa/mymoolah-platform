const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DtMercuryTransaction = sequelize.define('DtMercuryTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Unique transaction reference'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User who initiated the transaction'
    },
    paymentType: {
      type: DataTypes.ENUM('rpp', 'rtp'),
      allowNull: false,
      comment: 'PayShap payment type: RPP (Request to Pay) or RTP (Real-time Payment)'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Transaction amount in cents'
    },
    recipientAccountNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Recipient bank account number'
    },
    recipientBankCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Recipient bank code (e.g., SBZA for Standard Bank)'
    },
    recipientName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Recipient account holder name'
    },
    recipientReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Reference for recipient (payment description)'
    },
    kycTier: {
      type: DataTypes.ENUM('tier1', 'tier2'),
      allowNull: false,
      defaultValue: 'tier1',
      comment: 'KYC compliance tier required for transaction'
    },
    kycStatus: {
      type: DataTypes.ENUM('pending', 'verified', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'KYC verification status'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Transaction status'
    },
    dtmercuryTransactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'dtMercury transaction ID'
    },
    dtmercuryResponseCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'dtMercury API response code'
    },
    dtmercuryResponseMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'dtMercury API response message'
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Transaction fee in cents'
    },
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Processing time in milliseconds'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional transaction metadata'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if transaction failed'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'dtmercury_transactions',
    timestamps: true,
    indexes: [
      {
        name: 'idx_dtmercury_transactions_reference',
        unique: true,
        fields: ['reference']
      },
      {
        name: 'idx_dtmercury_transactions_user_id',
        fields: ['userId']
      },
      {
        name: 'idx_dtmercury_transactions_status',
        fields: ['status']
      },
      {
        name: 'idx_dtmercury_transactions_payment_type',
        fields: ['paymentType']
      },
      {
        name: 'idx_dtmercury_transactions_created_at',
        fields: ['createdAt']
      }
    ]
  });

  DtMercuryTransaction.associate = (models) => {
    DtMercuryTransaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return DtMercuryTransaction;
};
