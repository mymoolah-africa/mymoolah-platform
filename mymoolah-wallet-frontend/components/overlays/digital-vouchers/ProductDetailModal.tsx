import React, { useState } from 'react';
import { Check, AlertTriangle, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent } from '../../ui/card';
import { Separator } from '../../ui/separator';
import { apiService } from '../../../services/apiService';

import oneVoucherLogo from '../../../assets/1voucher-logo.png';
import betwayLogo from '../../../assets/betway-logo.png';
import hollywoodLogo from '../../../assets/hollywood-logo.png';
import ottLogo from '../../../assets/ott-logo.png';

const BRAND_LOGO_MAP: Record<string, string> = {
  '1voucher': oneVoucherLogo,
  'betway': betwayLogo,
  'hollywood bets': hollywoodLogo,
  'ott voucher': ottLogo,
};

function getBrandLogo(brandName: string): string | null {
  return BRAND_LOGO_MAP[brandName.toLowerCase().trim()] || null;
}

interface Voucher {
  id: string;
  purchaseProductId?: number;
  productId?: number;
  variantId?: number;
  name: string;
  brand: string;
  category: string;
  minAmount: number;
  maxAmount: number;
  isVariable?: boolean;
  icon: string;
  description: string;
  available: boolean;
  denominations: number[];
}

interface ProductDetailModalProps {
  voucher: Voucher;
  isOpen: boolean;
  onClose: () => void;
}

type PurchaseStep = 'selection' | 'processing' | 'success' | 'error';

export function ProductDetailModal({ voucher, isOpen, onClose }: ProductDetailModalProps) {
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('selection');
  const [errors, setErrors] = useState<{ amount?: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setSelectedDenomination(null);
      setAmountInput('');
      setCurrentStep('selection');
      setErrors({});
      setIsProcessing(false);
      setVoucherCode('');
      setTransactionRef('');
      setPurchaseError('');
    }
  }, [isOpen, voucher]);

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
    if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const numeric = parseFloat(cleaned);
    if (!cleaned || Number.isNaN(numeric)) {
      setSelectedDenomination(null);
      return;
    }
    setSelectedDenomination(Math.round(numeric * 100));
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount / 100);

  const validateForm = (): boolean => {
    const newErrors: { amount?: string } = {};
    if (!selectedDenomination) {
      newErrors.amount = 'Please select or enter an amount';
    } else {
      if (voucher.minAmount && selectedDenomination < voucher.minAmount) {
        newErrors.amount = `Minimum amount is ${formatCurrency(voucher.minAmount)}`;
      }
      if (voucher.maxAmount && selectedDenomination > voucher.maxAmount) {
        newErrors.amount = `Maximum amount is ${formatCurrency(voucher.maxAmount)}`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePurchase = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    setCurrentStep('processing');
    setPurchaseError('');

    try {
      const productIdForPurchase = voucher.purchaseProductId || voucher.productId;
      if (!productIdForPurchase) throw new Error('Product ID is required for purchase');

      const purchaseData = {
        productId: Number(productIdForPurchase),
        variantId: voucher.variantId ? Number(voucher.variantId) : undefined,
        denomination: selectedDenomination!,
        idempotencyKey: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `voucher-${Date.now()}-${Math.random().toString(36).slice(2)}`
      };

      const response = await apiService.purchaseVoucher(purchaseData);
      const code = (response as any)?.order?.metadata?.supplierResponse?.voucherCode || (response as any)?.voucherCode || '';
      const ref = (response as any)?.order?.id || (response as any)?.order?.orderId || (response as any)?.transactionRef || '';
      setVoucherCode(code);
      setTransactionRef(ref);
      setCurrentStep('success');
    } catch (err: any) {
      const msg =
        err?.data?.data?.message ||
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        'There was an error processing your purchase.';
      setPurchaseError(msg);
      setCurrentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (currentStep === 'processing') return;
    onClose();
  };

  const displayVoucherCode = voucherCode ? voucherCode.replace(/^VOUCHER[_-]?/i, '') : '';

  const handleCopyVoucher = async () => {
    if (!displayVoucherCode) return;
    try {
      await navigator.clipboard.writeText(displayVoucherCode);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  const isFixedDenominations = !voucher.isVariable && Array.isArray(voucher.denominations) && voucher.denominations.length > 0;

  const getStepContent = () => {
    switch (currentStep) {
      case 'selection':
        return (
          <div className="space-y-5">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3" style={{ height: '48px' }}>
                {getBrandLogo(voucher.name) ? (
                  <img
                    src={getBrandLogo(voucher.name)!}
                    alt={voucher.name}
                    style={{ maxHeight: '44px', maxWidth: '120px', objectFit: 'contain', borderRadius: '8px' }}
                  />
                ) : (
                  <span className="text-4xl leading-none">{voucher.icon}</span>
                )}
              </div>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                {voucher.name}
              </h3>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                {voucher.description}
              </p>
              <span style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: '11px', fontWeight: '500', color: '#6b7280',
                backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '6px'
              }}>
                {voucher.category.charAt(0).toUpperCase() + voucher.category.slice(1)}
              </span>
            </div>

            <Separator />

            <div>
              <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '10px', display: 'block' }}>
                {isFixedDenominations ? 'Select Amount' : 'Enter Amount'}
              </Label>

              {isFixedDenominations ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {voucher.denominations.map((denom: number) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => {
                          setSelectedDenomination(denom);
                          setAmountInput((denom / 100).toFixed(2));
                          setErrors(prev => ({ ...prev, amount: undefined }));
                        }}
                        style={{
                          fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: '600',
                          padding: '10px 16px', borderRadius: '10px',
                          border: selectedDenomination === denom ? '2px solid #86BE41' : '2px solid #d1d5db',
                          background: selectedDenomination === denom ? '#86BE41' : '#f9fafb',
                          color: selectedDenomination === denom ? '#fff' : '#374151',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}
                      >
                        {formatCurrency(denom)}
                      </button>
                    ))}
                  </div>
                  {errors.amount && (
                    <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#ef4444' }}>{errors.amount}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={
                      voucher.minAmount && voucher.maxAmount
                        ? `Enter amount (${formatCurrency(voucher.minAmount)} – ${formatCurrency(voucher.maxAmount)})`
                        : 'Enter amount (R)'
                    }
                    value={amountInput}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    style={{
                      fontFamily: 'Montserrat, sans-serif', fontSize: '14px', borderRadius: '12px',
                      minHeight: '48px', borderColor: errors.amount ? '#ef4444' : '#d1d5db'
                    }}
                  />
                  {errors.amount && (
                    <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#ef4444' }}>{errors.amount}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <Button
              onClick={handlePurchase}
              disabled={!selectedDenomination || isProcessing}
              style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '600', borderRadius: '12px',
                minHeight: '52px', backgroundColor: selectedDenomination ? '#86BE41' : '#9ca3af', width: '100%'
              }}
            >
              {isProcessing ? 'Processing...' : `Purchase ${selectedDenomination ? formatCurrency(selectedDenomination) : 'Voucher'}`}
            </Button>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-gray-200 border-t-[#86BE41] rounded-full animate-spin" />
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
              Processing Your Purchase
            </h3>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280' }}>
              Please wait while we process your retail voucher...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
              Purchase Successful!
            </h3>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              Your {voucher.name} retail voucher has been purchased.
            </p>

            <Card style={{ marginBottom: '16px' }}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {displayVoucherCode && (
                    <div className="flex items-start justify-between gap-3">
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280' }}>
                        Retail Voucher Code:
                      </span>
                      <div className="flex flex-col items-end gap-2 flex-1">
                        <span style={{
                          fontFamily: 'Inter, monospace', fontSize: '14px', fontWeight: 600,
                          color: '#1f2937', wordBreak: 'break-word', textAlign: 'right'
                        }}>
                          {displayVoucherCode}
                        </span>
                        <Button variant="outline" size="sm" onClick={handleCopyVoucher}
                          className="flex items-center gap-2"
                          style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', borderRadius: '8px', padding: '6px 10px' }}>
                          <Copy className="w-4 h-4" />
                          {hasCopied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {transactionRef && (
                    <div className="flex justify-between">
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280' }}>
                        Transaction Ref:
                      </span>
                      <span style={{ fontFamily: 'Inter, monospace', fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                        {transactionRef}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card style={{ marginBottom: '16px', backgroundColor: '#f0f9ff', borderColor: '#bfdbfe' }}>
              <CardContent className="p-4">
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#1e40af', margin: 0 }}>
                  Some providers send the PIN or redemption code by SMS after a successful transaction. Please check the SMS on your registered phone and keep the code private.
                </p>
              </CardContent>
            </Card>

            <Button onClick={handleClose}
              style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '600', borderRadius: '12px',
                minHeight: '52px', backgroundColor: '#86BE41', width: '100%'
              }}>
              Done
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
              Purchase Failed
            </h3>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {purchaseError || 'There was an error processing your purchase. Please try again.'}
            </p>
            <div className="space-y-3">
              <Button onClick={() => { setCurrentStep('selection'); setPurchaseError(''); }}
                style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '600', borderRadius: '12px',
                  minHeight: '52px', backgroundColor: '#86BE41', width: '100%'
                }}>
                Try Again
              </Button>
              <Button variant="outline" onClick={handleClose}
                style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '600', borderRadius: '12px',
                  minHeight: '52px', borderColor: '#d1d5db', color: '#374151', width: '100%'
                }}>
                Cancel
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const titleMap: Record<PurchaseStep, string> = {
    selection: 'Buy Retail Voucher',
    processing: 'Processing...',
    success: 'Success!',
    error: 'Error'
  };

  const descMap: Record<PurchaseStep, string> = {
    selection: 'Complete your retail voucher purchase',
    processing: 'Processing your retail voucher purchase',
    success: 'Your retail voucher has been issued',
    error: 'We could not complete the purchase'
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        style={{
          fontFamily: 'Montserrat, sans-serif',
          width: '100%',
          maxWidth: '375px',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '24px',
          paddingBottom: '32px'
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
            {titleMap[currentStep]}
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280' }}>
            {descMap[currentStep]}
          </DialogDescription>
        </DialogHeader>
        {getStepContent()}
      </DialogContent>
    </Dialog>
  );
}
