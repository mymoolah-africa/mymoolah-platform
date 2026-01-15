import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, CheckCircle, Copy, AlertTriangle, Info, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { APP_CONFIG } from '../../../config/app-config';
import { getToken as getSessionToken } from '../../../utils/authToken';

interface CashoutRequestData {
  original_amount: number;
  issued_to: string;
  description?: string;
}

interface PricingInfo {
  voucherAmount: number;
  transactionFee: number;
  totalDebit: number;
}

type Step = 'form' | 'processing' | 'success' | 'error';

export function CashoutEasyPayOverlay() {
  const navigate = useNavigate();
  
  // Form state
  const [amount, setAmount] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<Step>('form');
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [errors, setErrors] = useState<{ amount?: string; balance?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  
  // Success state
  const [easyPayPIN, setEasyPayPIN] = useState<string>('');
  const [copiedPIN, setCopiedPIN] = useState(false);

  // Quick amount options (R50 - R3000)
  const quickAmounts = [50, 100, 200, 300, 500, 1000, 2000, 3000];

  // Transaction fee (R8.00 VAT Inclusive)
  const TRANSACTION_FEE = 8.00;

  // Fetch wallet balance on mount
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const token = getSessionToken();
        const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setWalletBalance(parseFloat(data.data.balance || 0));
        }
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error);
      }
    };
    
    fetchWalletBalance();
  }, []);

  // Amount validation (R50 - R3000)
  const validateAmount = (value: string): boolean => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue >= 50 && numValue <= 3000;
  };

  // Calculate pricing based on amount
  const calculatePricing = (amountValue: number): PricingInfo => {
    const totalDebit = amountValue + TRANSACTION_FEE;
    
    return {
      voucherAmount: amountValue,
      transactionFee: TRANSACTION_FEE,
      totalDebit
    };
  };

  // Update pricing when amount changes
  useEffect(() => {
    if (amount && validateAmount(amount)) {
      const amountValue = parseFloat(amount);
      setPricing(calculatePricing(amountValue));
      
      // Check wallet balance
      if (walletBalance !== null) {
        const totalRequired = amountValue + TRANSACTION_FEE;
        if (totalRequired > walletBalance) {
          setErrors(prev => ({ 
            ...prev, 
            balance: `Insufficient balance. Required: R${totalRequired.toFixed(2)}, Available: R${walletBalance.toFixed(2)}` 
          }));
        } else {
          setErrors(prev => ({ ...prev, balance: undefined }));
        }
      }
    } else {
      setPricing(null);
    }
  }, [amount, walletBalance]);

  // Handle amount input
  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setAmount(cleanValue);
    
    // Clear amount error if valid
    if (validateAmount(cleanValue)) {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  // Handle quick amount selection
  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
    setErrors(prev => ({ ...prev, amount: undefined }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { amount?: string; balance?: string } = {};
    
    if (!amount || !validateAmount(amount)) {
      newErrors.amount = 'Amount must be between R50 and R3000';
    }
    
    if (pricing && walletBalance !== null && pricing.totalDebit > walletBalance) {
      newErrors.balance = `Insufficient balance. Required: R${pricing.totalDebit.toFixed(2)}, Available: R${walletBalance.toFixed(2)}`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setCurrentStep('processing');
    
    try {
      const token = getSessionToken();
      const requestData: CashoutRequestData = {
        original_amount: parseFloat(amount),
        issued_to: 'self',
        description: 'Cash-out at EasyPay'
      };
      
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/easypay/cashout/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create cash-out voucher';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || `Server returned ${response.status}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Set success data
      setEasyPayPIN(result.data.easypay_code || '');
      setCurrentStep('success');
      
      // Update wallet balance
      if (result.data.wallet_balance !== undefined) {
        setWalletBalance(parseFloat(result.data.wallet_balance));
      }
      
    } catch (error: any) {
      console.error('Cash-out request error:', error);
      setCurrentStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy PIN to clipboard
  const handleCopyPIN = async () => {
    try {
      await navigator.clipboard.writeText(easyPayPIN);
      setCopiedPIN(true);
      setTimeout(() => setCopiedPIN(false), 2000);
    } catch (err) {
      console.error('Failed to copy PIN:', err);
    }
  };

  // Format PIN for display: x xxxx xxxx xxxx x (14 digits on one line)
  const formatPIN = (pin: string): string => {
    if (!pin || pin.length !== 14) return pin;
    // Format as: x xxxx xxxx xxxx x
    return `${pin[0]} ${pin.substring(1, 5)} ${pin.substring(5, 9)} ${pin.substring(9, 13)} ${pin[13]}`;
  };

  // Reset form
  const handleReset = () => {
    setAmount('');
    setPricing(null);
    setErrors({});
    setEasyPayPIN('');
    setCopiedPIN(false);
    setCurrentStep('form');
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Montserrat, sans-serif',
      padding: 'var(--mobile-padding)'
    }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => currentStep === 'form' ? navigate(-1) : handleReset()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1f2937'
          }}>
            Cash-out at EasyPay
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-small)',
            fontWeight: 'var(--font-weight-normal)',
            color: '#6b7280',
            marginTop: '4px'
          }}>
            {currentStep === 'form' ? 'Create cash-out voucher' : 
             currentStep === 'processing' ? 'Processing request...' :
             currentStep === 'success' ? 'Cash-out voucher created' : 'Request failed'}
          </p>
        </div>
      </div>

      {/* Form Step */}
      {currentStep === 'form' && (
        <div className="space-y-6">
          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              color: '#1e40af'
            }}>
              <strong>How it works:</strong> Create a cash-out voucher, visit any EasyPay store, show the PIN, and receive cash. Transaction fee: R8.00.
            </AlertDescription>
          </Alert>

          {/* Wallet Balance Display */}
          {walletBalance !== null && (
            <Card className="bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#86BE41]" />
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#374151'
                    }}>
                      Available Balance
                    </span>
                  </div>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: '#1f2937'
                  }}>
                    R{walletBalance.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Amount Input Card */}
          <Card>
            <CardHeader>
              <CardTitle style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937'
              }}>
                Cash-out Amount
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount Input */}
              <div>
                <Label style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: '#374151'
                }}>
                  Enter Amount (R50 - R3000)
                </Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    R
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    className={`pl-8 pr-4 ${errors.amount || errors.balance ? 'border-red-500' : ''}`}
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-medium)',
                      height: '48px'
                    }}
                  />
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {errors.amount}
                  </p>
                )}
                {errors.balance && (
                  <p className="text-red-500 text-sm mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {errors.balance}
                  </p>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <Label style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: '#374151'
                }}>
                  Quick Select
                </Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {quickAmounts.map((qa) => (
                    <button
                      key={qa}
                      onClick={() => handleQuickAmount(qa)}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-[#86BE41] hover:text-white hover:border-[#86BE41] transition-colors"
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
                        fontWeight: 'var(--font-weight-medium)',
                        backgroundColor: amount === qa.toString() ? '#86BE41' : 'white',
                        color: amount === qa.toString() ? 'white' : '#374151'
                      }}
                    >
                      R{qa}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing Summary */}
              {pricing && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      color: '#6b7280'
                    }}>
                      Voucher Amount
                    </span>
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#1f2937'
                    }}>
                      R{pricing.voucherAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      color: '#6b7280'
                    }}>
                      Transaction Fee
                    </span>
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#1f2937'
                    }}>
                      R{pricing.transactionFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: '#1f2937'
                      }}>
                        Total to Debit
                      </span>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: '#1f2937'
                      }}>
                        R{pricing.totalDebit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!pricing || isSubmitting || !!errors.balance}
            className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white border-none"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-base)',
              fontWeight: 'var(--font-weight-medium)',
              padding: '16px',
              minHeight: 'var(--mobile-touch-target)',
              opacity: !pricing || isSubmitting || !!errors.balance ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Creating Voucher...' : 'Create Cash-out Voucher'}
          </Button>
        </div>
      )}

      {/* Processing Step */}
      {currentStep === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-[#86BE41] border-t-transparent rounded-full animate-spin mb-6" />
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-base)',
            fontWeight: 'var(--font-weight-medium)',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Creating your cash-out voucher...
          </p>
        </div>
      )}

      {/* Success Step */}
      {currentStep === 'success' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1f2937',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              Cash-out Voucher Created!
            </h2>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Show this PIN at any EasyPay store to receive cash
            </p>
          </div>

          {/* EasyPay PIN Display */}
          <Card className="bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10 border-[#86BE41]/30">
            <CardHeader>
              <CardTitle style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                textAlign: 'center'
              }}>
                Your EasyPay PIN
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-6 rounded-lg text-center mb-4" style={{ overflowX: 'auto' }}>
                <p style={{
                  fontFamily: 'Montserrat, monospace',
                  fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#1f2937',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  display: 'inline-block'
                }}>
                  {formatPIN(easyPayPIN)}
                </p>
              </div>
              
              <Button
                onClick={handleCopyPIN}
                variant="outline"
                className="w-full"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                {copiedPIN ? 'Copied!' : 'Copy PIN'}
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              color: '#1e40af'
            }}>
              <strong>Next Steps:</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>Visit any EasyPay store</li>
                <li>Show this 14-digit PIN</li>
                <li>Receive R{pricing?.voucherAmount.toFixed(2)} in cash</li>
                <li>Voucher expires in 4 days if not used</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/vouchers')}
              variant="outline"
              className="flex-1"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-small)',
                fontWeight: 'var(--font-weight-medium)'
              }}
            >
              View in Vouchers
            </Button>
            <Button
              onClick={handleReset}
              className="flex-1 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white border-none"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-small)',
                fontWeight: 'var(--font-weight-medium)'
              }}
            >
              Create Another
            </Button>
          </div>
        </div>
      )}

      {/* Error Step */}
      {currentStep === 'error' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1f2937',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              Request Failed
            </h2>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              We couldn't create your cash-out voucher. Please try again.
            </p>
          </div>

          <Button
            onClick={handleReset}
            className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white border-none"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-base)',
              fontWeight: 'var(--font-weight-medium)',
              padding: '16px',
              minHeight: 'var(--mobile-touch-target)'
            }}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
