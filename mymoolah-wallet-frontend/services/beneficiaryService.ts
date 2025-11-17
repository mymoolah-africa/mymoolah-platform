/**
 * Unified Beneficiary Service
 * 
 * This service handles all beneficiary-related API calls using the new
 * unified beneficiary architecture (one person = one beneficiary, multiple accounts).
 */

import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

const API_BASE = APP_CONFIG.API.baseUrl;

export interface BeneficiaryAccount {
  id: number;
  type: 'mymoolah' | 'bank' | 'mobile_money' | 'airtime' | 'data' | 'electricity' | 'biller' | 'voucher';
  identifier: string; // account number, MSISDN, meter number, etc.
  label?: string;
  isDefault: boolean;
  metadata?: {
    bankName?: string;
    accountType?: string;
    branchCode?: string;
    network?: string;
    meterType?: string;
    provider?: string;
    billerName?: string;
    [key: string]: any;
  };
}

export interface UnifiedBeneficiary {
  id: number;
  name: string;
  msisdn?: string;
  identifier?: string;
  accountType?: string;
  bankName?: string;
  accounts: BeneficiaryAccount[];
  isFavorite: boolean;
  notes?: string;
  preferredPaymentMethod?: string;
  lastPaidAt?: string;
  timesPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentBeneficiary {
  id: string;
  name: string;
  msisdn?: string;
  identifier: string;
  accountType: 'mymoolah' | 'bank';
  bankName?: string;
  userId?: string | number;
  createdAt?: string;
  updatedAt?: string;
  timesPaid?: number;
  lastPaidAt?: string;
  lastPaid?: Date;
  isFavorite?: boolean;
  totalPaid?: number;
  paymentCount?: number;
  metadata?: Record<string, any>;
  accounts?: BeneficiaryAccount[];
}

export interface CreateBeneficiaryRequest {
  name: string;
  msisdn?: string;
  serviceType: 'mymoolah' | 'bank' | 'mobile_money' | 'airtime' | 'data' | 'electricity' | 'biller' | 'voucher';
  serviceData: {
    walletMsisdn?: string;
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
    branchCode?: string;
    provider?: string;
    mobileMoneyId?: string;
    msisdn?: string;
    network?: string;
    meterNumber?: string;
    meterType?: string;
    accountNumber?: string;
    billerName?: string;
    label?: string;
    isDefault?: boolean;
    [key: string]: any;
  };
  isFavorite?: boolean;
  notes?: string;
}

export interface AddServiceRequest {
  serviceType: string;
  serviceData: Record<string, any>;
}

class BeneficiaryService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
    try {
      const url = `${API_BASE}${endpoint}`;
      const token = getToken();
      
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return {
        success: true,
        data: data.data || data
      };
    } catch (error) {
      console.error(`Beneficiary API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get beneficiaries filtered by service type
   * @param serviceType - 'payment', 'airtime-data', 'electricity', 'biller', 'voucher'
   * @param search - Optional search query
   */
  async getBeneficiariesByService(
    serviceType: 'payment' | 'airtime-data' | 'electricity' | 'biller' | 'voucher',
    search: string = ''
  ): Promise<UnifiedBeneficiary[]> {
    const response = await this.request<{ beneficiaries: any[] }>(
      `/api/v1/unified-beneficiaries/by-service/${serviceType}${search ? `?search=${encodeURIComponent(search)}` : ''}`
    );
    
    // Transform legacy format to unified format
    return (response.data?.beneficiaries || []).map(this.transformLegacyBeneficiary);
  }

  /**
   * Get payment beneficiaries (MyMoolah + Bank)
   */
  async getPaymentBeneficiaries(search: string = ''): Promise<PaymentBeneficiary[]> {
    const unified = await this.getBeneficiariesByService('payment', search);
    return unified.map((beneficiary, idx) => this.mapToPaymentBeneficiary(beneficiary, idx));
  }

  /**
   * Create or update a payment beneficiary (MyMoolah wallet or Bank account)
   */
  async createPaymentBeneficiary(options: {
    name: string;
    msisdn: string;
    accountType: 'mymoolah' | 'bank';
    bankName?: string;
    accountNumber?: string;
  }): Promise<PaymentBeneficiary> {
    const normalizedMsisdn = this.normalizeMsisdn(options.msisdn);
    const serviceType = options.accountType === 'bank' ? 'bank' : 'mymoolah';

    const serviceData =
      serviceType === 'bank'
        ? {
            bankName: options.bankName,
            accountNumber: options.accountNumber,
            accountType: 'cheque',
            isDefault: true
          }
        : {
            walletMsisdn: normalizedMsisdn,
            isDefault: true
          };

    const created = await this.createOrUpdateBeneficiary({
      name: options.name,
      msisdn: normalizedMsisdn,
      serviceType,
      serviceData
    });

    return this.mapToPaymentBeneficiary(created);
  }

  /**
   * Create or update a beneficiary
   */
  async createOrUpdateBeneficiary(request: CreateBeneficiaryRequest): Promise<UnifiedBeneficiary> {
    const response = await this.request<any>(
      '/api/v1/unified-beneficiaries',
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    );
    
    return this.transformLegacyBeneficiary(response.data);
  }

  /**
   * Add a service/account to an existing beneficiary
   */
  async addServiceToBeneficiary(
    beneficiaryId: number,
    request: AddServiceRequest
  ): Promise<void> {
    await this.request(
      `/api/v1/unified-beneficiaries/${beneficiaryId}/services`,
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    );
  }

  /**
   * Remove a service/account from a beneficiary
   */
  async removeServiceFromBeneficiary(
    beneficiaryId: number,
    serviceType: string,
    serviceId: string
  ): Promise<void> {
    await this.request(
      `/api/v1/unified-beneficiaries/${beneficiaryId}/services/${serviceType}/${serviceId}`,
      {
        method: 'DELETE'
      }
    );
  }

  /**
   * Get all services/accounts for a specific beneficiary
   */
  async getBeneficiaryServices(beneficiaryId: number): Promise<UnifiedBeneficiary> {
    const response = await this.request<any>(
      `/api/v1/unified-beneficiaries/${beneficiaryId}/services`
    );
    
    return this.transformLegacyBeneficiary(response.data);
  }

  /**
   * Update beneficiary metadata (favorite, notes, preferred method)
   */
  async updateBeneficiary(
    beneficiaryId: number,
    updates: {
      isFavorite?: boolean;
      notes?: string;
      preferredPaymentMethod?: string;
    }
  ): Promise<void> {
    await this.request(
      `/api/v1/unified-beneficiaries/${beneficiaryId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }
    );
  }

  /**
   * Search beneficiaries across all services
   */
  async searchBeneficiaries(
    query: string,
    serviceType?: string
  ): Promise<UnifiedBeneficiary[]> {
    const params = new URLSearchParams({ q: query });
    if (serviceType) params.append('serviceType', serviceType);
    
    const response = await this.request<{ beneficiaries: any[] }>(
      `/api/v1/unified-beneficiaries/search?${params.toString()}`
    );
    
    return (response.data?.beneficiaries || []).map(this.transformLegacyBeneficiary);
  }

  /**
   * Transform legacy beneficiary format to unified format
   * This bridges the gap between old JSONB structure and new normalized tables
   */
  private transformLegacyBeneficiary(legacy: any): UnifiedBeneficiary {
    const accounts: BeneficiaryAccount[] = [];
    
    // Extract payment methods
    if (legacy.paymentMethods) {
      // MyMoolah wallet
      if (legacy.paymentMethods.mymoolah) {
        accounts.push({
          id: legacy.id * 1000 + 1, // Generate stable ID
          type: 'mymoolah',
          identifier: legacy.paymentMethods.mymoolah.walletId || legacy.paymentMethods.mymoolah.walletMsisdn || legacy.identifier,
          label: 'MyMoolah Wallet',
          isDefault: legacy.preferredPaymentMethod === 'mymoolah',
          metadata: legacy.paymentMethods.mymoolah
        });
      }
      
      // Bank accounts
      if (legacy.paymentMethods.bankAccounts && Array.isArray(legacy.paymentMethods.bankAccounts)) {
        legacy.paymentMethods.bankAccounts.forEach((bank: any, idx: number) => {
          accounts.push({
            id: legacy.id * 1000 + 10 + idx,
            type: 'bank',
            identifier: bank.accountNumber,
            label: bank.label || `${bank.bankName} ${bank.accountType}`,
            isDefault: legacy.preferredPaymentMethod === 'bank' && idx === 0,
            metadata: {
              bankName: bank.bankName,
              accountType: bank.accountType,
              branchCode: bank.branchCode,
              ...bank
            }
          });
        });
      }
    }
    
    // Extract service accounts (airtime, data, electricity, etc.)
    if (legacy.vasServices) {
      if (legacy.vasServices.airtime && Array.isArray(legacy.vasServices.airtime)) {
        legacy.vasServices.airtime.forEach((service: any, idx: number) => {
          accounts.push({
            id: legacy.id * 1000 + 100 + idx,
            type: 'airtime',
            identifier: service.mobileNumber || service.msisdn,
            label: service.label || `Airtime - ${service.network || ''}`,
            isDefault: false,
            metadata: {
              network: service.network,
              ...service
            }
          });
        });
      }
      
      if (legacy.vasServices.data && Array.isArray(legacy.vasServices.data)) {
        legacy.vasServices.data.forEach((service: any, idx: number) => {
          accounts.push({
            id: legacy.id * 1000 + 200 + idx,
            type: 'data',
            identifier: service.mobileNumber || service.msisdn,
            label: service.label || `Data - ${service.network || ''}`,
            isDefault: false,
            metadata: {
              network: service.network,
              ...service
            }
          });
        });
      }
    }
    
    if (legacy.utilityServices) {
      if (legacy.utilityServices.electricity && Array.isArray(legacy.utilityServices.electricity)) {
        legacy.utilityServices.electricity.forEach((service: any, idx: number) => {
          accounts.push({
            id: legacy.id * 1000 + 300 + idx,
            type: 'electricity',
            identifier: service.meterNumber,
            label: service.label || `Electricity - ${service.provider || ''}`,
            isDefault: false,
            metadata: {
              meterType: service.meterType,
              provider: service.provider,
              ...service
            }
          });
        });
      }
    }
    
    if (legacy.billerServices) {
      if (legacy.billerServices.accounts && Array.isArray(legacy.billerServices.accounts)) {
        legacy.billerServices.accounts.forEach((account: any, idx: number) => {
          accounts.push({
            id: legacy.id * 1000 + 400 + idx,
            type: 'biller',
            identifier: account.accountNumber,
            label: account.label || `${account.billerName} - ${account.accountNumber}`,
            isDefault: false,
            metadata: {
              billerName: account.billerName,
              category: account.category,
              ...account
            }
          });
        });
      }
    }
    
    // If no accounts found, create a default one from legacy identifier
    if (accounts.length === 0 && legacy.identifier) {
      accounts.push({
        id: legacy.id * 1000,
        type: (legacy.accountType as any) || 'mymoolah',
        identifier: legacy.identifier,
        label: legacy.bankName ? `${legacy.bankName} Account` : 'Default',
        isDefault: true,
        metadata: legacy.metadata || {}
      });
    }
    
    return {
      id: legacy.id,
      name: legacy.name,
      msisdn: legacy.msisdn || legacy.identifier,
      identifier: legacy.identifier,
      accountType: legacy.accountType,
      accounts,
      isFavorite: legacy.isFavorite || false,
      notes: legacy.notes,
      preferredPaymentMethod: legacy.preferredPaymentMethod,
      lastPaidAt: legacy.lastPaidAt,
      timesPaid: legacy.timesPaid || 0,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt
    };
  }

  private mapToPaymentBeneficiary(
    beneficiary: UnifiedBeneficiary,
    idx: number = 0
  ): PaymentBeneficiary {
    const paymentAccounts = (beneficiary.accounts || []).filter(
      (account) => account.type === 'mymoolah' || account.type === 'bank'
    );

    const primaryAccount =
      paymentAccounts.find((account) => account.isDefault) ||
      paymentAccounts[0] ||
      null;

    const fallbackAccountType = (beneficiary as any)?.accountType as 'mymoolah' | 'bank' | undefined;
    const accountType =
      primaryAccount?.type === 'bank'
        ? 'bank'
        : (primaryAccount?.type === 'mymoolah'
            ? 'mymoolah'
            : (fallbackAccountType || 'mymoolah'));

    const identifier =
      accountType === 'bank'
        ? (primaryAccount?.identifier || (beneficiary as any)?.identifier || '')
        : beneficiary.msisdn ||
          primaryAccount?.identifier ||
          (beneficiary as any)?.identifier ||
          '';

    return {
      id: `b-${beneficiary.id ?? idx}`,
      name: beneficiary.name,
      msisdn: beneficiary.msisdn || primaryAccount?.identifier || (beneficiary as any)?.identifier,
      identifier,
      accountType,
      bankName: primaryAccount?.metadata?.bankName,
      userId: (beneficiary as any)?.userId,
      createdAt: beneficiary.createdAt,
      updatedAt: beneficiary.updatedAt,
      timesPaid: beneficiary.timesPaid || 0,
      lastPaidAt: beneficiary.lastPaidAt,
      lastPaid: beneficiary.lastPaidAt ? new Date(beneficiary.lastPaidAt) : undefined,
      isFavorite: beneficiary.isFavorite,
      totalPaid: (beneficiary as any)?.metadata?.totalPaid ?? 0,
      paymentCount: beneficiary.timesPaid || 0,
      metadata: {
        preferredPaymentMethod: beneficiary.preferredPaymentMethod
      },
      accounts: beneficiary.accounts
    };
  }

  private normalizeMsisdn(value: string): string {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('27')) return '0' + digits.slice(-9);
    if (digits.startsWith('0')) return digits;
    if (digits.length === 9) return '0' + digits;
    return digits;
  }
}

export const beneficiaryService = new BeneficiaryService();
