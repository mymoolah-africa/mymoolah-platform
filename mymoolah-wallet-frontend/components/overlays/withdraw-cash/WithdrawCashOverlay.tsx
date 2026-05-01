import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { apiService, ApiError, type OttPayoutProvider, type OttPayoutResult } from '../../../services/apiService';

type Step = 'details' | 'processing' | 'success' | 'error';

interface CashProvider extends OttPayoutProvider {
  helper: string;
}

const WALLET_MIN_CASH_AMOUNT = 50;
const WALLET_MAX_CASH_AMOUNT = 4000;
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 4000];

function formatOttPayoutError(error: ApiError): string {
  const supportCode = typeof error.payload?.error === 'string' ? error.payload.error : '';
  if (import.meta.env.DEV && supportCode && !error.message.includes(supportCode)) {
    return `${error.message} (${supportCode})`;
  }
  return error.message;
}

const FALLBACK_PROVIDERS: CashProvider[] = [
  {
    providerCode: '2',
    providerName: 'Standard Bank Instant Money',
    helper: 'You will receive a Standard Bank SMS with the PIN and instructions.',
    available: true,
    minAmount: WALLET_MIN_CASH_AMOUNT,
    maxAmount: WALLET_MAX_CASH_AMOUNT,
  },
  {
    providerCode: '112',
    providerName: 'ABSA CashSend',
    helper: 'You will receive an ABSA SMS with the PIN and instructions.',
    available: true,
    minAmount: WALLET_MIN_CASH_AMOUNT,
    maxAmount: WALLET_MAX_CASH_AMOUNT,
  },
  {
    providerCode: '10',
    providerName: 'Nedbank Cardless Cash Send',
    helper: 'You will receive a Nedbank SMS with the cash PIN and instructions.',
    available: true,
    minAmount: WALLET_MIN_CASH_AMOUNT,
    maxAmount: WALLET_MAX_CASH_AMOUNT,
  },
];

const CASH_PROVIDER_ALIASES: Record<string, string[]> = {
  '2': ['2', 'standard', 'instant money'],
  '112': ['112', 'absa', 'cashsend'],
  '10': ['10', 'nedbank', 'cardless'],
};

function formatRand(value: number): string {
  return `R${value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
}

export function WithdrawCashOverlay() {
  const navigate = useNavigate();

  const [providers, setProviders] = useState<CashProvider[]>(FALLBACK_PROVIDERS);
  const [selectedProviderCode, setSelectedProviderCode] = useState(FALLBACK_PROVIDERS[0].providerCode);
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<OttPayoutResult | null>(null);
  const [step, setStep] = useState<Step>('details');
  const [error, setError] = useState('');
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadProviders = async () => {
      try {
        setIsLoadingProviders(true);
        const activeProviders = await apiService.getOttPayoutProviders();
        if (!mounted || activeProviders.length === 0) return;

        const cashProviders = FALLBACK_PROVIDERS.map((fallback) => {
          const live = activeProviders.find((provider) => {
            const name = provider.providerName.toLowerCase();
            const code = provider.providerCode.toLowerCase();
            const aliases = CASH_PROVIDER_ALIASES[fallback.providerCode] || [];
            if (fallback.providerCode.toLowerCase() === code) return true;
            return aliases.some((alias) => code === alias || name.includes(alias));
          });
          return live ? { ...fallback, ...live, helper: fallback.helper, available: live.available } : fallback;
        });

        setProviders(cashProviders);
        const firstAvailable = cashProviders.find((provider) => provider.available);
        if (firstAvailable) setSelectedProviderCode(firstAvailable.providerCode);
      } catch (err) {
        console.warn('Could not load OTT cash providers, using configured fallback providers', err);
      } finally {
        if (mounted) setIsLoadingProviders(false);
      }
    };
    loadProviders();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.providerCode === selectedProviderCode) || providers[0],
    [providers, selectedProviderCode]
  );

  const amountNumber = Number(amount);
  const effectiveMinAmount = Math.max(WALLET_MIN_CASH_AMOUNT, selectedProvider?.minAmount || WALLET_MIN_CASH_AMOUNT);
  const effectiveMaxAmount = Math.min(WALLET_MAX_CASH_AMOUNT, selectedProvider?.maxAmount || WALLET_MAX_CASH_AMOUNT);
  const quickAmounts = QUICK_AMOUNTS.filter((value) => value >= effectiveMinAmount && value <= effectiveMaxAmount);

  const formError = useMemo(() => {
    if (!selectedProvider?.available) return 'Please choose an available cash provider.';
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return `Enter an amount from ${formatRand(effectiveMinAmount)} to ${formatRand(effectiveMaxAmount)}.`;
    }
    if (amountNumber < effectiveMinAmount) {
      return `Minimum amount is ${formatRand(effectiveMinAmount)}.`;
    }
    if (amountNumber > effectiveMaxAmount) {
      return `Maximum amount is ${formatRand(effectiveMaxAmount)}.`;
    }
    return '';
  }, [amountNumber, effectiveMaxAmount, effectiveMinAmount, selectedProvider]);

  const pollIfNeeded = async (payout: OttPayoutResult): Promise<OttPayoutResult> => {
    if (!payout.requiresPolling && payout.status !== 'processing') return payout;
    try {
      return await apiService.pollOttPayout(payout.payoutId);
    } catch {
      return payout;
    }
  };

  const handleSubmit = async () => {
    if (formError || isSubmitting) {
      if (formError) setError(formError);
      return;
    }
    setError('');
    setStep('processing');
    setIsSubmitting(true);
    try {
      const submitted = await apiService.submitOttPayout({
        amount: amountNumber,
        providerCode: selectedProvider.providerCode,
        providerName: selectedProvider.providerName,
        reference: `Withdraw cash - ${selectedProvider.providerName}`,
      });
      const finalResult = await pollIfNeeded(submitted);
      setResult(finalResult);
      setStep('success');
    } catch (err: any) {
      setError(err instanceof ApiError ? formatOttPayoutError(err) : 'Could not create the cash PIN. Please try again.');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReference = async () => {
    const ref = result?.uniqueReferenceId || result?.payoutId;
    if (!ref) return;
    await navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (step === 'processing') {
    return (
      <div role="dialog" aria-labelledby="withdraw-processing-title" style={{ padding: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
        <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: '65vh' }}>
          <Loader2 className="w-14 h-14 animate-spin text-[#86BE41] mb-4" />
          <h1 id="withdraw-processing-title" className="text-xl font-bold text-gray-900">Creating your cash PIN</h1>
          <p className="text-sm text-gray-600 mt-2 max-w-xs">Please wait. Do not close this screen while we process the request.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    const isCompleted = result?.status === 'completed';
    return (
      <div
        role="dialog"
        aria-labelledby="withdraw-success-title"
        style={{
          paddingTop: '1rem',
          paddingRight: '1rem',
          paddingBottom: '110px',
          paddingLeft: '1rem',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        <Button variant="ghost" onClick={() => navigate('/transact')} className="mb-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#86BE41]/10 flex items-center justify-center mb-2">
              <CheckCircle className="w-9 h-9 text-[#86BE41]" />
            </div>
            <CardTitle id="withdraw-success-title">
              {isCompleted ? 'Cash PIN requested' : 'Cash PIN is processing'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-[#86BE41]/30 bg-[#86BE41]/5">
              <ShieldCheck className="h-4 w-4 text-[#86BE41]" />
              <AlertDescription className="text-sm text-gray-700">
                Your cash PIN will be sent by SMS after the transaction is successful. Keep it private and follow the instructions in the provider SMS.
              </AlertDescription>
            </Alert>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Reference</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900 break-all">{result?.uniqueReferenceId || result?.payoutId}</p>
                <Button variant="outline" size="sm" onClick={copyReference}>
                  <Copy className="w-4 h-4 mr-1" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <Button onClick={() => navigate('/dashboard')} className="w-full bg-[#86BE41] hover:bg-[#75a938]">
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="withdraw-cash-title"
      style={{
        paddingTop: '1rem',
        paddingRight: '1rem',
        paddingBottom: '110px',
        paddingLeft: '1rem',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/transact')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <h1 id="withdraw-cash-title" className="text-xl font-bold text-gray-900">Withdraw Cash</h1>
        <div style={{ width: 56 }} />
      </div>

      {step === 'error' && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Choose where to get cash</CardTitle>
          <p className="text-sm text-gray-600">You receive the PIN by SMS after a successful transaction. The SMS will explain where and how to use it.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingProviders && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking available providers...
            </div>
          )}
          {providers.map((provider) => (
            <button
              key={provider.providerName}
              type="button"
              disabled={!provider.available}
              onClick={() => setSelectedProviderCode(provider.providerCode)}
              className={`w-full text-left rounded-xl border p-4 transition ${
                selectedProviderCode === provider.providerCode ? 'border-[#86BE41] bg-[#86BE41]/5' : 'border-gray-200 bg-white'
              } ${provider.available ? 'hover:border-[#86BE41]' : 'opacity-50'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{provider.providerName}</p>
                  <p className="text-xs text-gray-600 mt-1">{provider.helper}</p>
                </div>
                <span className="text-xs font-semibold text-gray-500">{provider.available ? 'Available' : 'Soon'}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Cash amount</CardTitle>
          <p className="text-sm text-gray-600">
            Choose an amount from {formatRand(effectiveMinAmount)} to {formatRand(effectiveMaxAmount)}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cash-amount">Amount</Label>
            <Input
              id="cash-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value.replace(/[^0-9.]/g, ''));
              }}
              placeholder={`${effectiveMinAmount}.00`}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={`min-h-[48px] rounded-2xl border px-3 text-sm font-semibold transition ${
                  amountNumber === value
                    ? 'border-[#86BE41] bg-[#86BE41]/10 text-[#4f7f22]'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-[#86BE41] hover:bg-[#86BE41]/5'
                }`}
                aria-pressed={amountNumber === value}
              >
                {formatRand(value)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && step !== 'error' && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div
        className="bg-white"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: '96px',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '343px',
          padding: '12px 0 16px',
          zIndex: 9999,
        }}
      >
        <Button onClick={handleSubmit} disabled={isSubmitting || !!formError} className="w-full bg-[#86BE41] hover:bg-[#75a938]">
          {isSubmitting ? 'Processing...' : 'Withdraw Cash'}
        </Button>
      </div>
    </div>
  );
}

