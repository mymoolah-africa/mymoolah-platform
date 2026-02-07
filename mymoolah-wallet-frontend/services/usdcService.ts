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
    const response = await apiService.get<{ success: boolean; data: UsdcRate }>('/usdc/rate');
    if (!response.success || !response.data) {
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
    const response = await apiService.post<{ success: boolean; data: UsdcQuote }>('/usdc/quote', {
      zarAmount
    });
    
    if (!response.success || !response.data) {
      throw new Error('Failed to get quote');
    }
    return response.data;
  }

  /**
   * Execute USDC buy and send
   * 
   * @param params - Send parameters
   */
  async send(params: SendParams): Promise<SendResult> {
    try {
      const response = await apiService.post<SendResult>('/usdc/send', params);
      return response;
    } catch (error: any) {
      // API service already wraps errors, but ensure we return proper structure
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
    
    const url = `/usdc/transactions${params.toString() ? '?' + params.toString() : ''}`;
    const response = await apiService.get<{ success: boolean; data: UsdcTransaction[] }>(url);
    
    if (!response.success || !response.data) {
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
    const response = await apiService.get<{ success: boolean; data: UsdcTransaction }>(`/usdc/transactions/${transactionId}`);
    
    if (!response.success || !response.data) {
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
    const response = await apiService.post<{ success: boolean; data: AddressValidation }>('/usdc/validate-address', {
      address
    });
    
    if (!response.success || !response.data) {
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
      const response = await apiService.get<{ success: boolean; data: any }>('/usdc/health');
      return {
        status: response.data?.status || 'unknown',
        healthy: response.success
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
