const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DtMercuryBank = sequelize.define('DtMercuryBank', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bankCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'Bank code (e.g., SBZA for Standard Bank)'
    },
    bankName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Full bank name'
    },
    shortName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Short bank name for display'
    },
    supportsRPP: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether bank supports Request to Pay (RPP)'
    },
    supportsRTP: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether bank supports Real-time Payment (RTP)'
    },
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 300000,
      comment: 'Processing time in milliseconds (default 5 minutes)'
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 2.50,
      comment: 'Transaction fee in cents'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether bank is active and accepting transactions'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional bank metadata'
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
    tableName: 'dtmercury_banks',
    timestamps: true,
    indexes: [
      {
        name: 'idx_dtmercury_banks_code',
        unique: true,
        fields: ['bankCode']
      },
      {
        name: 'idx_dtmercury_banks_active',
        fields: ['isActive']
      },
      {
        name: 'idx_dtmercury_banks_name',
        fields: ['bankName']
      }
    ]
  });

  return DtMercuryBank;
};
