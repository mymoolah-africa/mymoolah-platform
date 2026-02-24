import React, { useState, useEffect } from 'react';
import { ArrowLeft, Store, CheckCircle, Copy, Share, AlertTriangle, Info, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';

interface MMCashVoucherData {
  amount: number;
  recipientPhone?: string;
  retailPartner?: string;
  voucherType: string;
  reference: string;
  pricingPlanId: string;
}

interface ClientClassInfo {
  class: 'Standard' | 'Silver' | 'Gold' | 'Platinum';
  discount: number; // percentage or fixed amount
  isPercentage: boolean;
  badge: string;
}

interface PricingInfo {
  faceValue: number;
  clientDiscount: number;
  totalPayable: number;
  clientClass: ClientClassInfo;
}

type Step = 'form' | 'processing' | 'success' | 'error';

export function MMCashRetailOverlay() {
  const navigate = useNavigate();
  
  // Form state
  const [amount, setAmount] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [retailPartner, setRetailPartner] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<Step>('form');
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [errors, setErrors] = useState<{ amount?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Success state
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [voucherExpiry, setVoucherExpiry] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');

  // System fields (read-only)
  const systemData = {
    voucherType: 'mmcash',
    reference: `MC${Date.now().toString().slice(-8).toUpperCase()}`,
    pricingPlanId: 'GOLD_TIER_2024' // Backend-injected based on user context
  };

  // Mock client class - in real app, this comes from user context
  const [clientClass] = useState<ClientClassInfo>({
    class: 'Gold',
    discount: 2.5, // 2.5% discount for Gold members
    isPercentage: true,
    badge: 'GOLD'
  });

  // Quick amount options
  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  // Mock retail partners
  const retailPartners = [
    'Pick n Pay',
    'Shoprite',
    'Checkers',
    'Spar',
    'Game',
    'Makro',
    'Woolworths',
    'Any Partner Store'
  ];

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
    return !isNaN(numValue) && numValue >= 50 && numValue <= 5000;
  };

  // Calculate pricing based on amount and client class
  const calculatePricing = (amountValue: number): PricingInfo => {
    let discount = 0;
    
    if (clientClass.isPercentage) {
      discount = (amountValue * clientClass.discount) / 100;
    } else {
      discount = clientClass.discount;
    }
    
    // Ensure discount doesn't exceed face value
    discount = Math.min(discount, amountValue * 0.1); // Max 10% discount
    
    return {
      faceValue: amountValue,
      clientDiscount: discount,
      totalPayable: amountValue - discount,
      clientClass
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
  }, [amount, clientClass]);

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

  // Handle phone input
  const handlePhoneChange = (value: string) => {
    setRecipientPhone(value);
    
    // Clear phone error if valid
    if (validateSAMobile(value)) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  // Handle quick amount selection
  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
    setErrors(prev => ({ ...prev, amount: undefined }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { amount?: string; phone?: string } = {};
    
    if (!amount || !validateAmount(amount)) {
      newErrors.amount = 'Amount must be between R50 and R5,000';
    }
    
    if (recipientPhone && !validateSAMobile(recipientPhone)) {
      newErrors.phone = 'Please enter a valid SA mobile number';
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
      // Simulate API call
      const requestData: MMCashVoucherData = {
        amount: parseFloat(amount),
        recipientPhone: recipientPhone || undefined,
        retailPartner: retailPartner || undefined,
        voucherType: systemData.voucherType,
        reference: systemData.reference,
        pricingPlanId: systemData.pricingPlanId
      };
      
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock success response
      const mockCode = `MM${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      const mockRef = `TX${Date.now().toString().slice(-8).toUpperCase()}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry
      
      setVoucherCode(mockCode);
      setVoucherExpiry(expiryDate.toLocaleDateString());
      setTransactionRef(mockRef);
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Transaction failed:', error);
      setCurrentStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy voucher code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(voucherCode);
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
          Your MMCash voucher has been successfully created and is ready for redemption at partner retailers.
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
                  MMCash Voucher Ready
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
                    {voucherCode}
                  </p>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '11px',
                    color: '#6b7280',
                    marginBottom: '12px'
                  }}>
                    Expires: {voucherExpiry}
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

                <div className="flex justify-between">
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Client Class
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge style={{
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      fontSize: '10px'
                    }}>
                      <Star style={{ width: '10px', height: '10px', marginRight: '2px' }} />
                      {clientClass.class}
                    </Badge>
                  </div>
                </div>

                {retailPartner && (
                  <div className="flex justify-between">
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      Preferred Store
                    </span>
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#1f2937'
                    }}>
                      {retailPartner}
                    </span>
                  </div>
                )}

                {recipientPhone && (
                  <div className="flex justify-between">
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      Recipient
                    </span>
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#1f2937'
                    }}>
                      {recipientPhone}
                    </span>
                  </div>
                )}
              </div>

              {/* Redemption Steps */}
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
                      How to redeem:
                    </p>
                    <ol style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '11px',
                      color: '#0c4a6e',
                      paddingLeft: '16px',
                      margin: 0
                    }}>
                      <li>Visit any participating retail partner</li>
                      <li>Present your voucher code: {voucherCode}</li>
                      <li>Provide valid ID for verification</li>
                      <li>Redeem for goods up to R{pricing?.faceValue}</li>
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
          Your MMCash voucher creation is being processed. Please wait.
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
            Creating Your Voucher
          </h2>
          
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Generating your MMCash voucher...
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
        Create an MMCash voucher redeemable at partner retailers.
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
            Cash @ Retail (MMCash)
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280',
            margin: 0
          }}>
            Create voucher for retail redemption
          </p>
        </div>
      </div>

      {/* Client Class Badge */}
      <div className="mb-4 text-center">
        <Badge style={{
          backgroundColor: '#f59e0b',
          color: '#ffffff',
          fontSize: '12px',
          padding: '6px 12px'
        }}>
          <Star style={{ width: '12px', height: '12px', marginRight: '4px' }} />
          {clientClass.class} Member - {clientClass.discount}% Discount
        </Badge>
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
            Create MMCash Voucher
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
            <div className="grid grid-cols-3 gap-2 mb-3">
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
                  R{quickAmount >= 1000 ? `${quickAmount/1000}k` : quickAmount}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAmountChange(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  // Banking-grade: Prevent browser auto-formatting quirks
                  if (['e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onWheel={(e: React.WheelEvent<HTMLInputElement>) => {
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
              Minimum R50, Maximum R5,000
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

          {/* Recipient Phone (Optional) */}
          <div className="space-y-3">
            <Label 
              htmlFor="recipient-phone"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937'
              }}
            >
              Recipient SA Mobile Number (optional)
            </Label>
            
            <Input
              id="recipient-phone"
              type="tel"
              placeholder="27 XX XXX XXXX"
              value={recipientPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePhoneChange(e.target.value)}
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '400',
                borderRadius: '12px',
                minHeight: '44px',
                border: errors.phone ? '1px solid #dc2626' : '1px solid #e2e8f0'
              }}
              aria-describedby={errors.phone ? 'phone-error' : 'phone-help'}
            />

            <p 
              id="phone-help"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '12px',
                color: '#6b7280'
              }}
            >
              Optional: Send voucher details via SMS
            </p>

            {errors.phone && (
              <p 
                id="phone-error"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#dc2626'
                }}
                role="alert"
              >
                {errors.phone}
              </p>
            )}
          </div>

          {/* Retail Partner Selection (Optional) */}
          <div className="space-y-3">
            <Label 
              htmlFor="retail-partner"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937'
              }}
            >
              Retail Partner (optional)
            </Label>
            
            <Select value={retailPartner} onValueChange={setRetailPartner}>
              <SelectTrigger 
                id="retail-partner"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  minHeight: '44px',
                  borderRadius: '12px'
                }}
              >
                <SelectValue placeholder="Choose retail partner" />
              </SelectTrigger>
              <SelectContent>
                {retailPartners.map(partner => (
                  <SelectItem key={partner} value={partner}>{partner}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Optional: Specify preferred store for redemption
            </p>
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
                    {clientClass.class} class discount
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#16a34a'
                  }}>
                    -R{pricing.clientDiscount.toFixed(2)}
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
                Pricing linked to your client class/loyalty status.
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
              <Store style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Create MMCash Voucher
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


