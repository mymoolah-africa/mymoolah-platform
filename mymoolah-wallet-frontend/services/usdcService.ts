/**
 * USDC Service
 * 
 * Frontend service for USDC purchase and transfer API calls
 */

import { apiService } from './apiService';

export interface UsdcRate {
  pair: string;
  bidPrice: number;
  askPrice: number;
  midPrice: number;
  lastTrade: number;
  timestamp: string;
  cacheTtl: number;
}

export interface UsdcQuote {
  zarAmount: number;
  usdcAmount: number;
  exchangeRate: number;
  platformFee: number;
  platformFeeVat: number;
  networkFee: number;
  total: number;
  expiresAt: string;
  valrOrderId: string;
}

export interface UsdcTransaction {
  id: number;
  transactionId: string;
  zarAmount: number;
  usdcAmount: string;
  exchangeRate: string;
  platformFee: number;
  beneficiaryName: string;
  beneficiaryWalletAddress: string;
  beneficiaryCountry: string;
  blockchainTxHash?: string;
  blockchainStatus: string;
  explorerUrl?: string;
  status: string;
  createdAt: string;
}

export interface AddressValidation {
  address: string;
  valid: boolean;
  isOnCurve?: boolean;
  reason?: string;
  warning?: string;
  knownPattern?: {
    type: string;
    name: string;
    warning: string;
  };
}

export interface SendParams {
  zarAmount: number;
  beneficiaryId: number;
  purpose?: string;
  idempotencyKey?: string;
}

export interface SendResult {
  success: boolean;
  status?: 'compliance_hold' | 'success';
  message?: string;
  data?: {
    transactionId: string;
    zarAmount: number;
    usdcAmount: string;
    beneficiaryName: string;
    beneficiaryWalletAddress: string;
    blockchainTxHash?: string;
    blockchainStatus: string;
    valrWithdrawalId: string;
    explorerUrl?: string;
  };
  error?: {
    code: string;
    message: string;
    limitDetails?: any;
    requiredTier?: number;
    currentTier?: number;
  };
}

class UsdcService {
  /**
   * Get current USDC/ZAR exchange rate
   */
  async getRate(): Promise<UsdcRate> {
    const response = await apiService.request<UsdcRate>('/api/v1/usdc/rate');
    if (!response.data) {
      throw new Error('Failed to get exchange rate');
    }
    return response.data;
  }

  /**
   * Get quote for USDC purchase
   * 
   * @param zarAmount - Amount in ZAR
   */
  async getQuote(zarAmount: number): Promise<UsdcQuote> {
    const response = await apiService.request<{ data?: UsdcQuote } & UsdcQuote>('/api/v1/usdc/quote', {
      method: 'POST',
      body: JSON.stringify({ zarAmount })
    });
    if (!response.data) {
      throw new Error('Failed to get quote');
    }
    // API returns { success, data: { zarAmount, usdcAmount, exchangeRate, ... } }; unwrap to quote object
    const payload = response.data as { data?: UsdcQuote };
    const quote = payload?.data ?? (response.data as UsdcQuote);
    return quote;
  }

  /**
   * Execute USDC buy and send
   * 
   * @param params - Send parameters
   */
  async send(params: SendParams): Promise<SendResult> {
    try {
      const response = await apiService.request<any>('/api/v1/usdc/send', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      
      if (response.data) {
        // API returns { success, data: { transactionId, ... } }; unwrap so overlay gets flat payload
        const payload = (response.data as any)?.data ?? response.data;
        return {
          success: true,
          data: payload
        };
      }
      
      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: 'Failed to send USDC'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'SEND_FAILED',
          message: error.message || 'Failed to send USDC'
        }
      };
    }
  }

  /**
   * Get USDC transaction history
   * 
   * @param options - Query options
   */
  async getTransactions(options: { limit?: number; offset?: number; status?: string } = {}): Promise<UsdcTransaction[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.status) params.append('status', options.status);
    
    const url = `/api/v1/usdc/transactions${params.toString() ? '?' + params.toString() : ''}`;
    const response = await apiService.request<UsdcTransaction[]>(url);
    
    if (!response.data) {
      throw new Error('Failed to get transactions');
    }
    return response.data;
  }

  /**
   * Get transaction details by ID
   * 
   * @param transactionId - Transaction ID
   */
  async getTransaction(transactionId: string): Promise<UsdcTransaction> {
    const response = await apiService.request<UsdcTransaction>(`/api/v1/usdc/transactions/${transactionId}`);
    
    if (!response.data) {
      throw new Error('Transaction not found');
    }
    return response.data;
  }

  /**
   * Validate Solana wallet address
   * 
   * @param address - Solana address to validate
   */
  async validateAddress(address: string): Promise<AddressValidation> {
    const response = await apiService.request<AddressValidation>('/api/v1/usdc/validate-address', {
      method: 'POST',
      body: JSON.stringify({ address })
    });
    
    if (!response.data) {
      return {
        address,
        valid: false,
        reason: 'Validation failed'
      };
    }
    return response.data;
  }

  /**
   * Health check for USDC service
   */
  async healthCheck(): Promise<{ status: string; healthy: boolean }> {
    try {
      const response = await apiService.request<any>('/api/v1/usdc/health');
      return {
        status: response.data?.status || 'unknown',
        healthy: !!response.data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        healthy: false
      };
    }
  }
}

export const usdcService = new UsdcService();
