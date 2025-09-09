/**
 * Overlay Service - MyMoolah Treasury Platform
 * 
 * Service for handling overlay-specific API calls
 * Integrates with backend overlay services
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

import { apiClient } from './apiClient';

// ========================================
// TYPES
// ========================================

export interface Beneficiary {
  id: string;
  name: string;
  identifier: string;
  accountType: 'mymoolah' | 'bank' | 'airtime' | 'data' | 'electricity' | 'biller';
  bankName?: string;
  metadata?: {
    network?: string;
    meterType?: string;
    billerName?: string;
    billerCategory?: string;
    isValid?: boolean;
  };
  lastPaidAt?: string;
  timesPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface AirtimeDataProduct {
  id: string;
  name: string;
  size: string;
  price: number;
  provider: string;
  type: 'airtime' | 'data';
  validity?: string;
  isBestDeal: boolean;
  supplier: string;
  description?: string;
  commission?: number;
  fixedFee?: number;
}

export interface AirtimeDataCatalog {
  beneficiary: {
    id: string;
    label: string;
    identifier: string;
    network?: string;
  };
  providers: string[];
  products: AirtimeDataProduct[];
  bestDealSku?: string;
}

export interface ElectricityCatalog {
  beneficiary: {
    id: string;
    label: string;
    identifier: string;
    meterType: string;
  };
  meterValid: boolean;
  providers: string[];
  suggestedAmounts: number[];
}

export interface Biller {
  id: string;
  name: string;
  category: string;
}

export interface BillCategory {
  id: string;
  name: string;
}

export interface PurchaseResult {
  transactionId: string;
  status: string;
  reference: string;
  token?: string;
  receiptUrl?: string;
  beneficiaryIsMyMoolahUser?: boolean;
}

// ========================================
// BENEFICIARY SERVICE
// ========================================

// Import centralized beneficiary service
import { beneficiaryService as centralizedBeneficiaryService } from './beneficiaryService';

export const beneficiaryService = {
  // Get all beneficiaries with optional filtering
  async getBeneficiaries(type?: string, search?: string): Promise<Beneficiary[]> {
    // Redirect to centralized service for proper type filtering
    let beneficiaries;
    if (type === 'airtime' || type === 'data') {
      beneficiaries = await centralizedBeneficiaryService.getAirtimeDataBeneficiaries(search);
    } else if (type === 'electricity') {
      beneficiaries = await centralizedBeneficiaryService.getElectricityBeneficiaries(search);
    } else if (type === 'biller') {
      beneficiaries = await centralizedBeneficiaryService.getBillPaymentBeneficiaries(search);
    } else if (type === 'mymoolah' || type === 'bank') {
      beneficiaries = await centralizedBeneficiaryService.getPaymentBeneficiaries(search);
    } else {
      // Fallback to centralized service
      beneficiaries = await centralizedBeneficiaryService.getAllBeneficiaries(type, search);
    }
    
    // Convert centralized service types to overlay service types
    return beneficiaries.map((b: any) => ({
      id: b.id,
      name: b.name,
      identifier: b.identifier,
      accountType: b.accountType,
      bankName: (b as any).bankName || undefined,
      metadata: (b as any).metadata || {},
      lastPaidAt: b.lastPaidAt,
      timesPaid: (b as any).timesPaid || 0,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));
  },

  // Search beneficiaries
  async searchBeneficiaries(query: string, type?: string): Promise<Beneficiary[]> {
    const beneficiaries = await centralizedBeneficiaryService.searchBeneficiaries(query, type);
    
    // Convert centralized service types to overlay service types
    return beneficiaries.map((b: any) => ({
      id: b.id,
      name: b.name,
      identifier: b.identifier,
      accountType: b.accountType,
      bankName: (b as any).bankName || undefined,
      metadata: (b as any).metadata || {},
      lastPaidAt: b.lastPaidAt,
      timesPaid: (b as any).timesPaid || 0,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));
  },

  // Create or update beneficiary
  async saveBeneficiary(data: {
    name: string;
    identifier: string;
    accountType: string;
    bankName?: string;
    metadata?: any;
  }): Promise<Beneficiary> {
    const beneficiary = await centralizedBeneficiaryService.saveBeneficiary(data);
    
    // Convert centralized service type to overlay service type
    return {
      id: beneficiary.id,
      name: beneficiary.name,
      identifier: beneficiary.identifier,
      accountType: beneficiary.accountType,
      bankName: (beneficiary as any).bankName || undefined,
      metadata: (beneficiary as any).metadata || {},
      lastPaidAt: beneficiary.lastPaidAt,
      timesPaid: (beneficiary as any).timesPaid || 0,
      createdAt: beneficiary.createdAt,
      updatedAt: beneficiary.updatedAt
    };
  },

  // Update beneficiary
  async updateBeneficiary(id: string, data: {
    name?: string;
    identifier?: string;
    bankName?: string;
    metadata?: any;
  }): Promise<Beneficiary> {
    const beneficiary = await centralizedBeneficiaryService.updateBeneficiary(id, data);
    
    // Convert centralized service type to overlay service type
    return {
      id: beneficiary.id,
      name: beneficiary.name,
      identifier: beneficiary.identifier,
      accountType: beneficiary.accountType,
      bankName: (beneficiary as any).bankName || undefined,
      metadata: (beneficiary as any).metadata || {},
      lastPaidAt: beneficiary.lastPaidAt,
      timesPaid: (beneficiary as any).timesPaid || 0,
      createdAt: beneficiary.createdAt,
      updatedAt: beneficiary.updatedAt
    };
  },

  // Delete beneficiary
  async deleteBeneficiary(id: string): Promise<void> {
    return await centralizedBeneficiaryService.deleteBeneficiary(id);
  },

  // Remove beneficiary (alias for deleteBeneficiary)
  async removeBeneficiary(id: string): Promise<void> {
    return await centralizedBeneficiaryService.removeBeneficiary(id);
  }
};

// ========================================
// AIRTIME & DATA SERVICE
// ========================================

export const airtimeDataService = {
  // Get catalog for airtime/data
  async getCatalog(beneficiaryId: string, country: string = 'ZA'): Promise<AirtimeDataCatalog> {
    const response = await apiClient.get(`/api/v1/overlay/airtime-data/catalog`, {
      beneficiaryId,
      country
    });
    return response.data as AirtimeDataCatalog;
  },

  // Purchase airtime/data
  async purchase(data: {
    beneficiaryId: string;
    productId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<PurchaseResult> {
    const response = await apiClient.post('/api/v1/overlay/airtime-data/purchase', data);
    return response.data as PurchaseResult;
  }
};

// ========================================
// ELECTRICITY SERVICE
// ========================================

export const electricityService = {
  // Get catalog for electricity
  async getCatalog(beneficiaryId: string): Promise<ElectricityCatalog> {
    const response = await apiClient.get(`/api/v1/overlay/electricity/catalog`, {
      beneficiaryId
    });
    return response.data as ElectricityCatalog;
  },

  // Purchase electricity
  async purchase(data: {
    beneficiaryId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<PurchaseResult> {
    const response = await apiClient.post('/api/v1/overlay/electricity/purchase', data);
    return response.data as PurchaseResult;
  }
};

// ========================================
// BILL PAYMENTS SERVICE
// ========================================

export const billPaymentsService = {
  // Search billers
  async searchBillers(query?: string, category?: string): Promise<Biller[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category) params.append('category', category);
    
    const response = await apiClient.get(`/api/v1/overlay/bills/search?${params.toString()}`);
    return (response.data as any).billers || [];
  },

  // Get bill categories
  async getCategories(): Promise<BillCategory[]> {
    const response = await apiClient.get('/api/v1/overlay/bills/categories');
    return (response.data as any).categories || [];
  },

  // Pay bill
  async payBill(data: {
    beneficiaryId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<PurchaseResult> {
    const response = await apiClient.post('/api/v1/overlay/bills/pay', data);
    return response.data as PurchaseResult;
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

export const generateIdempotencyKey = (): string => {
  // Banking-grade idempotency key generation
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const userId = 'user'; // In real app, get from auth context
  return `overlay_${userId}_${timestamp}_${random}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(amount);
};

export const validateMobileNumber = (number: string): boolean => {
  // South African mobile number validation
  const saMobileRegex = /^(\+27|27|0)[6-8][0-9]{8}$/;
  return saMobileRegex.test(number);
};

export const validateMeterNumber = (meterNumber: string): boolean => {
  // Basic meter number validation (minimum 10 digits)
  return meterNumber.length >= 10 && /^\d+$/.test(meterNumber);
};

// ========================================
// EXPORTS
// ========================================

export default {
  beneficiaryService,
  airtimeDataService,
  electricityService,
  billPaymentsService,
  generateIdempotencyKey,
  formatCurrency,
  validateMobileNumber,
  validateMeterNumber
};
