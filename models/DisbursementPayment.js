'use strict';

/**
 * DisbursementPayment model
 * One record per beneficiary (employee/supplier) within a DisbursementRun.
 * Status updated when SBSA returns a Pain.002 response file.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

module.exports = (sequelize, DataTypes) => {
  const DisbursementPayment = sequelize.define('DisbursementPayment', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    run_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    employee_ref: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    beneficiary_name: {
      type: DataTypes.STRING(140),
      allowNull: false,
    },
    account_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    branch_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING(35),
      allowNull: true,
    },
    end_to_end_id: {
      type: DataTypes.STRING(35),
      allowNull: true,
      unique: true,
    },
    status: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: 'pending',
    },
    rejection_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    rejection_reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    retry_of: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'disbursement_payments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  DisbursementPayment.associate = (models) => {
    DisbursementPayment.belongsTo(models.DisbursementRun, {
      foreignKey: 'run_id',
      as: 'run',
    });
    DisbursementPayment.belongsTo(models.DisbursementPayment, {
      foreignKey: 'retry_of',
      as: 'originalPayment',
    });
  };

  return DisbursementPayment;
};
