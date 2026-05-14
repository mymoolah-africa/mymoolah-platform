import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { apiService, ApiError, type OttPayoutProvider, type OttPayoutQuote, type OttPayoutResult } from '../../../services/apiService';
import { BrandSpinner } from '../../common/LoadingSpinner';

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

function isFailedPayoutStatus(status?: string): boolean {
  return ['failed', 'cancelled', 'canceled', 'reversed', 'ledger_post_failed'].includes(String(status || '').toLowerCase());
}

function formatPayoutStatusError(payout: OttPayoutResult): string {
  const status = String(payout.status || '').replace(/_/g, ' ');
  if (payout.rejectionReason) return payout.rejectionReason;
  return `The cash withdrawal ${status || 'could not be completed'}. Your wallet will show the reversal if funds were already reserved.`;
}

const FALLBACK_PROVIDERS: CashProvider[] = [
  {
    providerCode: '112',
    providerName: 'ABSA CashSend',
    helper: 'You will receive an ABSA SMS with the PIN and instructions.',
    available: false,
    minAmount: WALLET_MIN_CASH_AMOUNT,
    maxAmount: WALLET_MAX_CASH_AMOUNT,
  },
  {
    providerCode: '10',
    providerName: 'Nedbank Cardless Cash Send',
    helper: 'You will receive a Nedbank SMS with the cash PIN and instructions.',
    available: false,
    minAmount: WALLET_MIN_CASH_AMOUNT,
    maxAmount: WALLET_MAX_CASH_AMOUNT,
  },
];

const CASH_PROVIDER_ALIASES: Record<string, string[]> = {
  '112': ['112', 'absa', 'cashsend'],
  '10': ['10', 'nedbank', 'cardless', 'cardless withdrawal'],
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
  const [providerLoadError, setProviderLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quote, setQuote] = useState<OttPayoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadProviders = async () => {
      try {
        setIsLoadingProviders(true);
        setProviderLoadError('');
        const activeProviders = await apiService.getOttPayoutProviders();
        if (!mounted) return;

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
        if (!firstAvailable) setProviderLoadError('Cash PIN providers are not available right now. Please try again later.');
      } catch (err) {
        console.warn('Could not load OTT cash providers', err);
        if (mounted) setProviderLoadError('Cash PIN providers are not available right now. Please try again later.');
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
    if (isLoadingQuote) {
      return 'Checking the fee before you continue.';
    }
    if (quoteError) {
      return quoteError;
    }
    if (!quote) {
      return 'We must check the fee before you continue.';
    }
    return '';
  }, [amountNumber, effectiveMaxAmount, effectiveMinAmount, isLoadingQuote, quote, quoteError, selectedProvider]);

  useEffect(() => {
    let cancelled = false;

    const canQuote = selectedProvider?.available &&
      Number.isFinite(amountNumber) &&
      amountNumber >= effectiveMinAmount &&
      amountNumber <= effectiveMaxAmount;

    setQuote(null);
    setQuoteError('');
    if (!canQuote) {
      setIsLoadingQuote(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingQuote(true);
    const timer = window.setTimeout(async () => {
      try {
        const nextQuote = await apiService.quoteOttPayout(amountNumber, selectedProvider.providerCode);
        if (!cancelled) setQuote(nextQuote);
      } catch {
        if (!cancelled) setQuoteError('We could not check the fee for this cash provider. Please try again.');
      } finally {
        if (!cancelled) setIsLoadingQuote(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [amountNumber, effectiveMaxAmount, effectiveMinAmount, selectedProvider]);

  const pollIfNeeded = async (payout: OttPayoutResult): Promise<OttPayoutResult> => {
    if (!payout.requiresPolling && payout.status !== 'processing') return payout;
    try {
      return await apiService.pollOttPayout(payout.payoutId, payout);
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
      if (isFailedPayoutStatus(finalResult.status)) {
        throw new Error(formatPayoutStatusError(finalResult));
      }
      setResult(finalResult);
      setStep('success');
    } catch (err: any) {
      setError(err instanceof ApiError ? formatOttPayoutError(err) : (err instanceof Error ? err.message : 'Could not create the cash PIN. Please try again.'));
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
          <BrandSpinner
            size={56}
            label="Creating your cash PIN"
            subtitle="Please wait. Do not close this screen while we process the request."
          />
          <h1 id="withdraw-processing-title" className="sr-only">Creating your cash PIN</h1>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    const isCompleted = String(result?.status || '').toLowerCase() === 'completed';
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
                {isCompleted
                  ? 'Your cash PIN request is successful. The provider SMS contains the collection PIN and instructions. Keep it private.'
                  : 'Your cash PIN is still processing. The provider SMS will arrive once the transaction completes. Keep it private and follow the provider instructions.'}
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
          {!isLoadingProviders && providerLoadError && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-700">{providerLoadError}</AlertDescription>
            </Alert>
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
                <span className="text-xs font-semibold text-gray-500">{provider.available ? 'Available' : 'Unavailable'}</span>
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

      {selectedProvider?.available && amountNumber >= effectiveMinAmount && amountNumber <= effectiveMaxAmount && (
        <Card className="mb-4">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Cash amount</span>
              <span className="font-semibold">{formatRand(amountNumber)}</span>
            </div>
            {isLoadingQuote && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking fee...
              </div>
            )}
            {quote && !isLoadingQuote && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Transaction fee</span>
                  <span className="font-semibold">R{(quote.providerFeeAmount + quote.mmtpFeeAmount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-base">
                  <span className="font-semibold text-gray-900">Total from wallet</span>
                  <span className="font-bold text-gray-900">R{quote.totalDebit.toFixed(2)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
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

