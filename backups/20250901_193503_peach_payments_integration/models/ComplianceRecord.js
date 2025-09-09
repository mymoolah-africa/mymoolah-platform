module.exports = (sequelize, DataTypes) => {
  const ComplianceRecord = sequelize.define('ComplianceRecord', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Record identification
    recordId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique compliance record identifier' 
    },
    complianceType: { 
      type: DataTypes.ENUM('kyc', 'aml', 'ctf', 'fica', 'poc', 'licensing', 'audit', 'other'), 
      allowNull: false,
      comment: 'Type of compliance record' 
    },
    
    // Entity details
    entityId: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Entity ID (user, supplier, client, merchant, reseller)' 
    },
    entityType: { 
      type: DataTypes.ENUM('user', 'supplier', 'client', 'merchant', 'reseller', 'company'), 
      allowNull: false,
      comment: 'Type of entity' 
    },
    
    // Compliance details
    requirement: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Compliance requirement description' 
    },
    status: { 
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed', 'expired', 'waived'), 
      allowNull: false, 
      defaultValue: 'pending',
      comment: 'Compliance status' 
    },
    
    // Document details
    documentType: { 
      type: DataTypes.ENUM('id_document', 'proof_of_address', 'business_registration', 'tax_clearance', 'bank_statement', 'utility_bill', 'other'), 
      allowNull: true,
      comment: 'Type of document submitted' 
    },
    documentReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Document reference number' 
    },
    documentUrl: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'URL to stored document' 
    },
    
    // Verification details
    verifiedBy: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'User ID who verified the compliance' 
    },
    verifiedAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'When compliance was verified' 
    },
    verificationMethod: { 
      type: DataTypes.ENUM('manual', 'automated', 'third_party', 'government_api'), 
      allowNull: true,
      comment: 'Method used for verification' 
    },
    
    // Expiry and renewal
    validFrom: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Date from which compliance is valid' 
    },
    validUntil: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Date until which compliance is valid' 
    },
    renewalRequired: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false,
      comment: 'Whether renewal is required' 
    },
    renewalPeriod: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      comment: 'Renewal period in months' 
    },
    
    // Risk assessment
    riskLevel: { 
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), 
      allowNull: false, 
      defaultValue: 'medium',
      comment: 'Risk level assessment' 
    },
    riskScore: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      comment: 'Numeric risk score (0-100)' 
    },
    
    // Notes and metadata
    notes: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: 'Additional notes about compliance' 
    },
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional compliance metadata' 
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
    },
  }, {
    tableName: 'compliance_records',
    timestamps: true,
    indexes: [
      { fields: ['recordId'] },
      { fields: ['complianceType'] },
      { fields: ['entityId'] },
      { fields: ['entityType'] },
      { fields: ['status'] },
      { fields: ['riskLevel'] },
      { fields: ['validUntil'] },
      { fields: ['createdAt'] }
    ]
  });

  // Instance methods
  ComplianceRecord.prototype.isValid = function() {
    if (this.status !== 'completed') return false;
    if (!this.validUntil) return true;
    return new Date() <= this.validUntil;
  };

  ComplianceRecord.prototype.isExpired = function() {
    if (!this.validUntil) return false;
    return new Date() > this.validUntil;
  };

  ComplianceRecord.prototype.daysUntilExpiry = function() {
    if (!this.validUntil) return null;
    const now = new Date();
    const expiry = new Date(this.validUntil);
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  ComplianceRecord.prototype.markAsVerified = function(verifiedBy, verificationMethod) {
    this.status = 'completed';
    this.verifiedBy = verifiedBy;
    this.verifiedAt = new Date();
    this.verificationMethod = verificationMethod;
    return this.save();
  };

  ComplianceRecord.prototype.updateRiskAssessment = function(riskLevel, riskScore) {
    this.riskLevel = riskLevel;
    this.riskScore = riskScore;
    return this.save();
  };

  return ComplianceRecord;
};
