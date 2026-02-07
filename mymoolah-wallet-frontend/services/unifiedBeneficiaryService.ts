import { apiClient } from './apiClient';

// ========================================
// UNIFIED BENEFICIARY INTERFACES
// ========================================

export interface BaseBeneficiary {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastPaidAt?: string;
  timesPaid: number;
  isFavorite: boolean;
  notes?: string;
  preferredPaymentMethod?: string;
}

// Payment Methods
export interface PaymentMethods {
  mymoolah?: {
    walletId: string;
    isActive: boolean;
  };
  bankAccounts?: Array<{
    id: string;
    accountNumber: string;
    bankName: string;
    accountType: 'savings' | 'current';
    isActive: boolean;
  }>;
}

export interface PaymentBeneficiary extends BaseBeneficiary {
  paymentMethods: PaymentMethods;
  // Legacy compatibility
  accountType: 'mymoolah' | 'bank';
  identifier: string;
  bankName?: string;
}

// VAS Services
export interface VasServices {
  airtime?: Array<{
    id: string;
    mobileNumber: string;
    network: string;
    isActive: boolean;
  }>;
  data?: Array<{
    id: string;
    mobileNumber: string;
    network: string;
    isActive: boolean;
  }>;
}

export interface VasBeneficiary extends BaseBeneficiary {
  vasServices: VasServices;
  // Legacy compatibility
  accountType: 'airtime' | 'data';
  identifier: string;
}

// Utility Services
export interface UtilityServices {
  electricity?: Array<{
    id: string;
    meterNumber: string;
    meterType: 'prepaid' | 'postpaid';
    provider: string;
    location?: string;
    isActive: boolean;
  }>;
  water?: Array<{
    id: string;
    accountNumber: string;
    municipality: string;
    isActive: boolean;
  }>;
}

export interface UtilityBeneficiary extends BaseBeneficiary {
  utilityServices: UtilityServices;
  // Legacy compatibility
  accountType: 'electricity';
  identifier: string;
}

// Biller Services
export interface BillerServices {
  accounts: Array<{
    id: string;
    accountNumber: string;
    billerName: string;
    billerCategory: string;
    isActive: boolean;
  }>;
}

export interface BillerBeneficiary extends BaseBeneficiary {
  billerServices: BillerServices;
  // Legacy compatibility
  accountType: 'biller';
  identifier: string;
}

// Voucher Services
export interface VoucherServices {
  gaming?: Array<{
    id: string;
    accountId: string;
    platform: string;
    isActive: boolean;
  }>;
  streaming?: Array<{
    id: string;
    accountId: string;
    platform: string;
    isActive: boolean;
  }>;
}

export interface VoucherBeneficiary extends BaseBeneficiary {
  voucherServices: VoucherServices;
  // Legacy compatibility
  accountType: 'biller';
  identifier: string;
}

// Union type for all beneficiary types
export type UnifiedBeneficiary = 
  | PaymentBeneficiary 
  | VasBeneficiary 
  | UtilityBeneficiary 
  | BillerBeneficiary 
  | VoucherBeneficiary;

// Service types for API calls
export type ServiceType = 'payment' | 'airtime-data' | 'electricity' | 'biller' | 'voucher' | 'usdc';

// ========================================
// SERVICE METHODS
// ========================================

export const unifiedBeneficiaryService = {
  // ========================================
  // GET BENEFICIARIES BY SERVICE TYPE
  // ========================================
  
  /**
   * Get beneficiaries filtered by service type for specific pages
   */
  async getBeneficiariesByService(
    serviceType: ServiceType, 
    search?: string
  ): Promise<UnifiedBeneficiary[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await apiClient.get(
        `/api/v1/unified-beneficiaries/by-service/${serviceType}?${params.toString()}`
      );
      
      return (response.data as any).data.beneficiaries || [];
    } catch (error) {
      console.error('Error getting beneficiaries by service:', error);
      throw error;
    }
  },

  // ========================================
  // CREATE/UPDATE BENEFICIARIES
  // ========================================
  
  /**
   * Create or update a unified beneficiary
   */
  async createOrUpdateBeneficiary(data: {
    name: string;
    serviceType: string;
    serviceData: any;
    isFavorite?: boolean;
    notes?: string;
  }): Promise<UnifiedBeneficiary> {
    try {
      const response = await apiClient.post('/api/v1/unified-beneficiaries', data);
      return response.data as UnifiedBeneficiary;
    } catch (error) {
      console.error('Error creating/updating beneficiary:', error);
      throw error;
    }
  },

  /**
   * Add a new service to an existing beneficiary
   */
  async addServiceToBeneficiary(
    beneficiaryId: string, 
    serviceType: string, 
    serviceData: any
  ): Promise<void> {
    try {
      await apiClient.post(`/api/v1/unified-beneficiaries/${beneficiaryId}/services`, {
        serviceType,
        serviceData
      });
    } catch (error) {
      console.error('Error adding service to beneficiary:', error);
      throw error;
    }
  },

  /**
   * Remove a service from a beneficiary
   */
  async removeServiceFromBeneficiary(
    beneficiaryId: string, 
    serviceType: string, 
    serviceId: string
  ): Promise<void> {
    try {
      await apiClient.delete(
        `/api/v1/unified-beneficiaries/${beneficiaryId}/services/${serviceType}/${serviceId}`
      );
    } catch (error) {
      console.error('Error removing service from beneficiary:', error);
      throw error;
    }
  },

  // ========================================
  // BENEFICIARY MANAGEMENT
  // ========================================
  
  /**
   * Get all services for a specific beneficiary
   */
  async getBeneficiaryServices(beneficiaryId: string): Promise<UnifiedBeneficiary> {
    try {
      const response = await apiClient.get(
        `/api/v1/unified-beneficiaries/${beneficiaryId}/services`
      );
      return response.data as UnifiedBeneficiary;
    } catch (error) {
      console.error('Error getting beneficiary services:', error);
      throw error;
    }
  },

  /**
   * Update beneficiary metadata (favorite, notes, preferred method)
   */
  async updateBeneficiaryMetadata(
    beneficiaryId: string, 
    data: {
      isFavorite?: boolean;
      notes?: string;
      preferredPaymentMethod?: string;
    }
  ): Promise<void> {
    try {
      await apiClient.patch(`/api/v1/unified-beneficiaries/${beneficiaryId}`, data);
    } catch (error) {
      console.error('Error updating beneficiary metadata:', error);
      throw error;
    }
  },

  // ========================================
  // SEARCH FUNCTIONALITY
  // ========================================
  
  /**
   * Search beneficiaries across all services
   */
  async searchBeneficiaries(
    query: string, 
    serviceType?: ServiceType
  ): Promise<UnifiedBeneficiary[]> {
    try {
      const params = new URLSearchParams({ q: query });
      if (serviceType) params.append('serviceType', serviceType);
      
      const response = await apiClient.get(
        `/api/v1/unified-beneficiaries/search?${params.toString()}`
      );
      
      return (response.data as any).data.beneficiaries || [];
    } catch (error) {
      console.error('Error searching beneficiaries:', error);
      throw error;
    }
  },

  // ========================================
  // UTILITY METHODS
  // ========================================
  
  /**
   * Check if beneficiary has specific service type
   */
  hasService(beneficiary: UnifiedBeneficiary, serviceType: string): boolean {
    switch (serviceType) {
      case 'payment':
        return !!(beneficiary as PaymentBeneficiary).paymentMethods;
      case 'airtime-data':
        return !!(beneficiary as VasBeneficiary).vasServices;
      case 'electricity':
        return !!(beneficiary as UtilityBeneficiary).utilityServices;
      case 'biller':
        return !!(beneficiary as BillerBeneficiary).billerServices;
      case 'voucher':
        return !!(beneficiary as VoucherBeneficiary).voucherServices;
      default:
        return false;
    }
  },

  /**
   * Get primary identifier for beneficiary (for display purposes)
   */
  getPrimaryIdentifier(beneficiary: UnifiedBeneficiary): string {
    if (this.hasService(beneficiary, 'payment')) {
      const paymentBen = beneficiary as PaymentBeneficiary;
      if (paymentBen.paymentMethods?.mymoolah?.walletId) {
        return paymentBen.paymentMethods.mymoolah.walletId;
      }
      if (paymentBen.paymentMethods?.bankAccounts && paymentBen.paymentMethods.bankAccounts.length > 0) {
        return paymentBen.paymentMethods.bankAccounts[0].accountNumber;
      }
    }
    
    if (this.hasService(beneficiary, 'airtime-data')) {
      const vasBen = beneficiary as VasBeneficiary;
      if (vasBen.vasServices?.airtime && vasBen.vasServices.airtime.length > 0) {
        return vasBen.vasServices.airtime[0].mobileNumber;
      }
      if (vasBen.vasServices?.data && vasBen.vasServices.data.length > 0) {
        return vasBen.vasServices.data[0].mobileNumber;
      }
    }
    
    if (this.hasService(beneficiary, 'electricity')) {
      const utilityBen = beneficiary as UtilityBeneficiary;
      if (utilityBen.utilityServices?.electricity && utilityBen.utilityServices.electricity.length > 0) {
        return utilityBen.utilityServices.electricity[0].meterNumber;
      }
    }
    
    if (this.hasService(beneficiary, 'biller')) {
      const billerBen = beneficiary as BillerBeneficiary;
      if (billerBen.billerServices?.accounts && billerBen.billerServices.accounts.length > 0) {
        return billerBen.billerServices.accounts[0].accountNumber;
      }
    }
    
    return beneficiary.identifier || 'N/A';
  },

  /**
   * Get service summary for display
   */
  getServiceSummary(beneficiary: UnifiedBeneficiary): string {
    const services = [];
    
    if (this.hasService(beneficiary, 'payment')) {
      const paymentBen = beneficiary as PaymentBeneficiary;
      if (paymentBen.paymentMethods?.mymoolah) services.push('MyMoolah');
      if (paymentBen.paymentMethods?.bankAccounts && paymentBen.paymentMethods.bankAccounts.length > 0) {
        services.push(`${paymentBen.paymentMethods.bankAccounts.length} Bank Account(s)`);
      }
    }
    
    if (this.hasService(beneficiary, 'airtime-data')) {
      const vasBen = beneficiary as VasBeneficiary;
      if (vasBen.vasServices?.airtime && vasBen.vasServices.airtime.length > 0) services.push('Airtime');
      if (vasBen.vasServices?.data && vasBen.vasServices.data.length > 0) services.push('Data');
    }
    
    if (this.hasService(beneficiary, 'electricity')) {
      const utilityBen = beneficiary as UtilityBeneficiary;
      if (utilityBen.utilityServices?.electricity && utilityBen.utilityServices.electricity.length > 0) services.push('Electricity');
      if (utilityBen.utilityServices?.water && utilityBen.utilityServices.water.length > 0) services.push('Water');
    }
    
    if (this.hasService(beneficiary, 'biller')) {
      const billerBen = beneficiary as BillerBeneficiary;
      if (billerBen.billerServices?.accounts && billerBen.billerServices.accounts.length > 0) {
        services.push(`${billerBen.billerServices.accounts.length} Biller(s)`);
      }
    }
    
    if (this.hasService(beneficiary, 'voucher')) {
      const voucherBen = beneficiary as VoucherBeneficiary;
      if (voucherBen.voucherServices?.gaming && voucherBen.voucherServices.gaming.length > 0) services.push('Gaming');
      if (voucherBen.voucherServices?.streaming && voucherBen.voucherServices.streaming.length > 0) services.push('Streaming');
    }
    
    return services.join(' • ') || 'No services';
  }
};

export default unifiedBeneficiaryService;
