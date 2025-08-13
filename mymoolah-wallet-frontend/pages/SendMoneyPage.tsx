import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { 
  ArrowLeft, 
  Wallet, 
  Building, 
  CreditCard, 
  Check, 
  X, 
  AlertTriangle, 
  Info,
  Clock,
  Shield,
  Loader2,
  Search,
  Banknote,
  Phone,
  User,
  Hash
} from 'lucide-react';

// Multi-input detection utilities (same as authentication)
const detectInputType = (input: string): 'phone' | 'account' | 'username' | 'unknown' => {
  const cleanInput = input.trim();
  
  // Phone number patterns (SA format)
  const phonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
  if (phonePattern.test(cleanInput.replace(/\s/g, ''))) {
    return 'phone';
  }
  
  // Account number pattern (8-12 digits only)
  const accountPattern = /^[0-9]{8,12}$/;
  if (accountPattern.test(cleanInput)) {
    return 'account';
  }
  
  // Username pattern (4-32 chars, letters/numbers/periods/underscores)
  const usernamePattern = /^[a-zA-Z0-9._]{4,32}$/;
  if (usernamePattern.test(cleanInput)) {
    return 'username';
  }
  
  return 'unknown';
};

// Recipient validation functions
const validateRecipient = (recipient: string, type: string): { isValid: boolean; message?: string } => {
  if (!recipient.trim()) {
    return { isValid: false, message: 'Recipient is required' };
  }

  switch (type) {
    case 'phone':
      const phonePattern = /^(\+27|27|0)[6-8][0-9]{8}$/;
      if (!phonePattern.test(recipient.replace(/\s/g, ''))) {
        return { isValid: false, message: 'Invalid South African mobile number' };
      }
      return { isValid: true };
    
    case 'account':
      if (!/^[0-9]{8,12}$/.test(recipient)) {
        return { isValid: false, message: 'Account number must be 8-12 digits' };
      }
      return { isValid: true };
    
    case 'username':
      if (!/^[a-zA-Z0-9._]{4,32}$/.test(recipient)) {
        return { isValid: false, message: 'Invalid username format' };
      }
      return { isValid: true };
    
    default:
      return { isValid: false, message: 'Please enter a valid recipient' };
  }
};

// Payment method types
interface PaymentMethod {
  id: 'mymoolah_internal' | 'sa_bank_transfer' | 'atm_cash_pickup';
  name: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  fee: string;
  feeAmount: number;
  available: boolean;
  preferred: boolean;
  badge?: string;
}

interface RecipientResolution {
  identifier: string;
  type: 'phone' | 'account' | 'username' | 'unknown';
  availableMethods: PaymentMethod[];
  recipientName?: string;
  recipientInfo?: string;
}

interface TransferQuote {
  paymentMethodId: string;
  amount: number;
  fee: number;
  exchangeRate?: number;
  totalAmount: number;
  estimatedTime: string;
  reference: string;
}

type SendMoneyStep = 'recipient' | 'method' | 'amount' | 'review' | 'processing' | 'success';

export function SendMoneyPage() {
  const { user, requiresKYC } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [step, setStep] = useState<SendMoneyStep>('recipient');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [recipientResolution, setRecipientResolution] = useState<RecipientResolution | null>(null);
  const [quote, setQuote] = useState<TransferQuote | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResolvingRecipient, setIsResolvingRecipient] = useState(false);

  // Real-time validation
  const recipientType = detectInputType(recipient);
  const recipientValidation = validateRecipient(recipient, recipientType);

  // Real wallet balance from API
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  // Fetch wallet balance on component mount
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const token = (await import('../utils/authToken')).getToken();
        if (!token) return;

        const response = await fetch('/api/v1/wallets/balance', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setWalletBalance(data.data.available || 0);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchWalletBalance();
  }, []);

  // Quick amount buttons
  const quickAmounts = [50, 100, 200, 500, 1000];

  // KYC gating moved to point-of-need (bank transfer selection). No redirect on mount.

  // Real API call to resolve recipient
  const resolveRecipient = async (identifier: string): Promise<RecipientResolution> => {
    setIsResolvingRecipient(true);
    
    try {
      const token = (await import('../utils/authToken')).getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/v1/send-money/resolve-recipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve recipient');
      }

      const data = await response.json();
      setIsResolvingRecipient(false);

      return {
        identifier,
        type: data.data.type || detectInputType(identifier),
        availableMethods: data.data.availableMethods || [],
        recipientName: data.data.recipientName,
        recipientInfo: data.data.recipientInfo
      };
    } catch (error) {
      console.error('Error resolving recipient:', error);
      setIsResolvingRecipient(false);
      
      // Fallback to basic resolution
      const type = detectInputType(identifier);
      const methods: PaymentMethod[] = [];

      // Basic fallback methods
      if (type === 'phone' || type === 'username') {
        methods.push({
          id: 'mymoolah_internal',
          name: 'MyMoolah Wallet',
          description: 'Instant transfer to MyMoolah user',
          icon: <Wallet className="w-6 h-6" />,
          estimatedTime: 'Instant',
          fee: 'Free',
          feeAmount: 0,
          available: true,
          preferred: true,
          badge: 'FREE • INSTANT'
        });
      }

      return {
        identifier,
        type,
        availableMethods: methods,
        recipientName: undefined,
        recipientInfo: undefined
      };
    }
  };

  const handleRecipientSubmit = async () => {
    if (!recipientValidation.isValid) {
      setError(recipientValidation.message || 'Please enter a valid recipient');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const resolution = await resolveRecipient(recipient);
      setRecipientResolution(resolution);

      if (resolution.availableMethods.length === 0) {
        setError('No payment methods available for this recipient');
        return;
      }

      // Smart routing - skip method selection if only one option
      if (resolution.availableMethods.length === 1) {
        setSelectedMethod(resolution.availableMethods[0]);
        setStep('amount');
      } else {
        setStep('method');
      }
    } catch (err) {
      setError('Failed to resolve recipient. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    // Enforce KYC only for bank transfers at selection time
    if (method.id === 'sa_bank_transfer' && requiresKYC('send')) {
      navigate('/kyc/documents?intent=instant_payment');
      return;
    }
    setSelectedMethod(method);
    setStep('amount');
  };

  const handleAmountSubmit = async () => {
    const amountValue = parseFloat(amount);
    
    if (!amountValue || amountValue <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountValue > walletBalance) {
      setError('Insufficient balance');
      return;
    }

    if (!selectedMethod) {
      setError('Payment method not selected');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Generate quote
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const transferQuote: TransferQuote = {
        paymentMethodId: selectedMethod.id,
        amount: amountValue,
        fee: selectedMethod.feeAmount,
        totalAmount: amountValue + selectedMethod.feeAmount,
        estimatedTime: selectedMethod.estimatedTime,
        reference: `TX${Date.now().toString().slice(-8).toUpperCase()}`
      };

      setQuote(transferQuote);
      setStep('review');
    } catch (err) {
      setError('Failed to get quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!quote || !selectedMethod || !recipientResolution) {
      setError('Transfer information missing');
      return;
    }

    setError('');
    setIsLoading(true);
    setStep('processing');

    try {
      // Simulate transfer processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Different processing based on payment method
      switch (selectedMethod.id) {
        case 'mymoolah_internal':
          // Internal transfer - instant
          break;
        case 'sa_bank_transfer':
          // dtMercury API integration
          break;
        case 'atm_cash_pickup':
          // Future SP integration
          break;
      }

      setStep('success');
    } catch (err) {
      setError('Transfer failed. Please try again.');
      setStep('review');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepProgress = (): number => {
    switch (step) {
      case 'recipient': return 20;
      case 'method': return 40;
      case 'amount': return 60;
      case 'review': return 80;
      case 'processing': 
      case 'success': return 100;
      default: return 0;
    }
  };

  const getPlaceholderText = () => {
    switch (recipientType) {
      case 'phone': return '27 XX XXX XXXX';
      case 'account': return '12345678';
      case 'username': return 'username';
      default: return 'Phone, Account, or Username';
    }
  };

  const formatCurrency = (amount: number): string => {
    return `R${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '1rem' }}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors touch-target"
              style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-medium)',
                minHeight: 'var(--mobile-touch-target)'
              }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#86BE41]" />
              <span style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)',
                fontWeight: 'var(--font-weight-medium)',
                color: '#6b7280'
              }}>
                Balance: {formatCurrency(walletBalance)}
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              Send Money
            </h1>
            <p style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-base)', 
              fontWeight: 'var(--font-weight-normal)',
              color: '#6b7280'
            }}>
              {step === 'recipient' && 'Who would you like to send money to?'}
              {step === 'method' && 'Choose how to send'}
              {step === 'amount' && 'Enter the amount to send'}
              {step === 'review' && 'Review your transfer'}
              {step === 'processing' && 'Processing your transfer...'}
              {step === 'success' && 'Transfer successful!'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)',
                fontWeight: 'var(--font-weight-medium)',
                color: '#6b7280'
              }}>
                Step {step === 'recipient' ? 1 : step === 'method' ? 2 : step === 'amount' ? 3 : step === 'review' ? 4 : 5} of 5
              </span>
              <span style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)',
                color: '#6b7280'
              }}>
                {getStepProgress()}%
              </span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-normal)',
                color: '#dc2626'
              }}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Recipient Input */}
          {step === 'recipient' && (
            <Card className="bg-white border border-gray-200 shadow-sm" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3" style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                  fontWeight: 'var(--font-weight-bold)', 
                  color: '#1f2937'
                }}>
                  <div className="bg-gradient-to-r from-[#86BE41]/20 to-[#2D8CCA]/20 rounded-xl w-10 h-10 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#86BE41]" />
                  </div>
                  Recipient Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-base)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: '#374151'
                    }}>
                      Send To
                    </Label>
                    <div className="relative">
                      <Input
                        id="recipient"
                        type="text"
                        placeholder={getPlaceholderText()}
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12 ${
                          !recipientValidation.isValid && recipient.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
                          recipientValidation.isValid && recipient.trim() ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''
                        }`}
                        style={{ 
                          height: 'var(--mobile-touch-target)',
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-normal)',
                          borderRadius: 'var(--mobile-border-radius)'
                        }}
                        required
                        aria-describedby="recipient-help recipient-error"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {recipientType === 'phone' && <Phone className="w-4 h-4 text-gray-400" />}
                        {recipientType === 'account' && <Hash className="w-4 h-4 text-gray-400" />}
                        {recipientType === 'username' && <User className="w-4 h-4 text-gray-400" />}
                        {recipientType === 'unknown' && <Search className="w-4 h-4 text-gray-400" />}
                      </div>
                      {isResolvingRecipient && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#86BE41]" />
                        </div>
                      )}
                    </div>
                    
                    <div id="recipient-help" className="text-xs mt-1" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)'
                    }}>
                      {recipient.trim() ? (
                        <span className={`inline-flex items-center gap-1 ${recipientValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {recipientValidation.isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {recipientType === 'phone' && 'South African mobile number'}
                          {recipientType === 'account' && 'Bank account number'}
                          {recipientType === 'username' && 'MyMoolah username'}
                          {recipientType === 'unknown' && 'Invalid format'}
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>
                          Enter phone number, account number, or username
                        </span>
                      )}
                    </div>
                    
                    {!recipientValidation.isValid && recipient.trim() && recipientValidation.message && (
                      <div id="recipient-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)'
                      }}>
                        <AlertTriangle className="w-3 h-3" />
                        {recipientValidation.message}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleRecipientSubmit}
                    disabled={!recipientValidation.isValid || isLoading}
                    className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white disabled:opacity-60"
                    style={{ 
                      height: 'var(--mobile-touch-target)',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-medium)',
                      borderRadius: 'var(--mobile-border-radius)'
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Finding Payment Methods...</span>
                      </>
                    ) : (
                      <span>Continue</span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payment Method Selection */}
          {step === 'method' && recipientResolution && (
            <div className="space-y-4">
              <Card className="bg-blue-50 border border-blue-200" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                <CardContent style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      recipientType === 'phone' ? 'bg-[#86BE41]/20' : 
                      recipientType === 'account' ? 'bg-[#2D8CCA]/20' : 'bg-purple-100'
                    }`}>
                      {recipientType === 'phone' && <Phone className="w-4 h-4 text-[#86BE41]" />}
                      {recipientType === 'account' && <Hash className="w-4 h-4 text-[#2D8CCA]" />}
                      {recipientType === 'username' && <User className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div>
                      <p style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-base)', 
                        fontWeight: 'var(--font-weight-medium)',
                        color: '#1f2937'
                      }}>
                        {recipientResolution.recipientName || 'Recipient'}
                      </p>
                      <p style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)',
                        color: '#6b7280'
                      }}>
                        {recipientResolution.identifier} {recipientResolution.recipientInfo && `• ${recipientResolution.recipientInfo}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h3 style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'var(--mobile-font-base)', 
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#1f2937',
                  marginBottom: '0.5rem'
                }}>
                  Choose Payment Method ({recipientResolution.availableMethods.length} available)
                </h3>

                {recipientResolution.availableMethods.map((method) => (
                  <Card 
                    key={method.id}
                    className={`cursor-pointer transition-all duration-200 border-2 ${
                      method.preferred ? 'border-[#86BE41] bg-[#86BE41]/5' : 
                      'border-gray-200 hover:border-[#86BE41]/50 hover:bg-gray-50'
                    }`}
                    style={{ borderRadius: 'var(--mobile-border-radius)' }}
                    onClick={() => handleMethodSelect(method)}
                  >
                    <CardContent style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            method.id === 'mymoolah_internal' ? 'bg-[#86BE41]/20' : 
                            method.id === 'sa_bank_transfer' ? 'bg-[#2D8CCA]/20' : 'bg-orange-100'
                          }`}>
                            {React.cloneElement(method.icon as React.ReactElement, {
                              className: `w-6 h-6 ${
                                method.id === 'mymoolah_internal' ? 'text-[#86BE41]' : 
                                method.id === 'sa_bank_transfer' ? 'text-[#2D8CCA]' : 'text-orange-600'
                              }`
                            })}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p style={{ 
                                fontFamily: 'Montserrat, sans-serif', 
                                fontSize: 'var(--mobile-font-base)', 
                                fontWeight: 'var(--font-weight-medium)',
                                color: '#1f2937'
                              }}>
                                {method.name}
                              </p>
                              {method.preferred && (
                                <span className="bg-[#86BE41] text-white text-xs px-2 py-1 rounded-full" style={{ 
                                  fontFamily: 'Montserrat, sans-serif', 
                                  fontSize: '10px',
                                  fontWeight: 'var(--font-weight-medium)'
                                }}>
                                  RECOMMENDED
                                </span>
                              )}
                            </div>
                            <p style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              fontSize: 'var(--mobile-font-small)',
                              color: '#6b7280'
                            }}>
                              {method.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <span style={{ 
                                  fontFamily: 'Montserrat, sans-serif', 
                                  fontSize: 'var(--mobile-font-small)',
                                  color: '#6b7280'
                                }}>
                                  {method.estimatedTime}
                                </span>
                              </div>
                              <span style={{ color: '#d1d5db' }}>•</span>
                              <span style={{ 
                                fontFamily: 'Montserrat, sans-serif', 
                                fontSize: 'var(--mobile-font-small)',
                                fontWeight: 'var(--font-weight-medium)',
                                color: method.feeAmount === 0 ? '#16a34a' : '#6b7280'
                              }}>
                                {method.fee}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {method.badge && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              method.feeAmount === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`} style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              fontSize: '10px',
                              fontWeight: 'var(--font-weight-medium)'
                            }}>
                              {method.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Amount Input */}
          {step === 'amount' && selectedMethod && (
            <div className="space-y-4">
              {/* Selected method summary */}
              <Card className="bg-gray-50 border border-gray-200" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                <CardContent style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      selectedMethod.id === 'mymoolah_internal' ? 'bg-[#86BE41]/20' : 
                      selectedMethod.id === 'sa_bank_transfer' ? 'bg-[#2D8CCA]/20' : 'bg-orange-100'
                    }`}>
                      {React.cloneElement(selectedMethod.icon as React.ReactElement, {
                        className: `w-4 h-4 ${
                          selectedMethod.id === 'mymoolah_internal' ? 'text-[#86BE41]' : 
                          selectedMethod.id === 'sa_bank_transfer' ? 'text-[#2D8CCA]' : 'text-orange-600'
                        }`
                      })}
                    </div>
                    <div>
                      <p style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-base)', 
                        fontWeight: 'var(--font-weight-medium)',
                        color: '#1f2937'
                      }}>
                        {selectedMethod.name}
                      </p>
                      <p style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)',
                        color: '#6b7280'
                      }}>
                        {selectedMethod.estimatedTime} • {selectedMethod.fee}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: '#1f2937'
                  }}>
                    <div className="bg-gradient-to-r from-[#86BE41]/20 to-[#2D8CCA]/20 rounded-xl w-10 h-10 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-[#86BE41]" />
                    </div>
                    Enter Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount" style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-base)', 
                        fontWeight: 'var(--font-weight-medium)', 
                        color: '#374151'
                      }}>
                        Amount (ZAR)
                      </Label>
                      <div className="relative">
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-8 text-right text-2xl"
                          style={{ 
                            height: '3.5rem',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '1.5rem',
                            fontWeight: 'var(--font-weight-bold)',
                            borderRadius: 'var(--mobile-border-radius)'
                          }}
                          required
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <span style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: '1.25rem',
                            fontWeight: 'var(--font-weight-bold)',
                            color: '#6b7280'
                          }}>
                            R
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 text-right" style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)'
                      }}>
                        Available: {formatCurrency(walletBalance)}
                      </div>
                    </div>

                    {/* Quick amount buttons */}
                    <div className="space-y-2">
                      <Label style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)', 
                        fontWeight: 'var(--font-weight-medium)', 
                        color: '#6b7280'
                      }}>
                        Quick Amounts
                      </Label>
                      <div className="grid grid-cols-5 gap-2">
                        {quickAmounts.map((quickAmount) => (
                          <Button
                            key={quickAmount}
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(quickAmount.toString())}
                            className={`border-gray-200 text-gray-700 hover:border-[#86BE41] hover:text-[#86BE41] ${
                              amount === quickAmount.toString() ? 'border-[#86BE41] text-[#86BE41] bg-[#86BE41]/5' : ''
                            }`}
                            style={{ 
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: 'var(--mobile-font-small)',
                              fontWeight: 'var(--font-weight-medium)',
                              borderRadius: 'var(--mobile-border-radius)',
                              height: '2.5rem'
                            }}
                          >
                            R{quickAmount}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Purpose/Reference */}
                    <div className="space-y-2">
                      <Label htmlFor="purpose" style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-base)', 
                        fontWeight: 'var(--font-weight-medium)', 
                        color: '#374151'
                      }}>
                        Purpose (Optional)
                      </Label>
                      <Input
                        id="purpose"
                        type="text"
                        placeholder="What's this for?"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41]"
                        style={{ 
                          height: 'var(--mobile-touch-target)',
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-normal)',
                          borderRadius: 'var(--mobile-border-radius)'
                        }}
                        maxLength={50}
                      />
                    </div>

                    <Button
                      onClick={handleAmountSubmit}
                      disabled={!amount || parseFloat(amount) <= 0 || isLoading}
                      className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white disabled:opacity-60"
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-medium)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span>Getting Quote...</span>
                        </>
                      ) : (
                        <span>Continue</span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 'review' && quote && selectedMethod && recipientResolution && (
            <div className="space-y-4">
              <Card className="bg-white border border-gray-200 shadow-sm" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: '#1f2937'
                  }}>
                    <div className="bg-gradient-to-r from-[#86BE41]/20 to-[#2D8CCA]/20 rounded-xl w-10 h-10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-[#86BE41]" />
                    </div>
                    Review Transfer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Transfer summary */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: '#6b7280'
                        }}>
                          Send to
                        </span>
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: '#1f2937'
                        }}>
                          {recipientResolution.recipientName || recipientResolution.identifier}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: '#6b7280'
                        }}>
                          Payment method
                        </span>
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: '#1f2937'
                        }}>
                          {selectedMethod.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: '#6b7280'
                        }}>
                          Amount
                        </span>
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: '#1f2937'
                        }}>
                          {formatCurrency(quote.amount)}
                        </span>
                      </div>

                      {quote.fee > 0 && (
                        <div className="flex items-center justify-between">
                          <span style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-base)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: '#6b7280'
                          }}>
                            Transfer fee
                          </span>
                          <span style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-base)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: '#1f2937'
                          }}>
                            {formatCurrency(quote.fee)}
                          </span>
                        </div>
                      )}

                      {purpose && (
                        <div className="flex items-center justify-between">
                          <span style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-base)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: '#6b7280'
                          }}>
                            Purpose
                          </span>
                          <span style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-base)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: '#1f2937'
                          }}>
                            {purpose}
                          </span>
                        </div>
                      )}
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: '#1f2937'
                        }}>
                          Total
                        </span>
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: '#1f2937'
                        }}>
                          {formatCurrency(quote.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Estimated time */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: '#2563eb'
                        }}>
                          Estimated delivery: {quote.estimatedTime}
                        </span>
                      </div>
                    </div>

                    {/* Reference number */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: '#6b7280'
                        }}>
                          Reference
                        </span>
                        <span style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: '#1f2937'
                        }}>
                          {quote.reference}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleTransferSubmit}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-medium)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Send {formatCurrency(quote.totalAmount)}</span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Processing */}
          {step === 'processing' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-[#86BE41]/20 to-[#2D8CCA]/20 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#86BE41]" />
              </div>
              
              <div>
                <h3 style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', 
                  fontWeight: 'var(--font-weight-bold)', 
                  color: '#1f2937',
                  marginBottom: '0.5rem'
                }}>
                  Processing Transfer
                </h3>
                <p style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'var(--mobile-font-base)',
                  color: '#6b7280'
                }}>
                  Please wait while we process your transfer...
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-small)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: '#2563eb'
                  }}>
                    Your transfer is secured with bank-grade encryption
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Success */}
          {step === 'success' && quote && selectedMethod && recipientResolution && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              
              <div>
                <h3 style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', 
                  fontWeight: 'var(--font-weight-bold)', 
                  color: '#16a34a',
                  marginBottom: '0.5rem'
                }}>
                  Transfer Successful!
                </h3>
                <p style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'var(--mobile-font-base)',
                  color: '#6b7280'
                }}>
                  {formatCurrency(quote.amount)} sent successfully to {recipientResolution.recipientName || recipientResolution.identifier}
                </p>
              </div>

              <Card className="bg-green-50 border border-green-200" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                <CardContent style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
                  <div className="space-y-2 text-center">
                    <p style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#16a34a'
                    }}>
                      Transaction Reference
                    </p>
                    <p style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: '#1f2937'
                    }}>
                      {quote.reference}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
                  style={{ 
                    height: 'var(--mobile-touch-target)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    borderRadius: 'var(--mobile-border-radius)'
                  }}
                >
                  Back to Dashboard
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset form for new transfer
                    setStep('recipient');
                    setRecipient('');
                    setAmount('');
                    setPurpose('');
                    setSelectedMethod(null);
                    setRecipientResolution(null);
                    setQuote(null);
                    setError('');
                  }}
                  className="w-full border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
                  style={{ 
                    height: 'var(--mobile-touch-target)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    borderRadius: 'var(--mobile-border-radius)'
                  }}
                >
                  Send Another Transfer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}