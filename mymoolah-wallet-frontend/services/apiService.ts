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

  /**
   * Purchase an eeziAirtime Token (PIN cash voucher) via Flash eezi-voucher endpoint.
   * Amount is in cents. Returns { pin, ref }.
   */
  async purchaseEeziToken(amountCents: number, idempotencyKey: string): Promise<{ pin: string; ref: string }> {
    const response = await this.request<any>('/api/v1/flash/eezi-voucher/purchase', {
      method: 'POST',
      body: JSON.stringify({ reference: idempotencyKey, amount: amountCents }),
    });
    const data = (response as any)?.data?.data ?? (response as any)?.data ?? response;
    // Backend normalizes PIN to data.pin; also check nested transaction/data/result
    const t = data?.transaction;
    const pin =
      data?.pin ||
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

  // Voucher API Methods (uses supplier comparison best-deals for deduped variants)
  async getVouchers(): Promise<{ vouchers: any[] }> {
    try {
      // Use comparison engine to dedupe and pick best supplier per product
      const comparison = await this.compareSuppliers('voucher');
      const sourceList =
        (comparison?.bestDeals && comparison.bestDeals.length > 0)
          ? comparison.bestDeals
          : (comparison?.products || []);

      // ── Product enrichment table ─────────────────────────────────────────────
      // Maps raw supplier product name keywords → human-readable display info.
      // Matched case-insensitively against the raw product name.
      interface ProductMeta { label: string; description: string; icon: string; category: string; }
      const PRODUCT_META: Array<{ match: RegExp; meta: ProductMeta }> = [
        // ── Streaming / entertainment ─────────────────────────────────────────
        { match: /netflix/i,          meta: { label: 'Netflix',           description: 'Netflix streaming gift card — top up your Netflix account',               icon: '🎭', category: 'Entertainment' } },
        { match: /dstv/i,             meta: { label: 'DStv',              description: 'DStv subscription payment — pay your DStv account',                       icon: '📺', category: 'Entertainment' } },
        { match: /showmax/i,          meta: { label: 'Showmax',           description: 'Showmax streaming gift card',                                              icon: '🎬', category: 'Entertainment' } },
        { match: /spotify/i,          meta: { label: 'Spotify',           description: 'Spotify music gift card — top up your Spotify Premium',                   icon: '🎵', category: 'Entertainment' } },
        { match: /apple\s*music/i,    meta: { label: 'Apple Music',       description: 'Apple Music gift card — top up your Apple Music subscription',            icon: '🎵', category: 'Entertainment' } },
        { match: /itunes/i,           meta: { label: 'iTunes',            description: 'iTunes / Apple gift card — use on App Store, Apple Music, iCloud',        icon: '🍎', category: 'Entertainment' } },
        // Apple credit ($10/$30) — must come AFTER itunes/apple music checks
        { match: /\$\d+\s*credit/i,   meta: { label: 'Apple Credit',      description: 'Apple App Store / iTunes credit — use for apps, music, movies & more',   icon: '🍎', category: 'Entertainment' } },
        { match: /ott/i,              meta: { label: 'OTT Voucher',       description: 'OTT streaming voucher — use on supported streaming platforms',            icon: '🎬', category: 'Entertainment' } },

        // ── Gaming ────────────────────────────────────────────────────────────
        { match: /pubg|battleground/i,meta: { label: 'PUBG Mobile',       description: 'PUBG Mobile UC (Unknown Cash) — in-game currency for PUBG Mobile',       icon: '🎮', category: 'Gaming' } },
        { match: /\buc\b/i,           meta: { label: 'PUBG Mobile UC',    description: 'PUBG Mobile UC (Unknown Cash) — in-game currency for PUBG Mobile',       icon: '🎮', category: 'Gaming' } },
        { match: /free\s*fire|diamond/i, meta: { label: 'Free Fire',      description: 'Free Fire Diamonds — in-game currency for Garena Free Fire',             icon: '💎', category: 'Gaming' } },
        { match: /roblox/i,           meta: { label: 'Roblox',            description: 'Roblox gift card — buy Robux or a Roblox Premium subscription',          icon: '🟥', category: 'Gaming' } },
        { match: /steam/i,            meta: { label: 'Steam',             description: 'Steam Wallet gift card — add funds to your Steam account',                icon: '🎮', category: 'Gaming' } },
        { match: /playstation|psn/i,  meta: { label: 'PlayStation',       description: 'PlayStation Store gift card — buy games, DLC & PS Plus',                 icon: '🎮', category: 'Gaming' } },
        { match: /xbox/i,             meta: { label: 'Xbox',              description: 'Xbox gift card — buy games, add-ons & Xbox Game Pass',                   icon: '🎮', category: 'Gaming' } },
        { match: /nintendo/i,         meta: { label: 'Nintendo',          description: 'Nintendo eShop gift card — buy games & DLC on Nintendo Switch',          icon: '🎮', category: 'Gaming' } },
        { match: /razer\s*gold/i,     meta: { label: 'Razer Gold',        description: 'Razer Gold — universal gaming credits for 2 000+ games worldwide',       icon: '🎮', category: 'Gaming' } },
        { match: /fifa/i,             meta: { label: 'EA Sports FC',      description: 'EA Sports FC (FIFA) gift card — buy FC Points for Ultimate Team',        icon: '⚽', category: 'Gaming' } },
        { match: /google\s*play/i,    meta: { label: 'Google Play',       description: 'Google Play gift card — buy apps, games, movies & books on Android',     icon: '📱', category: 'Gaming' } },

        // ── Betting / entertainment ───────────────────────────────────────────
        { match: /hollywoodbets|hollywood\s*bets/i, meta: { label: 'Hollywood Bets', description: 'Hollywood Bets voucher — deposit funds into your Hollywood Bets account', icon: '🎰', category: 'Entertainment' } },
        { match: /yesplay/i,          meta: { label: 'YesPlay',           description: 'YesPlay voucher — deposit funds into your YesPlay betting account',       icon: '🎲', category: 'Entertainment' } },
        { match: /betway/i,           meta: { label: 'Betway',            description: 'Betway voucher — deposit funds into your Betway betting account',         icon: '🎯', category: 'Entertainment' } },

        // ── Transport ─────────────────────────────────────────────────────────
        { match: /intercape/i,        meta: { label: 'Intercape',         description: 'Intercape bus ticket voucher — travel between major SA cities',           icon: '🚌', category: 'Transport' } },
        { match: /uber/i,             meta: { label: 'Uber',              description: 'Uber gift card — pay for Uber rides or Uber Eats orders',                 icon: '🚗', category: 'Transport' } },
        { match: /bolt/i,             meta: { label: 'Bolt',              description: 'Bolt gift card — pay for Bolt rides',                                     icon: '⚡', category: 'Transport' } },

        // ── Retail / shopping ─────────────────────────────────────────────────
        { match: /tenacity/i,         meta: { label: 'Tenacity',          description: 'Tenacity retail voucher — use at Jet, Legit, Exact & other Tenacity stores', icon: '🏪', category: 'Shopping' } },
        { match: /talk360/i,          meta: { label: 'Talk360',           description: 'Talk360 international calling credit — call any number worldwide',        icon: '📞', category: 'Entertainment' } },

        // ── MyMoolah / generic ────────────────────────────────────────────────
        { match: /mmvoucher|mm\s*voucher/i, meta: { label: 'MyMoolah Voucher', description: 'MyMoolah digital voucher — redeem cash at any MyMoolah agent',     icon: '💰', category: 'MyMoolah' } },
        { match: /1voucher/i,         meta: { label: '1Voucher',          description: '1Voucher — a secure cash voucher accepted at thousands of online stores', icon: '🛒', category: 'Shopping' } },
        { match: /wallet\s*code|steam.*wallet/i, meta: { label: 'Steam Wallet', description: 'Steam Wallet top-up code — add funds to your Steam account',      icon: '🎮', category: 'Gaming' } },
      ];

      /** Return enriched meta for a raw product name, or null if no match */
      const enrichProduct = (rawName: string): ProductMeta | null => {
        for (const entry of PRODUCT_META) {
          if (entry.match.test(rawName)) return entry.meta;
        }
        return null;
      };

      // ── Step 1: Normalise each raw product into a typed shape ──────────────────
      interface NormalisedProduct {
        id: string;
        productId: any;
        variantId: any;
        rawName: string;
        displayName: string;
        brandKey: string;       // normalised key used for grouping (brand + supplier)
        supplierCode: string;
        minAmount: number;
        maxAmount: number;
        isVariable: boolean;    // true = own-amount entry field
        denominations: number[];
        category: any;
        icon: string;
        description: string;
        featured: boolean;
      }

      const normalisedList: NormalisedProduct[] = sourceList.map((product: any) => {
        const rawName = (product.productName || product.name || '').trim();
        const enriched = enrichProduct(rawName);

        // Strip range suffixes/prefixes from display name (used as fallback when no enrichment)
        const strippedName = rawName
          .replace(/\s+Voucher$/i, '')
          .replace(/\s+Gift\s+Card$/i, '')
          .replace(/\s+Token$/i, '')
          .replace(/\s+R\d+\s*[-–]\s*R\d+\s*$/i, '')
          .replace(/^R\d+\s*[-–]\s*R\d+\s+/i, '')
          .replace(/\s+R\d+$/i, '')
          .replace(/^R\d+\s+/i, '')
          .replace(/\(\d+\s*months?\)/i, '')
          .replace('HollywoodBets', 'Hollywood Bets')
          .trim();

        const displayName = enriched ? enriched.label : strippedName;

        const minAmount = product.minAmount ?? product.price ?? product.min ?? 0;
        const maxAmount = product.maxAmount ?? product.price ?? product.max ?? minAmount;
        const supplierCode = (product.supplierCode || product.supplier?.code || '').toString().toUpperCase();

        // A product is "variable" when min < max and it has no fixed denominations list
        const explicitDenominations: number[] =
          (Array.isArray(product.predefinedAmounts) && product.predefinedAmounts.length > 0
            ? product.predefinedAmounts
            : null) ||
          (Array.isArray(product.denominationOptions) && product.denominationOptions.length > 0
            ? product.denominationOptions
            : null) ||
          (Array.isArray(product.denominations) && product.denominations.length > 0
            ? product.denominations
            : null) ||
          [];

        // Fixed = has explicit denominations OR min === max (single price point)
        // Variable = min < max AND no explicit denominations
        const isVariable = explicitDenominations.length === 0 && minAmount < maxAmount;

        // Grouping key: normalised display name + supplier (so Flash R50 and MobileMart R50 stay separate)
        const brandKey = `${displayName.toLowerCase().replace(/\s+/g, ' ').trim()}::${supplierCode}`;

        return {
          id: (product.variantId || product.id || product.supplierProductId || rawName).toString(),
          productId: product.productId,
          variantId: product.variantId || product.id,
          rawName,
          displayName,
          brandKey,
          supplierCode,
          minAmount,
          maxAmount,
          isVariable,
          denominations: explicitDenominations,
          category: enriched ? enriched.category : this.mapCategory(product.category || product.vasType || 'voucher'),
          icon: enriched ? enriched.icon : this.getVoucherIcon(rawName || displayName),
          description: enriched ? enriched.description : (product.description || displayName),
          featured: product.isPromotional || product.featured ||
            ['MyMoolah Voucher', 'Netflix', 'Google Play', 'DStv', 'Betway'].includes(displayName),
        };
      });

      // ── Step 2: Group by brandKey ────────────────────────────────────────────
      // Collect all variants per brand+supplier combination
      const grouped = new Map<string, NormalisedProduct[]>();
      for (const p of normalisedList) {
        if (!grouped.has(p.brandKey)) grouped.set(p.brandKey, []);
        grouped.get(p.brandKey)!.push(p);
      }

      // ── Step 3: Collapse each group into one card ────────────────────────────
      // Business rule:
      //   • If the group contains a variable product → show ONLY the variable card
      //     (suppress all fixed-denomination variants of the same brand/supplier)
      //   • If no variable exists → merge all fixed denominations into one card
      const transformedVouchers = Array.from(grouped.values()).map((group) => {
        const variableVariant = group.find(p => p.isVariable);

        if (variableVariant) {
          // Use the variable product as the card; ignore fixed siblings
          return {
            id: variableVariant.id,
            productId: variableVariant.productId,
            variantId: variableVariant.variantId,
            name: variableVariant.displayName,
            brand: variableVariant.displayName,
            category: variableVariant.category,
            minAmount: variableVariant.minAmount,
            maxAmount: variableVariant.maxAmount,
            isVariable: true,
            icon: variableVariant.icon,
            description: variableVariant.description,
            supplierCode: variableVariant.supplierCode,
            available: true,
            featured: variableVariant.featured,
            denominations: [],   // empty → modal shows free-text input
          };
        }

        // All fixed: merge denominations from every variant in the group
        const base = group[0];
        const allDenoms = Array.from(
          new Set(
            group.flatMap(p =>
              p.denominations.length > 0
                ? p.denominations
                : [p.minAmount]   // single-price product → treat its price as a denomination
            )
          )
        ).sort((a, b) => a - b);

        return {
          id: base.id,
          productId: base.productId,
          variantId: base.variantId,
          name: base.displayName,
          brand: base.displayName,
          category: base.category,
          minAmount: Math.min(...allDenoms),
          maxAmount: Math.max(...allDenoms),
          isVariable: false,
          icon: base.icon,
          description: base.description,
          supplierCode: base.supplierCode,
          available: true,
          featured: group.some(p => p.featured),
          denominations: allDenoms,  // populated → modal shows denomination buttons
        };
      });

      return { vouchers: transformedVouchers };
    } catch (error) {
      console.error('❌ Error in getVouchers:', error);
      throw error;
    }
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

        const minAmount: number = p.minAmount ?? p.price ?? 0;
        const maxAmount: number = p.maxAmount ?? p.price ?? minAmount;
        const supplierCode: string = (p.supplierCode || p.supplier?.code || '').toString().toUpperCase();

        const explicitDenominations: number[] =
          (Array.isArray(p.predefinedAmounts) && p.predefinedAmounts.length > 0 ? p.predefinedAmounts : null) ||
          (Array.isArray(p.denominations)     && p.denominations.length > 0     ? p.denominations     : null) ||
          [];

        const isVariable = explicitDenominations.length === 0 && minAmount < maxAmount;

        // Group key: network label + supplier (keeps Flash MTN separate from MobileMart MTN)
        const networkLabel = enriched ? enriched.label : rawName;
        const brandKey = `${networkLabel.toLowerCase().trim()}::${supplierCode}`;

        return {
          id: (p.id || p.variantId || p.supplierProductId || rawName).toString(),
          productId: p.productId,
          variantId: p.id || p.variantId,
          rawName,
          name: enriched ? enriched.label : rawName,
          description: enriched ? enriched.description : (p.description || rawName),
          icon: enriched ? enriched.icon : (vasType === 'airtime' ? '📱' : '📶'),
          network: enriched ? enriched.network : '',
          brandKey,
          supplierCode,
          minAmount,
          maxAmount,
          isVariable,
          denominations: explicitDenominations,
          vasType,
          isBestDeal: p.isBestDeal || false,
          isPopular: p.isPopular || false,
          commission: p.commission || 0,
          supplierProductId: p.supplierProductId,
        };
      });

      // ── Group by brandKey ────────────────────────────────────────────────
      const grouped = new Map<string, typeof normalised>();
      for (const p of normalised) {
        if (!grouped.has(p.brandKey)) grouped.set(p.brandKey, []);
        grouped.get(p.brandKey)!.push(p);
      }

      // ── Collapse each group ──────────────────────────────────────────────
      return Array.from(grouped.values()).map((group) => {
        const variableVariant = group.find(p => p.isVariable);
        if (variableVariant) {
          return {
            ...variableVariant,
            isVariable: true,
            denominations: [],
            // price in rands (formatCurrency expects rands)
            price: variableVariant.minAmount / 100,
            size: `R${(variableVariant.minAmount / 100).toFixed(0)}–R${(variableVariant.maxAmount / 100).toFixed(0)}`,
            type: vasType,
            validity: vasType === 'airtime' ? 'Immediate' : '30 days',
            provider: variableVariant.network || variableVariant.supplierCode,
          };
        }

        const base = group[0];
        // allDenoms stays in cents (used for denomination buttons and purchase API)
        const allDenoms = Array.from(
          new Set(group.flatMap(p => p.denominations.length > 0 ? p.denominations : [p.minAmount]))
        ).sort((a, b) => a - b);

        return {
          ...base,
          isVariable: false,
          denominations: allDenoms,   // cents — used for denomination picker & purchase
          minAmount: Math.min(...allDenoms),
          maxAmount: Math.max(...allDenoms),
          // price in rands (formatCurrency expects rands); shows lowest denom on card
          price: allDenoms[0] / 100,
          size: allDenoms.length === 1
            ? `R${(allDenoms[0] / 100).toFixed(0)}`
            : `R${(allDenoms[0] / 100).toFixed(0)}–R${(allDenoms[allDenoms.length - 1] / 100).toFixed(0)}`,
          type: vasType,
          validity: vasType === 'airtime' ? 'Immediate' : '30 days',
          provider: base.network || base.supplierCode,
        };
      });
    };

    const airtime = transformProducts(airtimeComparison?.bestDeals || [], 'airtime');
    const data    = transformProducts(dataComparison?.bestDeals    || [], 'data');

    // Global PIN — just normalise names, no grouping needed (each is a distinct product)
    const globalPin = (pinComparison?.bestDeals || []).map((p: any) => ({
      id: p.id || p.productId || p.variantId,
      name: (p.productName || p.name || '').replace(/\s+Token$/i, '').trim(),
      // price in rands (formatCurrency expects rands); minAmount from DB is in cents
      price: (p.minAmount || 0) / 100,
      maxPrice: (p.maxAmount || p.minAmount || 0) / 100,
      supplierCode: (p.supplierCode || '').toUpperCase(),
      denominations: p.denominations || p.predefinedAmounts || [],
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      variantId: p.id,
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
   * Get user's referral code
   */
  async getReferralCode(): Promise<{ referralCode: string; shareUrl: string }> {
    const response = await this.request<{
      referralCode: string;
      shareUrl: string;
    }>('/api/v1/referrals/code');
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
