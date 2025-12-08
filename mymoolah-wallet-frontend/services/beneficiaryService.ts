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
      let token = getToken();
      
      // Filter out demo tokens - they should not be sent to the backend
      if (token && token.startsWith('demo-token-')) {
        token = null;
      }
      
      // Handle missing token gracefully (same as apiClient.ts)
      // Let the backend return 401/403 if token is missing
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
        // Handle 401 Unauthorized - token might be expired or missing
        if (response.status === 401 || response.status === 403) {
          throw new Error(data.message || data.error || 'Session expired. Please log in again.');
        }
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
   * Get electricity beneficiaries
   */
  async getElectricityBeneficiaries(search: string = ''): Promise<UnifiedBeneficiary[]> {
    return await this.getBeneficiariesByService('electricity', search);
  }

  /**
   * Get airtime/data beneficiaries
   */
  async getAirtimeDataBeneficiaries(search: string = ''): Promise<UnifiedBeneficiary[]> {
    return await this.getBeneficiariesByService('airtime-data', search);
  }

  /**
   * Get bill payment beneficiaries
   */
  async getBillPaymentBeneficiaries(search: string = ''): Promise<UnifiedBeneficiary[]> {
    return await this.getBeneficiariesByService('biller', search);
  }

  /**
   * Get all beneficiaries (legacy method for overlay service)
   */
  async getAllBeneficiaries(type?: string, search: string = ''): Promise<UnifiedBeneficiary[]> {
    if (type) {
      return await this.getBeneficiariesByService(type as any, search);
    }
    // If no type specified, return all (not recommended, but for backward compatibility)
    const response = await this.request<{ beneficiaries: any[] }>(
      `/api/v1/unified-beneficiaries/search?q=${encodeURIComponent(search)}`
    );
    return (response.data?.beneficiaries || []).map(this.transformLegacyBeneficiary);
  }

  /**
   * Save beneficiary (legacy method for overlay service)
   */
  async saveBeneficiary(data: CreateBeneficiaryRequest): Promise<UnifiedBeneficiary> {
    return await this.createOrUpdateBeneficiary(data);
  }

  /**
   * Remove all services of specific types from a beneficiary
   * Banking-grade: Only removes service accounts, never affects beneficiary record or user account
   * Use this when removing from service-specific pages (e.g., airtime/data page removes all airtime+data)
   */
  async removeAllServicesOfType(
    beneficiaryId: number | string,
    serviceType: 'airtime-data' | 'electricity' | 'biller' | string
  ): Promise<void> {
    await this.request(
      `/api/v1/unified-beneficiaries/${beneficiaryId}/services/${serviceType}`,
      {
        method: 'DELETE'
      }
    );
    // Optionally return void; callers can refresh state afterward
  }

  /**
   * Remove beneficiary from a specific service context
   * Banking-grade: Only removes service accounts, never deletes beneficiary record
   * Supports both number and string IDs for backward compatibility
   */
  async removeBeneficiary(
    beneficiaryId: number | string,
    context?: 'airtime-data' | 'electricity' | 'biller' | 'payment'
  ): Promise<void> {
    // If context is provided, remove all services of that type
    if (context) {
      await this.removeAllServicesOfType(beneficiaryId, context);
      return;
    }

    // Legacy behavior: Return success (placeholder for backward compatibility)
    // New code should explicitly provide context
    console.warn('removeBeneficiary called without context - this is deprecated. Use removeAllServicesOfType instead.');
    return Promise.resolve();
  }

  /**
   * Delete beneficiary (legacy method for overlay service)
   * Supports both number and string IDs for backward compatibility
   */
  async deleteBeneficiary(beneficiaryId: number | string): Promise<void> {
    // This would require a DELETE endpoint on the backend
    // For now, we'll just return success
    return Promise.resolve();
  }

  /**
   * Create or update a payment beneficiary (MyMoolah wallet or Bank account)
   */
  async createPaymentBeneficiary(options: {
    name: string;
    msisdn?: string; // Optional for bank accounts
    accountType: 'mymoolah' | 'bank';
    bankName?: string;
    accountNumber?: string;
  }): Promise<PaymentBeneficiary> {
    const serviceType = options.accountType === 'bank' ? 'bank' : 'mymoolah';
    
    // For MyMoolah, msisdn is required. For bank accounts, we don't use MSISDN (backend generates NON_MSI_ identifier)
    let normalizedMsisdn: string | undefined;
    if (serviceType === 'mymoolah') {
      if (!options.msisdn) {
        throw new Error('MSISDN is required for MyMoolah accounts');
      }
      normalizedMsisdn = this.normalizeMsisdn(options.msisdn);
    } else {
      // For bank accounts, we don't pass MSISDN - backend will generate NON_MSI_ identifier
      // PayShap reference is stored separately in serviceData
      normalizedMsisdn = undefined;
    }

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
      msisdn: normalizedMsisdn, // undefined for bank accounts (backend will use NON_MSI_ identifier)
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
   * Supports both number and string IDs for backward compatibility
   */
  async updateBeneficiary(
    beneficiaryId: number | string,
    updates: {
      isFavorite?: boolean;
      notes?: string;
      preferredPaymentMethod?: string;
    name?: string;
    identifier?: string;
    bankName?: string;
    metadata?: any;
    }
  ): Promise<UnifiedBeneficiary> {
    const id = typeof beneficiaryId === 'string' ? parseInt(beneficiaryId, 10) : beneficiaryId;
    const response = await this.request<any>(
      `/api/v1/unified-beneficiaries/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }
    );
    
    return this.transformLegacyBeneficiary(response.data);
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
    // Filter to only payment accounts (mymoolah and bank)
    const paymentAccounts = (beneficiary.accounts || []).filter(
      (account) => account.type === 'mymoolah' || account.type === 'bank'
    );

    // Find primary account (default or first)
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
      // Include only payment accounts (mymoolah and bank) for account selector
      accounts: paymentAccounts.length > 0 ? paymentAccounts : undefined
    };
  }

  private normalizeMsisdn(value: string): string {
    if (!value) return '';
    const raw = String(value).trim();
    const digits = raw.replace(/\D/g, '');
    if (/^0[6-8]\d{8}$/.test(digits)) return `+27${digits.slice(1)}`;
    if (/^27[6-8]\d{8}$/.test(digits)) return `+${digits}`;
    if (raw.startsWith('+') && /^\+27[6-8]\d{8}$/.test(raw)) return raw;
    return raw; // return as-is; backend will validate and respond with error if invalid
  }
}

export const beneficiaryService = new BeneficiaryService();
