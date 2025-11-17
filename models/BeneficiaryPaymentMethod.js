module.exports = (sequelize, DataTypes) => {
  const BeneficiaryPaymentMethod = sequelize.define(
    'BeneficiaryPaymentMethod',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      beneficiaryId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      methodType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Payment method type (mymoolah, bank, mobile_money, etc.)'
      },
      walletMsisdn: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Wallet or MSISDN number used for this payment method'
      },
      bankName: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      accountNumber: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      accountType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Bank account type (savings, cheque, transmission, etc.)'
      },
      branchCode: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      provider: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Mobile money provider identifier (e.g. mtn_momo)'
      },
      mobileMoneyId: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      payShapReference: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'PayShap reference (recipient MSISDN) - REQUIRED for PayShap bank transfers to wallets'
      }
    },
    {
      tableName: 'beneficiary_payment_methods'
    }
  );

  BeneficiaryPaymentMethod.associate = (models) => {
    BeneficiaryPaymentMethod.belongsTo(models.Beneficiary, {
      foreignKey: 'beneficiaryId',
      as: 'beneficiary'
    });
  };

  return BeneficiaryPaymentMethod;
};


