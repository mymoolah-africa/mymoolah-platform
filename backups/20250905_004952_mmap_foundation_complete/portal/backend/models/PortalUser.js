module.exports = (sequelize, DataTypes) => {
  const PortalUser = sequelize.define('PortalUser', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    
    // Entity identification
    entityId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      comment: 'Reference to entity in core MMTP (supplier_id, client_id, etc.)' 
    },
    entityName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Human readable entity name' 
    },
    entityType: { 
      type: DataTypes.ENUM('supplier', 'client', 'merchant', 'reseller', 'admin'), 
      allowNull: false,
      comment: 'Type of entity this portal user represents' 
    },
    
    // Portal user details
    email: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      validate: {
        isEmail: true
      },
      comment: 'Portal user email address' 
    },
    passwordHash: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Hashed password for portal access' 
    },
    
    // Role and permissions
    role: { 
      type: DataTypes.STRING, 
      allowNull: false,
      defaultValue: 'user',
      comment: 'Portal user role (admin, manager, user, viewer)' 
    },
    permissions: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      defaultValue: {},
      comment: 'JSON object defining specific permissions' 
    },
    
    // Dual-role support
    hasDualRole: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false,
      comment: 'Whether this entity has dual roles (e.g., supplier + merchant)' 
    },
    dualRoles: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      defaultValue: [],
      comment: 'Array of roles this entity can perform' 
    },
    
    // Account status
    isActive: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true,
      comment: 'Whether the portal user account is active' 
    },
    isVerified: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false,
      comment: 'Whether the portal user email is verified' 
    },
    
    // Security
    lastLoginAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Last successful login timestamp' 
    },
    loginAttempts: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 0,
      comment: 'Number of failed login attempts' 
    },
    lockedUntil: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Account lockout expiration timestamp' 
    },
    
    // Two-factor authentication
    twoFactorEnabled: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false,
      comment: 'Whether 2FA is enabled for this user' 
    },
    twoFactorSecret: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: '2FA secret key (encrypted)' 
    },
    
    // Notification preferences
    notificationPreferences: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      defaultValue: {
        email: true,
        sms: false,
        push: true,
        alerts: true
      },
      comment: 'User notification preferences' 
    },
    
    // Metadata
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional entity-specific configuration' 
    },
    
    // Timestamps
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
    tableName: 'portal_users',
    timestamps: true,
    indexes: [
      { fields: ['entityId'] },
      { fields: ['entityType'] },
      { fields: ['email'] },
      { fields: ['isActive'] },
      { fields: ['hasDualRole'] },
      { fields: ['createdAt'] }
    ],
    hooks: {
      beforeUpdate: (portalUser) => {
        portalUser.updatedAt = new Date();
      }
    }
  });

  // Instance methods
  PortalUser.prototype.isAccountLocked = function() {
    return !!(this.lockedUntil && this.lockedUntil > Date.now());
  };

  PortalUser.prototype.incrementLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockedUntil && this.lockedUntil < Date.now()) {
      return this.update({
        loginAttempts: 1,
        lockedUntil: null
      });
    }
    
    const updates = { loginAttempts: this.loginAttempts + 1 };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isAccountLocked()) {
      updates.lockedUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    }
    
    return this.update(updates);
  };

  PortalUser.prototype.resetLoginAttempts = function() {
    return this.update({
      loginAttempts: 0,
      lockedUntil: null
    });
  };

  PortalUser.prototype.hasPermission = function(permission) {
    if (this.role === 'admin') return true;
    
    const permissions = this.permissions || {};
    return permissions[permission] === true;
  };

  PortalUser.prototype.canAccessPortal = function(portalType) {
    // Admin can access all portals
    if (this.role === 'admin') return true;
    
    // Check if entity type matches portal type
    if (this.entityType === portalType) return true;
    
    // Check dual roles
    if (this.hasDualRole && this.dualRoles.includes(portalType)) return true;
    
    return false;
  };

  PortalUser.prototype.getDisplayName = function() {
    return this.entityName || this.email;
  };

  // Class methods
  PortalUser.findByEntity = function(entityId, entityType) {
    return this.findOne({
      where: {
        entityId: entityId,
        entityType: entityType,
        isActive: true
      }
    });
  };

  PortalUser.findActiveUsers = function(entityType = null) {
    const where = { isActive: true };
    if (entityType) {
      where.entityType = entityType;
    }
    
    return this.findAll({
      where: where,
      order: [['createdAt', 'DESC']]
    });
  };

  PortalUser.getDualRoleEntities = function() {
    return this.findAll({
      where: {
        hasDualRole: true,
        isActive: true
      },
      order: [['entityName', 'ASC']]
    });
  };

  return PortalUser;
};
