import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, CheckCircle, Copy, AlertTriangle, Info, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';
import { Alert, AlertDescription } from '../../ui/alert';
import { APP_CONFIG } from '../../../config/app-config';
import { getToken as getSessionToken } from '../../../utils/authToken';

interface TopupRequestData {
  original_amount: number;
  issued_to: string;
  description?: string;
}

interface PricingInfo {
  grossAmount: number;
  providerFee: number;
  mmFee: number;
  totalFee: number;
  netAmount: number;
}

type Step = 'form' | 'processing' | 'success' | 'error';

export function TopupEasyPayOverlay() {
  const navigate = useNavigate();
  
  // Form state
  const [amount, setAmount] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<Step>('form');
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [errors, setErrors] = useState<{ amount?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Success state
  const [easyPayPIN, setEasyPayPIN] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');
  const [copiedPIN, setCopiedPIN] = useState(false);

  // Quick amount options
  const quickAmounts = [50, 100, 200, 300, 500, 1000, 2000];

  // Amount validation (R50 - R4000)
  const validateAmount = (value: string): boolean => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue >= 50 && numValue <= 4000;
  };

  // Calculate pricing based on amount
  const calculatePricing = (amountValue: number): PricingInfo => {
    // Fee structure: R2.00 provider fee + R0.50 MM margin = R2.50 total
    const providerFee = 2.00;
    const mmFee = 0.50;
    const totalFee = providerFee + mmFee;
    const netAmount = amountValue - totalFee;
    
    return {
      grossAmount: amountValue,
      providerFee,
      mmFee,
      totalFee,
      netAmount
    };
  };

  // Update pricing when amount changes
  useEffect(() => {
    if (amount && validateAmount(amount)) {
      const amountValue = parseFloat(amount);
      setPricing(calculatePricing(amountValue));
    } else {
      setPricing(null);
    }
  }, [amount]);

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
    const newErrors: { amount?: string } = {};
    
    if (!amount || !validateAmount(amount)) {
      newErrors.amount = 'Amount must be between R50 and R4000';
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
      const requestData: TopupRequestData = {
        original_amount: parseFloat(amount),
        issued_to: 'self',
        description: 'Top-up at EasyPay'
      };
      
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/easypay/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create top-up request';
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
      setRequestId(result.data.request_id || '');
      setCurrentStep('success');
      
    } catch (error: any) {
      console.error('Top-up request error:', error);
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

  // Format PIN for display (group by 4 digits)
  const formatPIN = (pin: string): string => {
    return pin.replace(/(.{4})/g, '$1 ').trim();
  };

  // Reset form
  const handleReset = () => {
    setAmount('');
    setPricing(null);
    setErrors({});
    setEasyPayPIN('');
    setRequestId('');
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
            Top-up at EasyPay
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-small)',
            fontWeight: 'var(--font-weight-normal)',
            color: '#6b7280',
            marginTop: '4px'
          }}>
            {currentStep === 'form' ? 'Create top-up request' : 
             currentStep === 'processing' ? 'Processing request...' :
             currentStep === 'success' ? 'Top-up request created' : 'Request failed'}
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
              <strong>How it works:</strong> Create a top-up request, pay at any EasyPay store, and your wallet will be credited automatically (minus R2.50 fee).
            </AlertDescription>
          </Alert>

          {/* Amount Input Card */}
          <Card>
            <CardHeader>
              <CardTitle style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937'
              }}>
                Top-up Amount
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
                  Enter Amount (R50 - R4000)
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
                    className={`pl-8 pr-4 ${errors.amount ? 'border-red-500' : ''}`}
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
            </CardContent>
          </Card>

          {/* Pricing Breakdown Card */}
          {pricing && (
            <Card className="bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10 border-[#86BE41]/30">
              <CardHeader>
                <CardTitle style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#1f2937'
                }}>
                  Fee Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    color: '#6b7280'
                  }}>
                    You pay at EasyPay
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: '#1f2937'
                  }}>
                    R {pricing.grossAmount.toFixed(2)}
                  </span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    color: '#6b7280'
                  }}>
                    Provider fee
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    color: '#dc2626'
                  }}>
                    - R {pricing.providerFee.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    color: '#6b7280'
                  }}>
                    Service fee
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    color: '#dc2626'
                  }}>
                    - R {pricing.mmFee.toFixed(2)}
                  </span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: '#1f2937'
                  }}>
                    You'll receive in wallet
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: '#16a34a'
                  }}>
                    R {pricing.netAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!pricing || isSubmitting}
            className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white border-none"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-base)',
              fontWeight: 'var(--font-weight-medium)',
              padding: '16px',
              minHeight: 'var(--mobile-touch-target)',
              opacity: !pricing || isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Creating Request...' : 'Create Top-up Request'}
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
            Creating your top-up request...
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
              Top-up Request Created!
            </h2>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Show this PIN at any EasyPay store to complete your top-up
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
              <div className="bg-white p-6 rounded-lg text-center mb-4">
                <p style={{
                  fontFamily: 'Montserrat, monospace',
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#1f2937',
                  letterSpacing: '0.1em'
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
                <li>Pay R{pricing?.grossAmount.toFixed(2)}</li>
                <li>Your wallet will be credited with R{pricing?.netAmount.toFixed(2)}</li>
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
              We couldn't create your top-up request. Please try again.
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