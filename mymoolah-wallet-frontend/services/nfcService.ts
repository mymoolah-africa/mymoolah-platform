/**
 * NFC Deposit (Tap to Add Money) API Service
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

export interface CreateIntentResponse {
  success: boolean;
  data?: {
    consumerTransactionId: string;
    jwt: string;
    paymentReference: string;
    amount: number;
    currencyCode: string;
    expiresAt: string;
  };
  error?: { code: string; message: string };
}

export interface ConfirmDepositResponse {
  success: boolean;
  data?: {
    amount: number;
    transactionId: string;
    walletId: string;
    alreadyProcessed?: boolean;
  };
  error?: { code: string; message: string };
}

export interface NfcHealthResponse {
  success: boolean;
  data?: {
    nfcDepositEnabled: boolean;
    haloConfigured: boolean;
    status: 'ready' | 'degraded';
  };
}

export async function createNfcDepositIntent(amount: number, currencyCode = 'ZAR'): Promise<CreateIntentResponse> {
  const token = getToken();
  const res = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/nfc/deposit/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, currencyCode }),
  });
  return res.json();
}

export async function confirmNfcDeposit(paymentReference: string, result: 'success' | 'failed'): Promise<ConfirmDepositResponse> {
  const token = getToken();
  const res = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/nfc/deposit/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ paymentReference, result }),
  });
  return res.json();
}

export async function getNfcHealth(): Promise<NfcHealthResponse> {
  const token = getToken();
  const res = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/nfc/health`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
