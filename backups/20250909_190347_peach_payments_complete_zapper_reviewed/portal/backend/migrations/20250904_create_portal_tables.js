'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create portal_users table
    await queryInterface.createTable('portal_users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      entityId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Reference to entity in core MMTP (supplier_id, client_id, etc.)'
      },
      entityName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Human readable entity name'
      },
      entityType: {
        type: Sequelize.ENUM('supplier', 'client', 'merchant', 'reseller', 'admin'),
        allowNull: false,
        comment: 'Type of entity this portal user represents'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Portal user email address'
      },
      passwordHash: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Hashed password for portal access'
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'user',
        comment: 'Portal user role (admin, manager, user, viewer)'
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'JSON object defining specific permissions'
      },
      hasDualRole: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this entity has dual roles (e.g., supplier + merchant)'
      },
      dualRoles: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of roles this entity can perform'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the portal user account is active'
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the portal user email is verified'
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last successful login timestamp'
      },
      loginAttempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of failed login attempts'
      },
      lockedUntil: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Account lockout expiration timestamp'
      },
      twoFactorEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether 2FA is enabled for this user'
      },
      twoFactorSecret: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '2FA secret key (encrypted)'
      },
      notificationPreferences: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          email: true,
          sms: false,
          push: true,
          alerts: true
        },
        comment: 'User notification preferences'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional entity-specific configuration'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for portal_users
    await queryInterface.addIndex('portal_users', ['entityId']);
    await queryInterface.addIndex('portal_users', ['entityType']);
    await queryInterface.addIndex('portal_users', ['email']);
    await queryInterface.addIndex('portal_users', ['isActive']);
    await queryInterface.addIndex('portal_users', ['hasDualRole']);
    await queryInterface.addIndex('portal_users', ['createdAt']);

    // Create dual_role_floats table
    await queryInterface.createTable('dual_role_floats', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      entityId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique entity identifier'
      },
      entityName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Human readable entity name'
      },
      entityType: {
        type: Sequelize.ENUM('supplier', 'client', 'merchant', 'reseller'),
        allowNull: false,
        comment: 'Primary entity type'
      },
      roles: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of roles this entity can perform'
      },
      primaryRole: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Primary role (supplier, merchant, etc.)'
      },
      supplierFloatBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Balance when acting as supplier'
      },
      supplierCommissionEarned: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total commission earned as supplier'
      },
      supplierSettlementMethod: {
        type: Sequelize.ENUM('real_time', 'daily', 'weekly', 'monthly'),
        allowNull: true,
        comment: 'Settlement method for supplier role'
      },
      supplierLastSettlementAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last settlement timestamp for supplier role'
      },
      merchantFloatBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Balance when acting as merchant'
      },
      merchantFeesEarned: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total fees earned as merchant'
      },
      merchantSettlementMethod: {
        type: Sequelize.ENUM('real_time', 'daily', 'weekly', 'monthly'),
        allowNull: true,
        comment: 'Settlement method for merchant role'
      },
      merchantLastSettlementAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last settlement timestamp for merchant role'
      },
      netBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Net balance (supplier - merchant)'
      },
      netSettlementThreshold: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 1000.00,
        comment: 'Minimum amount for net settlement'
      },
      autoSettlementEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether automatic net settlement is enabled'
      },
      settlementFrequency: {
        type: Sequelize.ENUM('real_time', 'daily', 'weekly', 'monthly'),
        allowNull: false,
        defaultValue: 'daily',
        comment: 'Frequency of net settlement processing'
      },
      nextSettlementAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next scheduled settlement timestamp'
      },
      lastNetSettlementAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last net settlement timestamp'
      },
      status: {
        type: Sequelize.ENUM('active', 'suspended', 'closed'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Current status of the dual-role float account'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the dual-role float account is active'
      },
      maxSupplierBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Maximum balance allowed for supplier role'
      },
      maxMerchantBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Maximum balance allowed for merchant role'
      },
      dailyTransactionLimit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Daily transaction limit across all roles'
      },
      integrationType: {
        type: Sequelize.ENUM('api', 'webhook', 'batch'),
        allowNull: false,
        defaultValue: 'api',
        comment: 'Integration method with the entity'
      },
      apiEndpoint: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Entity API endpoint for callbacks'
      },
      webhookUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Entity webhook URL for notifications'
      },
      bankAccountNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Bank account number for settlements'
      },
      bankCode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Bank code for settlements'
      },
      bankName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Bank name for settlements'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional entity-specific configuration'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for dual_role_floats
    await queryInterface.addIndex('dual_role_floats', ['entityId']);
    await queryInterface.addIndex('dual_role_floats', ['entityType']);
    await queryInterface.addIndex('dual_role_floats', ['primaryRole']);
    await queryInterface.addIndex('dual_role_floats', ['status']);
    await queryInterface.addIndex('dual_role_floats', ['isActive']);
    await queryInterface.addIndex('dual_role_floats', ['nextSettlementAt']);
    await queryInterface.addIndex('dual_role_floats', ['createdAt']);

    // Create portal_sessions table
    await queryInterface.createTable('portal_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      portalUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'portal_users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sessionToken: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique session token'
      },
      portalType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Type of portal (admin, supplier, client, merchant, reseller)'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Session expiration timestamp'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the session is active'
      },
      lastActivityAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last activity timestamp'
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'IP address of the session'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent string'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for portal_sessions
    await queryInterface.addIndex('portal_sessions', ['portalUserId']);
    await queryInterface.addIndex('portal_sessions', ['sessionToken']);
    await queryInterface.addIndex('portal_sessions', ['portalType']);
    await queryInterface.addIndex('portal_sessions', ['expiresAt']);
    await queryInterface.addIndex('portal_sessions', ['isActive']);
    await queryInterface.addIndex('portal_sessions', ['createdAt']);

    // Create portal_audit_logs table
    await queryInterface.createTable('portal_audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      portalUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'portal_users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Action performed'
      },
      entityType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Type of entity affected'
      },
      entityId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID of entity affected'
      },
      portalType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Type of portal where action occurred'
      },
      method: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'HTTP method'
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Request URL'
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'IP address of request'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent string'
      },
      requestData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Request data (sanitized)'
      },
      responseStatus: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'HTTP response status'
      },
      responseData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Response data (sanitized)'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for portal_audit_logs
    await queryInterface.addIndex('portal_audit_logs', ['portalUserId']);
    await queryInterface.addIndex('portal_audit_logs', ['action']);
    await queryInterface.addIndex('portal_audit_logs', ['entityType']);
    await queryInterface.addIndex('portal_audit_logs', ['entityId']);
    await queryInterface.addIndex('portal_audit_logs', ['portalType']);
    await queryInterface.addIndex('portal_audit_logs', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('portal_audit_logs');
    await queryInterface.dropTable('portal_sessions');
    await queryInterface.dropTable('dual_role_floats');
    await queryInterface.dropTable('portal_users');
  }
};
