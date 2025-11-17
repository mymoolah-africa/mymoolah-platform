// import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMoolah } from '../contexts/MoolahContext';
import { 
  ArrowLeft,
  X,
  Wallet,
  Building2,
  Check,
  Download,
  Info,
  Bell
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';
import { BeneficiaryList } from '../components/overlays/shared/BeneficiaryList';
import { useEffect } from 'react';

// Types for Request Money functionality
type AccountType = 'mymoolah' | 'bank';
type RequestStep = 'form' | 'confirmation' | 'success';
type RequestMode = 'once' | 'recurring';

interface RequestFormData {
  accountType: AccountType;
  payerName: string;
  payerMobileNumber: string;
  payerAccountNumber?: string;
  payerBankName?: string;
  amount: string;
  reference: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  startTime?: string;
  endOption?: 'never' | 'count' | 'until';
  occurrences?: string;
  untilDate?: string;
  dayOfWeek?: string;
  dayOfMonth?: string;
}

interface MoneyRequest {
  id: string;
  type: 'money_request';
  accountType: AccountType;
  requesterId: string;
  requesterName: string;
  payerName: string;
  payerMobileNumber: string;
  payerAccountNumber?: string;
  payerBankName?: string;
  amount: number;
  reference: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
}

// Normalize SA mobile to 27XXXXXXXXX
const normalizeSAMobile = (v: string): string => {
  const s = (v || '').replace(/\s/g, '');
  if (s.startsWith('+27')) return s.slice(1);
  if (s.startsWith('0')) return '27' + s.slice(1);
  return s;
};

// Helpers to format local date/time for input defaults
const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const formatLocalTime = (d: Date): string => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// Get bank code for Peach Payments API
const getBankCode = (bankName: string): string => {
  const bankCodes: { [key: string]: string } = {
    'ABSA Bank': '632005',
    'African Bank': '430000',
    'Bidvest Bank': '462005',
    'Capitec Bank': '470010',
    'Discovery Bank': '679000',
    'First National Bank (FNB)': '250655',
    'Investec Bank': '580105',
    'Nedbank': '198765',
    'Standard Bank': '051001',
    'TymeBank': '678910'
  };
  return bankCodes[bankName] || '';
};

export function RequestMoneyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshBalanceAfterAction } = useMoolah();
  const [currentStep, setCurrentStep] = useState<RequestStep>('form');
  const [requestMode, setRequestMode] = useState<RequestMode>('once');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<MoneyRequest | null>(null);
  const [recentPayers, setRecentPayers] = useState<any[]>([]);
  const [loadingPayers, setLoadingPayers] = useState<boolean>(false);

  // Payshap participating banks (alphabetically ordered)
  const payshapBanks = [
    'ABSA Bank',
    'African Bank',
    'Bidvest Bank',
    'Capitec Bank',
    'Discovery Bank',
    'First National Bank (FNB)',
    'Investec Bank',
    'Nedbank',
    'Standard Bank',
    'TymeBank'
  ];
  
  const [formData, setFormData] = useState<RequestFormData>({
    accountType: 'mymoolah',
    payerName: '',
    payerMobileNumber: '',
    payerAccountNumber: '',
    payerBankName: '',
    amount: '',
    reference: '',
    frequency: 'monthly',
    startDate: formatLocalDate(new Date()),
    startTime: formatLocalTime(new Date()),
    endOption: 'never',
    occurrences: '',
    untilDate: '',
    dayOfWeek: '1',
    dayOfMonth: '1'
  });

  const [errors, setErrors] = useState<Partial<RequestFormData>>({});

  // Load recent payers for quick selection
  useEffect(() => {
    (async () => {
      try {
        setLoadingPayers(true);
        const token = getToken();
        const api = APP_CONFIG.API.baseUrl;
        const resp = await fetch(`${api}/api/v1/requests/recent-payers`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        const j = await resp.json();
        if (resp.ok && j?.success && Array.isArray(j?.data?.recentPayers)) {
          setRecentPayers(j.data.recentPayers);
        } else {
          setRecentPayers([]);
        }
      } catch (_) {
        setRecentPayers([]);
      } finally {
        setLoadingPayers(false);
      }
    })();
  }, []);

  const handleInputChange = (field: keyof RequestFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAccountTypeSelect = (type: AccountType) => {
    setFormData(prev => ({
      ...prev,
      accountType: type,
      // Clear type-specific fields when switching
      payerAccountNumber: type === 'mymoolah' ? '' : prev.payerAccountNumber,
      payerBankName: type === 'mymoolah' ? '' : prev.payerBankName
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RequestFormData> = {};

    if (!formData.payerName.trim()) {
      newErrors.payerName = 'Payer name is required';
    }

    if (!formData.payerMobileNumber.trim()) {
      newErrors.payerMobileNumber = 'Payer mobile number is required';
    } else {
      const phoneRegex = /^(\+27|27|0)[6-8][0-9]{8}$/;
      if (!phoneRegex.test(formData.payerMobileNumber.replace(/\s/g, ''))) {
        newErrors.payerMobileNumber = 'Please enter a valid South African mobile number';
      }
    }

    if (formData.accountType === 'bank') {
      if (!formData.payerAccountNumber?.trim()) {
        newErrors.payerAccountNumber = 'Payer account number is required';
      } else if (!/^[0-9]{8,12}$/.test(formData.payerAccountNumber)) {
        newErrors.payerAccountNumber = 'Account number must be 8-12 digits';
      }

      if (!formData.payerBankName?.trim()) {
        newErrors.payerBankName = 'Payer bank name is required';
      }
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Please enter a valid amount';
      } else if (amount < 5) {
        newErrors.amount = 'Minimum request amount is R5.00';
      } else if (amount > 50000) {
        newErrors.amount = 'Maximum request amount is R50,000.00';
      }
    }

    // Recurring validation
    if (requestMode === 'recurring') {
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      if (!formData.startTime) newErrors.startTime = 'Start time is required';
      if (formData.frequency === 'weekly' && !formData.dayOfWeek) newErrors.dayOfWeek = 'Select a weekday';
      if (formData.frequency === 'monthly' && !formData.dayOfMonth) newErrors.dayOfMonth = 'Select a day of month';
      if (formData.endOption === 'count') {
        const n = parseInt(formData.occurrences || '0', 10);
        if (!n || n < 1 || n > 60) newErrors.occurrences = 'Enter 1–60 occurrences';
      }
      if (formData.endOption === 'until' && !formData.untilDate) newErrors.untilDate = 'Select an end date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancel = () => {
    if (showDialog) {
      setShowDialog(false);
    } else {
      navigate('/transact');
    }
  };

  const generateRequestId = (): string => {
    return `REQ${Date.now().toString().slice(-8).toUpperCase()}`;
  };

  const handleRequestMoney = async () => {
    if (!validateForm()) {
      return;
    }

    // KYC: only required for bank requests (tiered). MMwallet requests are tier 0 (no KYC).
    if (formData.accountType === 'bank') {
      if (!user?.kycVerified) {
        navigate('/kyc/documents?returnTo=/request-money');
        return;
      }
    }

    if (!user) {
      console.error('User not authenticated');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('confirmation');

    try {
      const amount = parseFloat(formData.amount);
      const requestId = generateRequestId();
      const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours from now

      // Create the money request object
      const moneyRequest: MoneyRequest = {
        id: requestId,
        type: 'money_request',
        accountType: formData.accountType,
        requesterId: user.id,
        requesterName: user.name,
        payerName: formData.payerName,
        payerMobileNumber: formData.payerMobileNumber,
        payerAccountNumber: formData.payerAccountNumber,
        payerBankName: formData.payerBankName,
        amount: amount,
        reference: formData.reference || `Payment request from ${user.name}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      

      if (formData.accountType === 'mymoolah') {
        // MyMoolah internal request – call backend API
        const token = getToken();
        const api = APP_CONFIG.API.baseUrl;

        const resp = await fetch(`${api}/api/v1/requests/wallet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            payerPhoneNumber: normalizeSAMobile(formData.payerMobileNumber),
            amount,
            description: formData.reference || `Payment request from ${user.name}`,
          }),
        });

        const payload = await resp.json();
        if (!resp.ok || !payload?.success || !payload?.data?.requestId) {
          throw new Error(payload?.message || 'Failed to create payment request');
        }

        // Reflect backend request id in local success view
        moneyRequest.id = String(payload.data.requestId);
      } else {
        // 🆕 ENHANCED: Peach Payments bank request (PayShap RTP) with MSISDN reference
        
        // Call Peach Payments API for bank payment request with MSISDN reference
        const token = getToken();
        const api = APP_CONFIG.API.baseUrl;

        const resp = await fetch(`${api}/api/v1/peach/request-money`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amount,
            currency: 'ZAR',
            payerName: formData.payerName,
            payerMobileNumber: normalizeSAMobile(formData.payerMobileNumber),
            payerAccountNumber: formData.payerAccountNumber,
            payerBankName: formData.payerBankName,
            description: formData.reference || `Money request from ${user.name}`,
            businessContext: 'wallet',
            clientId: user.id
          }),
        });

        const payload = await resp.json();

        
        if (!resp.ok || !payload?.success) {
          const errorMessage = payload?.message || (typeof payload?.details === 'string' ? payload?.details : JSON.stringify(payload?.details)) || payload?.error || 'Failed to submit Peach Payments RTP request';
          console.error('Peach Payments API error:', errorMessage);
          throw new Error(errorMessage);
        }

        // Reflect backend request id in local success view
        moneyRequest.id = String(payload.data?.merchantTransactionId || requestId);
        
        // If there's a redirect URL, open it in a new window
        if (payload.data?.redirectUrl) {
          window.open(payload.data.redirectUrl, '_blank');
        }
      }

      setCreatedRequest(moneyRequest);
      setCurrentStep('success');

      

      // Event-driven balance refresh after payment request creation
      try {
        await refreshBalanceAfterAction('payment_request_created');
      } catch (error) {
        console.error('Balance refresh failed after request creation:', error);
        // Don't break the success flow if balance refresh fails
      }

    } catch (error) {
      console.error('Request money failed:', error);
      // Reset to form view; optionally surface a simple alert for now
      try { alert('Unable to send payment request. Please verify the payer number and try again.'); } catch (_) {}
      setCurrentStep('form');
      setShowDialog(false);
      
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: string | number): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(numAmount) ? 'R0.00' : `R${numAmount.toFixed(2)}`;
  };

  const getNotificationMessage = () => {
    if (requestMode === 'recurring') {
      if (formData.accountType === 'mymoolah') {
        return `Recurring payment requests will be sent to ${formData.payerName} according to your schedule.`;
      } else {
        return `Recurring payment requests will be submitted to ${formData.payerBankName} according to your schedule.`;
      }
    } else {
      if (formData.accountType === 'mymoolah') {
        return `${formData.payerName} will receive a notification to approve your payment request.`;
      } else {
        return `A payment request will be submitted to ${formData.payerBankName} for processing. Share your MSISDN (${user?.phoneNumber}) with the payer for automatic wallet allocation.`;
      }
    }
  };

  if (currentStep === 'success') {
    return (
      <div style={{ 
        fontFamily: 'Montserrat, sans-serif',
        backgroundColor: '#ffffff',
        padding: '16px',
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <Check style={{ width: '40px', height: '40px', color: '#16a34a' }} />
        </div>
        
        <h1 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '24px',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          {requestMode === 'recurring' ? 'Recurring Request Created!' : 'Request Sent!'}
        </h1>
        
        <p style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          {requestMode === 'recurring' 
            ? `Your recurring payment request for ${formatCurrency(formData.amount)} has been scheduled for ${formData.payerName}.`
            : `Your payment request for ${formatCurrency(formData.amount)} has been sent to ${formData.payerName}.`
          }
        </p>

        {/* 🆕 NEW: MSISDN Reference Information for Bank Requests */}
        {formData.accountType === 'bank' && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '12px',
            padding: '16px',
            width: '100%',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                backgroundColor: '#0ea5e9', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <span style={{ color: 'white', fontSize: '12px' }}>📱</span>
              </div>
              <h3 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                color: '#0c4a6e',
                margin: 0
              }}>
                Automatic Wallet Allocation
              </h3>
            </div>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#0369a1',
              marginBottom: '12px',
              lineHeight: '1.5'
            }}>
              Share your MSISDN reference with the payer:
            </p>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              <code style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#0c4a6e',
                fontFamily: 'monospace'
              }}>
                {user?.phoneNumber || 'MSISDN not available'}
              </code>
            </div>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#0369a1',
              margin: 0,
              fontStyle: 'italic'
            }}>
              💡 The bank will automatically route the payment to your wallet using this reference
            </p>
          </div>
        )}

        {createdRequest && (
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '16px',
            width: '100%',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {requestMode === 'recurring' ? 'Schedule ID' : 'Request ID'}
              </span>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937'
              }}>
                {createdRequest.id}
              </span>
            </div>
            
            {requestMode === 'recurring' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Frequency
                </span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937'
                }}>
                  {formData.frequency ? formData.frequency.charAt(0).toUpperCase() + formData.frequency.slice(1) : 'Unknown'}
                </span>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {requestMode === 'recurring' ? 'Next Request' : 'Expires'}
              </span>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937'
              }}>
                {requestMode === 'recurring' 
                  ? `${formData.startDate} at ${formData.startTime}`
                  : `${new Date(createdRequest.expiresAt).toLocaleDateString()} at ${new Date(createdRequest.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                }
              </span>
            </div>
            
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#374151',
              margin: '12px 0 0 0',
              lineHeight: '1.5'
            }}>
              {getNotificationMessage()}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <Button 
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Back to Dashboard
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/transaction-history')}
            style={{
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            View Request History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: 'Montserrat, sans-serif',
      backgroundColor: '#ffffff',
      padding: '16px',
      minHeight: 'calc(100vh - 160px)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '24px',
        position: 'relative'
      }}>
        <button
          onClick={() => navigate('/transact')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            position: 'absolute',
            left: '0',
            zIndex: 1
          }}
        >
          <ArrowLeft style={{ width: '20px', height: '20px', color: '#6b7280' }} />
        </button>
        <div style={{
          flex: 1,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '20px',
            fontWeight: '700',
            color: '#1f2937',
            margin: 0
          }}>
            Request Money
          </h1>
        </div>
      </div>

      {currentStep === 'form' && (
        <>
          {/* 🆕 NEW: MSISDN Reference Display for Automatic Wallet Allocation */}
          <div style={{ 
            backgroundColor: '#f0f9ff', 
            border: '1px solid #0ea5e9', 
            borderRadius: '12px', 
            padding: '16px', 
            marginBottom: '24px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                backgroundColor: '#0ea5e9', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>📱</span>
              </div>
              <h3 style={{ 
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '600',
                color: '#0c4a6e',
                margin: 0
              }}>
                Your Reference Number (MSISDN)
              </h3>
            </div>
            <p style={{ 
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#0369a1',
              marginBottom: '12px',
              lineHeight: '1.5'
            }}>
              Share this number with the payer for automatic wallet allocation:
            </p>
            <div style={{ 
              backgroundColor: 'white', 
              border: '2px solid #0ea5e9', 
              borderRadius: '8px', 
              padding: '12px 16px',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              <code style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#0c4a6e',
                fontFamily: 'monospace',
                letterSpacing: '1px'
              }}>
                {user?.phoneNumber || 'MSISDN not available'}
              </code>
            </div>
            <p style={{ 
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#0369a1',
              margin: 0,
              fontStyle: 'italic'
            }}>
              💡 The payer's bank will automatically route the payment to your wallet using this reference
            </p>
          </div>

          {/* Payer Quick Pick */}
          {recentPayers.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <Label style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px',
                display: 'block'
              }}>
                Recent payers
              </Label>
              <BeneficiaryList
                title="Select Payer"
                type="all"
                beneficiaries={recentPayers.map((p, idx) => ({
                  id: String(p.payerUserId || idx),
                  name: p.name || (p.phoneNumber || 'Unknown'),
                  identifier: p.phoneNumber || p.accountNumber || '',
                  accountType: 'mymoolah',
                  timesPaid: p.count || 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date(p.lastRequestedAt || Date.now()).toISOString(),
                }))}
                selectedBeneficiary={null}
                onSelect={(b) => {
                  handleInputChange('payerName', b.name);
                  handleInputChange('payerMobileNumber', b.identifier);
                }}
                onAddNew={() => {
                  const el = document.getElementById('payerName');
                  try { el?.focus(); } catch (_) {}
                }}
                onEdit={(b) => {
                  handleInputChange('payerName', b.name);
                  handleInputChange('payerMobileNumber', b.identifier);
                  try { document.getElementById('payerMobileNumber')?.focus(); } catch (_) {}
                }}
                isLoading={loadingPayers}
                searchPlaceholder="Search recent payers"
                addNewButtonText="Add New Payer"
                showFilters={false}
              />
            </div>
          )}

          {/* Mode Selection */}
          <div style={{ marginBottom: '16px' }}>
            <Label style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
              display: 'block'
            }}>
              Request Mode
            </Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => setRequestMode('once')}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${requestMode === 'once' ? '#86BE41' : '#e5e7eb'}`,
                  backgroundColor: requestMode === 'once' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Once off
              </button>
              <button
                onClick={() => setRequestMode('recurring')}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${requestMode === 'recurring' ? '#86BE41' : '#e5e7eb'}`,
                  backgroundColor: requestMode === 'recurring' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Recurring
              </button>
            </div>
          </div>
          {/* Account Type Selection */}
          <div style={{ marginBottom: '24px' }}>
            <Label style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
              display: 'block'
            }}>
              Request From Account Type
            </Label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* MyMoolah Account Type */}
              <button
                onClick={() => handleAccountTypeSelect('mymoolah')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${formData.accountType === 'mymoolah' ? '#86BE41' : '#e5e7eb'}`,
                  backgroundColor: formData.accountType === 'mymoolah' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#86BE41',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Wallet style={{ width: '16px', height: '16px', color: 'white' }} />
                </div>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: formData.accountType === 'mymoolah' ? '#16a34a' : '#374151'
                }}>
                  MyMoolah
                </span>
              </button>

              {/* Bank Account Type */}
              <button
                onClick={() => handleAccountTypeSelect('bank')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${formData.accountType === 'bank' ? '#86BE41' : '#e5e7eb'}`,
                  backgroundColor: formData.accountType === 'bank' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#2D8CCA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Building2 style={{ width: '16px', height: '16px', color: 'white' }} />
                </div>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: formData.accountType === 'bank' ? '#16a34a' : '#374151'
                }}>
                  Bank
                </span>
                {/* KYC Required Badge for Bank option */}
                {!user?.kycVerified && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    fontSize: '8px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: '500',
                    padding: '2px 4px',
                    borderRadius: '4px'
                  }}>
                    KYC
                  </div>
                )}
              </button>
            </div>
            
            {/* KYC Information for Bank selection */}
            {formData.accountType === 'bank' && !user?.kycVerified && (
              <Alert style={{
                borderColor: '#fed7aa',
                backgroundColor: '#fff7ed',
                marginTop: '12px',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <Info style={{ width: '16px', height: '16px', color: '#ea580c' }} />
                <AlertDescription>
                  <span style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: '14px',
                    color: '#ea580c'
                  }}>
                    Bank requests require identity verification. Complete KYC to enable bank requests.
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Payer Name */}
            <div>
              <Label htmlFor="payerName" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}>
                Request From (Payer Name)
              </Label>
              <Input
                id="payerName"
                type="text"
                placeholder="Enter payer's full name"
                value={formData.payerName}
                onChange={(e) => handleInputChange('payerName', e.target.value)}
                style={{
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '400',
                  borderRadius: '12px',
                  border: `1px solid ${errors.payerName ? '#dc2626' : '#d1d5db'}`,
                  backgroundColor: '#f9fafb'
                }}
              />
              {errors.payerName && (
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#dc2626',
                  margin: '4px 0 0 0'
                }}>
                  {errors.payerName}
                </p>
              )}
            </div>

            {/* Payer Mobile Number */}
            <div>
              <Label htmlFor="payerMobileNumber" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}>
                Payer Mobile Number
              </Label>
              <Input
                id="payerMobileNumber"
                type="tel"
                placeholder="27XXXXXXXXX"
                value={formData.payerMobileNumber}
                onChange={(e) => handleInputChange('payerMobileNumber', e.target.value)}
                style={{
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '400',
                  borderRadius: '12px',
                  border: `1px solid ${errors.payerMobileNumber ? '#dc2626' : '#d1d5db'}`,
                  backgroundColor: '#f9fafb'
                }}
              />
              {errors.payerMobileNumber && (
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#dc2626',
                  margin: '4px 0 0 0'
                }}>
                  {errors.payerMobileNumber}
                </p>
              )}
            </div>

            {/* Bank-specific fields */}
            {formData.accountType === 'bank' && (
              <>
                <div>
                  <Label htmlFor="payerBankName" style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px',
                    display: 'block'
                  }}>
                    Payer Bank Name
                  </Label>
                  <Select 
                    value={formData.payerBankName || ''}
                    onValueChange={(value) => handleInputChange('payerBankName', value)}
                  >
                    <SelectTrigger 
                      style={{
                        height: '44px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '400',
                        borderRadius: '12px',
                        border: `1px solid ${errors.payerBankName ? '#dc2626' : '#d1d5db'}`,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <SelectValue placeholder="Select payer's bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {payshapBanks.map((bank) => (
                        <SelectItem 
                          key={bank} 
                          value={bank}
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '14px'
                          }}
                        >
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.payerBankName && (
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#dc2626',
                      margin: '4px 0 0 0'
                    }}>
                      {errors.payerBankName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="payerAccountNumber" style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px',
                    display: 'block'
                  }}>
                    Payer Account Number
                  </Label>
                  <Input
                    id="payerAccountNumber"
                    type="text"
                    placeholder="Payer's bank account number"
                    value={formData.payerAccountNumber || ''}
                    onChange={(e) => handleInputChange('payerAccountNumber', e.target.value)}
                    style={{
                      height: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '400',
                      borderRadius: '12px',
                      border: `1px solid ${errors.payerAccountNumber ? '#dc2626' : '#d1d5db'}`,
                      backgroundColor: '#f9fafb'
                    }}
                  />
                  {errors.payerAccountNumber && (
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#dc2626',
                      margin: '4px 0 0 0'
                    }}>
                      {errors.payerAccountNumber}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Amount */}
            <div>
              <Label htmlFor="amount" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}>
                Amount to Request (ZAR)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                style={{
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '400',
                  borderRadius: '12px',
                  border: `1px solid ${errors.amount ? '#dc2626' : '#d1d5db'}`,
                  backgroundColor: '#f9fafb'
                }}
              />
              {errors.amount && (
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#dc2626',
                  margin: '4px 0 0 0'
                }}>
                  {errors.amount}
                </p>
              )}
            </div>

            {/* Reference */}
            <div>
              <Label htmlFor="reference" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}>
                Payment Reference (Optional, max 20 chars)
              </Label>
              <Input
                id="reference"
                type="text"
                placeholder="e.g. Rent Aug, Lunch money"
                maxLength={20}
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                style={{
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '400',
                  borderRadius: '12px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb'
                }}
              />
            </div>

            {/* MSISDN (Requester's Mobile Number) - Read-only, pre-populated */}
            <div>
              <Label htmlFor="requesterMsisdn" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}>
                Your Mobile Number (MSISDN) <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: '400' }}>(Auto-filled)</span>
              </Label>
              <Input
                id="requesterMsisdn"
                type="text"
                value={user?.phoneNumber || ''}
                disabled
                readOnly
                style={{
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '400',
                  borderRadius: '12px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  cursor: 'not-allowed'
                }}
              />
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
              }}>
                This number will be sent to Standard Bank to identify your wallet when payment is received.
              </p>
            </div>

            {/* Recurring schedule fields */}
            {requestMode === 'recurring' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                <div>
                  <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px', display: 'block' }}>Frequency</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {(['daily','weekly','monthly'] as const).map(f => (
                      <button key={f} onClick={() => handleInputChange('frequency', f)} style={{ padding: '10px', borderRadius: 8, border: `1px solid ${formData.frequency === f ? '#86BE41' : '#e5e7eb'}`, background: formData.frequency === f ? '#f0fdf4' : '#fff', cursor: 'pointer' }}>{f[0].toUpperCase()+f.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Start date</Label>
                    <Input type="date" value={formData.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)} style={{ height: '44px', borderRadius: 12, backgroundColor: '#f9fafb', border: `1px solid ${errors.startDate ? '#dc2626' : '#d1d5db'}` }} />
                    {errors.startDate && <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.startDate}</p>}
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Start time</Label>
                    <Input type="time" value={formData.startTime} onChange={(e) => handleInputChange('startTime', e.target.value)} style={{ height: '44px', borderRadius: 12, backgroundColor: '#f9fafb', border: `1px solid ${errors.startTime ? '#dc2626' : '#d1d5db'}` }} />
                    {errors.startTime && <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.startTime}</p>}
                  </div>
                </div>
                {formData.frequency === 'weekly' && (
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Day of week</Label>
                    <Select value={formData.dayOfWeek} onValueChange={(v) => handleInputChange('dayOfWeek', v)}>
                      <SelectTrigger style={{ height: '44px', borderRadius: 12, backgroundColor: '#f9fafb', border: `1px solid ${errors.dayOfWeek ? '#dc2626' : '#d1d5db'}` }}>
                        <SelectValue placeholder="Select weekday" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => (
                          <SelectItem key={d} value={String(i)} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.dayOfWeek && <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.dayOfWeek}</p>}
                  </div>
                )}
                {formData.frequency === 'monthly' && (
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Day of month</Label>
                    <Input type="number" min={1} max={31} value={formData.dayOfMonth} onChange={(e) => handleInputChange('dayOfMonth', e.target.value)} style={{ height: '44px', borderRadius: 12, backgroundColor: '#f9fafb', border: `1px solid ${errors.dayOfMonth ? '#dc2626' : '#d1d5db'}` }} />
                    {errors.dayOfMonth && <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.dayOfMonth}</p>}
                  </div>
                )}
                <div>
                  <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Ends</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {(['never','count','until'] as const).map(opt => (
                      <button key={opt} onClick={() => handleInputChange('endOption', opt)} style={{ padding: '10px', borderRadius: 8, border: `1px solid ${formData.endOption === opt ? '#86BE41' : '#e5e7eb'}`, background: formData.endOption === opt ? '#f0fdf4' : '#fff', cursor: 'pointer' }}>{opt[0].toUpperCase()+opt.slice(1)}</button>
                    ))}
                  </div>
                </div>
                {formData.endOption === 'count' && (
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Occurrences</Label>
                    <Input type="number" min={1} max={60} value={formData.occurrences} onChange={(e) => handleInputChange('occurrences', e.target.value)} style={{ height: '44px', borderRadius: 12, backgroundColor: '#f9fafb', border: `1px solid ${errors.occurrences ? '#dc2626' : '#d1d5db'}` }} />
                    {errors.occurrences && <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.occurrences}</p>}
                  </div>
                )}
                {formData.endOption === 'until' && (
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Until date</Label>
                    <Input type="date" value={formData.untilDate} onChange={(e) => handleInputChange('untilDate', e.target.value)} style={{ height: '44px', borderRadius: 12, backgroundColor: '#f9fafb', border: `1px solid ${errors.untilDate ? '#dc2626' : '#d1d5db'}` }} />
                    {errors.untilDate && <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.untilDate}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <Button 
              variant="outline"
              onClick={handleCancel}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '16px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Cancel
            </Button>
            
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <Button 
                onClick={() => setShowDialog(true)}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Send Request
              </Button>

              <DialogContent aria-describedby="send-request-description" style={{
                fontFamily: 'Montserrat, sans-serif',
                maxWidth: '340px',
                borderRadius: '16px'
              }}>
                <DialogHeader>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <DialogTitle style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      Send Payment Request
                    </DialogTitle>
                    <div id="send-request-description" className="sr-only">
                      Send a payment request to a contact
                    </div>
                    <button
                      onClick={() => setShowDialog(false)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                    </button>
                  </div>
                </DialogHeader>

                {/* Confirmation Details */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        Request from
                      </span>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {formData.payerName}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        Account type
                      </span>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {formData.accountType === 'mymoolah' ? 'MyMoolah' : 'Bank'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        Amount
                      </span>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1f2937'
                      }}>
                        {formatCurrency(formData.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Information message */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <Bell style={{ width: '16px', height: '16px', color: '#2D8CCA', marginTop: '2px', flexShrink: 0 }} />
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#1e40af',
                      margin: '0',
                      lineHeight: '1.4'
                    }}>
                      {getNotificationMessage()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button 
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                      style={{
                        flex: 1,
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '12px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        minHeight: '44px'
                      }}
                    >
                      Cancel
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        if (requestMode === 'recurring') {
                          // Call recurring create endpoint
                          (async () => {
                            try {
                              setIsProcessing(true);
                              const token = getToken();
                              const api = APP_CONFIG.API.baseUrl;
                              const amount = parseFloat(formData.amount);
                              const resp = await fetch(`${api}/api/v1/requests/wallet/recurring`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({
                                  payerPhoneNumber: normalizeSAMobile(formData.payerMobileNumber),
                                  amount,
                                  description: formData.reference || undefined,
                                  frequency: formData.frequency,
                                  dayOfWeek: formData.frequency === 'weekly' ? Number(formData.dayOfWeek) : undefined,
                                  dayOfMonth: formData.frequency === 'monthly' ? Number(formData.dayOfMonth) : undefined,
                                  startDate: formData.startDate,
                                  startTime: formData.startTime,
                                  endOption: formData.endOption,
                                  occurrences: formData.endOption === 'count' ? Number(formData.occurrences) : undefined,
                                  untilDate: formData.endOption === 'until' ? formData.untilDate : undefined,
                                })
                              });
                              const j = await resp.json();
                              if (!resp.ok || !j?.success) throw new Error(j?.message || 'Failed to create schedule');
                              
                              // Create a mock request object for the success page
                              const recurringRequest: MoneyRequest = {
                                id: j.data.recurringId,
                                type: 'money_request',
                                accountType: formData.accountType,
                                requesterId: user?.id?.toString() || '1',
                                requesterName: user?.name || 'User',
                                payerName: formData.payerName,
                                payerMobileNumber: formData.payerMobileNumber,
                                payerAccountNumber: formData.payerAccountNumber,
                                payerBankName: formData.payerBankName,
                                amount: parseFloat(formData.amount),
                                reference: formData.reference || '',
                                status: 'pending',
                                createdAt: new Date().toISOString(),
                                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
                              };
                              
                              setCreatedRequest(recurringRequest);
                              setCurrentStep('success');
                              setShowDialog(false);

                              // Event-driven balance refresh after recurring request creation
                              try {
                                await refreshBalanceAfterAction('payment_request_created');
                              } catch (error) {
                                console.error('Balance refresh failed after recurring request creation:', error);
                                // Don't break the success flow if balance refresh fails
                              }
                            } catch (e) {
                              console.error('Recurring request failed:', e);
                              alert('Failed to create recurring schedule. Please try again.');
                              setShowDialog(false);
                            } finally {
                              setIsProcessing(false);
                            }
                          })();
                          return;
                        }
                        handleRequestMoney();
                      }}
                      disabled={isProcessing}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        minHeight: '44px',
                        opacity: isProcessing ? 0.7 : 1
                      }}
                    >
                      {isProcessing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Download style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                          Sending Request...
                        </div>
                      ) : (
                        'Send Request'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </div>
  );
}