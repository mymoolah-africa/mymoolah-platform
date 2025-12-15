import React, { useState } from 'react';
import { X, Check, Phone, CreditCard, Info, AlertTriangle, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
import { Alert, AlertDescription } from '../../ui/alert';
import { Separator } from '../../ui/separator';
import { apiService } from '../../../services/apiService';

interface Voucher {
  id: string;
  name: string;
  brand: string;
  category: 'Gaming' | 'Entertainment' | 'Transport' | 'Shopping' | 'MyMoolah';
  minAmount: number;
  maxAmount: number;
  icon: string;
  description: string;
  available: boolean;
  featured: boolean;
  denominations: number[];
}

interface ProductDetailModalProps {
  voucher: Voucher;
  isOpen: boolean;
  onClose: () => void;
}

interface RecipientInfo {
  phone: string;
  sendToSelf: boolean;
  recipientName?: string;
  isVerified: boolean;
  verificationStatus: 'idle' | 'verifying' | 'verified' | 'failed';
}

type PurchaseStep = 'selection' | 'processing' | 'success' | 'error';

export function ProductDetailModal({ voucher, isOpen, onClose }: ProductDetailModalProps) {
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo>({
    phone: '',
    sendToSelf: true,
    isVerified: false,
    verificationStatus: 'idle'
  });
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('selection');
  const [errors, setErrors] = useState<{ phone?: string; amount?: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Reset modal state when opening
  React.useEffect(() => {
    if (isOpen) {
      console.log('🎯 Modal opened with voucher:', voucher);
      console.log('💰 Voucher denominations:', voucher.denominations);
      setSelectedDenomination(null);
      setAmountInput('');
      setRecipientInfo({ phone: '', sendToSelf: true, isVerified: false, verificationStatus: 'idle' });
      setCurrentStep('selection');
      setErrors({});
      setIsProcessing(false);
      setVoucherCode('');
      setTransactionRef('');
    }
  }, [isOpen, voucher]);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  // Validate South African phone number
  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.trim().replace(/\s/g, '');
    const phonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
    return phonePattern.test(cleanPhone);
  };

  // Handle amount input (Rands) and keep cents in selectedDenomination
  const handleAmountChange = (value: string) => {
    setAmountInput(value);

    // Clear previous amount error when user is typing
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }

    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const numeric = parseFloat(cleaned);

    if (!cleaned || Number.isNaN(numeric)) {
      setSelectedDenomination(null);
      return;
    }

    // Work in cents, rounded to avoid floating issues
    const cents = Math.round(numeric * 100);
    setSelectedDenomination(cents);
  };

  // MMWallet verification function - using real API
  const verifyMMWalletHolder = async (phoneNumber: string): Promise<{ isValid: boolean; recipientName?: string }> => {
    try {
      // Call the real MMWallet verification API
      const response = await apiService.verifyMMWalletHolder(phoneNumber);
      return {
        isValid: response.isValid,
        recipientName: response.recipientName
      };
    } catch (error) {
      console.error('Error verifying MMWallet holder:', error);
      return { isValid: false };
    }
  };

  // Handle recipient info change
  const handleRecipientChange = async (field: keyof RecipientInfo, value: string | boolean) => {
    if (field === 'sendToSelf') {
      const sendToSelfValue = Boolean(value); // Ensure it's always a boolean
      setRecipientInfo(prev => ({
        ...prev,
        sendToSelf: sendToSelfValue,
        phone: '',
        isVerified: false,
        verificationStatus: 'idle',
        recipientName: undefined
      }));
      setErrors({ phone: undefined });
      return;
    }

    if (field === 'phone') {
      const phoneValue = value as string;
      setRecipientInfo(prev => ({
        ...prev,
        phone: phoneValue,
        isVerified: false,
        verificationStatus: 'idle',
        recipientName: undefined
      }));
      
      // Clear phone error
      if (errors.phone) {
        setErrors(prev => ({ ...prev, phone: undefined }));
      }

      // Auto-verify when phone number looks complete
      if (phoneValue.length >= 10) {
        setRecipientInfo(prev => ({ ...prev, verificationStatus: 'verifying' }));
        
        try {
          const verification = await verifyMMWalletHolder(phoneValue);
          
          if (verification.isValid) {
            setRecipientInfo(prev => ({
              ...prev,
              isVerified: true,
              verificationStatus: 'verified',
              recipientName: verification.recipientName
            }));
          } else {
            setRecipientInfo(prev => ({
              ...prev,
              isVerified: false,
              verificationStatus: 'failed'
            }));
            setErrors(prev => ({ 
              ...prev, 
              phone: 'This phone number is not registered with MMWallet' 
            }));
          }
        } catch (error) {
          setRecipientInfo(prev => ({
            ...prev,
            isVerified: false,
            verificationStatus: 'failed'
          }));
          setErrors(prev => ({ 
            ...prev, 
            phone: 'Unable to verify MMWallet. Please try again.' 
          }));
        }
      }
    } else {
      setRecipientInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const normalizeToLocalMsisdn = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('27') && digits.length >= 11) {
      return `0${digits.slice(-9)}`;
    }
    if (digits.startsWith('0') && digits.length >= 10) {
      return digits.slice(0, 10);
    }
    if (digits.length === 9) {
      return `0${digits}`;
    }
    return digits;
  };

  const getDescriptionText = () => {
    if (currentStep === 'selection') return 'Complete your voucher purchase';
    if (currentStep === 'processing') return 'Processing your voucher purchase';
    if (currentStep === 'success') return 'Your voucher has been issued';
    if (currentStep === 'error') return 'We could not complete the purchase';
    return '';
  };

  // Validate form before purchase
  const validateForm = (): boolean => {
    const newErrors: { phone?: string; amount?: string } = {};

    if (!selectedDenomination) {
      newErrors.amount = 'Please enter an amount for this voucher';
    } else {
      // Min/max validation in cents (backend also validates, but we keep UX safe)
      if (voucher.minAmount && selectedDenomination < voucher.minAmount) {
        newErrors.amount = `Minimum amount is ${formatCurrency(voucher.minAmount)}`;
      }
      if (voucher.maxAmount && selectedDenomination > voucher.maxAmount) {
        newErrors.amount = `Maximum amount is ${formatCurrency(voucher.maxAmount)}`;
      }
    }

    if (!recipientInfo.sendToSelf) {
      // Phone number is required when sending to someone else
      if (!recipientInfo.phone.trim()) {
        newErrors.phone = 'Please enter the recipient\'s MMWallet phone number';
      } else if (!validatePhone(recipientInfo.phone)) {
        newErrors.phone = 'Please enter a valid SA mobile number';
      } else if (!recipientInfo.isVerified) {
        newErrors.phone = 'Please wait for MMWallet verification to complete';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle purchase submission
  const handlePurchase = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');

    try {
      const recipientPhone = recipientInfo.sendToSelf
        ? undefined
        : normalizeToLocalMsisdn(recipientInfo.phone);

      const purchaseData = {
        productId: Number(voucher.productId || voucher.id),
        denomination: selectedDenomination!,
        recipient: recipientInfo.sendToSelf
          ? undefined
          : {
              phone: recipientPhone,
              name: recipientInfo.recipientName
            },
        idempotencyKey: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `voucher-${Date.now()}-${Math.random().toString(36).slice(2)}`
      };

      const response = await apiService.purchaseVoucher(purchaseData);
      
      setVoucherCode(response?.order?.metadata?.supplierResponse?.voucherCode || response?.voucherCode || '');
      setTransactionRef(response?.order?.id || response?.order?.orderId || response?.transactionRef || '');
      setCurrentStep('success');
    } catch (error) {
      console.error('Error purchasing voucher:', error);
      setCurrentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (currentStep === 'processing') {
      return; // Prevent closing during processing
    }
    onClose();
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount / 100);
  };

  // Clean display values for codes/refs
  const displayVoucherCode = voucherCode
    ? voucherCode.replace(/^VOUCHER[_-]?/i, '')
    : '';
  const displayTransactionRef = transactionRef || '';

  const handleCopyVoucher = async () => {
    if (!displayVoucherCode) return;
    try {
      await navigator.clipboard.writeText(displayVoucherCode);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.error('Unable to copy voucher code:', err);
    }
  };

  // Get step content
  const getStepContent = () => {
    switch (currentStep) {
      case 'selection':
        return (
          <div className="space-y-6">
            {/* Voucher Details */}
            <div className="text-center">
              <div className="text-4xl mb-2">{voucher.icon}</div>
              <h3 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '8px'
              }}>
                {voucher.name}
              </h3>
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                {voucher.description}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}>
                  {voucher.category}
                </span>
                {voucher.featured && (
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#ffffff',
                    backgroundColor: '#f59e0b',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}>
                    Featured
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Amount Selection */}
            <div>
              <Label style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '12px',
                display: 'block'
              }}>
                Select Amount
              </Label>
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={
                    voucher.minAmount || voucher.maxAmount
                      ? `Enter amount (min ${voucher.minAmount ? formatCurrency(voucher.minAmount) : ''}${
                          voucher.maxAmount ? `, max ${formatCurrency(voucher.maxAmount)}` : ''
                        })`
                      : 'Enter amount (R)'
                  }
                  value={amountInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    borderRadius: '12px',
                    minHeight: '48px',
                    borderColor: errors.amount ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.amount && (
                  <p
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#ef4444'
                    }}
                  >
                    {errors.amount}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Recipient Selection */}
            <div>
              <Label style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '12px',
                display: 'block'
              }}>
                Recipient
              </Label>
              
              <div className="space-y-4">
                {/* Send to self option */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="send-to-self"
                    checked={recipientInfo.sendToSelf}
                    onCheckedChange={(checked) => handleRecipientChange('sendToSelf', checked as boolean)}
                  />
                  <Label
                    htmlFor="send-to-self"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    Send to myself
                  </Label>
                </div>

                {/* Send to someone else */}
                {!recipientInfo.sendToSelf && (
                  <div className="space-y-3">
                    <div>
                      <Label style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        Recipient's MMWallet Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="tel"
                          placeholder="Enter phone number"
                          value={recipientInfo.phone}
                          onChange={(e) => handleRecipientChange('phone', e.target.value)}
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '14px',
                            paddingLeft: '40px',
                            borderRadius: '12px',
                            minHeight: '48px',
                            borderColor: errors.phone ? '#ef4444' : '#d1d5db'
                          }}
                        />
                        {recipientInfo.verificationStatus === 'verifying' && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                          </div>
                        )}
                        {recipientInfo.verificationStatus === 'verified' && (
                          <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                        )}
                        {recipientInfo.verificationStatus === 'failed' && (
                          <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
                        )}
                      </div>
                      {errors.phone && (
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          color: '#ef4444',
                          marginTop: '4px'
                        }}>
                          {errors.phone}
                        </p>
                      )}
                      {recipientInfo.recipientName && (
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          color: '#10b981',
                          marginTop: '4px'
                        }}>
                          ✓ {recipientInfo.recipientName}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Purchase Button */}
            <Button
              onClick={handlePurchase}
              disabled={!selectedDenomination || isProcessing}
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '12px',
                minHeight: '52px',
                backgroundColor: selectedDenomination ? '#86BE41' : '#9ca3af',
                width: '100%'
              }}
            >
              {isProcessing ? 'Processing...' : `Purchase ${selectedDenomination ? formatCurrency(selectedDenomination) : 'Voucher'}`}
            </Button>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-8">
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #86BE41',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <h3 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Processing Your Purchase
            </h3>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Please wait while we process your voucher...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Purchase Successful!
            </h3>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '24px'
            }}>
              Your voucher has been purchased successfully
            </p>
            
            <Card style={{ marginBottom: '16px' }}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      Voucher Code:
                    </span>
                    <div className="flex flex-col items-end gap-2 flex-1">
                      <span style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f2937',
                        wordBreak: 'break-word',
                        textAlign: 'right'
                      }}>
                        {displayVoucherCode}
                      </span>
                      {displayVoucherCode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyVoucher}
                          className="flex items-center gap-2"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '12px',
                            borderRadius: '8px',
                            padding: '6px 10px'
                          }}
                        >
                          <Copy className="w-4 h-4" />
                          {hasCopied ? 'Copied' : 'Copy to clipboard'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      Transaction Ref:
                    </span>
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#1f2937',
                      wordBreak: 'break-word',
                      textAlign: 'right'
                    }}>
                      {displayTransactionRef}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleClose}
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '12px',
                minHeight: '52px',
                backgroundColor: '#86BE41',
                width: '100%'
              }}
            >
              Done
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Purchase Failed
            </h3>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '24px'
            }}>
              There was an error processing your purchase. Please try again.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => setCurrentStep('selection')}
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '12px',
                  minHeight: '52px',
                  backgroundColor: '#86BE41',
                  width: '100%'
                }}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '12px',
                  minHeight: '52px',
                  borderColor: '#d1d5db',
                  color: '#374151',
                  width: '100%'
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        style={{
          fontFamily: 'Montserrat, sans-serif',
          maxWidth: '400px',
          width: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '24px',
          paddingBottom: '32px'
        }}
        aria-describedby="product-detail-description"
      >
        <DialogHeader>
          <DialogTitle style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            {currentStep === 'selection' ? 'Purchase Voucher' : 
             currentStep === 'processing' ? 'Processing...' :
             currentStep === 'success' ? 'Success!' : 'Error'}
          </DialogTitle>
          <DialogDescription 
            id="product-detail-description"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            {getDescriptionText()}
          </DialogDescription>
        </DialogHeader>

        {getStepContent()}

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </DialogContent>
    </Dialog>
  );
}