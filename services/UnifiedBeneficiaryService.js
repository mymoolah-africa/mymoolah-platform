const {
  Beneficiary,
  BeneficiaryPaymentMethod,
  BeneficiaryServiceAccount,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

class UnifiedBeneficiaryService {
  /**
   * Get beneficiaries filtered by service type for specific pages
   */
  async getBeneficiariesByService(userId, serviceType, search = '') {
    try {
      const whereClause = { userId };

      if (search && search.trim().length > 0) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { identifier: { [Op.iLike]: `%${search}%` } },
          { msisdn: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Fetch beneficiaries
      const beneficiaries = await Beneficiary.findAll({
        where: whereClause,
        order: [
          ['isFavorite', 'DESC'],
          ['lastPaidAt', 'DESC NULLS LAST'],
          ['timesPaid', 'DESC'],
          ['name', 'ASC']
        ]
      });

      // Enrich beneficiaries with normalized table data for filtering
      const enrichedBeneficiaries = await Promise.all(
        beneficiaries.map(async (beneficiary) => {
          // Convert to plain object to allow modifications
          const beneficiaryData = beneficiary.toJSON ? beneficiary.toJSON() : beneficiary;
          
          // If JSONB fields are empty or null, populate them from normalized tables
          const hasLegacyPaymentMethods = beneficiaryData.paymentMethods && 
            (beneficiaryData.paymentMethods.mymoolah || 
             (Array.isArray(beneficiaryData.paymentMethods.bankAccounts) && beneficiaryData.paymentMethods.bankAccounts.length > 0));
          
          if (!hasLegacyPaymentMethods) {
            const paymentMethods = await BeneficiaryPaymentMethod.findAll({
              where: { beneficiaryId: beneficiaryData.id, isActive: true }
            });
            if (paymentMethods.length > 0) {
              // Populate JSONB from normalized data
              beneficiaryData.paymentMethods = this.normalizedToLegacyPaymentMethods(paymentMethods);
              console.log(`[Beneficiary Enrichment] Populated paymentMethods for beneficiary ${beneficiaryData.id} (${beneficiaryData.name}) from normalized tables`);
            }
          }
          
          const hasLegacyServices = (beneficiaryData.vasServices && 
            ((Array.isArray(beneficiaryData.vasServices.airtime) && beneficiaryData.vasServices.airtime.length > 0) ||
             (Array.isArray(beneficiaryData.vasServices.data) && beneficiaryData.vasServices.data.length > 0))) ||
            (beneficiaryData.utilityServices && 
             (Array.isArray(beneficiaryData.utilityServices.electricity) && beneficiaryData.utilityServices.electricity.length > 0));
          
          if (!hasLegacyServices) {
            const serviceAccounts = await BeneficiaryServiceAccount.findAll({
              where: { beneficiaryId: beneficiaryData.id, isActive: true }
            });
            if (serviceAccounts.length > 0) {
              const { vasServices, utilityServices } = this.normalizedToLegacyServiceAccounts(serviceAccounts);
              if (!beneficiaryData.vasServices) beneficiaryData.vasServices = vasServices;
              if (!beneficiaryData.utilityServices) beneficiaryData.utilityServices = utilityServices;
              console.log(`[Beneficiary Enrichment] Populated service accounts for beneficiary ${beneficiaryData.id} (${beneficiaryData.name}) from normalized tables`);
            }
          }
          
          // Merge enriched data back into the model instance
          Object.assign(beneficiary, beneficiaryData);
          
          return beneficiary;
        })
      );

      const filtered = await this.filterBeneficiariesByServiceWithNormalized(enrichedBeneficiaries, serviceType);
      return this.formatBeneficiariesForService(filtered, serviceType);
    } catch (error) {
      console.error('Error getting beneficiaries by service:', error);
      throw error;
    }
  }

  /**
   * Validate MSISDN format (South African mobile numbers)
   * Matches the same validation used in registration/login process
   * Also handles non-MSI identifiers (for electricity, biller accounts, etc.)
   */
  validateMsisdn(msisdn) {
    if (!msisdn || typeof msisdn !== 'string') {
      throw new Error('Identifier is required');
    }

    // Handle non-MSI identifiers (for electricity, biller, etc.)
    if (msisdn.startsWith('NON_MSI_')) {
      // Return as-is for non-MSI identifiers
      return msisdn;
    }

    // Remove all non-digit characters
    const cleanNumber = msisdn.replace(/\D/g, '');
    
    // Check if it's a valid SA mobile number
    // Accepts 0XXXXXXXXX, 27XXXXXXXXX, or XXXXXXXX (we'll normalize to 0XXXXXXXXX)
    const saMobileRegex = /^(?:27|0)?[6-8]\d{8}$/;
    
    if (!saMobileRegex.test(cleanNumber)) {
      throw new Error('Invalid South African mobile number format');
    }

    // Format to standard SA format (0821234567)
    let formattedNumber;
    if (cleanNumber.startsWith('27')) {
      formattedNumber = '0' + cleanNumber.substring(2);
    } else {
      formattedNumber = cleanNumber;
    }

    // Additional validation checks
    if (formattedNumber.length !== 10) {
      throw new Error('Mobile number must be 10 digits (including leading 0)');
    }

    if (!formattedNumber.startsWith('0')) {
      throw new Error('Mobile number must start with 0');
    }

    const prefix = formattedNumber.substring(1, 2);
    if (!['6', '7', '8'].includes(prefix)) {
      throw new Error('Mobile number must start with 06, 07, or 08');
    }

    return formattedNumber; // Return formatted number for consistency
  }

  // Note: Removed checkMsisdnExists function as it's no longer needed
  // We now only check user-scoped uniqueness, not global uniqueness

  /**
   * Check if user already has a beneficiary with this MSISDN
   */
  async checkUserMsisdnExists(userId, msisdn, excludeBeneficiaryId = null) {
    try {
      const whereClause = { userId, msisdn };
      if (excludeBeneficiaryId) {
        whereClause.id = { [Op.ne]: excludeBeneficiaryId };
      }
      
      const existingBeneficiary = await Beneficiary.findOne({ where: whereClause });
      return existingBeneficiary;
    } catch (error) {
      console.error('Error checking user MSISDN existence:', error);
      throw error;
    }
  }

  /**
   * Format beneficiaries for specific service pages
   */
  formatBeneficiariesForService(beneficiaries, serviceType) {
    return beneficiaries.map(beneficiary => {
      const base = {
        id: beneficiary.id,
        name: beneficiary.name,
        userId: beneficiary.userId,
        msisdn: beneficiary.msisdn,
        identifier: beneficiary.identifier,
        accountType: beneficiary.accountType,
        bankName: beneficiary.bankName,
        createdAt: beneficiary.createdAt,
        updatedAt: beneficiary.updatedAt,
        lastPaidAt: beneficiary.lastPaidAt,
        timesPaid: beneficiary.timesPaid,
        isFavorite: beneficiary.isFavorite,
        notes: beneficiary.notes,
        preferredPaymentMethod: beneficiary.preferredPaymentMethod
      };

      switch (serviceType) {
        case 'payment':
          return {
            ...base,
            paymentMethods: beneficiary.paymentMethods,
            // Legacy compatibility
            accountType: this.getLegacyAccountType(beneficiary.paymentMethods, beneficiary.accountType),
            identifier: this.getPrimaryIdentifier(beneficiary.paymentMethods, base),
            bankName: this.getBankName(beneficiary.paymentMethods, beneficiary.bankName)
          };
          
        case 'airtime-data':
          return {
            ...base,
            vasServices: beneficiary.vasServices,
            // Legacy compatibility
            accountType: this.getVasAccountType(beneficiary.vasServices, beneficiary.accountType),
            identifier: this.getVasIdentifier(beneficiary.vasServices, base.identifier)
          };
          
        case 'electricity':
          return {
            ...base,
            utilityServices: beneficiary.utilityServices,
            // Legacy compatibility
            accountType: 'electricity',
            identifier: this.getUtilityIdentifier(beneficiary.utilityServices, base.identifier)
          };
          
        case 'biller':
          return {
            ...base,
            billerServices: beneficiary.billerServices,
            // Legacy compatibility
            accountType: 'biller',
            identifier: this.getBillerIdentifier(beneficiary.billerServices, base.identifier)
          };
          
        default:
          return base;
      }
    });
  }

  /**
   * Create or update a unified beneficiary
   */
  async createOrUpdateBeneficiary(userId, data) {
    try {
      const {
        name,
        msisdn, // primary party MSISDN (optional - will derive from serviceData if not provided)
        serviceType,
        serviceData,
        isFavorite = false,
        notes = null
      } = data;

      if (!name) {
        throw new Error('Beneficiary name is required');
      }

      // For bank accounts, always use NON_MSI_ identifier
      let primaryMsisdn;
      if (serviceType === 'bank') {
        // Always generate NON_MSI_ identifier for bank accounts
        primaryMsisdn = `NON_MSI_${userId}_${name.toLowerCase().replace(/\s+/g, '_')}`;
      } else {
        // For non-bank services, derive MSISDN from msisdn parameter or serviceData
        primaryMsisdn = msisdn;
        if (!primaryMsisdn) {
          // Try to extract from serviceData
          if (serviceData?.walletMsisdn) {
            primaryMsisdn = serviceData.walletMsisdn;
          } else if (serviceData?.msisdn) {
            primaryMsisdn = serviceData.msisdn;
          } else if (serviceData?.mobileNumber) {
            primaryMsisdn = serviceData.mobileNumber;
          }
          // For non-MSI services (electricity, biller), use a placeholder or generate from name
          if (!primaryMsisdn && (serviceType === 'electricity' || serviceType === 'biller')) {
            // Generate a stable identifier from name for non-MSI services
            primaryMsisdn = `NON_MSI_${userId}_${name.toLowerCase().replace(/\s+/g, '_')}`;
          }
        }

        // MSISDN is required for non-bank services (except electricity/biller which use NON_MSI_)
        if (!primaryMsisdn && serviceType !== 'electricity' && serviceType !== 'biller') {
          throw new Error('MSISDN is required. Provide msisdn or ensure serviceData contains walletMsisdn/msisdn/mobileNumber');
        }
      }

      // 1) Resolve / create the party-level beneficiary (one per user + msisdn)
      const legacyFields = this.getLegacyFieldValues(serviceType, serviceData, primaryMsisdn);

      const beneficiary = await this.ensureBeneficiaryForParty(userId, {
        name,
        msisdn: primaryMsisdn,
        isFavorite,
        notes,
        preferredServiceType: serviceType,
        legacyFields
      });

      // Ensure legacy columns (identifier/accountType/bankName) stay populated
      await this.ensureLegacyColumns(beneficiary, {
        serviceType,
        serviceData,
        primaryMsisdn
      });

      // 2) Persist the concrete method / service in the new normalized tables
      if (serviceType === 'mymoolah' || serviceType === 'bank' || serviceType === 'mobile_money') {
        await this.addOrUpdatePaymentMethod(userId, {
          beneficiaryId: beneficiary.id,
          serviceType,
          serviceData
        });
      } else {
        await this.addOrUpdateServiceAccount(userId, {
          beneficiaryId: beneficiary.id,
          serviceType,
          serviceData
        });
      }

      // 3) Backwards‑compatibility: mirror into legacy JSONB fields so existing
      //    code that reads Beneficiary.paymentMethods / vasServices still works.
      await this.addServiceToBeneficiary(beneficiary, serviceType, serviceData);

      return beneficiary;
    } catch (error) {
      console.error('Error creating/updating beneficiary:', error);
      throw error;
    }
  }

  getLegacyFieldValues(serviceType, serviceData = {}, primaryMsisdn) {
    try {
      switch (serviceType) {
        case 'mymoolah':
          return {
            identifier: this.validateMsisdn(primaryMsisdn),
            accountType: 'mymoolah'
          };
        case 'bank':
          return {
            identifier: serviceData.accountNumber || primaryMsisdn,
            accountType: 'bank',
            bankName: serviceData.bankName || null
          };
        case 'airtime':
        case 'data':
          return {
            identifier: this.validateMsisdn(serviceData.msisdn || serviceData.mobileNumber || primaryMsisdn),
            accountType: serviceType
          };
        case 'electricity':
          return {
            identifier: serviceData.meterNumber || primaryMsisdn,
            accountType: 'electricity'
          };
        case 'biller':
          return {
            identifier: serviceData.accountNumber || primaryMsisdn,
            accountType: 'biller'
          };
        default:
          return {
            identifier: this.validateMsisdn(primaryMsisdn),
            accountType: serviceType || 'mymoolah'
          };
      }
    } catch (error) {
      // Fallback: ensure we always return valid values
      console.warn('Error in getLegacyFieldValues, using fallback:', error.message);
      return {
        identifier: primaryMsisdn || 'UNKNOWN',
        accountType: serviceType || 'mymoolah'
      };
    }
  }

  /**
   * Ensure legacy columns (identifier, accountType, bankName) are populated
   * This is a safety net in case they weren't set during creation
   */
  async ensureLegacyColumns(beneficiary, { serviceType, serviceData = {}, primaryMsisdn }) {
    try {
      const needsUpdate = !beneficiary.identifier || !beneficiary.accountType;
      if (!needsUpdate) {
        return beneficiary; // Already set
      }

      const legacyFields = this.getLegacyFieldValues(serviceType, serviceData, primaryMsisdn);
      const updates = {};

      if (!beneficiary.identifier && legacyFields.identifier) {
        updates.identifier = legacyFields.identifier;
      }
      if (!beneficiary.accountType && legacyFields.accountType) {
        updates.accountType = legacyFields.accountType;
      }
      if (!beneficiary.bankName && legacyFields.bankName) {
        updates.bankName = legacyFields.bankName;
      }

      if (Object.keys(updates).length > 0) {
        await beneficiary.update(updates);
      }

      return beneficiary;
    } catch (error) {
      console.error('Error ensuring legacy columns:', error);
      // Don't throw - this is a safety net, not critical
      return beneficiary;
    }
  }

  /**
   * Add a new service to an existing beneficiary
   */
  async addServiceToBeneficiary(beneficiary, serviceType, serviceData) {
    try {
      const serviceField = this.getServiceField(serviceType);
      const currentServices = beneficiary[serviceField] || {};
      
      // Merge new service data
      const updatedServices = this.mergeServiceData(currentServices, serviceType, serviceData);
      
      await beneficiary.update({
        [serviceField]: updatedServices,
        preferredPaymentMethod: serviceType,
        updatedAt: new Date()
      });

      return beneficiary;
    } catch (error) {
      console.error('Error adding service to beneficiary:', error);
      throw error;
    }
  }

  /**
   * Remove a service from a beneficiary
   */
  async removeServiceFromBeneficiary(beneficiaryId, serviceType, serviceId) {
    try {
      const beneficiary = await Beneficiary.findByPk(beneficiaryId);
      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      const serviceField = this.getServiceField(serviceType);
      const currentServices = beneficiary[serviceField] || {};
      
      // Remove the specific service
      const updatedServices = this.removeServiceData(currentServices, serviceType, serviceId);
      
      // If no services left, remove the entire service field
      const updateData = {};
      if (Object.keys(updatedServices).length === 0) {
        updateData[serviceField] = null;
      } else {
        updateData[serviceField] = updatedServices;
      }

      await beneficiary.update(updateData);
      return beneficiary;
    } catch (error) {
      console.error('Error removing service from beneficiary:', error);
      throw error;
    }
  }

  /**
   * Get all services for a specific beneficiary
   */
  async getBeneficiaryServices(beneficiaryId) {
    try {
      const beneficiary = await Beneficiary.findByPk(beneficiaryId);
      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      return {
        id: beneficiary.id,
        name: beneficiary.name,
        paymentMethods: beneficiary.paymentMethods,
        vasServices: beneficiary.vasServices,
        utilityServices: beneficiary.utilityServices,
        billerServices: beneficiary.billerServices,
        voucherServices: beneficiary.voucherServices,
        preferredPaymentMethod: beneficiary.preferredPaymentMethod,
        isFavorite: beneficiary.isFavorite,
        notes: beneficiary.notes
      };
    } catch (error) {
      console.error('Error getting beneficiary services:', error);
      throw error;
    }
  }

  // ------------------------------------------------------------------------
  // NEW MODEL: PARTY-LEVEL BENEFICIARY + NORMALIZED PAYMENT / SERVICE ROWS
  // ------------------------------------------------------------------------

  /**
   * Ensure there is exactly one beneficiary record for this user + msisdn.
   * If it exists, update name / flags; otherwise create it.
   */
  async ensureBeneficiaryForParty(userId, { name, msisdn, isFavorite = false, notes = null, preferredServiceType, legacyFields = {} }) {
    const tx = await sequelize.transaction();
    try {
      const formattedMsisdn = this.validateMsisdn(msisdn);
      
      // Ensure legacyFields is always an object with valid values
      const safeLegacyFields = legacyFields || {};
      const identifier = safeLegacyFields.identifier || formattedMsisdn || 'UNKNOWN';
      const accountType = safeLegacyFields.accountType || preferredServiceType || 'mymoolah';

      // Look up by (userId, msisdn). This aligns with the unique index on beneficiaries.
      let beneficiary = await Beneficiary.findOne({
        where: { userId, msisdn: formattedMsisdn },
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });

      if (!beneficiary) {
        // No existing party for this MSISDN → create new beneficiary (party)
        // CRITICAL: Ensure identifier and accountType are never null (database constraint)
        if (!identifier || identifier === 'UNKNOWN') {
          throw new Error(`Invalid identifier for beneficiary creation: ${identifier}. MSISDN: ${formattedMsisdn}, PreferredServiceType: ${preferredServiceType}`);
        }
        if (!accountType) {
          throw new Error(`Invalid accountType for beneficiary creation: ${accountType}. PreferredServiceType: ${preferredServiceType}`);
        }
        
        beneficiary = await Beneficiary.create(
          {
            userId,
            name,
            msisdn: formattedMsisdn,
            isFavorite,
            notes,
            preferredPaymentMethod: preferredServiceType || null,
            identifier: identifier,
            accountType: accountType,
            bankName: safeLegacyFields.bankName || null
          },
          { transaction: tx }
        );
      } else {
        // Update display fields if they have changed (non‑destructive)
        const updates = {};
        if (name && beneficiary.name !== name) updates.name = name;
        if (typeof isFavorite === 'boolean' && beneficiary.isFavorite !== isFavorite) {
          updates.isFavorite = isFavorite;
        }
        if (typeof notes === 'string' && notes !== beneficiary.notes) {
          updates.notes = notes;
        }
        if (preferredServiceType && beneficiary.preferredPaymentMethod !== preferredServiceType) {
          updates.preferredPaymentMethod = preferredServiceType;
        }
        // CRITICAL: Always ensure identifier/accountType are set (required fields)
        if (!beneficiary.identifier) {
          updates.identifier = identifier;
        }
        if (!beneficiary.accountType) {
          updates.accountType = accountType;
        }
        if (!beneficiary.bankName && safeLegacyFields.bankName) {
          updates.bankName = safeLegacyFields.bankName;
        }
        if (Object.keys(updates).length > 0) {
          await beneficiary.update(updates, { transaction: tx });
        }
      }

      await tx.commit();
      return beneficiary;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /**
   * Add or update a payment method for a beneficiary.
   * - Supports multiple methods per beneficiary (e.g. multiple bank accounts).
   * - If isDefault is true, clears other defaults for the same methodType.
   */
  async addOrUpdatePaymentMethod(userId, { beneficiaryId, serviceType, serviceData }) {
    if (!beneficiaryId) {
      throw new Error('beneficiaryId is required to add a payment method');
    }

    const { methodType, walletMsisdn, bankName, accountNumber, accountType, branchCode, provider, mobileMoneyId, isDefault } =
      this.normalizePaymentServiceData(serviceType, serviceData);

    const tx = await sequelize.transaction();
    try {
      // Ensure the beneficiary belongs to this user
      const beneficiary = await Beneficiary.findOne({
        where: { id: beneficiaryId, userId },
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });
      if (!beneficiary) {
        throw new Error('Beneficiary not found for current user');
      }

      // If this should become the default, clear existing defaults for same methodType
      if (isDefault) {
        await BeneficiaryPaymentMethod.update(
          { isDefault: false },
          {
            where: { beneficiaryId, methodType },
            transaction: tx
          }
        );
      }

      // Try to find an existing method by (beneficiary, methodType, accountNumber/walletMsisdn/mobileMoneyId)
      const primaryKeyValue = accountNumber || walletMsisdn || mobileMoneyId;
      let existing = null;
      if (primaryKeyValue) {
        existing = await BeneficiaryPaymentMethod.findOne({
          where: {
            beneficiaryId,
            methodType,
            [Op.or]: [
              { accountNumber: primaryKeyValue },
              { walletMsisdn: primaryKeyValue },
              { mobileMoneyId: primaryKeyValue }
            ]
          },
          transaction: tx,
          lock: tx.LOCK.UPDATE
        });
      }

      if (existing) {
        await existing.update(
          {
            walletMsisdn,
            bankName,
            accountNumber,
            accountType,
            branchCode,
            provider,
            mobileMoneyId,
            isActive: true,
            isDefault: isDefault ?? existing.isDefault
          },
          { transaction: tx }
        );
      } else {
        await BeneficiaryPaymentMethod.create(
          {
            beneficiaryId,
            methodType,
            walletMsisdn,
            bankName,
            accountNumber,
            accountType,
            branchCode,
            provider,
            mobileMoneyId,
            isActive: true,
            isDefault: !!isDefault
          },
          { transaction: tx }
        );
      }

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /**
   * Add or update a service account (VAS, electricity, biller, etc.) for a beneficiary.
   * Supports multiple accounts per serviceType and default selection.
   */
  async addOrUpdateServiceAccount(userId, { beneficiaryId, serviceType, serviceData }) {
    if (!beneficiaryId) {
      throw new Error('beneficiaryId is required to add a service account');
    }

    const normalized = this.normalizeServiceAccountData(serviceType, serviceData);
    const { serviceType: normalizedType, serviceData: normalizedData, isDefault } = normalized;

    const tx = await sequelize.transaction();
    try {
      const beneficiary = await Beneficiary.findOne({
        where: { id: beneficiaryId, userId },
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });
      if (!beneficiary) {
        throw new Error('Beneficiary not found for current user');
      }

      if (isDefault) {
        await BeneficiaryServiceAccount.update(
          { isDefault: false },
          {
            where: { beneficiaryId, serviceType: normalizedType },
            transaction: tx
          }
        );
      }

      const identifierKey = this.getServiceIdentifierKey(normalizedType);
      const identifierValue = normalizedData[identifierKey];

      let existing = null;
      if (identifierKey && identifierValue) {
        existing = await BeneficiaryServiceAccount.findOne({
          where: {
            beneficiaryId,
            serviceType: normalizedType,
            serviceData: {
              [identifierKey]: identifierValue
            }
          },
          transaction: tx,
          lock: tx.LOCK.UPDATE
        });
      }

      if (existing) {
        await existing.update(
          {
            serviceData: normalizedData,
            isActive: true,
            isDefault: isDefault ?? existing.isDefault
          },
          { transaction: tx }
        );
      } else {
        await BeneficiaryServiceAccount.create(
          {
            beneficiaryId,
            serviceType: normalizedType,
            serviceData: normalizedData,
            isActive: true,
            isDefault: !!isDefault
          },
          { transaction: tx }
        );
      }

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /**
   * Normalize payment method input coming from various flows into the canonical
   * fields on BeneficiaryPaymentMethod.
   */
  normalizePaymentServiceData(serviceType, serviceData = {}) {
    const methodType = serviceType; // for now we align names

    const normalized = {
      methodType,
      walletMsisdn: null,
      bankName: null,
      accountNumber: null,
      accountType: null,
      branchCode: null,
      provider: null,
      mobileMoneyId: null,
      isDefault: !!serviceData.isDefault
    };

    if (methodType === 'mymoolah') {
      normalized.walletMsisdn = serviceData.walletMsisdn || serviceData.walletId || serviceData.mobileNumber || null;
    } else if (methodType === 'bank') {
      normalized.bankName = serviceData.bankName || null;
      normalized.accountNumber = serviceData.accountNumber || null;
      normalized.accountType = serviceData.accountType || null;
      normalized.branchCode = serviceData.branchCode || null;
    } else if (methodType === 'mobile_money') {
      normalized.provider = serviceData.provider || null;
      normalized.mobileMoneyId = serviceData.mobileMoneyId || serviceData.walletId || serviceData.msisdn || null;
    }

    return normalized;
  }

  /**
   * Normalize service account data into a canonical JSON structure.
   */
  normalizeServiceAccountData(serviceType, serviceData = {}) {
    const base = {
      serviceType,
      serviceData: { ...serviceData },
      isDefault: !!serviceData.isDefault
    };

    switch (serviceType) {
      case 'airtime':
      case 'data':
        base.serviceData = {
          msisdn: serviceData.msisdn || serviceData.mobileNumber || null,
          network: serviceData.network || null,
          label: serviceData.label || null
        };
        break;
      case 'electricity':
        base.serviceData = {
          meterNumber: serviceData.meterNumber || null,
          meterType: serviceData.meterType || null,
          provider: serviceData.provider || null,
          label: serviceData.label || null
        };
        break;
      case 'biller':
        base.serviceData = {
          accountNumber: serviceData.accountNumber || null,
          billerName: serviceData.billerName || null,
          category: serviceData.category || serviceData.billerCategory || null,
          reference: serviceData.reference || null,
          label: serviceData.label || null
        };
        break;
      default:
        // Leave as‑is for future types
        break;
    }

    return base;
  }

  /**
   * Determine the primary identifier key for a given service type.
   * This is used when de‑duplicating service accounts.
   */
  getServiceIdentifierKey(serviceType) {
    switch (serviceType) {
      case 'airtime':
      case 'data':
        return 'msisdn';
      case 'electricity':
        return 'meterNumber';
      case 'biller':
        return 'accountNumber';
      default:
        return null;
    }
  }

  // Helper methods
  getServiceField(serviceType) {
    const serviceMap = {
      'mymoolah': 'paymentMethods',
      'bank': 'paymentMethods',
      'airtime': 'vasServices',
      'data': 'vasServices',
      'electricity': 'utilityServices',
      'water': 'utilityServices',
      'biller': 'billerServices',
      'voucher': 'voucherServices'
    };
    return serviceMap[serviceType];
  }

  mapServiceTypeToLegacy(serviceType) {
    const legacyMap = {
      'mymoolah': 'mymoolah',
      'bank': 'bank',
      'airtime': 'airtime',
      'data': 'data',
      'electricity': 'electricity',
      'water': 'electricity',
      'biller': 'biller',
      'voucher': 'biller'
    };
    return legacyMap[serviceType];
  }

  getIdentifierFromServiceData(serviceType, serviceData) {
    switch (serviceType) {
      case 'mymoolah':
        return serviceData.walletId;
      case 'bank':
        return serviceData.accountNumber;
      case 'airtime':
      case 'data':
        return serviceData.mobileNumber;
      case 'electricity':
      case 'water':
        return serviceData.meterNumber;
      case 'biller':
        return serviceData.accountNumber;
      case 'voucher':
        return serviceData.accountId;
      default:
        return null;
    }
  }

  mergeServiceData(currentServices, serviceType, newServiceData) {
    switch (serviceType) {
      case 'mymoolah':
        return { ...currentServices, mymoolah: newServiceData };
      case 'bank':
        const bankAccounts = currentServices.bankAccounts || [];
        return { ...currentServices, bankAccounts: [...bankAccounts, newServiceData] };
      case 'airtime':
      case 'data':
        const services = currentServices[serviceType] || [];
        return { ...currentServices, [serviceType]: [...services, newServiceData] };
      case 'electricity':
      case 'water':
        const utilityServices = currentServices[serviceType] || [];
        return { ...currentServices, [serviceType]: [...utilityServices, newServiceData] };
      case 'biller':
        const accounts = currentServices.accounts || [];
        return { ...currentServices, accounts: [...accounts, newServiceData] };
      case 'voucher':
        const voucherType = newServiceData.type || 'gaming';
        const voucherServices = currentServices[voucherType] || [];
        return { ...currentServices, [voucherType]: [...voucherServices, newServiceData] };
      default:
        return currentServices;
    }
  }

  removeServiceData(currentServices, serviceType, serviceId) {
    switch (serviceType) {
      case 'mymoolah':
        const { mymoolah, ...rest } = currentServices;
        return rest;
      case 'bank':
        return {
          ...currentServices,
          bankAccounts: (currentServices.bankAccounts || []).filter(acc => acc.id !== serviceId)
        };
      case 'airtime':
      case 'data':
        return {
          ...currentServices,
          [serviceType]: (currentServices[serviceType] || []).filter(service => service.id !== serviceId)
        };
      case 'electricity':
      case 'water':
        return {
          ...currentServices,
          [serviceType]: (currentServices[serviceType] || []).filter(service => service.id !== serviceId)
        };
      case 'biller':
        return {
          ...currentServices,
          accounts: (currentServices.accounts || []).filter(acc => acc.id !== serviceId)
        };
      case 'voucher':
        const voucherType = 'gaming'; // Default, could be enhanced
        return {
          ...currentServices,
          [voucherType]: (currentServices[voucherType] || []).filter(service => service.id !== serviceId)
        };
      default:
        return currentServices;
    }
  }

  // Legacy compatibility helpers
  getLegacyAccountType(paymentMethods, fallback) {
    if (paymentMethods?.mymoolah) return 'mymoolah';
    if (paymentMethods?.bankAccounts?.length > 0) return 'bank';
    if (fallback && ['mymoolah', 'bank'].includes(fallback)) {
      return fallback;
    }
    return 'mymoolah';
  }

  getPrimaryIdentifier(paymentMethods, fallback = {}) {
    if (paymentMethods?.mymoolah?.walletId) return paymentMethods.mymoolah.walletId;
    if (paymentMethods?.mymoolah?.walletMsisdn) return paymentMethods.mymoolah.walletMsisdn;
    if (paymentMethods?.bankAccounts?.length > 0) return paymentMethods.bankAccounts[0].accountNumber;
    return fallback.identifier || fallback.msisdn || null;
  }

  getBankName(paymentMethods, fallback) {
    if (paymentMethods?.bankAccounts?.length > 0) return paymentMethods.bankAccounts[0].bankName;
    return fallback || null;
  }

  getVasAccountType(vasServices, fallback) {
    if (vasServices?.airtime?.length > 0) return 'airtime';
    if (vasServices?.data?.length > 0) return 'data';
    if (fallback && ['airtime', 'data'].includes(fallback)) return fallback;
    return 'airtime';
  }

  getVasIdentifier(vasServices, fallback) {
    if (vasServices?.airtime?.length > 0) return vasServices.airtime[0].mobileNumber;
    if (vasServices?.data?.length > 0) return vasServices.data[0].mobileNumber;
    return fallback || null;
  }

  getUtilityIdentifier(utilityServices, fallback) {
    if (utilityServices?.electricity?.length > 0) return utilityServices.electricity[0].meterNumber;
    if (utilityServices?.water?.length > 0) return utilityServices.water[0].accountNumber;
    return fallback || null;
  }

  getBillerIdentifier(billerServices, fallback) {
    if (billerServices?.accounts?.length > 0) return billerServices.accounts[0].accountNumber;
    return fallback || null;
  }

  /**
   * Convert normalized payment methods to legacy JSONB format
   */
  normalizedToLegacyPaymentMethods(paymentMethods) {
    const legacy = {};
    
    paymentMethods.forEach((method) => {
      if (method.methodType === 'mymoolah') {
        legacy.mymoolah = {
          walletId: method.walletMsisdn || method.walletId,
          walletMsisdn: method.walletMsisdn,
          isActive: method.isActive,
          isDefault: method.isDefault
        };
      } else if (method.methodType === 'bank') {
        if (!legacy.bankAccounts) legacy.bankAccounts = [];
        legacy.bankAccounts.push({
          accountNumber: method.accountNumber,
          bankName: method.bankName,
          accountType: method.accountType || 'cheque',
          branchCode: method.branchCode,
          isActive: method.isActive,
          isDefault: method.isDefault
        });
      } else if (method.methodType === 'mobile_money') {
        if (!legacy.mobileMoney) legacy.mobileMoney = [];
        legacy.mobileMoney.push({
          mobileMoneyId: method.mobileMoneyId,
          provider: method.provider,
          isActive: method.isActive,
          isDefault: method.isDefault
        });
      }
    });
    
    return legacy;
  }

  /**
   * Convert normalized service accounts to legacy JSONB format
   */
  normalizedToLegacyServiceAccounts(serviceAccounts) {
    const vasServices = {};
    const utilityServices = {};
    
    serviceAccounts.forEach((account) => {
      const serviceData = account.serviceData || {};
      
      if (account.serviceType === 'airtime') {
        if (!vasServices.airtime) vasServices.airtime = [];
        vasServices.airtime.push({
          mobileNumber: serviceData.msisdn || serviceData.mobileNumber,
          msisdn: serviceData.msisdn || serviceData.mobileNumber,
          network: serviceData.network,
          isActive: account.isActive,
          isDefault: account.isDefault,
          ...serviceData
        });
      } else if (account.serviceType === 'data') {
        if (!vasServices.data) vasServices.data = [];
        vasServices.data.push({
          mobileNumber: serviceData.msisdn || serviceData.mobileNumber,
          msisdn: serviceData.msisdn || serviceData.mobileNumber,
          network: serviceData.network,
          isActive: account.isActive,
          isDefault: account.isDefault,
          ...serviceData
        });
      } else if (account.serviceType === 'electricity') {
        if (!utilityServices.electricity) utilityServices.electricity = [];
        utilityServices.electricity.push({
          meterNumber: serviceData.meterNumber,
          meterType: serviceData.meterType,
          provider: serviceData.provider,
          isActive: account.isActive,
          isDefault: account.isDefault,
          ...serviceData
        });
      }
    });
    
    return { vasServices, utilityServices };
  }

  /**
   * Filter beneficiaries by service type, also checking normalized tables
   */
  async filterBeneficiariesByServiceWithNormalized(beneficiaries, serviceType) {
    const filtered = [];
    
    for (const beneficiary of beneficiaries) {
      const beneficiaryData = beneficiary.toJSON ? beneficiary.toJSON() : beneficiary;
      const hasLegacyType = (types = []) => types.includes(beneficiaryData.accountType);
      let shouldInclude = false;
      
      switch (serviceType) {
        case 'payment':
          // Check JSONB first
          shouldInclude = Boolean(
            beneficiaryData.paymentMethods?.mymoolah ||
            (beneficiaryData.paymentMethods?.bankAccounts || []).length ||
            hasLegacyType(['mymoolah', 'bank'])
          );
          
          // If not found in JSONB, check normalized tables
          if (!shouldInclude) {
            const paymentMethods = await BeneficiaryPaymentMethod.findAll({
              where: { 
                beneficiaryId: beneficiaryData.id, 
                isActive: true,
                methodType: { [Op.in]: ['mymoolah', 'bank'] }
              }
            });
            shouldInclude = paymentMethods.length > 0;
            if (shouldInclude) {
              console.log(`[Filter] Beneficiary ${beneficiaryData.id} (${beneficiaryData.name}) included in payment list via normalized table`);
            }
          }
          
          // Fallback: If beneficiary has msisdn (not NON_MSI_) and accountType is not electricity/biller, include as payment
          if (!shouldInclude && beneficiaryData.msisdn && 
              !beneficiaryData.msisdn.startsWith('NON_MSI_') &&
              beneficiaryData.accountType !== 'electricity' && 
              beneficiaryData.accountType !== 'biller' &&
              beneficiaryData.accountType !== 'voucher') {
            // Likely a payment beneficiary (MyMoolah wallet) created before unified system
            shouldInclude = true;
            console.log(`[Filter] Beneficiary ${beneficiaryData.id} (${beneficiaryData.name}) included in payment list via fallback (msisdn: ${beneficiaryData.msisdn})`);
          }
          break;
          
        case 'airtime-data':
          // Check JSONB first
          shouldInclude = Boolean(
            (beneficiaryData.vasServices?.airtime || []).length ||
            (beneficiaryData.vasServices?.data || []).length ||
            hasLegacyType(['airtime', 'data'])
          );
          
          // If not found in JSONB, check normalized tables
          if (!shouldInclude) {
            const serviceAccounts = await BeneficiaryServiceAccount.findAll({
              where: { 
                beneficiaryId: beneficiaryData.id, 
                isActive: true,
                serviceType: { [Op.in]: ['airtime', 'data'] }
              }
            });
            shouldInclude = serviceAccounts.length > 0;
            if (shouldInclude) {
              console.log(`[Filter] Beneficiary ${beneficiaryData.id} (${beneficiaryData.name}) included in airtime-data list via normalized table`);
            }
          }
          
          // Fallback: If beneficiary has MyMoolah wallet (payment method), they can receive airtime/data
          // Check normalized payment methods
          if (!shouldInclude) {
            const paymentMethods = await BeneficiaryPaymentMethod.findAll({
              where: { 
                beneficiaryId: beneficiaryData.id, 
                isActive: true,
                methodType: 'mymoolah'
              }
            });
            shouldInclude = paymentMethods.length > 0;
            if (shouldInclude) {
              console.log(`[Filter] Beneficiary ${beneficiaryData.id} (${beneficiaryData.name}) included in airtime-data list via MyMoolah wallet fallback`);
            }
          }
          
          // Also check JSONB for MyMoolah payment method
          if (!shouldInclude && beneficiaryData.paymentMethods?.mymoolah) {
            shouldInclude = true;
            console.log(`[Filter] Beneficiary ${beneficiaryData.id} (${beneficiaryData.name}) included in airtime-data list via MyMoolah wallet (JSONB)`);
          }
          
          // Final fallback: If beneficiary has msisdn (MyMoolah wallet number) and accountType is mymoolah
          if (!shouldInclude && beneficiaryData.msisdn && 
              !beneficiaryData.msisdn.startsWith('NON_MSI_') &&
              (beneficiaryData.accountType === 'mymoolah' || !beneficiaryData.accountType)) {
            // Likely a MyMoolah wallet beneficiary that can receive airtime/data
            shouldInclude = true;
            console.log(`[Filter] Beneficiary ${beneficiaryData.id} (${beneficiaryData.name}) included in airtime-data list via msisdn fallback (${beneficiaryData.msisdn})`);
          }
          break;
          
        case 'electricity':
          shouldInclude = Boolean(
            (beneficiaryData.utilityServices?.electricity || []).length ||
            (beneficiaryData.utilityServices?.water || []).length ||
            beneficiaryData.accountType === 'electricity'
          );
          
          // If not found in JSONB, check normalized tables
          if (!shouldInclude) {
            const serviceAccounts = await BeneficiaryServiceAccount.findAll({
              where: { 
                beneficiaryId: beneficiaryData.id, 
                isActive: true,
                serviceType: 'electricity'
              }
            });
            shouldInclude = serviceAccounts.length > 0;
          }
          break;
          
        case 'biller':
          shouldInclude = Boolean(
            (beneficiaryData.billerServices?.accounts || []).length ||
            beneficiaryData.accountType === 'biller'
          );
          break;
          
        case 'voucher':
          shouldInclude = Boolean(
            beneficiaryData.voucherServices ||
            beneficiaryData.accountType === 'voucher'
          );
          break;
          
        default:
          shouldInclude = true;
      }
      
      if (shouldInclude) {
        filtered.push(beneficiary);
      }
    }
    
    return filtered;
  }

  filterBeneficiariesByService(beneficiaries, serviceType) {
    return beneficiaries.filter((beneficiary) => {
      const hasLegacyType = (types = []) => types.includes(beneficiary.accountType);
      switch (serviceType) {
        case 'payment':
          // ONLY return beneficiaries with payment methods (mymoolah or bank)
          // Do NOT include electricity, biller, or other service-only beneficiaries
          return Boolean(
            beneficiary.paymentMethods?.mymoolah ||
            (beneficiary.paymentMethods?.bankAccounts || []).length ||
            hasLegacyType(['mymoolah', 'bank'])
          );
        case 'airtime-data':
          return Boolean(
            (beneficiary.vasServices?.airtime || []).length ||
            (beneficiary.vasServices?.data || []).length ||
            hasLegacyType(['airtime', 'data'])
          );
        case 'electricity':
          return Boolean(
            (beneficiary.utilityServices?.electricity || []).length ||
            (beneficiary.utilityServices?.water || []).length ||
            beneficiary.accountType === 'electricity'
          );
        case 'biller':
          return Boolean(
            (beneficiary.billerServices?.accounts || []).length ||
            beneficiary.accountType === 'biller'
          );
        case 'voucher':
          return Boolean(
            beneficiary.voucherServices ||
            beneficiary.accountType === 'voucher'
          );
        default:
          return true;
      }
    });
  }
}

module.exports = UnifiedBeneficiaryService;
