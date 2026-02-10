/**
 * Tap to Add Money Overlay
 * User taps their card on a device running Halo.Go to add money to their wallet.
 * Named for limited-education market: "Tap to Add Money" (VodaPay uses "Add money").
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import {
  createNfcDepositIntent,
  confirmNfcDeposit,
  getNfcHealth,
  type CreateIntentResponse,
} from '../../services/nfcService';

type Step = 'amount' | 'tap' | 'confirm' | 'success' | 'error';

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 5000;

export function TapToAddMoneyOverlay() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfcAvailable, setNfcAvailable] = useState<boolean | null>(null);

  const [paymentReference, setPaymentReference] = useState('');
  const [consumerTransactionId, setConsumerTransactionId] = useState('');
  const [successAmount, setSuccessAmount] = useState(0);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    getNfcHealth().then((res) => {
      if (res.success && res.data?.nfcDepositEnabled && res.data?.haloConfigured) {
        setNfcAvailable(true);
      } else {
        setNfcAvailable(false);
      }
    }).catch(() => setNfcAvailable(false));
  }, []);

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/[^0-9.]/g, ''));
    setError(null);
  };

  const handleQuickAmount = (val: number) => {
    setAmount(String(val));
    setError(null);
  };

  const handleCreateIntent = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < MIN_AMOUNT || num > MAX_AMOUNT) {
      setError(`Amount must be between R${MIN_AMOUNT} and R${MAX_AMOUNT}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res: CreateIntentResponse = await createNfcDepositIntent(num, 'ZAR');
      if (!res.success) {
        setError(res.error?.message || 'Could not start. Please try again.');
        return;
      }
      if (!res.data) {
        setError('No intent data received.');
        return;
      }

      setPaymentReference(res.data.paymentReference);
      setConsumerTransactionId(res.data.consumerTransactionId);
      setStep('tap');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTap = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await confirmNfcDeposit(paymentReference, 'success');
      if (!res.success) {
        setError(res.error?.message || 'Could not confirm. Please try again.');
        return;
      }
      if (res.data) {
        setSuccessAmount(res.data.amount);
        setTransactionId(res.data.transactionId || '');
        setStep('success');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (nfcAvailable === false) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 mb-4">
          <ArrowLeft size={20} /> Back
        </button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tap to Add Money is not available right now. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <button
        onClick={handleCancel}
        className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-800"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard size={24} style={{ color: '#86BE41' }} />
            Tap to Add Money
          </CardTitle>
          <p className="text-sm text-gray-600">
            Tap your card on a device with Halo.Go to add money to your wallet.
          </p>
        </CardHeader>
      </Card>

      {step === 'amount' && (
        <Card>
          <CardContent className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (ZAR)</label>
            <Input
              type="text"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="mb-4"
            />
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_AMOUNTS.map((val) => (
                <Button
                  key={val}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(val)}
                >
                  R{val}
                </Button>
              ))}
            </div>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              style={{ backgroundColor: '#86BE41' }}
              onClick={handleCreateIntent}
              disabled={isLoading || !amount}
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              Tap to Add Money
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'tap' && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700 mb-4">
              Open the <strong>Halo.Go</strong> app on this device and tap your card when prompted.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Amount: <strong>R{amount}</strong>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Don&apos;t have Halo.Go? Download it from the app store to use Tap to Add Money.
            </p>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              style={{ backgroundColor: '#86BE41' }}
              onClick={handleConfirmTap}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              I&apos;ve tapped my card
            </Button>
            <Button variant="outline" className="w-full mt-2" onClick={handleCancel}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'success' && (
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#86BE41' }} />
            <h3 className="font-semibold text-lg mb-2">Money added!</h3>
            <p className="text-2xl font-bold text-gray-800 mb-4">R{successAmount.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mb-4">
              Your wallet has been updated.
            </p>
            <Button
              className="w-full"
              style={{ backgroundColor: '#86BE41' }}
              onClick={() => navigate('/dashboard')}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
