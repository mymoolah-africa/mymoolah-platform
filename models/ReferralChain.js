/**
 * ReferralChain Model
 * 
 * Stores the complete 4-level referral chain for each user
 * Enables fast calculation of who earns from each transaction
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = (sequelize, DataTypes) => {
  const ReferralChain = sequelize.define('ReferralChain', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User whose chain this is'
    },
    level1UserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'level_1_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Direct referrer (Level 1 - earns 4%)'
    },
    level2UserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'level_2_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Level 2 referrer (earns 3%)'
    },
    level3UserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'level_3_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Level 3 referrer (earns 2%)'
    },
    level4UserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'level_4_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Level 4 referrer (earns 1%)'
    },
    chainDepth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chain_depth',
      comment: 'Number of levels in chain (0-4)'
    }
  }, {
    tableName: 'referral_chains',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false
  });

  ReferralChain.associate = (models) => {
    ReferralChain.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    ReferralChain.belongsTo(models.User, {
      foreignKey: 'level1UserId',
      as: 'level1User'
    });
    
    ReferralChain.belongsTo(models.User, {
      foreignKey: 'level2UserId',
      as: 'level2User'
    });
    
    ReferralChain.belongsTo(models.User, {
      foreignKey: 'level3UserId',
      as: 'level3User'
    });
    
    ReferralChain.belongsTo(models.User, {
      foreignKey: 'level4UserId',
      as: 'level4User'
    });
  };

  /**
   * Get all users in the chain who should earn from this user's transactions
   * @returns {Array} Array of {userId, level, percentage}
   */
  ReferralChain.prototype.getEarners = function() {
    const earners = [];
    const percentages = [4.00, 3.00, 2.00, 1.00];
    
    if (this.level1UserId) {
      earners.push({ userId: this.level1UserId, level: 1, percentage: percentages[0] });
    }
    if (this.level2UserId) {
      earners.push({ userId: this.level2UserId, level: 2, percentage: percentages[1] });
    }
    if (this.level3UserId) {
      earners.push({ userId: this.level3UserId, level: 3, percentage: percentages[2] });
    }
    if (this.level4UserId) {
      earners.push({ userId: this.level4UserId, level: 4, percentage: percentages[3] });
    }
    
    return earners;
  };

  return ReferralChain;
};

