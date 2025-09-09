const { Beneficiary } = require('../models');
const { Op } = require('sequelize');

class UnifiedBeneficiaryService {
  /**
   * Get beneficiaries filtered by service type for specific pages
   */
  async getBeneficiariesByService(userId, serviceType, search = '') {
    try {
      const whereClause = {
        userId,
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { identifier: { [Op.iLike]: `%${search}%` } }
        ]
      };

      // Add service-specific filtering
      switch (serviceType) {
        case 'payment':
          whereClause[Op.or] = [
            { paymentMethods: { [Op.not]: null } },
            { 'paymentMethods.mymoolah': { [Op.not]: null } },
            { 'paymentMethods.bankAccounts': { [Op.not]: null } }
          ];
          break;
          
        case 'airtime-data':
          whereClause[Op.or] = [
            { vasServices: { [Op.not]: null } },
            { 'vasServices.airtime': { [Op.not]: null } },
            { 'vasServices.data': { [Op.not]: null } }
          ];
          break;
          
        case 'electricity':
          whereClause[Op.or] = [
            { utilityServices: { [Op.not]: null } },
            { 'utilityServices.electricity': { [Op.not]: null } }
          ];
          break;
          
        case 'biller':
          whereClause[Op.or] = [
            { billerServices: { [Op.not]: null } },
            { 'billerServices.accounts': { [Op.not]: null } }
          ];
          break;
          
        case 'voucher':
          whereClause[Op.or] = [
            { voucherServices: { [Op.not]: null } },
            { 'voucherServices.gaming': { [Op.not]: null } },
            { 'voucherServices.streaming': { [Op.not]: null } }
          ];
          break;
      }

      const beneficiaries = await Beneficiary.findAll({
        where: whereClause,
        order: [
          ['isFavorite', 'DESC'],
          ['lastPaidAt', 'DESC NULLS LAST'],
          ['timesPaid', 'DESC'],
          ['name', 'ASC']
        ]
      });

      return this.formatBeneficiariesForService(beneficiaries, serviceType);
    } catch (error) {
      console.error('Error getting beneficiaries by service:', error);
      throw error;
    }
  }

  /**
   * Validate MSISDN format (South African mobile numbers)
   * Matches the same validation used in registration/login process
   */
  validateMsisdn(msisdn) {
    if (!msisdn || typeof msisdn !== 'string') {
      throw new Error('Mobile number is required');
    }

    // Remove all non-digit characters
    const cleanNumber = msisdn.replace(/\D/g, '');
    
    // Check if it's a valid SA mobile number
    // SA mobile numbers start with 27 (country code) + 7 or 8 (mobile prefix) + 8 digits
    // Or just 7 or 8 + 8 digits (without country code)
    const saMobileRegex = /^(27)?[78]\d{8}$/;
    
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
            accountType: this.getLegacyAccountType(beneficiary.paymentMethods),
            identifier: this.getPrimaryIdentifier(beneficiary.paymentMethods),
            bankName: this.getBankName(beneficiary.paymentMethods)
          };
          
        case 'airtime-data':
          return {
            ...base,
            vasServices: beneficiary.vasServices,
            // Legacy compatibility
            accountType: this.getVasAccountType(beneficiary.vasServices),
            identifier: this.getVasIdentifier(beneficiary.vasServices)
          };
          
        case 'electricity':
          return {
            ...base,
            utilityServices: beneficiary.utilityServices,
            // Legacy compatibility
            accountType: 'electricity',
            identifier: this.getUtilityIdentifier(beneficiary.utilityServices)
          };
          
        case 'biller':
          return {
            ...base,
            billerServices: beneficiary.billerServices,
            // Legacy compatibility
            accountType: 'biller',
            identifier: this.getBillerIdentifier(beneficiary.billerServices)
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
        msisdn, // NEW: MSISDN field
        serviceType,
        serviceData,
        isFavorite = false,
        notes = null
      } = data;

      // Validate MSISDN format and get formatted version
      const formattedMsisdn = this.validateMsisdn(msisdn);

      // Check if current user already has a beneficiary with this MSISDN
      // (This allows different users to have beneficiaries with same MSISDN)
      const existingUserBeneficiary = await this.checkUserMsisdnExists(userId, msisdn);
      if (existingUserBeneficiary) {
        throw new Error(`You already have a beneficiary with mobile number ${msisdn}`);
      }

      // Note: We allow different users to have beneficiaries with same MSISDN
      // This is correct for banking scenarios where multiple users might pay the same person

      // Check if beneficiary with same name exists for this user
      let beneficiary = await Beneficiary.findOne({
        where: { userId, name }
      });

      if (beneficiary) {
        // Update existing beneficiary with new service
        await this.addServiceToBeneficiary(beneficiary, serviceType, serviceData);
        return beneficiary;
      } else {
        // Create new beneficiary
        const beneficiaryData = {
          userId,
          name,
          msisdn: formattedMsisdn, // Use formatted MSISDN
          isFavorite,
          notes,
          preferredPaymentMethod: serviceType,
          // Legacy fields for backward compatibility
          accountType: this.mapServiceTypeToLegacy(serviceType),
          identifier: this.getIdentifierFromServiceData(serviceType, serviceData),
          bankName: serviceType === 'bank' ? serviceData.bankName : null,
          metadata: {}
        };

        // Add service-specific data
        beneficiaryData[this.getServiceField(serviceType)] = serviceData;

        beneficiary = await Beneficiary.create(beneficiaryData);
        return beneficiary;
      }
    } catch (error) {
      console.error('Error creating/updating beneficiary:', error);
      throw error;
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
  getLegacyAccountType(paymentMethods) {
    if (paymentMethods?.mymoolah) return 'mymoolah';
    if (paymentMethods?.bankAccounts?.length > 0) return 'bank';
    return 'mymoolah';
  }

  getPrimaryIdentifier(paymentMethods) {
    if (paymentMethods?.mymoolah?.walletId) return paymentMethods.mymoolah.walletId;
    if (paymentMethods?.bankAccounts?.length > 0) return paymentMethods.bankAccounts[0].accountNumber;
    return null;
  }

  getBankName(paymentMethods) {
    if (paymentMethods?.bankAccounts?.length > 0) return paymentMethods.bankAccounts[0].bankName;
    return null;
  }

  getVasAccountType(vasServices) {
    if (vasServices?.airtime?.length > 0) return 'airtime';
    if (vasServices?.data?.length > 0) return 'data';
    return 'airtime';
  }

  getVasIdentifier(vasServices) {
    if (vasServices?.airtime?.length > 0) return vasServices.airtime[0].mobileNumber;
    if (vasServices?.data?.length > 0) return vasServices.data[0].mobileNumber;
    return null;
  }

  getUtilityIdentifier(utilityServices) {
    if (utilityServices?.electricity?.length > 0) return utilityServices.electricity[0].meterNumber;
    if (utilityServices?.water?.length > 0) return utilityServices.water[0].accountNumber;
    return null;
  }

  getBillerIdentifier(billerServices) {
    if (billerServices?.accounts?.length > 0) return billerServices.accounts[0].accountNumber;
    return null;
  }
}

module.exports = UnifiedBeneficiaryService;
