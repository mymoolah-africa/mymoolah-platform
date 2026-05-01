'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupplierCommercialTerm extends Model {
    static associate(models) {
      SupplierCommercialTerm.belongsTo(models.Supplier, {
        foreignKey: 'supplierId',
        as: 'supplier',
      });
    }
  }

  SupplierCommercialTerm.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'supplier_id',
      references: { model: 'suppliers', key: 'id' },
    },
    supplierCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'supplier_code',
    },
    providerCode: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'provider_code',
    },
    providerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_name',
    },
    providerType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'provider_type',
    },
    serviceFamily: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'service_family',
    },
    commercialType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'commercial_type',
    },
    fixedFeeExVat: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'fixed_fee_ex_vat',
    },
    fixedFeeVatRate: {
      type: DataTypes.DECIMAL(6, 4),
      allowNull: false,
      defaultValue: 0.15,
      field: 'fixed_fee_vat_rate',
    },
    fixedFeeIsVatExclusive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'fixed_fee_is_vat_exclusive',
    },
    mmtpFeeExVat: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'mmtp_fee_ex_vat',
    },
    reversalFeeExVat: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'reversal_fee_ex_vat',
    },
    grossCommissionPct: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: true,
      field: 'gross_commission_pct',
    },
    serviceFeePct: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: true,
      field: 'service_fee_pct',
    },
    netCommissionPct: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: true,
      field: 'net_commission_pct',
    },
    monthlySwitchingFeePct: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: true,
      field: 'monthly_switching_fee_pct',
    },
    isCustomerFacing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_customer_facing',
    },
    isMock: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_mock',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'effective_from',
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_to',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    sequelize,
    modelName: 'SupplierCommercialTerm',
    tableName: 'supplier_commercial_terms',
    timestamps: true,
    indexes: [
      { fields: ['supplier_code', 'provider_code', 'is_active'], name: 'idx_supplier_commercial_terms_model_lookup' },
    ],
  });

  return SupplierCommercialTerm;
};
