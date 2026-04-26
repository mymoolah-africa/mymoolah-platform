/**
 * MyMoolah API Service Layer
 * Centralized API calls for TransactPage and SendMoneyPage
 */

import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

// API Base URL
const API_BASE = APP_CONFIG.API.baseUrl;

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  payload: Record<string, unknown>;

  constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
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

export interface WalletBankPaymentQuote {
  rail: 'eft' | 'payshap';
  amount: number;
  feeAmount: number;
  totalDebit: number;
  currency: string;
  settlementEstimate: {
    estimatedReceiverAvailabilityDate?: string;
    message: string;
    cutoffSast?: string;
  };
  beneficiary: {
    id: number;
    name: string;
    bankName?: string;
    accountNumberLast4?: string;
    branchCode?: string;
  };
}

export interface WalletBankPaymentResult {
  paymentId: string;
  status: 'processing' | 'completed' | 'failed';
  rail: 'eft' | 'payshap';
  amount: number;
  feeAmount: number;
  totalDebit: number;
  settlementEstimate: WalletBankPaymentQuote['settlementEstimate'];
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
    tipEnabled?: boolean;
    defaultTipPercent?: number | null;
    referenceEditable?: boolean;
    customReferenceLabel?: string | null;
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
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE}${endpoint}`;
      const token = getToken();

      const { headers: callerHeaders, ...restOptions } = options;

      const config: RequestInit = {
        ...restOptions,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(callerHeaders as Record<string, string>),
        },
      };

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const body = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
        const msg =
          (typeof body.message === 'string' && body.message) ||
          (typeof body.error === 'string' && body.error) ||
          `HTTP ${response.status}`;
        throw new ApiError(msg, response.status, body);
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
      headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
      body: JSON.stringify({ paymentMethodId, amount, recipient, reference }),
    });
    return response.data!
  }

  async quoteWalletBankPayment(
    beneficiaryAccountId: number,
    amount: number,
    rail: 'eft' | 'payshap'
  ): Promise<WalletBankPaymentQuote> {
    const response = await this.request<WalletBankPaymentQuote>('/api/v1/wallet-bank-payments/quote', {
      method: 'POST',
      body: JSON.stringify({ beneficiaryAccountId, amount, rail }),
    });
    return response.data!;
  }

  async submitWalletBankPayment(
    beneficiaryAccountId: number,
    amount: number,
    rail: 'eft' | 'payshap',
    reference?: string
  ): Promise<WalletBankPaymentResult> {
    const response = await this.request<WalletBankPaymentResult>('/api/v1/wallet-bank-payments/submit', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
      body: JSON.stringify({ beneficiaryAccountId, amount, rail, reference }),
    });
    return response.data!;
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
      headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
      body: JSON.stringify({ qrCode, amount, walletId, reference, tipAmount }),
    });
    return response.data?.data || (response.data as unknown as QRPaymentResult);
  }

  async confirmQRPayment(paymentId: string, otp?: string): Promise<any> {
    const response = await this.request('/api/v1/qr/payment/confirm', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
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
      headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
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
      headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
      body: JSON.stringify({ networkId, amount, recipientPhone }),
    });
    return response.data!
  }

  async purchaseAirtimeTopUp(networkId: string, amount: number, recipientPhone: string): Promise<AirtimePurchaseResult> {
    const response = await this.request<AirtimePurchaseResult>('/api/v1/airtime/purchase/topup', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
      body: JSON.stringify({ networkId, amount, recipientPhone }),
    });
    return response.data!
  }

  async purchaseEeziAirtime(amount: number, recipientPhone: string): Promise<AirtimePurchaseResult> {
    const response = await this.request<AirtimePurchaseResult>('/api/v1/airtime/purchase/eezi', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
      body: JSON.stringify({ amount, recipientPhone }),
    });
    return response.data!
  }

  /**
   * Purchase an eeziAirtime Token (PIN cash voucher) via Flash eezi-voucher endpoint.
   * Amount is in cents. Returns { pin, ref }.
   */
  async purchaseEeziToken(amountCents: number, idempotencyKey: string): Promise<{ pin: string; ref: string }> {
    const response = await this.request<any>('/api/v1/flash/eezi-voucher/purchase', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ reference: idempotencyKey, amount: amountCents }),
    });
    return this._extractEeziPinRef(response, idempotencyKey);
  }

  /**
   * Purchase an eeziPower Token (electricity PIN voucher) via Flash eezi-voucher endpoint.
   * Amount is in cents. Returns { pin, ref }.
   */
  async purchaseEeziPower(amountCents: number, idempotencyKey: string): Promise<{ pin: string; ref: string }> {
    const response = await this.request<any>('/api/v1/flash/eezi-voucher/purchase', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ reference: idempotencyKey, amount: amountCents, type: 'power' }),
    });
    return this._extractEeziPinRef(response, idempotencyKey);
  }

  private _extractEeziPinRef(response: any, idempotencyKey: string): { pin: string; ref: string } {
    const data = (response as any)?.data?.data ?? (response as any)?.data ?? response;
    // Backend normalizes PIN to data.pin; Flash eezi-voucher returns PIN in transaction.voucher
    const t = data?.transaction;
    const v = t?.voucher;
    const pin =
      data?.pin ||
      (v && (v.pin || v.pinNumber || v.voucherPin || v.token || v.code || v.serialNumber)) ||
      t?.pinNumber || t?.voucherPin || t?.pin || t?.code || t?.token || t?.serialNumber ||
      data?.pinNumber || data?.voucherPin || data?.pin || data?.code ||
      'No PIN returned';
    const ref =
      data?.transaction?.reference ||
      data?.transaction?.transactionId ||
      data?.reference ||
      idempotencyKey.slice(0, 12).toUpperCase();
    return { pin, ref };
  }

  async getVouchers(query?: string, category?: string): Promise<{ vouchers: any[]; categories?: any[]; total?: number }> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (category) params.append('category', category);
      const qs = params.toString();
      const url = `/api/v1/overlay/vouchers/catalog${qs ? `?${qs}` : ''}`;
      const response = await this.request<any>(url);
      const payload = response?.data?.data ?? response?.data ?? response;
      return {
        vouchers: payload?.vouchers || [],
        categories: payload?.categories || [],
        total: payload?.total || 0
      };
    } catch (error) {
      console.error('Error fetching voucher catalog:', error);
      throw error;
    }
  }


  // ─── Data bundle label extraction ────────────────────────────────────────────
  // Parses MobileMart product names like "Vodacom Daily WhatsApp 250MB R3"
  // into structured { name, dataSize, validity, category } for the UI.
  private extractDataBundleLabel(bundleName: string, network: string): {
    name: string; dataSize: string; validity: string; category: string;
  } {
    const n = bundleName || '';
    // Strip network prefix and trailing price (e.g. "R3", "R5.50")
    const stripped = n
      .replace(/^(Vodacom|MTN|CellC|Cell\s*C|Telkom)\s*/i, '')
      .replace(/\s*R\d+(\.\d+)?$/i, '')
      .trim();

    // Extract data size (e.g. "250MB", "1GB", "1.5GB")
    const sizeMatch = stripped.match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)/i);
    const dataSize = sizeMatch ? `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}` : '';

    // Extract validity
    let validity = '30 Days';
    const lower = stripped.toLowerCase();
    if (lower.includes('daily') || lower.includes('1 day')) validity = '1 Day';
    else if (lower.includes('three day') || lower.includes('3 day')) validity = '3 Days';
    else if (lower.includes('weekly') || lower.includes('7 day')) validity = '7 Days';
    else if (lower.includes('monthly') || lower.includes('30 day')) validity = '30 Days';

    // Detect category for icon selection
    let category = 'data';
    if (/whatsapp/i.test(n)) category = 'whatsapp';
    else if (/tiktok/i.test(n)) category = 'tiktok';
    else if (/facebook/i.test(n)) category = 'facebook';
    else if (/youtube/i.test(n)) category = 'youtube';
    else if (/instagram/i.test(n)) category = 'instagram';
    else if (/streaming/i.test(n)) category = 'streaming';
    else if (/all.?in.?one|all.?network/i.test(n)) category = 'allnetwork';
    else if (/lte/i.test(n)) category = 'lte';

    // Build human-readable name without network prefix
    const name = stripped || `${network} Data`;

    return { name, dataSize, validity, category };
  }

  // ─── Airtime / Data product enrichment ──────────────────────────────────────
  // Maps raw product name keywords → human-readable label, description, icon.
  private enrichAirtimeProduct(rawName: string, vasType: 'airtime' | 'data'): {
    label: string; description: string; icon: string; network: string;
  } | null {
    const n = rawName.toLowerCase();

    // ── Network detection ──────────────────────────────────────────────────
    const networkMap: Array<{ match: RegExp; network: string; label: string; color: string }> = [
      { match: /vodacom/i,                  network: 'Vodacom',    label: 'Vodacom',    color: 'red'    },
      { match: /\bmtn\b/i,                  network: 'MTN',        label: 'MTN',        color: 'yellow' },
      { match: /cell\s*c\b/i,               network: 'Cell C',     label: 'Cell C',     color: 'blue'   },
      { match: /telkom/i,                   network: 'Telkom',     label: 'Telkom',     color: 'blue'   },
      { match: /eezi\s*airtime|eeziairtime/i, network: 'eeziAirtime', label: 'eeziAirtime', color: 'green' },
    ];

    for (const nm of networkMap) {
      if (nm.match.test(rawName)) {
        // Avoid double-suffix: "eeziAirtime" already contains "Airtime", don't append again
        const alreadyHasSuffix = (suffix: string) =>
          nm.label.toLowerCase().endsWith(suffix.toLowerCase());

        if (vasType === 'airtime') {
          return {
            label: alreadyHasSuffix('Airtime') ? nm.label : `${nm.label} Airtime`,
            description: `${nm.label} prepaid airtime — top up any ${nm.label} number instantly`,
            icon: '📱',
            network: nm.network,
          };
        } else {
          return {
            label: alreadyHasSuffix('Data') ? nm.label : `${nm.label} Data`,
            description: `${nm.label} mobile data bundle — browse, stream and connect`,
            icon: '📶',
            network: nm.network,
          };
        }
      }
    }
    return null; // no match — caller uses raw name
  }

  /**
   * Fetch and normalise airtime + data products from the comparison engine.
   *
   * Applies the same business rules as getVouchers():
   *   - Fixed-denomination variants of the same network+supplier are collapsed
   *     into a single card with a denominations[] array.
   *   - If a variable (own-amount) variant exists for the same network+supplier,
   *     it wins and fixed variants are suppressed.
   *
   * Returns two arrays ready for SmartProductGrid.
   */
  async getAirtimeDataProducts(): Promise<{
    airtime: any[];
    data: any[];
    globalPin: any[];
  }> {
    const [airtimeComparison, dataComparison, pinComparison] = await Promise.all([
      this.compareSuppliers('airtime'),
      this.compareSuppliers('data'),
      this.compareSuppliers('international_pin').catch(() => ({ bestDeals: [] })),
    ]);

    const transformProducts = (sourceList: any[], vasType: 'airtime' | 'data'): any[] => {
      // ── Normalise ────────────────────────────────────────────────────────
      const normalised = sourceList.map((p: any) => {
        const rawName = (p.productName || p.name || '').trim();
        const enriched = this.enrichAirtimeProduct(rawName, vasType);
        const bundleName: string = p.metadata?.mobilemart_product_name || rawName;

        const minAmount: number = p.minAmount ?? p.price ?? 0;
        const maxAmount: number = p.maxAmount ?? p.price ?? minAmount;
        const supplierCode: string = (p.supplierCode || p.supplier?.code || '').toString().toUpperCase();

        const explicitDenominations: number[] =
          (Array.isArray(p.predefinedAmounts) && p.predefinedAmounts.length > 0 ? p.predefinedAmounts : null) ||
          (Array.isArray(p.denominations)     && p.denominations.length > 0     ? p.denominations     : null) ||
          [];

        const networkLabel = enriched ? enriched.label : rawName;

        return {
          id: (p.id || p.variantId || p.supplierProductId || rawName).toString(),
          productId: p.productId,
          variantId: p.id || p.variantId,
          rawName,
          bundleName,
          name: networkLabel,
          description: enriched ? enriched.description : (p.description || rawName),
          icon: enriched ? enriched.icon : (vasType === 'airtime' ? '📱' : '📶'),
          network: enriched ? enriched.network : '',
          networkKey: networkLabel.toLowerCase().trim(),
          supplierCode,
          minAmount,
          maxAmount,
          denominations: explicitDenominations,
          vasType,
          isBestDeal: p.isBestDeal || false,
          isPopular: p.isPopular || false,
          commission: parseFloat(p.commission) || 0,
          supplierProductId: p.supplierProductId,
          metadata: p.metadata || {},
        };
      });

      // ── Group by NETWORK only (merge all suppliers into one card per network)
      const grouped = new Map<string, typeof normalised>();
      for (const p of normalised) {
        if (!grouped.has(p.networkKey)) grouped.set(p.networkKey, []);
        grouped.get(p.networkKey)!.push(p);
      }

      if (vasType === 'airtime') {
        // Airtime: collapse to ONE variable-amount card per network
        return Array.from(grouped.values()).map((group) => {
          const mobilemart = group.find(p => p.supplierCode === 'MOBILEMART');
          const best = mobilemart
            || group.reduce((a, b) => (b.commission > a.commission ? b : a), group[0]);

          const allMin = group.map(p => p.minAmount).filter(v => v > 0);
          const widestMin = allMin.length > 0 ? Math.min(...allMin) : best.minAmount;
          const effectiveMin = Math.max(widestMin, 200);   // floor R2
          const effectiveMax = 99900;                       // cap R999
          return {
            ...best,
            isVariable: true,
            denominations: [],
            minAmount: effectiveMin,
            maxAmount: effectiveMax,
            price: effectiveMin / 100,
            size: `R${(effectiveMin / 100).toFixed(0)}–R${(effectiveMax / 100).toFixed(0)}`,
            type: vasType,
            validity: 'Immediate',
            provider: best.network || best.supplierCode,
          };
        });
      }

      // Data: return individual product rows (not collapsed), sorted by price
      const allDataProducts: any[] = [];
      for (const group of grouped.values()) {
        // Deduplicate by price within the same network — keep highest commission
        const byPrice = new Map<number, any>();
        for (const p of group) {
          const price = p.minAmount;
          const existing = byPrice.get(price);
          if (!existing || p.commission > existing.commission) {
            byPrice.set(price, p);
          }
        }
        for (const p of byPrice.values()) {
          const bundleLabel = this.extractDataBundleLabel(p.bundleName, p.network);
          allDataProducts.push({
            ...p,
            isVariable: false,
            denominations: [p.minAmount],
            price: p.minAmount / 100,
            size: bundleLabel.dataSize || `${(p.minAmount / 100).toFixed(0)}MB`,
            bundleLabel: bundleLabel.name,
            bundleCategory: bundleLabel.category,
            type: vasType,
            validity: bundleLabel.validity,
            provider: p.network || p.supplierCode,
          });
        }
      }
      allDataProducts.sort((a, b) => a.minAmount - b.minAmount);
      return allDataProducts;
    };

    const airtime = transformProducts(airtimeComparison?.bestDeals || [], 'airtime');
    const data    = transformProducts(dataComparison?.bestDeals    || [], 'data');

    // Global PIN — just normalise names, no grouping needed (each is a distinct product)
    // price in CENTS: GlobalPinModal formatPrice() and purchase denomination expect cents
    const globalPin = (pinComparison?.bestDeals || []).map((p: any) => ({
      id: p.id || p.productId || p.variantId,
      name: (p.productName || p.name || '').replace(/\s+Token$/i, '').trim(),
      price: p.minAmount || 0,
      maxPrice: p.maxAmount || p.minAmount || 0,
      supplierCode: (p.supplierCode || '').toUpperCase(),
      denominations: p.denominations || p.predefinedAmounts || [],
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      variantId: p.id,
      productId: p.productId,
      supplierProductId: p.supplierProductId,
    }));

    return { airtime, data, globalPin };
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
    pin?: string;
    code?: string;
    [key: string]: any;
  }> {
    const response = await this.request<any>('/api/v1/products/purchase', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': (purchaseData as any).idempotencyKey || generateIdempotencyKey() },
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

  // ============================================
  // Password Reset & Phone Change API Methods
  // ============================================

  /**
   * Request password reset OTP
   * @param phoneNumber - User's phone number
   */
  async requestPasswordReset(phoneNumber: string): Promise<{ message: string; expiresInMinutes?: number }> {
    const response = await this.request<{
      message: string;
      expiresInMinutes?: number;
    }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
    return response.data!;
  }

  /**
   * Reset password with OTP
   * @param phoneNumber - User's phone number
   * @param otp - 6-digit OTP
   * @param newPassword - New password
   */
  async resetPassword(phoneNumber: string, otp: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.request<{
      message: string;
    }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otp, newPassword }),
    });
    return response.data!;
  }

  /**
   * Request phone number change OTP (authenticated)
   * @param newPhoneNumber - New phone number to verify
   */
  async requestPhoneChange(newPhoneNumber: string): Promise<{ message: string; expiresInMinutes?: number }> {
    const response = await this.request<{
      message: string;
      expiresInMinutes?: number;
    }>('/api/v1/auth/request-phone-change', {
      method: 'POST',
      body: JSON.stringify({ newPhoneNumber }),
    });
    return response.data!;
  }

  /**
   * Verify phone number change with OTP (authenticated)
   * @param newPhoneNumber - New phone number
   * @param otp - 6-digit OTP
   */
  async verifyPhoneChange(newPhoneNumber: string, otp: string): Promise<{ message: string; newPhoneNumber: string }> {
    const response = await this.request<{
      message: string;
      newPhoneNumber: string;
    }>('/api/v1/auth/verify-phone-change', {
      method: 'POST',
      body: JSON.stringify({ newPhoneNumber, otp }),
    });
    return response.data!;
  }

  // ============================================
  // Referral System API Methods
  // ============================================

  /**
   * Get user's referral dashboard data
   */
  async getReferralDashboard(): Promise<ReferralDashboard> {
    const response = await this.request<ReferralDashboard>('/api/v1/referrals/dashboard');
    return response.data!;
  }

  /**
   * Get user's referral network (referrals by level)
   */
  async getReferralNetwork(): Promise<ReferralNetwork> {
    const response = await this.request<ReferralNetwork>('/api/v1/referrals/network');
    return response.data!;
  }

  /**
   * Get user's referral earnings history
   */
  async getReferralEarnings(params?: { page?: number; limit?: number }): Promise<ReferralEarningsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const queryString = queryParams.toString();
    const url = `/api/v1/referrals/earnings${queryString ? `?${queryString}` : ''}`;
    const response = await this.request<ReferralEarningsResponse>(url);
    return response.data!;
  }

  /**
   * Get user's payout history
   */
  async getReferralPayouts(params?: { page?: number; limit?: number }): Promise<ReferralPayoutsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const queryString = queryParams.toString();
    const url = `/api/v1/referrals/payouts${queryString ? `?${queryString}` : ''}`;
    const response = await this.request<ReferralPayoutsResponse>(url);
    return response.data!;
  }

  /**
   * Send referral invite via SMS
   */
  async sendReferralInvite(phoneNumber: string, language?: string): Promise<{ message: string; success: boolean }> {
    const response = await this.request<{
      message: string;
      success: boolean;
    }>('/api/v1/referrals/invite', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, language: language || 'en' }),
    });
    return response.data!;
  }
}

// Referral Types
export interface ReferralDashboard {
  referralCode: string;
  shareUrl: string;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    pendingReferrals: number;
    totalEarnings: number;
    monthlyEarnings: number;
    pendingEarnings: number;
    referralsByLevel: {
      level1: number;
      level2: number;
      level3: number;
    };
  };
  recentEarnings: Array<{
    id: number;
    amount: number;
    level: number;
    status: string;
    createdAt: string;
    referralName?: string;
  }>;
}

export interface ReferralNetwork {
  levels: {
    level1: ReferralInfo[];
    level2: ReferralInfo[];
    level3: ReferralInfo[];
  };
  totals: {
    level1: number;
    level2: number;
    level3: number;
  };
}

export interface ReferralInfo {
  id: number;
  name: string;
  joinedAt: string;
  isActive: boolean;
  totalTransactions: number;
  totalEarnings: number;
}

export interface ReferralEarningsResponse {
  earnings: Array<{
    id: number;
    amount: number;
    level: number;
    status: string;
    transactionId: number;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReferralPayoutsResponse {
  payouts: Array<{
    id: number;
    amount: number;
    status: string;
    processedAt: string;
    transactionId?: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Export singleton instance
export const apiService = new ApiService();

// Also export as default for convenience
export default apiService;
