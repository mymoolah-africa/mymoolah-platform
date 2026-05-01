import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { useAuth } from '../../../contexts/AuthContext';
import { apiService, ApiError, type OttPayoutProvider, type OttPayoutQuote, type OttPayoutResult } from '../../../services/apiService';

type Step = 'details' | 'confirm' | 'processing' | 'success' | 'error';

interface CashProvider extends OttPayoutProvider {
  helper: string;
}

const FALLBACK_PROVIDERS: CashProvider[] = [
  {
    providerCode: '2',
    providerName: 'Standard Bank Instant Money',
    helper: 'You will receive a Standard Bank SMS with the PIN and instructions.',
    available: true,
  },
  {
    providerCode: '112',
    providerName: 'ABSA CashSend',
    helper: 'You will receive an ABSA SMS with the PIN and instructions.',
    available: true,
  },
  {
    providerCode: 'NEDBANK',
    providerName: 'Nedbank Cardless Cash Send',
    helper: 'Nedbank will show here once the active OTT provider code is returned.',
    available: false,
  },
];

function normalizeMobile(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('27')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+27${digits.slice(1)}`;
  if (digits.length === 9) return `+27${digits}`;
  return value;
}

function splitName(name: string): { firstName: string; surname: string } {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', surname: '' };
  if (parts.length === 1) return { firstName: parts[0], surname: '' };
  return { firstName: parts[0], surname: parts.slice(1).join(' ') };
}

export function WithdrawCashOverlay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const defaultName = splitName(user?.name || '');

  const [providers, setProviders] = useState<CashProvider[]>(FALLBACK_PROVIDERS);
  const [selectedProviderCode, setSelectedProviderCode] = useState(FALLBACK_PROVIDERS[0].providerCode);
  const [amount, setAmount] = useState('');
  const [firstName, setFirstName] = useState(defaultName.firstName);
  const [surname, setSurname] = useState(defaultName.surname);
  const [mobile, setMobile] = useState(normalizeMobile(user?.phoneNumber || user?.identifier || ''));
  const [idNumber, setIdNumber] = useState('');
  const [quote, setQuote] = useState<OttPayoutQuote | null>(null);
  const [result, setResult] = useState<OttPayoutResult | null>(null);
  const [step, setStep] = useState<Step>('details');
  const [error, setError] = useState('');
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
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
            if (fallback.providerCode.toLowerCase() === code) return true;
            if (fallback.providerName.toLowerCase().includes('standard')) return name.includes('standard');
            if (fallback.providerName.toLowerCase().includes('absa')) return name.includes('absa');
            if (fallback.providerName.toLowerCase().includes('nedbank')) return name.includes('nedbank');
            return false;
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
  const quickAmounts = [50, 100, 200, 300, 500];

  const formError = useMemo(() => {
    if (!selectedProvider?.available) return 'Please choose an available cash provider.';
    if (!Number.isFinite(amountNumber) || amountNumber < 1) return 'Enter the cash amount.';
    if (selectedProvider.minAmount && amountNumber < selectedProvider.minAmount) {
      return `Minimum amount for ${selectedProvider.providerName} is R${selectedProvider.minAmount.toFixed(2)}.`;
    }
    if (selectedProvider.maxAmount && amountNumber > selectedProvider.maxAmount) {
      return `Maximum amount for ${selectedProvider.providerName} is R${selectedProvider.maxAmount.toFixed(2)}.`;
    }
    if (!firstName.trim()) return 'Enter your first name.';
    if (!surname.trim()) return 'Enter your surname.';
    if (!/^(\+27|27|0)[6-8][0-9]{8}$/.test(mobile.replace(/\s/g, ''))) return 'Enter a valid South African mobile number.';
    if (!/^\d{13}$/.test(idNumber.trim())) return 'Enter your 13-digit South African ID number.';
    return '';
  }, [amountNumber, firstName, idNumber, mobile, selectedProvider, surname]);

  const handleQuote = async () => {
    setError('');
    if (formError) {
      setError(formError);
      return;
    }
    try {
      setIsQuoting(true);
      const nextQuote = await apiService.quoteOttPayout(amountNumber, selectedProvider.providerCode);
      setQuote(nextQuote);
      setStep('confirm');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Could not get a quote. Please try again.');
    } finally {
      setIsQuoting(false);
    }
  };

  const pollIfNeeded = async (payout: OttPayoutResult): Promise<OttPayoutResult> => {
    if (!payout.requiresPolling && payout.status !== 'processing') return payout;
    try {
      return await apiService.pollOttPayout(payout.payoutId);
    } catch {
      return payout;
    }
  };

  const handleSubmit = async () => {
    if (!quote || formError) return;
    setError('');
    setStep('processing');
    setIsSubmitting(true);
    try {
      const submitted = await apiService.submitOttPayout({
        amount: amountNumber,
        providerCode: selectedProvider.providerCode,
        providerName: selectedProvider.providerName,
        recipient: {
          firstName: firstName.trim(),
          surname: surname.trim(),
          mobile: normalizeMobile(mobile),
          idType: 'RSAID',
          idNumber: idNumber.trim(),
          title: 'MR',
          countryOfIssue: 'ZA',
          nationality: 'ZA',
        },
        reference: `Withdraw cash - ${selectedProvider.providerName}`,
      });
      const finalResult = await pollIfNeeded(submitted);
      setResult(finalResult);
      setStep('success');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Could not create the cash PIN. Please try again.');
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
          <p className="text-sm text-gray-600 mt-2 max-w-xs">Please wait. Do not close this screen while we confirm the request.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    const isCompleted = result?.status === 'completed';
    return (
      <div role="dialog" aria-labelledby="withdraw-success-title" style={{ padding: '1rem', fontFamily: 'Montserrat, sans-serif', paddingBottom: '110px' }}>
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
    <div role="dialog" aria-labelledby="withdraw-cash-title" style={{ padding: '1rem', fontFamily: 'Montserrat, sans-serif', paddingBottom: '110px' }}>
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
                setQuote(null);
              }}
              placeholder="100.00"
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {quickAmounts.map((value) => (
              <Button key={value} type="button" variant="outline" onClick={() => { setAmount(String(value)); setQuote(null); }}>
                R{value}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
          <p className="text-sm text-gray-600">OTT needs these details to create the cash PIN and send the provider SMS.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first-name">First name</Label>
              <Input id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="surname">Surname</Label>
              <Input id="surname" value={surname} onChange={(event) => setSurname(event.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="mobile">Mobile number for SMS</Label>
            <Input id="mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="id-number">SA ID number</Label>
            <Input id="id-number" inputMode="numeric" maxLength={13} value={idNumber} onChange={(event) => setIdNumber(event.target.value.replace(/\D/g, ''))} />
          </div>
        </CardContent>
      </Card>

      {error && step !== 'error' && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {step === 'confirm' && quote && (
        <Card className="mb-4 border-[#86BE41]/30 bg-[#86BE41]/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Cash amount</span><strong>R{quote.amount.toFixed(2)}</strong></div>
            <div className="flex justify-between text-sm"><span>Provider fee</span><strong>R{quote.providerFeeAmount.toFixed(2)}</strong></div>
            <div className="flex justify-between text-sm"><span>MyMoolah fee</span><strong>R{quote.mmtpFeeAmount.toFixed(2)}</strong></div>
            <div className="flex justify-between text-base border-t pt-2"><span>Total from wallet</span><strong>R{quote.totalDebit.toFixed(2)}</strong></div>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-24 bg-white pt-3">
        {step === 'confirm' && quote ? (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep('details')} disabled={isSubmitting}>Change</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !!formError} className="bg-[#86BE41] hover:bg-[#75a938]">
              {isSubmitting ? 'Creating...' : 'Confirm'}
            </Button>
          </div>
        ) : (
          <Button onClick={handleQuote} disabled={isQuoting || !!formError} className="w-full bg-[#86BE41] hover:bg-[#75a938]">
            {isQuoting ? 'Checking fees...' : 'Check fees'}
          </Button>
        )}
      </div>
    </div>
  );
}

