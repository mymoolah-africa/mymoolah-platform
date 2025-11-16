'use strict';

/**
 * Beneficiary normalization migration (Phase 1)
 *
 * This migration introduces two new tables:
 * - beneficiary_payment_methods      (how to PAY a beneficiary)
 * - beneficiary_service_accounts     (what SERVICES belong to a beneficiary)
 *
 * It does NOT modify or drop the existing `beneficiaries` table.
 * Existing JSONB fields (paymentMethods, vasServices, etc.) remain in place
 * for backwards compatibility. Application code can gradually start reading
 * and writing to these new tables while still supporting the legacy shape.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, BOOLEAN, JSONB, DATE } = Sequelize;

    // 1) Payment methods (bank / wallet / mobile money, etc.)
    await queryInterface.createTable('beneficiary_payment_methods', {
      id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      beneficiaryId: {
        type: INTEGER,
        allowNull: false,
        references: {
          model: 'beneficiaries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      // Payment method type: 'mymoolah', 'bank', 'mobile_money', etc.
      methodType: {
        type: STRING(50),
        allowNull: false,
        comment: 'Payment method type (mymoolah, bank, mobile_money, etc.)'
      },

      // For MyMoolah wallet & mobile-money MSISDN based methods
      walletMsisdn: {
        type: STRING(20),
        allowNull: true,
        comment: 'Wallet or MSISDN number used for this payment method'
      },

      // For bank accounts
      bankName: {
        type: STRING(100),
        allowNull: true
      },
      accountNumber: {
        type: STRING(50),
        allowNull: true
      },
      accountType: {
        type: STRING(20),
        allowNull: true,
        comment: 'Bank account type (savings, cheque, transmission, etc.)'
      },
      branchCode: {
        type: STRING(20),
        allowNull: true
      },

      // Mobile money specific
      provider: {
        type: STRING(50),
        allowNull: true,
        comment: 'Mobile money provider identifier (e.g. mtn_momo)'
      },
      mobileMoneyId: {
        type: STRING(50),
        allowNull: true
      },

      // Status & verification
      isActive: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isDefault: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the default payment method for the beneficiary'
      },
      isVerified: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      verifiedAt: {
        type: DATE,
        allowNull: true
      },

      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Indexes for payment methods
    await queryInterface.addIndex('beneficiary_payment_methods', ['beneficiaryId'], {
      name: 'beneficiary_payment_methods_beneficiary_idx'
    });
    await queryInterface.addIndex('beneficiary_payment_methods', ['methodType'], {
      name: 'beneficiary_payment_methods_type_idx'
    });
    await queryInterface.addIndex(
      'beneficiary_payment_methods',
      ['beneficiaryId', 'methodType', 'accountNumber'],
      {
        name: 'beneficiary_payment_methods_unique_account',
        unique: false
      }
    );

    // 2) Service accounts (airtime, electricity, billers, vouchers, etc.)
    await queryInterface.createTable('beneficiary_service_accounts', {
      id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      beneficiaryId: {
        type: INTEGER,
        allowNull: false,
        references: {
          model: 'beneficiaries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      // Service type: 'airtime', 'data', 'electricity', 'biller', 'voucher', etc.
      serviceType: {
        type: STRING(50),
        allowNull: false,
        comment: 'Service type (airtime, data, electricity, biller, voucher, etc.)'
      },

      // Service-specific data stored as JSON for flexibility
      serviceData: {
        type: JSONB,
        allowNull: false,
        comment:
          'Service-specific payload: e.g. { msisdn, network } for airtime, { meterNumber, provider } for electricity'
      },

      isActive: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isDefault: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isValidated: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      validationError: {
        type: STRING(255),
        allowNull: true
      },
      lastValidatedAt: {
        type: DATE,
        allowNull: true
      },

      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Indexes for service accounts
    await queryInterface.addIndex('beneficiary_service_accounts', ['beneficiaryId'], {
      name: 'beneficiary_service_accounts_beneficiary_idx'
    });
    await queryInterface.addIndex('beneficiary_service_accounts', ['serviceType'], {
      name: 'beneficiary_service_accounts_type_idx'
    });
    await queryInterface.addIndex('beneficiary_service_accounts', ['serviceData'], {
      name: 'beneficiary_service_accounts_data_gin_idx',
      using: 'gin'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('beneficiary_service_accounts');
    await queryInterface.dropTable('beneficiary_payment_methods');
  }
};


