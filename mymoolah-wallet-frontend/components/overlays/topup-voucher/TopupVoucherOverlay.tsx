import React, { useState } from 'react';
import { ArrowLeft, Ticket, CheckCircle, AlertTriangle, Info, Banknote, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { APP_CONFIG } from '../../../config/app-config';
import { getToken as getSessionToken } from '../../../utils/authToken';
import { BrandSpinner } from '../../common/LoadingSpinner';

type VoucherType = '1voucher' | 'fnb' | 'flashpay';
type Step = 'select' | 'pin' | 'processing' | 'success' | 'error';

interface RedeemResult {
  faceValue: number;
  fee: number;
  feeRate: string;
  netDeposit: number;
  transactionId: string;
  reference: string;
}

const VOUCHER_OPTIONS: { id: VoucherType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    id: '1voucher',
    label: '1Voucher',
    description: 'Redeem a 1Voucher PIN purchased at any retail store',
    icon: <Ticket className="w-6 h-6" />,
    color: '#2563eb',
  },
  {
    id: 'fnb',
    label: 'FNB Voucher',
    description: 'Redeem an FNB eWallet voucher PIN',
    icon: <Banknote className="w-6 h-6" />,
    color: '#059669',
  },
  {
    id: 'flashpay',
    label: 'Flash Pay',
    description: 'Redeem a Flash Pay deposit reference',
    icon: <Zap className="w-6 h-6" />,
    color: '#d97706',
  },
];

const FEE_PCT_EXCL_VAT = 4;
const FEE_TOTAL_PCT = 4.6;

export function TopupVoucherOverlay() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<VoucherType | null>(null);
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<{ pin?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelectType = (type: VoucherType) => {
    setSelectedType(type);
    setCurrentStep('pin');
    setPin('');
    setErrors({});
  };

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    setPin(cleaned);
    if (cleaned.length === 16) {
      setErrors(prev => ({ ...prev, pin: undefined }));
    }
  };

  const formatPin = (raw: string): string => {
    return raw.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleSubmit = async () => {
    if (pin.length !== 16) {
      setErrors({ pin: 'PIN must be exactly 16 digits' });
      return;
    }
    if (!selectedType) return;

    setIsSubmitting(true);
    setCurrentStep('processing');

    try {
      const token = getSessionToken();
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/flash/voucher-topup/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pin, voucherType: selectedType }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to redeem voucher');
      }

      setResult(data.data);
      setCurrentStep('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Voucher redemption failed. Please check your voucher PIN and try again.');
      setCurrentStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'pin') {
      setCurrentStep('select');
      setSelectedType(null);
      setPin('');
      setErrors({});
    } else {
      navigate(-1);
    }
  };

  const handleDone = () => {
    navigate('/dashboard');
  };

  const handleRetry = () => {
    setCurrentStep('pin');
    setErrorMessage('');
    setPin('');
  };

  const selectedOption = VOUCHER_OPTIONS.find(o => o.id === selectedType);

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', padding: '16px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#374151' }} />
        </button>
        <div>
          <h2 style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '18px',
            color: '#111827', margin: 0,
          }}>
            Top-up with Voucher
          </h2>
          <p style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', margin: 0,
          }}>
            Add money to your wallet using a voucher PIN
          </p>
        </div>
      </div>

      {/* ── Step 1: Select Voucher Type ── */}
      {currentStep === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Info className="w-4 h-4" style={{ color: '#16a34a' }} />
            <AlertDescription style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#166534' }}>
              A {FEE_PCT_EXCL_VAT}% + VAT redemption fee applies. You'll receive R{(100 - FEE_TOTAL_PCT).toFixed(2)} per R100 voucher in your wallet.
            </AlertDescription>
          </Alert>

          {VOUCHER_OPTIONS.map(opt => (
            <Card
              key={opt.id}
              onClick={() => handleSelectType(opt.id)}
              style={{
                cursor: 'pointer',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = opt.color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${opt.color}40`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <CardContent style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  backgroundColor: `${opt.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: opt.color, flexShrink: 0,
                }}>
                  {opt.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '14px',
                    color: '#111827', margin: 0,
                  }}>
                    {opt.label}
                  </p>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280',
                    margin: '2px 0 0',
                  }}>
                    {opt.description}
                  </p>
                </div>
                <ArrowLeft className="w-4 h-4" style={{ color: '#9ca3af', transform: 'rotate(180deg)' }} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Step 2: Enter PIN ── */}
      {currentStep === 'pin' && selectedOption && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selected type badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px', backgroundColor: `${selectedOption.color}08`,
            borderRadius: '10px', border: `1px solid ${selectedOption.color}20`,
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: `${selectedOption.color}15`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: selectedOption.color,
            }}>
              {selectedOption.icon}
            </div>
            <div>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '13px', color: '#111827', margin: 0 }}>
                {selectedOption.label}
              </p>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: '#6b7280', margin: 0 }}>
                {FEE_PCT_EXCL_VAT}% + VAT fee applies
              </p>
            </div>
          </div>

          {/* PIN input */}
          <div>
            <Label style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '13px', color: '#374151' }}>
              Voucher PIN
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatPin(pin)}
              onChange={e => handlePinChange(e.target.value)}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 600,
                letterSpacing: '2px', textAlign: 'center', marginTop: '6px',
                padding: '14px', borderRadius: '10px',
                ...(errors.pin ? { borderColor: '#ef4444' } : {}),
              }}
            />
            {errors.pin && (
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                {errors.pin}
              </p>
            )}
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
              Enter the 16-digit PIN from your voucher
            </p>
          </div>

          {/* Fee notice */}
          <Alert style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <Info className="w-4 h-4" style={{ color: '#d97706' }} />
            <AlertDescription style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#92400e' }}>
              A {FEE_PCT_EXCL_VAT}% + VAT redemption fee will be deducted. For a R100 voucher, R{FEE_TOTAL_PCT.toFixed(2)} fee is deducted and R{(100 - FEE_TOTAL_PCT).toFixed(2)} is deposited into your wallet.
            </AlertDescription>
          </Alert>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={pin.length !== 16 || isSubmitting}
            style={{
              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '15px',
              padding: '14px', borderRadius: '10px', width: '100%',
              backgroundColor: pin.length === 16 ? selectedOption.color : '#d1d5db',
              color: '#ffffff', border: 'none', cursor: pin.length === 16 ? 'pointer' : 'not-allowed',
            }}
          >
            Redeem Voucher
          </Button>
        </div>
      )}

      {/* ── Step 3: Processing ── */}
      {currentStep === 'processing' && (
        <BrandSpinner
          style={{ padding: '40px 0' }}
          size={56}
          label="Redeeming your voucher..."
          subtitle="Please wait while we process your deposit"
        />
      )}

      {/* ── Step 4: Success ── */}
      {currentStep === 'success' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle className="w-16 h-16" style={{ color: '#10b981', margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '20px', color: '#111827', margin: 0 }}>
              Voucher Redeemed!
            </p>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              Funds have been added to your wallet
            </p>
          </div>

          <Card style={{ borderRadius: '12px', border: '1px solid #d1fae5', backgroundColor: '#f0fdf4' }}>
            <CardContent style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#6b7280' }}>Voucher Value</span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    R {result.faceValue.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#6b7280' }}>
                    Fee ({result.feeRate})
                  </span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>
                    − R {result.fee.toFixed(2)}
                  </span>
                </div>
                <div style={{ height: '1px', backgroundColor: '#d1fae5' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                    Deposited
                  </span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, color: '#166534' }}>
                    R {result.netDeposit.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div style={{ padding: '8px 0' }}>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
              Reference: {result.reference}
            </p>
          </div>

          <Button
            onClick={handleDone}
            style={{
              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '15px',
              padding: '14px', borderRadius: '10px', width: '100%',
              backgroundColor: '#10b981', color: '#ffffff', border: 'none',
            }}
          >
            Done
          </Button>
        </div>
      )}

      {/* ── Step 5: Error ── */}
      {currentStep === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <AlertTriangle className="w-16 h-16" style={{ color: '#ef4444', margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '18px', color: '#111827', margin: 0 }}>
              Redemption Failed
            </p>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#6b7280', marginTop: '8px', padding: '0 8px' }}>
              {errorMessage}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              onClick={handleRetry}
              variant="outline"
              style={{
                fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '14px',
                padding: '12px', borderRadius: '10px', flex: 1,
              }}
            >
              Try Again
            </Button>
            <Button
              onClick={handleDone}
              style={{
                fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '14px',
                padding: '12px', borderRadius: '10px', flex: 1,
                backgroundColor: '#374151', color: '#ffffff', border: 'none',
              }}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
