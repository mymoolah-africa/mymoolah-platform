import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, CheckCircle, Copy, Share, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';
import { Alert, AlertDescription } from '../../ui/alert';
import { apiClient } from '../../../services/apiClient';

interface FlashVoucherData {
  amount: number;
  reference: string;
  accountNumber: string;
  productCode: string;
}

interface PricingInfo {
  faceValue: number;
  commission: number;
  totalPayable: number;
  commissionRate: number;
}

type Step = 'form' | 'processing' | 'success' | 'error';

export function FlashEeziCashOverlay() {
  const navigate = useNavigate();
  
  // Form state
  const [amount, setAmount] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<Step>('form');
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [errors, setErrors] = useState<{ amount?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Success state
  const [voucherToken, setVoucherToken] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');

  // System fields (read-only)
  const systemData = {
    reference: `EZ${Date.now().toString().slice(-8).toUpperCase()}`,
    accountNumber: 'FLASH001234',
    productCode: 'EEZI_CASH_ZAR'
  };

  // Quick amount options
  const quickAmounts = [50, 100, 150, 200, 300, 400, 500];

  // SA mobile number validation
  const validateSAMobile = (phone: string): boolean => {
    if (!phone.trim()) return true; // Optional field
    const cleanPhone = phone.trim().replace(/\s/g, '');
    const saPhonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
    return saPhonePattern.test(cleanPhone);
  };

  // Amount validation
  const validateAmount = (value: string): boolean => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue >= 50 && numValue <= 500;
  };

  // Calculate pricing based on amount
  const calculatePricing = (amountValue: number): PricingInfo => {
    // Flat transaction fee: R8.00 (VAT Inclusive)
    const transactionFee = 8.00;
    
    return {
      faceValue: amountValue,
      commission: transactionFee,
      totalPayable: amountValue + transactionFee,
      commissionRate: 0 // Not used - flat fee instead
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
      newErrors.amount = 'Amount must be between R50 and R500';
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
      // Prepare request data for Flash API
      const requestData = {
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        reference: systemData.reference,
        accountNumber: systemData.accountNumber,
        productCode: parseInt(systemData.productCode) || 1, // Product code as integer
        metadata: {
          source: 'FlashEeziCashOverlay',
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('🚀 Flash Cash-Out: Calling API with data:', requestData);
      
      // Call Flash cash-out API
      const response = await apiClient.post('/api/v1/flash/cash-out-pin/purchase', requestData);
      
      console.log('✅ Flash Cash-Out: API response:', response);
      
      // Extract token/PIN from Flash response
      // Response format: { success: true, data: { transaction: { ... } } }
      const transaction = response.data?.transaction || response.data;
      const token = transaction?.pin || transaction?.token || transaction?.serialNumber || transaction?.reference;
      const ref = transaction?.transactionId || transaction?.reference || systemData.reference;
      
      if (!token) {
        console.error('❌ Flash Cash-Out: No token in response:', transaction);
        throw new Error('No voucher token received from Flash API');
      }
      
      setVoucherToken(token);
      setTransactionRef(ref);
      setCurrentStep('success');
      
      console.log('🎉 Flash Cash-Out: Success - Token:', token, 'Ref:', ref);
      
    } catch (error: any) {
      console.error('❌ Flash Cash-Out: Transaction failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      setCurrentStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy voucher code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(voucherToken);
      // Could show toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Form can be submitted
  const canSubmit = amount && validateAmount(amount) && !isSubmitting;

  if (currentStep === 'success') {
    return (
      <div 
        style={{ padding: '1rem' }}
        role="dialog"
        aria-labelledby="success-title"
        aria-describedby="success-description"
      >
        <div id="success-description" className="sr-only">
          Your eeziCash voucher has been successfully purchased and is ready for cash-out at Flash traders.
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/transact')}
            style={{
              padding: '8px',
              minWidth: '44px',
              minHeight: '44px'
            }}
            aria-label="Back to transact"
          >
            <ArrowLeft style={{ width: '20px', height: '20px' }} />
          </Button>
          
          <h1 
            id="success-title"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '18px',
              fontWeight: '700',
              color: '#1f2937'
            }}
          >
            Voucher Created
          </h1>
          
          <div style={{ width: '44px' }}></div>
        </div>

        {/* Success Card */}
        <Card style={{
          backgroundColor: '#ffffff',
          border: '1px solid #16a34a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)'
        }}>
          <CardHeader style={{
            backgroundColor: '#16a34a',
            color: '#ffffff',
            borderRadius: '12px 12px 0 0'
          }}>
            <div className="flex items-center gap-3">
              <CheckCircle style={{ width: '24px', height: '24px' }} />
              <div>
                <CardTitle style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#ffffff'
                }}>
                  eeziCash Voucher Ready
                </CardTitle>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#ffffff',
                  opacity: 0.9
                }}>
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent style={{ padding: '1rem' }}>
            <div className="space-y-4">
              {/* Voucher Code */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#f8fafe',
                borderRadius: '12px',
                border: '1px dashed #86BE41'
              }}>
                <div className="text-center">
                  <Label style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    Voucher Code
                  </Label>
                  <p style={{
                    fontFamily: 'Monaco, monospace',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '8px 0',
                    letterSpacing: '2px'
                  }}>
                    {voucherToken}
                  </p>
                  <Button
                    onClick={handleCopyCode}
                    size="sm"
                    style={{
                      backgroundColor: '#86BE41',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px'
                    }}
                  >
                    <Copy style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                    Copy Code
                  </Button>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Reference
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    {transactionRef}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Face Value
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    R{pricing?.faceValue}
                  </span>
                </div>

              </div>

              {/* How to Cash Out */}
              <Alert style={{
                backgroundColor: '#e0f2fe',
                borderColor: '#2D8CCA',
                borderRadius: '12px'
              }}>
                <Info style={{ width: '16px', height: '16px', color: '#2D8CCA' }} />
                <AlertDescription>
                  <div>
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      fontWeight: '500',
                      marginBottom: '8px',
                      color: '#0c4a6e'
                    }}>
                      How to cash out:
                    </p>
                    <ol style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '11px',
                      color: '#0c4a6e',
                      paddingLeft: '16px',
                      margin: 0
                    }}>
                      <li>Visit any participating Flash trader</li>
                      <li>Present your voucher code: {voucherToken}</li>
                      <li>Provide valid ID for verification</li>
                      <li>Receive your cash (R{pricing?.faceValue})</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  style={{
                    flex: '1',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    minHeight: '44px',
                    borderRadius: '12px'
                  }}
                  onClick={handleCopyCode}
                >
                  <Copy style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Copy
                </Button>
                
                <Button
                  variant="outline"
                  style={{
                    flex: '1',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    minHeight: '44px',
                    borderRadius: '12px'
                  }}
                >
                  <Share style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Share
                </Button>
              </div>
              
              <Button
                onClick={() => navigate('/transact')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px'
                }}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'processing') {
    return (
      <div 
        style={{ padding: '1rem' }}
        role="dialog"
        aria-labelledby="processing-title"
        aria-describedby="processing-description"
      >
        <div id="processing-description" className="sr-only">
          Your eeziCash voucher purchase is being processed. Please wait.
        </div>

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
          
          <h2 
            id="processing-title"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '18px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '8px'
            }}
          >
            Processing Your Purchase
          </h2>
          
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Creating your eeziCash voucher...
          </p>
        </div>

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div 
      style={{ padding: '1rem' }}
      role="dialog"
      aria-labelledby="overlay-title"
      aria-describedby="overlay-description"
    >
      <div id="overlay-description" className="sr-only">
        Purchase an eeziCash voucher for cash-out at Flash traders.
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', position: 'relative' }}>
        <Button
          variant="ghost"
          onClick={() => navigate('/transact')}
          style={{
            padding: '8px',
            minWidth: '44px',
            minHeight: '44px',
            position: 'absolute',
            left: '0',
            zIndex: 1
          }}
          aria-label="Back to transact"
        >
          <ArrowLeft style={{ width: '20px', height: '20px' }} />
        </Button>
        
        <div style={{ 
          flex: 1, 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h1 
            id="overlay-title"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '18px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}
          >
            Cash @ Flash (eeziCash)
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280',
            margin: 0
          }}>
            Purchase voucher for instant cash-out
          </p>
        </div>
      </div>

      {/* Main Form Card */}
      <Card style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <CardHeader>
          <CardTitle style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            Create eeziCash Voucher
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Amount Section */}
          <div className="space-y-3">
            <Label 
              htmlFor="amount"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937'
              }}
            >
              Voucher Amount *
            </Label>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(quickAmount)}
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    minHeight: '36px',
                    backgroundColor: amount === quickAmount.toString() ? '#86BE41' : 'transparent',
                    color: amount === quickAmount.toString() ? '#ffffff' : '#6b7280',
                    borderColor: amount === quickAmount.toString() ? '#86BE41' : '#e2e8f0'
                  }}
                >
                  R{quickAmount}
                </Button>
              ))}
            </div>

            <div className="relative">
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280',
                zIndex: 1
              }}>
                R
              </span>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="50"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                onKeyDown={(e) => {
                  // Banking-grade: Prevent browser auto-formatting quirks
                  if (['e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onWheel={(e) => {
                  // Banking-grade: Prevent scroll-to-change number input values
                  e.currentTarget.blur();
                }}
                style={{
                  paddingLeft: '28px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '12px',
                  minHeight: '44px',
                  border: errors.amount ? '1px solid #dc2626' : '1px solid #e2e8f0'
                }}
                aria-describedby={errors.amount ? 'amount-error' : 'amount-help'}
              />
            </div>

            <p 
              id="amount-help"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '12px',
                color: '#6b7280'
              }}
            >
              Minimum R50, Maximum R500
            </p>

            {errors.amount && (
              <p 
                id="amount-error"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#dc2626'
                }}
                role="alert"
              >
                {errors.amount}
              </p>
            )}
          </div>

          {/* Pricing Summary */}
          {pricing && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafe',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '12px'
              }}>
                Pricing Summary
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Face value
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    R{pricing.faceValue}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Transaction Fee
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    R{pricing.commission.toFixed(2)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#1f2937'
                  }}>
                    Total payable
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#1f2937'
                  }}>
                    R{pricing.totalPayable.toFixed(2)}
                  </span>
                </div>
              </div>

              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                color: '#6b7280',
                marginTop: '12px',
                fontStyle: 'italic'
              }}>
                Transaction fee: R8.00 flat rate (VAT Inclusive)
              </p>
            </div>
          )}

          {/* Error Display */}
          {currentStep === 'error' && (
            <Alert style={{
              backgroundColor: '#fee2e2',
              borderColor: '#dc2626',
              borderRadius: '12px'
            }}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
              <AlertDescription>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#991b1b'
                }}>
                  Transaction failed. Please try again or contact support.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/transact')}
              style={{
                flex: '1',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                minHeight: '44px',
                borderRadius: '12px'
              }}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                flex: '2',
                background: canSubmit 
                  ? 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)' 
                  : '#e2e8f0',
                color: canSubmit ? '#ffffff' : '#6b7280',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                minHeight: '44px',
                cursor: canSubmit ? 'pointer' : 'not-allowed'
              }}
            >
              <CreditCard style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Purchase eeziCash Voucher
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


