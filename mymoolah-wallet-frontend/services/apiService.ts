/**
 * MyMoolah API Service Layer
 * Centralized API calls for TransactPage and SendMoneyPage
 */

import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

// API Base URL
const API_BASE = APP_CONFIG.API.baseUrl;

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface RecipientMethod {
  id: string;
  name: string;
  description: string;
  estimatedTime: string;
  fee: string;
  feeAmount: number;
  available: boolean;
  preferred: boolean;
  badge: string;
}

export interface RecipientInfo {
  identifier: string;
  type: 'phone' | 'account' | 'username' | 'unknown';
  availableMethods: RecipientMethod[];
  recipientName?: string;
  recipientInfo?: string;
}

export interface PaymentQuote {
  paymentMethodId: string;
  amount: number;
  fee: number;
  totalAmount: number;
  estimatedTime: string;
  reference: string;
}

export interface TransferResult {
  transactionId: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedCompletion: string;
}

export interface TransferStatus {
  transactionId: string;
  status: 'processing' | 'completed' | 'failed';
  completedAt?: string;
}

export interface VASProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  supplier: string;
  category: string;
  isPromotional: boolean;
  discountPercentage?: number;
}

export interface SupplierComparison {
  vasType: string;
  products: VASProduct[];
  bestDeals: VASProduct[];
  trending: VASProduct[];
}

// QR Payment Types
export interface QRMerchant {
  id: string;
  name: string;
  logo: string;
  category: string;
  locations: string;
  qrType: string;
  isActive: boolean;
}

export interface QRCodeData {
  qrCode: string;
  qrType: string;
  decodedData: any;
  timestamp: string;
}

export interface QRValidationResult {
  qrCode: string;
  merchant: QRMerchant;
  paymentDetails: {
    amount: number;
    currency: string;
    reference: string;
  };
  isValid: boolean;
  error?: string;
}

export interface QRPaymentResult {
  paymentId?: string;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  fee?: number;
  reference: string;
  qrCode?: string;
  merchant?: QRMerchant;
}

// Airtime Types
export interface AirtimeNetwork {
  id: string;
  name: string;
  logo: string;
  available: boolean;
  voucherAvailable: boolean;
  topUpAvailable: boolean;
  preferred: boolean;
}

export interface AirtimeValue {
  value: number;
  available: boolean;
  promotional: boolean;
}

export interface AirtimePromotion {
  id: string;
  title: string;
  description: string;
  discountPercentage?: number;
  validUntil: string;
}

export interface AirtimeVoucherData {
  networkId: string;
  networkName: string;
  voucherValues: AirtimeValue[];
  promotions: AirtimePromotion[];
  type: 'voucher';
  lastUpdated: string;
}

export interface AirtimeTopUpData {
  networkId: string;
  networkName: string;
  topUpValues: AirtimeValue[];
  promotions: AirtimePromotion[];
  type: 'topup';
  customAmount: {
    min: number;
    max: number;
    available: boolean;
  };
  lastUpdated: string;
}

export interface EeziAirtimeData {
  type: 'eeziAirtime';
  supplier: string;
  eeziValues: AirtimeValue[];
  promotions: AirtimePromotion[];
  customAmount: {
    min: number;
    max: number;
    available: boolean;
  };
  lastUpdated: string;
}

export interface GlobalService {
  id: string;
  name: string;
  description: string;
  type: string;
  supplier: string;
  available: boolean;
  icon: string;
}

export interface AirtimePurchaseResult {
  transactionId: string;
  status: 'completed' | 'failed';
  amount: number;
  networkId?: string;
  type: string;
  recipientPhone?: string;
  pin?: string;
  reference: string;
  completedAt: string;
}

// API Service Class
class ApiService {
  private normalizeSAMobileNumber(phoneNumber: string): string {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    let core = digits;
    if (core.startsWith('27')) core = core.slice(2);
    if (core.startsWith('0')) core = core.slice(1);
    core = core.slice(-9);
    return `+27${core}`; // backend stores with +27 per User model validation
  }
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
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
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Send Money APIs
  async resolveRecipient(identifier: string): Promise<RecipientInfo> {
    const response = await this.request<RecipientInfo>('/api/v1/send-money/resolve-recipient', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
    return response.data!
  }

  async getPaymentQuote(
    paymentMethodId: string,
    amount: number,
    recipient: string
  ): Promise<PaymentQuote> {
    const response = await this.request<PaymentQuote>('/api/v1/send-money/quote', {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId, amount, recipient }),
    });
    return response.data!
  }

  async initiateTransfer(
    paymentMethodId: string,
    amount: number,
    recipient: string,
    reference: string
  ): Promise<TransferResult> {
    const response = await this.request<TransferResult>('/api/v1/send-money/transfer', {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId, amount, recipient, reference }),
    });
    return response.data!
  }

  async getTransferStatus(transactionId: string): Promise<TransferStatus> {
    const response = await this.request<TransferStatus>(`/api/v1/send-money/status/${transactionId}`);
    return response.data!
  }

  // VAS and Supplier APIs
  async getVASServices(): Promise<any> {
    const response = await this.request('/api/v1/vas');
    return response.data;
  }

  async compareSuppliers(vasType: string, amount?: number, provider?: string): Promise<SupplierComparison> {
    const params = new URLSearchParams();
    if (amount) params.append('amount', amount.toString());
    if (provider) params.append('provider', provider);
    
    const response = await this.request<SupplierComparison>(`/api/v1/suppliers/compare/${vasType}?${params}`);
    // Backend returns { success, data: { ...comparison... } }; unwrap if nested
    const payload: any = response.data;
    return (payload && payload.data) ? payload.data : payload!;
  }

  async getTrendingProducts(vasType?: string): Promise<VASProduct[]> {
    const params = vasType ? `?vasType=${vasType}` : '';
    const response = await this.request<VASProduct[]>(`/api/v1/suppliers/trending${params}`);
    return response.data!
  }

  // User and Wallet APIs
  async getUserProfile(): Promise<any> {
    const response = await this.request('/api/v1/users/profile');
    return response.data;
  }

  async getWalletBalance(): Promise<any> {
    const response = await this.request('/api/v1/wallets/balance');
    return response.data;
  }

  async getRecentTransactions(limit: number = 10): Promise<any[]> {
    const response = await this.request<{ transactions: any[] }>(`/api/v1/wallets/transactions?limit=${limit}&page=1`);
    return (response as any).data?.transactions || [];
  }

  // KYC APIs
  async checkKYCStatus(): Promise<any> {
    const response = await this.request('/api/v1/kyc/status');
    return response.data;
  }

  // Health Check
  async healthCheck(): Promise<any> {
    const response = await this.request('/health');
    return response.data;
  }

  // QR Payment APIs
  async scanQRCode(qrCode: string, qrType?: string): Promise<QRCodeData> {
    const response = await this.request<QRCodeData>('/api/v1/qr/scan', {
      method: 'POST',
      body: JSON.stringify({ qrCode, qrType }),
    });
    return response.data!
  }

  async validateQRCode(qrCode: string, amount?: number): Promise<QRValidationResult> {
    const response = await this.request<QRValidationResult>('/api/v1/qr/validate', {
      method: 'POST',
      body: JSON.stringify({ qrCode, amount }),
    });
    return response.data!
  }

  async getQRMerchants(category?: string, qrType?: string): Promise<QRMerchant[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (qrType) params.append('qrType', qrType);
    
    const response = await this.request<{ merchants: QRMerchant[] }>(`/api/v1/qr/merchants?${params}`);
    return response.data!.merchants;
  }

  async getQRMerchantDetails(merchantId: string): Promise<QRMerchant> {
    const response = await this.request<{ merchant: QRMerchant }>(`/api/v1/qr/merchants/${merchantId}`);
    return response.data!.merchant;
  }

  async validateWalletAtMerchant(merchantId: string, walletId: string, amount: number): Promise<any> {
    const response = await this.request(`/api/v1/qr/merchants/${merchantId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ walletId, amount }),
    });
    return response.data;
  }

  async initiateQRPayment(qrCode: string, amount: number, walletId: string, reference?: string, tipAmount?: number): Promise<QRPaymentResult> {
    const response = await this.request<{ success: boolean; data: QRPaymentResult }>('/api/v1/qr/payment/initiate', {
      method: 'POST',
      body: JSON.stringify({ qrCode, amount, walletId, reference, tipAmount }),
    });
    return response.data?.data || (response.data as unknown as QRPaymentResult);
  }

  async confirmQRPayment(paymentId: string, otp?: string): Promise<any> {
    const response = await this.request('/api/v1/qr/payment/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentId, otp }),
    });
    return response.data;
  }

  async getQRPaymentStatus(paymentId: string): Promise<any> {
    const response = await this.request(`/api/v1/qr/payment/status/${paymentId}`);
    return response.data;
  }

  async generateQRCode(amount: number, merchantId?: string, reference?: string): Promise<any> {
    const response = await this.request('/api/v1/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ amount, merchantId, reference }),
    });
    return response.data;
  }

  async getQRServiceStatus(): Promise<any> {
    const response = await this.request('/api/v1/qr/status');
    return response.data;
  }

  // Wallet details (includes walletId)
  async getWalletDetails(): Promise<any> {
    const response = await this.request('/api/v1/wallets/details');
    return response.data;
  }

  // Wallet-to-wallet send (database-backed)
  async sendWalletToWallet(receiverPhoneNumber: string, amount: number, description?: string): Promise<any> {
    const normalized = this.normalizeSAMobileNumber(receiverPhoneNumber);
    const response = await this.request('/api/v1/wallets/send', {
      method: 'POST',
      body: JSON.stringify({ receiverPhoneNumber: normalized, amount, description }),
    });
    return response.data;
  }

  // Admin: get wallet by ID (used to resolve recipient phone for previous recipients)
  async getWalletById(walletId: string): Promise<any> {
    const response = await this.request(`/api/v1/wallets/${walletId}`);
    return (response.data as any)?.wallet;
  }

  // Beneficiaries API (for future backend integration)
  async getBeneficiaries(): Promise<any[]> {
    const response = await this.request('/api/v1/beneficiaries');
    return (response.data as any)?.beneficiaries || [];
  }

  async addBeneficiary(beneficiary: {
    name: string;
    identifier: string;
    accountType: 'mymoolah' | 'bank';
    bankName?: string;
  }): Promise<any> {
    const response = await this.request('/api/v1/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(beneficiary),
    });
    return response.data;
  }

  // Airtime API Methods
  async getAirtimeNetworks(): Promise<AirtimeNetwork[]> {
    const response = await this.request<{ networks: AirtimeNetwork[] }>('/api/v1/airtime/networks');
    return response.data!.networks;
  }

  async getAirtimeVoucherValues(networkId: string): Promise<AirtimeVoucherData> {
    const response = await this.request<AirtimeVoucherData>(`/api/v1/airtime/networks/${networkId}/voucher-values`);
    return response.data!
  }

  async getAirtimeTopUpValues(networkId: string): Promise<AirtimeTopUpData> {
    const response = await this.request<AirtimeTopUpData>(`/api/v1/airtime/networks/${networkId}/topup-values`);
    return response.data!
  }

  async getEeziAirtimeValues(): Promise<EeziAirtimeData> {
    const response = await this.request<EeziAirtimeData>('/api/v1/airtime/eezi-values');
    return response.data!
  }

  async getGlobalServices(): Promise<GlobalService[]> {
    const response = await this.request<{ services: GlobalService[] }>('/api/v1/airtime/global-services');
    return response.data!.services;
  }

  async purchaseAirtimeVoucher(networkId: string, amount: number, recipientPhone?: string): Promise<AirtimePurchaseResult> {
    const response = await this.request<AirtimePurchaseResult>('/api/v1/airtime/purchase/voucher', {
      method: 'POST',
      body: JSON.stringify({ networkId, amount, recipientPhone }),
    });
    return response.data!
  }

  async purchaseAirtimeTopUp(networkId: string, amount: number, recipientPhone: string): Promise<AirtimePurchaseResult> {
    const response = await this.request<AirtimePurchaseResult>('/api/v1/airtime/purchase/topup', {
      method: 'POST',
      body: JSON.stringify({ networkId, amount, recipientPhone }),
    });
    return response.data!
  }

  async purchaseEeziAirtime(amount: number, recipientPhone: string): Promise<AirtimePurchaseResult> {
    const response = await this.request<AirtimePurchaseResult>('/api/v1/airtime/purchase/eezi', {
      method: 'POST',
      body: JSON.stringify({ amount, recipientPhone }),
    });
    return response.data!
  }

  // Voucher API Methods (uses supplier comparison best-deals for deduped variants)
  async getVouchers(): Promise<{ vouchers: any[] }> {
    try {
      // Use comparison engine to dedupe and pick best supplier per product
      const comparison = await this.compareSuppliers('voucher');
      const sourceList =
        (comparison?.bestDeals && comparison.bestDeals.length > 0)
          ? comparison.bestDeals
          : (comparison?.products || []);

      const transformedVouchers = sourceList.map((product: any) => {
        const rawName = (product.productName || product.name || '').trim();
        const displayName = rawName
          .replace(/\s+Voucher$/, '')
          .replace('HollywoodBets', 'Hollywood\nBets');

        const minAmount = product.minAmount ?? product.price ?? product.min ?? 0;
        const maxAmount = product.maxAmount ?? product.price ?? product.max ?? minAmount;
        const supplierCode = (product.supplierCode || product.supplier?.code || '').toString().toUpperCase();

        const explicitDenominations =
          (Array.isArray(product.predefinedAmounts) ? product.predefinedAmounts : null) ||
          (Array.isArray(product.denominationOptions) ? product.denominationOptions : null) ||
          (Array.isArray(product.denominations) ? product.denominations : null) ||
          (Array.isArray(product.priceRange?.denominations) ? product.priceRange.denominations : null);

        const denominations = Array.isArray(explicitDenominations) && explicitDenominations.length > 0
          ? explicitDenominations
          : this.generateVoucherDenominations(minAmount, maxAmount);

        const voucherObj = {
          id: (product.variantId || product.id || product.supplierProductId || rawName).toString(),
          productId: product.productId, // Actual product ID for purchase
          variantId: product.variantId || product.id, // Variant ID for reference
          name: displayName,
          brand: product.brand?.name || product.provider || displayName,
          category: this.mapCategory(product.category || product.vasType || 'voucher'),
          minAmount,
          maxAmount,
          icon: this.getVoucherIcon(rawName || displayName),
          description: product.description || rawName || displayName,
          supplierCode,
          available: true, // Show best pick irrespective of supplier; purchase flow can branch as needed
          featured: product.isPromotional || product.featured || ['MMVoucher', 'Netflix', 'Google Play', 'DStv', 'Betway'].includes(displayName),
          denominations
        };

        return voucherObj;
      });

      return { vouchers: transformedVouchers };
    } catch (error) {
      console.error('❌ Error in getVouchers:', error);
      throw error;
    }
  }

  async purchaseVoucher(purchaseData: {
    productId: number;
    denomination: number;
    recipient?: {
      phone?: string;
      name?: string;
      email?: string;
    };
    idempotencyKey: string;
  }): Promise<{
    order?: any;
    message?: string;
    supplier?: any;
    product?: any;
    recipient?: any;
  }> {
    const response = await this.request<any>('/api/v1/products/purchase', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
    // Some endpoints wrap payload under `data`; unwrap if present
    const payload = (response as any)?.data?.data ?? (response as any)?.data ?? response;
    return payload;
  }

  async verifyMMWalletHolder(phoneNumber: string): Promise<{
    isValid: boolean;
    recipientName?: string;
  }> {
    const response = await this.request<{
      isValid: boolean;
      recipientName?: string;
    }>('/api/v1/wallets/verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
    return response.data!
  }

  // Helper method to map backend categories to frontend categories
  private mapCategory(backendCategory: string): 'Gaming' | 'Entertainment' | 'Transport' | 'Shopping' | 'MyMoolah' {
    const categoryMap: { [key: string]: 'Gaming' | 'Entertainment' | 'Transport' | 'Shopping' | 'MyMoolah' } = {
      'gaming': 'Gaming',
      'entertainment': 'Entertainment',
      'transport': 'Transport',
      'shopping': 'Shopping',
      'vouchers': 'MyMoolah',
      'music': 'Entertainment'
    };
    return categoryMap[backendCategory.toLowerCase()] || 'Entertainment';
  }

  // Helper method to get voucher icons
  private getVoucherIcon(voucherName: string): string {
    const iconMap: { [key: string]: string } = {
      'MMVoucher': '💰',
      '1Voucher': '🛒',
      'OTT Voucher': '🎬',
      'Betway Voucher': '🎯',
      'HollywoodBets Voucher': '🎰',
      'YesPlay Voucher': '🎲',
      'DStv Voucher': '📺',
      'Netflix Voucher': '🎭',
      'Fifa Mobile Gift Card': '⚽',
      'Intercape Voucher': '🚌',
      'Tenacity Voucher': '🏪',
      'Google Play Voucher': '📱',
      'Steam Gift Card': '🎮',
      'PlayStation Gift Card': '🎮',
      'Xbox Gift Card': '🎮',
      'Nintendo Gift Card': '🎮',
      'Spotify Gift Card': '🎵',
      'Apple Music Gift Card': '🎵'
    };
    return iconMap[voucherName] || '🎁';
  }

  // Helper method to generate voucher denominations based on min/max amounts
  private generateVoucherDenominations(minAmount: number, maxAmount: number): number[] {
    // If no min/max amounts, provide default denominations
    if (!minAmount && !maxAmount) {
      return [500, 1000, 2000, 5000, 10000, 20000]; // R5, R10, R20, R50, R100, R200
    }

    // If only min amount, create denominations from min to reasonable max
    if (minAmount && !maxAmount) {
      const denominations: number[] = [];
      let current = minAmount;
      while (current <= minAmount * 10 && current <= 50000) { // Max R500
        denominations.push(current);
        current *= 2;
      }
      return denominations;
    }

    // If only max amount, create denominations from reasonable min to max
    if (!minAmount && maxAmount) {
      const denominations: number[] = [];
      let current = Math.max(500, Math.floor(maxAmount / 10)); // Start at R5 or 1/10 of max
      while (current <= maxAmount) {
        denominations.push(current);
        current *= 2;
      }
      return denominations;
    }

    // If both min and max, create reasonable denominations between them
    if (minAmount && maxAmount) {
      const denominations: number[] = [];
      let current = minAmount;
      
      // Add min amount
      denominations.push(current);
      
      // Generate intermediate amounts
      while (current < maxAmount) {
        if (current < 1000) {
          current = Math.min(current * 2, maxAmount);
        } else if (current < 5000) {
          current = Math.min(current + 1000, maxAmount);
        } else if (current < 20000) {
          current = Math.min(current + 5000, maxAmount);
        } else {
          current = Math.min(current + 10000, maxAmount);
        }
        
        if (current <= maxAmount) {
          denominations.push(current);
        }
      }
      
      return denominations;
    }

    // Fallback to default denominations
    return [500, 1000, 2000, 5000, 10000, 20000];
  }

  // User Favorites API Methods
  async getUserFavorites(): Promise<{ favorites: any[]; count: number }> {
    const response = await this.request<{
      favorites: any[];
      count: number;
    }>('/api/v1/favorites');
    return response.data!
  }

  async addToFavorites(productId: string): Promise<{ favorite: any; message: string }> {
    const response = await this.request<{
      favorite: any;
      message: string;
    }>('/api/v1/favorites/add', {
      method: 'POST',
      body: JSON.stringify({ productId: parseInt(productId) }),
    });
    return response.data!
  }

  async removeFromFavorites(productId: string): Promise<{ removed: boolean; message: string }> {
    const response = await this.request<{
      removed: boolean;
      message: string;
    }>('/api/v1/favorites/remove', {
      method: 'POST',
      body: JSON.stringify({ productId: parseInt(productId) }),
    });
    return response.data!
  }

  async toggleFavorite(productId: string): Promise<{ isFavorite: boolean; action: string; message: string }> {
    const response = await this.request<{
      isFavorite: boolean;
      action: string;
      message: string;
    }>('/api/v1/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ productId: parseInt(productId) }),
    });
    return response.data!
  }

  async checkFavorite(productId: string): Promise<{ isFavorite: boolean }> {
    const response = await this.request<{
      isFavorite: boolean;
    }>(`/api/v1/favorites/check/${productId}`);
    return response.data!
  }

  async getFavoritesCount(): Promise<{ count: number }> {
    const response = await this.request<{
      count: number;
    }>('/api/v1/favorites/count');
    return response.data!
  }
}

// Export singleton instance
export const apiService = new ApiService();
