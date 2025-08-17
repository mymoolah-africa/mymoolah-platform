// mymoolah/models/Kyc.js

module.exports = (sequelize, DataTypes) => {
  const Kyc = sequelize.define('Kyc', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      validate: {
        notNull: true,
      },
    },
    documentType: {
      type: DataTypes.ENUM('id_card', 'passport', 'drivers_license', 'utility_bill', 'bank_statement'),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    documentNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 50],
      },
    },
    documentImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    ocrData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'OCR extracted data from document',
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'under_review'),
      allowNull: false,
      defaultValue: 'pending',
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reviewerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verificationScore: {
      type: DataTypes.DECIMAL(3, 2), // 0.00 to 1.00
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
    },
    isAutomated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'kyc',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['documentType'],
      },
      {
        fields: ['submittedAt'],
      },
    ],
    hooks: {
      beforeUpdate: (kyc) => {
        // Update reviewedAt when status changes from pending
        if (kyc.changed('status') && kyc.status !== 'pending' && !kyc.reviewedAt) {
          kyc.reviewedAt = new Date();
        }
      },
    },
  });

  // Define associations
  Kyc.associate = (models) => {
    // KYC belongs to one User
    Kyc.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  // Instance methods
  Kyc.prototype.isApproved = function() {
    return this.status === 'approved';
  };

  Kyc.prototype.isRejected = function() {
    return this.status === 'rejected';
  };

  Kyc.prototype.isPending = function() {
    return this.status === 'pending';
  };

  Kyc.prototype.approve = async function(reviewedBy = 'system', notes = '') {
    this.status = 'approved';
    this.reviewedBy = reviewedBy;
    this.reviewerNotes = notes;
    this.reviewedAt = new Date();
    
    await this.save();
    return this;
  };

  Kyc.prototype.reject = async function(reviewedBy = 'system', reason = '') {
    this.status = 'rejected';
    this.reviewedBy = reviewedBy;
    this.rejectionReason = reason;
    this.reviewedAt = new Date();
    
    await this.save();
    return this;
  };

  Kyc.prototype.setVerificationScore = async function(score) {
    this.verificationScore = score;
    await this.save();
    return this;
  };

  return Kyc;
};
