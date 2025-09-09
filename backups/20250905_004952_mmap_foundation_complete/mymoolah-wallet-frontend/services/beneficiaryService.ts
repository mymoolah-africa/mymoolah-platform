import { apiClient } from './apiClient';

// ========================================
// BENEFICIARY TYPES & INTERFACES
// ========================================

export interface BaseBeneficiary {
  id: string;
  name: string;
  msisdn: string; // NEW: Mobile number (MSISDN)
  identifier: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastPaidAt?: string;
  timesPaid: number;
}

export interface PaymentBeneficiary extends BaseBeneficiary {
  accountType: 'mymoolah' | 'bank';
  bankName?: string;
  // Legacy properties for backward compatibility with SendMoneyPage
  lastPaid?: Date;
  isFavorite: boolean;
  totalPaid: number;
  paymentCount: number;
  avatar?: string;
  metadata?: {
    isFavorite?: boolean;
    totalPaid?: number;
    paymentCount?: number;
    avatar?: string;
  };
}

export interface ServiceBeneficiary extends BaseBeneficiary {
  accountType: 'airtime' | 'data' | 'electricity' | 'biller';
  metadata?: {
    network?: string; // For airtime/data
    meterType?: string; // For electricity
    billerName?: string; // For bills
    billerCategory?: string;
    isValid?: boolean; // Validation status
    isFavorite?: boolean;
    totalPaid?: number;
    paymentCount?: number;
  };
}

export type Beneficiary = PaymentBeneficiary | ServiceBeneficiary;

// ========================================
// SERVICE-SPECIFIC BENEFICIARY MANAGEMENT
// ========================================

export const beneficiaryService = {
  // ========================================
  // PAYMENT BENEFICIARIES (Send Money)
  // ========================================
  
  // Get ONLY payment beneficiaries (mymoolah and bank)
  async getPaymentBeneficiaries(search?: string): Promise<PaymentBeneficiary[]> {
    const params = new URLSearchParams();
    params.append('type', 'mymoolah');
    params.append('type', 'bank');
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/api/v1/beneficiaries?${params.toString()}`);
    const beneficiaries = (response.data as any).beneficiaries || [];
    
    // Map backend data to include legacy properties for SendMoneyPage compatibility
    return beneficiaries.map((b: any) => ({
      ...b,
      lastPaid: b.lastPaidAt ? new Date(b.lastPaidAt) : undefined,
      isFavorite: b.metadata?.isFavorite || false,
      totalPaid: b.metadata?.totalPaid || 0,
      paymentCount: b.timesPaid || 0,
      avatar: b.metadata?.avatar
    }));
  },

  // ========================================
  // AIRTIME & DATA BENEFICIARIES
  // ========================================
  
  // Get ONLY airtime and data beneficiaries
  async getAirtimeDataBeneficiaries(search?: string): Promise<ServiceBeneficiary[]> {
    const params = new URLSearchParams();
    params.append('type', 'airtime');
    params.append('type', 'data');
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/api/v1/beneficiaries?${params.toString()}`);
    return (response.data as any).beneficiaries || [];
  },

  // ========================================
  // ELECTRICITY BENEFICIARIES
  // ========================================
  
  // Get ONLY electricity beneficiaries
  async getElectricityBeneficiaries(search?: string): Promise<ServiceBeneficiary[]> {
    const params = new URLSearchParams();
    params.append('type', 'electricity');
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/api/v1/beneficiaries?${params.toString()}`);
    return (response.data as any).beneficiaries || [];
  },

  // ========================================
  // BILL PAYMENT BENEFICIARIES
  // ========================================
  
  // Get ONLY bill payment beneficiaries
  async getBillPaymentBeneficiaries(search?: string): Promise<ServiceBeneficiary[]> {
    const params = new URLSearchParams();
    params.append('type', 'biller');
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/api/v1/beneficiaries?${params.toString()}`);
    return (response.data as any).beneficiaries || [];
  },

  // ========================================
  // VOUCHER BENEFICIARIES (3rd Party)
  // ========================================
  
  // Get ONLY voucher beneficiaries (if any)
  async getVoucherBeneficiaries(search?: string): Promise<ServiceBeneficiary[]> {
    // Note: Vouchers typically don't have beneficiaries in the same way
    // This is kept for future extensibility
    return [];
  },

  // ========================================
  // UNIVERSAL BENEFICIARY OPERATIONS
  // ========================================
  
  // Get all beneficiaries with optional type filtering
  async getAllBeneficiaries(type?: string, search?: string): Promise<Beneficiary[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/api/v1/beneficiaries?${params.toString()}`);
    return (response.data as any).beneficiaries || [];
  },

  // Search beneficiaries across all types
  async searchBeneficiaries(query: string, type?: string): Promise<Beneficiary[]> {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    
    const response = await apiClient.get(`/api/v1/beneficiaries/search?${params.toString()}`);
    return (response.data as any).beneficiaries || [];
  },

  // Create or update beneficiary
  async saveBeneficiary(data: {
    name: string;
    identifier: string;
    accountType: string;
    bankName?: string;
    metadata?: any;
  }): Promise<Beneficiary> {
    const response = await apiClient.post('/api/v1/beneficiaries', data);
    return response.data as Beneficiary;
  },

  // Update beneficiary
  async updateBeneficiary(id: string, data: {
    name?: string;
    identifier?: string;
    bankName?: string;
    metadata?: any;
  }): Promise<Beneficiary> {
    const response = await apiClient.put(`/api/v1/beneficiaries/${id}`, data);
    return response.data as Beneficiary;
  },

  // Delete beneficiary
  async deleteBeneficiary(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/beneficiaries/${id}`);
  },

  // Remove beneficiary (alias for deleteBeneficiary)
  async removeBeneficiary(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/beneficiaries/${id}`);
  }
};

// ========================================
// TYPE GUARDS & UTILITIES
// ========================================

export const isPaymentBeneficiary = (beneficiary: Beneficiary): beneficiary is PaymentBeneficiary => {
  return beneficiary.accountType === 'mymoolah' || beneficiary.accountType === 'bank';
};

export const isServiceBeneficiary = (beneficiary: Beneficiary): beneficiary is ServiceBeneficiary => {
  return ['airtime', 'data', 'electricity', 'biller'].includes(beneficiary.accountType);
};

export const isAirtimeDataBeneficiary = (beneficiary: Beneficiary): beneficiary is ServiceBeneficiary => {
  return beneficiary.accountType === 'airtime' || beneficiary.accountType === 'data';
};

export const isElectricityBeneficiary = (beneficiary: Beneficiary): beneficiary is ServiceBeneficiary => {
  return beneficiary.accountType === 'electricity';
};

export const isBillPaymentBeneficiary = (beneficiary: Beneficiary): beneficiary is ServiceBeneficiary => {
  return beneficiary.accountType === 'biller';
};

// ========================================
// EXPORT DEFAULT
// ========================================

export default beneficiaryService;
