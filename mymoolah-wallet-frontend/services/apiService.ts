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
    reference?: string;
    description?: string;
  };
  timestamp: string;
}

export interface QRPayment {
  id: string;
  qrCode: string;
  amount: number;
  walletId: string;
  reference: string;
  merchant: QRMerchant;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  expiresAt: string;
}

export interface QRPaymentResult {
  paymentId: string;
  payment: QRPayment;
  nextStep: string;
  timestamp: string;
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

      return data;
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
    return response.data!;
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
    return response.data!;
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
    return response.data!;
  }

  async getTransferStatus(transactionId: string): Promise<TransferStatus> {
    const response = await this.request<TransferStatus>(`/api/v1/send-money/status/${transactionId}`);
    return response.data!;
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
    return response.data!;
  }

  async getTrendingProducts(vasType?: string): Promise<VASProduct[]> {
    const params = vasType ? `?vasType=${vasType}` : '';
    const response = await this.request<VASProduct[]>(`/api/v1/suppliers/trending${params}`);
    return response.data!;
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
    return response.data!;
  }

  async validateQRCode(qrCode: string, amount?: number): Promise<QRValidationResult> {
    const response = await this.request<QRValidationResult>('/api/v1/qr/validate', {
      method: 'POST',
      body: JSON.stringify({ qrCode, amount }),
    });
    return response.data!;
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

  async initiateQRPayment(qrCode: string, amount: number, walletId: string, reference?: string): Promise<QRPaymentResult> {
    const response = await this.request<QRPaymentResult>('/api/v1/qr/payment/initiate', {
      method: 'POST',
      body: JSON.stringify({ qrCode, amount, walletId, reference }),
    });
    return response.data!;
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
    return response.data?.wallet;
  }

  // Beneficiaries API (for future backend integration)
  async getBeneficiaries(): Promise<any[]> {
    const response = await this.request('/api/v1/beneficiaries');
    return response.data?.beneficiaries || [];
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
}

// Export singleton instance
export const apiService = new ApiService();
