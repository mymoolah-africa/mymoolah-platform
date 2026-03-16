import React, { useState } from 'react';
import { X, Smartphone, Copy, CheckCircle, Globe, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { apiService } from '../../../services/apiService';
import { generateIdempotencyKey } from '../../../services/overlayService';

// Show supplier borders in UAT/Staging only
const _viteMode: string = (import.meta as any).env?.MODE ?? 'production';
const _viteNodeEnv: string = (import.meta as any).env?.VITE_NODE_ENV ?? '';
const isUatOrStaging = _viteMode !== 'production' || _viteNodeEnv === 'staging';

const SUPPLIER_BORDER: Record<string, string> = {
  FLASH: '2px solid #22c55e',
  MOBILEMART: '2px solid #3b82f6',
};

export interface GlobalPinProduct {
  id: string | number;
  name: string;
  price: number;       // in cents
  supplierCode: string;
  variantId?: string | number;
  productId?: number;  // Product id for /api/v1/products/purchase
  supplierProductId?: string;
  denominations?: number[];
  minAmount?: number;
  maxAmount?: number;
}

interface GlobalPinModalProps {
  products: GlobalPinProduct[];
  onClose: () => void;
  selectedAccountId?: number | null;
  /** Modal title — defaults to "International PIN" */
  title?: string;
  /** Modal subtitle — defaults to "Buy · Copy · Use anywhere" */
  subtitle?: string;
  /** Currency for price display — 'USD' shows $, 'ZAR' shows R. Defaults to 'USD' */
  currency?: 'USD' | 'ZAR';
  /** Hint text shown on the confirm step */
  confirmHint?: string;
  /**
   * When true, replaces the product list with a single "enter amount" input.
   * minAmountCents / maxAmountCents control the allowed range.
   */
  ownAmountMode?: boolean;
  minAmountCents?: number;
  maxAmountCents?: number;
  /**
   * Custom purchase function. Receives amount in cents + idempotencyKey.
   * Must return { pin, ref } on success or throw on failure.
   * If omitted, falls back to apiService.purchaseVoucher (International Airtime path).
   */
  onPurchase?: (amountCents: number, idempotencyKey: string) => Promise<{ pin: string; ref: string }>;
  /**
   * When set, shows eeziAirtime redemption instructions, formats PIN as 3×4 digits,
   * and copies the full USSD string to clipboard.
   */
  eeziRedemption?: {
    instruction: string;
    ussdPrefix: string;
    ussdSuffix?: string;
    pinGroupSize?: number;
  };
}

type Step = 'select' | 'confirm' | 'processing' | 'success' | 'error';

/** Format PIN into groups of 4 digits (e.g. 1761 3288 3283) */
function formatEeziPin(pin: string, groupSize = 4): string {
  const digits = pin.replace(/\D/g, '');
  if (!digits) return pin;
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += groupSize) {
    groups.push(digits.slice(i, i + groupSize));
  }
  return groups.join(' ');
}

export function GlobalPinModal({
  products,
  onClose,
  selectedAccountId,
  title = 'International PIN',
  subtitle = 'Buy · Copy · Use anywhere',
  currency = 'USD',
  confirmHint = 'A PIN code will be generated instantly. Copy and use it to top-up any international number.',
  ownAmountMode = false,
  minAmountCents = 200,
  maxAmountCents = 99900,
  onPurchase,
  eeziRedemption,
}: GlobalPinModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<GlobalPinProduct | null>(null);
  const [ownAmountInput, setOwnAmountInput] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const minR = minAmountCents / 100;
  const maxR = maxAmountCents / 100;

  const handleSelect = (product: GlobalPinProduct) => {
    setSelected(product);
    setStep('confirm');
  };

  const handleOwnAmountNext = () => {
    const amount = parseFloat(ownAmountInput);
    if (!amount || amount < minR || amount > maxR) return;
    const amountCents = Math.round(amount * 100);
    setSelected({
      id: 'eezi_own',
      name: `${title} R${amount.toFixed(0)}`,
      price: amountCents,
      supplierCode: 'FLASH',
    });
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setStep('processing');

    try {
      const idempotencyKey = generateIdempotencyKey();

      let pinCode: string;
      let ref: string;

      if (onPurchase) {
        // Custom purchase path (e.g. eeziAirtime token via Flash eezi-voucher endpoint)
        const result = await onPurchase(selected.price, idempotencyKey);
        pinCode = result.pin;
        ref = result.ref;
      } else {
        // Default path: International Airtime via generic voucher endpoint
        // Backend products/purchase expects Product id; fallback to variantId for overlay routes
        const result = await apiService.purchaseVoucher({
          productId: Number(selected.productId || selected.variantId || selected.id),
          denomination: selected.price,
          idempotencyKey,
        });
        pinCode =
          result?.order?.pin ||
          result?.order?.voucherPin ||
          result?.order?.code ||
          result?.order?.serialNumber ||
          result?.voucherCode ||
          result?.pin ||
          result?.code ||
          'No PIN returned';
        ref =
          result?.order?.reference ||
          result?.order?.transactionId ||
          result?.message ||
          idempotencyKey.slice(0, 12).toUpperCase();
      }

      setPin(pinCode);
      setTransactionRef(ref);
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Purchase failed. Please try again.');
      setStep('error');
    }
  };

  const handleCopy = async () => {
    if (!pin) return;
    try {
      let textToCopy = pin;
      if (eeziRedemption) {
        const rawPin = pin.replace(/\s/g, '');
        textToCopy = `${eeziRedemption.ussdPrefix}${rawPin}${eeziRedemption.ussdSuffix ?? ''}`;
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback — silently ignore
    }
  };

  const formatPrice = (cents: number) => {
    if (cents <= 0) return '';
    const amount = (cents / 100).toFixed(0);
    return currency === 'ZAR' ? `R${amount}` : `$${amount}`;
  };

  const supplierBorder = (code: string) =>
    isUatOrStaging ? (SUPPLIER_BORDER[code.toUpperCase()] ?? undefined) : undefined;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        position: 'fixed',
        top: '140px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '375px',
        maxHeight: 'calc(100vh - 140px - 60px)',
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '24px',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingRight: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: '#86BE41',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Globe style={{ width: '20px', height: '20px', color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                {title}
              </p>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', margin: 0 }}>
                {subtitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="universal-close-btn" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── STEP: SELECT ── */}
        {step === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ownAmountMode ? (
              /* Own-amount input (eeziAirtime Token) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
                    Enter amount ({currency === 'ZAR' ? `R${minR.toFixed(0)}–R${maxR.toFixed(0)}` : `$${minR.toFixed(0)}–$${maxR.toFixed(0)}`})
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={currency === 'ZAR' ? `R${minR.toFixed(0)}` : `$${minR.toFixed(0)}`}
                      value={ownAmountInput}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        setOwnAmountInput(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : v);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleOwnAmountNext(); }}
                      style={{
                        flex: 1, padding: '10px 14px',
                        border: '1px solid #d1d5db', borderRadius: '10px',
                        fontFamily: 'Montserrat, sans-serif', fontSize: '16px',
                        fontWeight: '600', color: '#1f2937', outline: 'none',
                      }}
                    />
                    <Button
                      onClick={handleOwnAmountNext}
                      disabled={!ownAmountInput || parseFloat(ownAmountInput) < minR || parseFloat(ownAmountInput) > maxR}
                      style={{
                        padding: '10px 20px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                        color: '#fff', border: 'none',
                        fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: '600',
                        cursor: 'pointer', opacity: (!ownAmountInput || parseFloat(ownAmountInput) < minR || parseFloat(ownAmountInput) > maxR) ? 0.5 : 1,
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            ) : products.length === 0 ? (
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '32px 0' }}>
                No {title} products available.
              </p>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    border: supplierBorder(product.supplierCode) ?? '1px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      backgroundColor: '#f0fdf4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Smartphone style={{ width: '20px', height: '20px', color: '#86BE41' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                        {product.name}
                      </p>
                      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                        {title} · {product.supplierCode}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                      {formatPrice(product.price)}
                    </span>
                    <ChevronRight style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '16px', backgroundColor: '#f8fafc',
              borderRadius: '12px', border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>
                You are buying
              </p>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                {selected.name}
              </p>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', fontWeight: '700', color: '#10b981', margin: '8px 0 0' }}>
                {formatPrice(selected.price)}
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fcd34d' }}>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#92400e', margin: 0 }}>
                ℹ️ {confirmHint}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                style={{ flex: 1, borderRadius: '12px', fontFamily: 'Montserrat, sans-serif', minHeight: '48px' }}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                style={{
                  flex: 2, borderRadius: '12px', minHeight: '48px',
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#fff', border: 'none',
                  fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: '600'
                }}
              >
                Confirm Purchase
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: PROCESSING ── */}
        {step === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '16px' }}>
            <Loader2 style={{ width: '40px', height: '40px', color: '#86BE41', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#6b7280' }}>
              Processing your purchase…
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === 'success' && selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Success header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 16px', backgroundColor: '#dcfce7',
              borderRadius: '12px', border: '1px solid #16a34a'
            }}>
              <CheckCircle style={{ width: '22px', height: '22px', color: '#16a34a', flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: '600', color: '#166534', margin: 0 }}>
                  Purchase Successful
                </p>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: '#166534', margin: 0, opacity: 0.8 }}>
                  Ref: {transactionRef}
                </p>
              </div>
            </div>

            {/* PIN display */}
            <div style={{
              padding: '20px', backgroundColor: '#f8fafe',
              borderRadius: '14px', border: '2px dashed #86BE41',
              textAlign: 'center'
            }}>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', margin: '0 0 8px' }}>
                Your PIN Code
              </p>
              <p style={{
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '22px', fontWeight: '700', color: '#1f2937',
                letterSpacing: '3px', wordBreak: 'break-all', margin: '0 0 16px'
              }}>
                {eeziRedemption ? formatEeziPin(pin, eeziRedemption.pinGroupSize ?? 4) : pin}
              </p>
              {eeziRedemption?.instruction && (
                <p style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#4b5563',
                  margin: '0 0 12px', lineHeight: 1.4
                }}>
                  {eeziRedemption.instruction}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <Button
                  onClick={handleCopy}
                  size="sm"
                  style={{
                    backgroundColor: copied ? '#16a34a' : '#86BE41',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    fontFamily: 'Montserrat, sans-serif', fontSize: '13px', padding: '8px 16px',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Copy style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                  {copied ? 'Copied!' : 'Copy PIN'}
                </Button>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Product', value: selected.name },
                { label: 'Amount', value: formatPrice(selected.price) },
                { label: 'Supplier', value: selected.supplierCode },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#6b7280' }}>{label}</span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: '500', color: '#1f2937' }}>{value}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={onClose}
              style={{
                width: '100%', minHeight: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                color: '#fff', border: 'none',
                fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: '600'
              }}
            >
              Done
            </Button>
          </div>
        )}

        {/* ── STEP: ERROR ── */}
        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '14px 16px', backgroundColor: '#fef2f2',
              borderRadius: '12px', border: '1px solid #fca5a5'
            }}>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: '600', color: '#991b1b', margin: '0 0 4px' }}>
                Purchase Failed
              </p>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#7f1d1d', margin: 0 }}>
                {errorMsg}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                style={{ flex: 1, borderRadius: '12px', fontFamily: 'Montserrat, sans-serif', minHeight: '48px' }}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                style={{ flex: 1, borderRadius: '12px', fontFamily: 'Montserrat, sans-serif', minHeight: '48px' }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
