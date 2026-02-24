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

      // ------------------------------------------------------------------
      // methodType: the structural type of the payment account.
      // Constrained by DB CHECK bpm_method_type_check.
      // ------------------------------------------------------------------
      methodType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Account type: mymoolah | bank | mobile_money | international_bank',
        validate: {
          isIn: {
            args: [['mymoolah', 'bank', 'mobile_money', 'international_bank']],
            msg: 'methodType must be one of: mymoolah, bank, mobile_money, international_bank'
          }
        }
      },

      // ------------------------------------------------------------------
      // paymentRail: the payment network used to send money.
      // Multiple rails can share the same bank account (e.g. EFT and PayShap
      // both use methodType='bank' but are different rails).
      // Constrained by DB CHECK bpm_payment_rail_check.
      // ------------------------------------------------------------------
      paymentRail: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'unspecified',
        comment: 'Payment rail: mymoolah | eft | payshap | moolahmove | mobile_money | international_bank | unspecified',
        validate: {
          isIn: {
            args: [['mymoolah', 'eft', 'payshap', 'moolahmove', 'mobile_money', 'international_bank', 'unspecified']],
            msg: 'paymentRail must be one of: mymoolah, eft, payshap, moolahmove, mobile_money, international_bank, unspecified'
          }
        }
      },

      // ------------------------------------------------------------------
      // MyMoolah wallet fields
      // ------------------------------------------------------------------
      walletMsisdn: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'E.164 mobile number for MyMoolah wallet (methodType=mymoolah)'
      },

      // ------------------------------------------------------------------
      // Domestic bank account fields (EFT, PayShap, MoolahMove domestic)
      // ------------------------------------------------------------------
      bankName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Bank name for domestic bank accounts'
      },
      accountNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Bank account number (domestic or international)'
      },
      accountType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Bank account type: savings | cheque | transmission | current'
      },
      branchCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'South African branch code (6 digits)'
      },

      // ------------------------------------------------------------------
      // International bank fields (MoolahMove international_bank)
      // ------------------------------------------------------------------
      swiftBic: {
        type: DataTypes.STRING(11),
        allowNull: true,
        comment: 'SWIFT/BIC code for international bank transfers (MoolahMove)'
      },
      iban: {
        type: DataTypes.STRING(34),
        allowNull: true,
        comment: 'IBAN for international bank transfers (MoolahMove)'
      },
      countryCode: {
        type: DataTypes.CHAR(2),
        allowNull: true,
        comment: 'ISO 3166-1 alpha-2 country code for international methods (MoolahMove)'
      },

      // ------------------------------------------------------------------
      // Mobile money / international e-wallet fields (MoolahMove mobile_money)
      // ------------------------------------------------------------------
      provider: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Mobile money / e-wallet provider identifier (e.g. yellowcard, mtn_momo, valr)'
      },
      mobileMoneyId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Mobile money wallet ID or MSISDN for the provider'
      },

      // ------------------------------------------------------------------
      // Status and verification
      // ------------------------------------------------------------------
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the default method for this methodType on the beneficiary'
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this account has been verified (e.g. penny-drop, KYC check)'
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
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
