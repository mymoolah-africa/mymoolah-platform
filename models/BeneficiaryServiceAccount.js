module.exports = (sequelize, DataTypes) => {
  const BeneficiaryServiceAccount = sequelize.define(
    'BeneficiaryServiceAccount',
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
      serviceType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Service type (airtime, data, electricity, biller, voucher, etc.)'
      },
      serviceData: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment:
          'Service-specific payload: e.g. { msisdn, network } for airtime, { meterNumber, provider } for electricity'
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
      isValidated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      validationError: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      lastValidatedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'beneficiary_service_accounts'
    }
  );

  BeneficiaryServiceAccount.associate = (models) => {
    BeneficiaryServiceAccount.belongsTo(models.Beneficiary, {
      foreignKey: 'beneficiaryId',
      as: 'beneficiary'
    });
  };

  return BeneficiaryServiceAccount;
};


