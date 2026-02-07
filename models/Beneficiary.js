module.exports = (sequelize, DataTypes) => {
  const Beneficiary = sequelize.define('Beneficiary', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Owner user who made the payment',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Beneficiary name (can be same across different users)',
    },
    msisdn: {
      type: DataTypes.STRING(15),
      allowNull: true, // Optional for non-mobile beneficiaries (electricity, biller, bank)
      comment: 'Mobile number (MSISDN) in E.164 (+27XXXXXXXXX). Required for mymoolah/airtime/data; optional otherwise',
      validate: {
        isValidMsisdn(value) {
          if (value == null || value === '') return; // allow null/empty
          // Allow NON_MSI_* placeholders for non-mobile services
          if (typeof value === 'string' && value.startsWith('NON_MSI_')) return;
          if (!/^\+27[6-8][0-9]{8}$/.test(value)) {
            throw new Error('Invalid South African mobile number (E.164 +27XXXXXXXXX required)');
          }
        }
      }
    },
    identifier: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'For MyMoolah: same as MSISDN. For Bank: bank account number. For others: service-specific identifier',
    },
    accountType: {
      type: DataTypes.ENUM('mymoolah', 'bank', 'airtime', 'data', 'electricity', 'biller', 'usdc', 'crypto'),
      allowNull: false,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Bank name for bank beneficiaries',
    },
    // Unified beneficiary system - multiple service types per person
    paymentMethods: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Payment methods: mymoolah wallet, bank accounts',
      // Structure: { mymoolah: { walletId: string, isActive: boolean }, bankAccounts: [...] }
    },
    vasServices: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'VAS services: airtime, data providers',
      // Structure: { airtime: [{ mobileNumber, network, isActive }], data: [...] }
    },
    utilityServices: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Utility services: electricity, water meters',
      // Structure: { electricity: [{ meterNumber, meterType, provider, isActive }], water: [...] }
    },
    billerServices: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Biller services: DSTV, insurance, etc.',
      // Structure: { accounts: [{ accountNumber, billerName, billerCategory, isActive }] }
    },
    voucherServices: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Voucher services: gaming, streaming platforms',
      // Structure: { gaming: [{ accountId, platform, isActive }], streaming: [...] }
    },
    cryptoServices: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'crypto_services',
      comment: 'Crypto wallet services: { usdc: [{ walletAddress, network, isActive, country, relationship, purpose, totalSends, totalUsdcSent }] }',
    },
    preferredPaymentMethod: {
      type: DataTypes.ENUM('mymoolah', 'bank', 'airtime', 'data', 'electricity', 'biller', 'voucher', 'usdc', 'crypto'),
      allowNull: true,
      comment: 'User preferred payment method for this beneficiary',
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this beneficiary is marked as favorite',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User notes about this beneficiary',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Legacy metadata - kept for backward compatibility',
    },
    lastPaidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    timesPaid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'beneficiaries',
    indexes: [
      { fields: ['userId'] },
      { unique: true, fields: ['userId', 'msisdn'], name: 'beneficiaries_user_msisdn_unique' }, // User-scoped uniqueness
      { fields: ['msisdn'], name: 'beneficiaries_msisdn_index' }, // Performance index (non-unique)
      { unique: false, fields: ['userId', 'identifier', 'accountType'] },
      { fields: ['accountType'] },
      { fields: ['userId', 'isFavorite'] },
      { fields: ['preferredPaymentMethod'] },
      { fields: ['paymentMethods'], using: 'gin' },
      { fields: ['vasServices'], using: 'gin' },
      { fields: ['utilityServices'], using: 'gin' },
      { fields: ['billerServices'], using: 'gin' },
      { fields: ['voucherServices'], using: 'gin' },
      { fields: ['crypto_services'], using: 'gin', name: 'idx_beneficiaries_crypto_services' },
    ],
  });

  Beneficiary.associate = (models) => {
    Beneficiary.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    // Unified beneficiary associations
    // Note: Using different aliases to avoid collision with JSONB attributes
    Beneficiary.hasMany(models.BeneficiaryPaymentMethod, { 
      foreignKey: 'beneficiaryId', 
      as: 'paymentMethodRecords' // Different from JSONB 'paymentMethods' attribute
    });
    Beneficiary.hasMany(models.BeneficiaryServiceAccount, { 
      foreignKey: 'beneficiaryId', 
      as: 'serviceAccountRecords' // Different from JSONB 'vasServices'/'utilityServices' attributes
    });
  };

  return Beneficiary;
};




