/**
 * Buy USDC Overlay
 * 
 * Full-page overlay for USDC purchase and transfer to Solana wallets
 * Follows MyMoolah standard overlay pattern (beneficiary-first flow)
 * 
 * Flow:
 * 1. Beneficiary (Select/create USDC recipient)
 * 2. Amount (Enter ZAR amount, get USDC quote)
 * 3. Confirm (ConfirmSheet with warnings)
 * 4. Processing (VALR execution + blockchain)
 * 5. Success (Transaction complete, blockchain link)
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Coins, CheckCircle, ExternalLink, AlertTriangle, Copy, Clock, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ConfirmSheet } from './shared/ConfirmSheet';
import { BeneficiaryList } from './shared/BeneficiaryList';
import { BeneficiaryModal } from './shared/BeneficiaryModal';
import { ConfirmationModal } from './shared/ConfirmationModal';
import { ErrorModal } from '../ui/ErrorModal';
import { usdcService, type UsdcQuote } from '../../services/usdcService';
import { unifiedBeneficiaryService, type UnifiedBeneficiary } from '../../services/unifiedBeneficiaryService';
import { formatCurrency, beneficiaryService } from '../../services/overlayService';

type Step = 'beneficiary' | 'amount' | 'confirm' | 'processing' | 'success';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';
type Beneficiary = UnifiedBeneficiary;

const PURPOSE_OPTIONS = [
  { value: 'support', label: 'Financial Support' },
  { value: 'gift', label: 'Gift' },
  { value: 'payment', label: 'Payment for Goods/Services' },
  { value: 'investment', label: 'Investment' },
  { value: 'savings', label: 'Savings Transfer' },
  { value: 'other', label: 'Other' }
];

export function BuyUsdcOverlay() {
  const navigate = useNavigate();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('beneficiary');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  
  // Beneficiary step
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [beneficiaryToRemove, setBeneficiaryToRemove] = useState<Beneficiary | null>(null);
  
  // Amount step
  const [zarAmount, setZarAmount] = useState<string>('');
  const [quote, setQuote] = useState<UsdcQuote | null>(null);
  const [quoteExpiry, setQuoteExpiry] = useState<number>(60);
  const [quoteLoading, setQuoteLoading] = useState(false);
  
  // Confirm step  
  const [purpose, setPurpose] = useState<string>('support');
  
  // Success step
  const [transactionResult, setTransactionResult] = useState<any>(null);
  
  // Error handling
  const [error, setError] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string>('');

  // Load beneficiaries on mount
  useEffect(() => {
    loadBeneficiaries();
  }, []);

  // Quote expiry timer
  useEffect(() => {
    if (!quote) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiresAt = new Date(quote.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setQuoteExpiry(remaining);
      
      if (remaining === 0) {
        setQuote(null);
        setError('Quote expired. Please get a new quote.');
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quote]);

  const loadBeneficiaries = async () => {
    try {
      setLoadingState('loading');
      const list = await unifiedBeneficiaryService.getBeneficiariesByService('usdc');
      setBeneficiaries(list);
      setLoadingState('success');
    } catch (err: any) {
      console.error('Failed to load USDC beneficiaries:', err);
      setLoadingState('error');
    }
  };

  const handleBeneficiarySelect = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setCurrentStep('amount');
  };

  const handleCreateBeneficiary = async () => {
    await loadBeneficiaries();
    setShowBeneficiaryModal(false);
    setEditingBeneficiary(null);
  };

  const handleEditBeneficiary = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setShowBeneficiaryModal(true);
  };

  const handleRemoveBeneficiary = (beneficiary: Beneficiary) => {
    setBeneficiaryToRemove(beneficiary);
    setShowConfirmationModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!beneficiaryToRemove) return;
    try {
      const id = beneficiaryToRemove.id != null ? String(beneficiaryToRemove.id) : '';
      if (!id) return;
      await beneficiaryService.removeAllServicesOfType(id, 'usdc');
      await loadBeneficiaries();
      if (selectedBeneficiary?.id === beneficiaryToRemove.id) {
        setSelectedBeneficiary(null);
      }
      setBeneficiaryToRemove(null);
      setShowConfirmationModal(false);
    } catch (err) {
      console.error('Failed to remove USDC recipient:', err);
      setErrorModalMessage('Failed to remove recipient. Please try again.');
      setShowErrorModal(true);
    }
  };

  const handleGetQuote = async () => {
    try {
      const amount = parseFloat(zarAmount);
      if (isNaN(amount) || amount < 10) {
        setError('Minimum amount is R10');
        return;
      }
      
      if (amount > 5000) {
        setError('Maximum amount is R5,000');
        return;
      }
      
      setQuoteLoading(true);
      setError('');
      
      const quoteData = await usdcService.getQuote(amount);
      setQuote(quoteData);
      setQuoteExpiry(60);
      setCurrentStep('confirm');
    } catch (err: any) {
      console.error('Failed to get quote:', err);
      setError(err.message || 'Failed to get quote. Please try again.');
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirmSend = async () => {
    try {
      if (!quote || !selectedBeneficiary) {
        setError('Missing quote or beneficiary');
        return;
      }
      
      setLoadingState('loading');
      setCurrentStep('processing');
      setError('');
      
      const result = await usdcService.send({
        zarAmount: quote.zarAmount,
        beneficiaryId: selectedBeneficiary.id,
        purpose,
        idempotencyKey: `USDC-${Date.now()}-${Math.random().toString(36).slice(2)}`
      });
      
      if (result.success) {
        setTransactionResult(result.data);
        setLoadingState('success');
        setCurrentStep('success');
      } else {
        setErrorModalMessage(result.error?.message || 'Transaction failed');
        setShowErrorModal(true);
        setLoadingState('error');
        setCurrentStep('confirm');
      }
    } catch (err: any) {
      console.error('Failed to send USDC:', err);
      setErrorModalMessage(err.message || 'Transaction failed');
      setShowErrorModal(true);
      setLoadingState('error');
      setCurrentStep('confirm');
    }
  };

  const handleStartOver = () => {
    setCurrentStep('beneficiary');
    setZarAmount('');
    setQuote(null);
    setSelectedBeneficiary(null);
    setPurpose('support');
    setTransactionResult(null);
    setError('');
    setLoadingState('idle');
  };

  const handleBack = () => {
    if (currentStep === 'amount') {
      setCurrentStep('beneficiary');
      setZarAmount('');
      setQuote(null);
    } else if (currentStep === 'confirm') {
      setCurrentStep('amount');
    }
  };

  return (
    <div style={{
      padding: '1rem',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'Montserrat, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '1.5rem',
        position: 'relative'
      }}>
        {/* Back Button */}
        {(currentStep === 'amount' || currentStep === 'confirm') && (
          <Button
            variant="ghost"
            onClick={handleBack}
            style={{
              padding: '8px',
              minWidth: '44px',
              minHeight: '44px',
              position: 'absolute',
              left: '0',
              zIndex: 1
            }}
          >
            <ArrowLeft style={{ width: '20px', height: '20px' }} />
          </Button>
        )}
        
        {currentStep === 'beneficiary' && (
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
          >
            <ArrowLeft style={{ width: '20px', height: '20px' }} />
          </Button>
        )}

        {/* Title */}
        <div style={{
          flex: 1,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#1f2937',
            margin: 0
          }}>
            Buy USDC
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280',
            margin: 0
          }}>
            Send value globally via USDC
          </p>
        </div>
      </div>

      {/* Step 1: Beneficiary Selection */}
      {currentStep === 'beneficiary' && (
        <div>
          {loadingState === 'loading' ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #86BE41',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }} />
              Loading recipients...
            </div>
          ) : beneficiaries.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <Coins style={{ width: '48px', height: '48px', color: '#9333ea', margin: '0 auto 1rem' }} />
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                No USDC Recipients Yet
              </p>
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '1.5rem'
              }}>
                Add a recipient to start sending USDC
              </p>
              <Button
                onClick={() => setShowBeneficiaryModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                Add Recipient
              </Button>
            </div>
          ) : (
            <>
              <BeneficiaryList
                beneficiaries={beneficiaries}
                selectedBeneficiary={selectedBeneficiary}
                onSelect={handleBeneficiarySelect}
                onAddNew={() => {
                  setEditingBeneficiary(null);
                  setShowBeneficiaryModal(true);
                }}
                onEdit={handleEditBeneficiary}
                onRemove={handleRemoveBeneficiary}
                serviceType="usdc"
                showFilters={false}
                emptyMessage="No USDC recipients saved yet"
              />
              
              <Button
                onClick={() => setShowBeneficiaryModal(true)}
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                Add New Recipient
              </Button>
            </>
          )}

          {/* Important Information Card */}
          <div style={{
            marginTop: '1.5rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertTriangle style={{ width: '20px', height: '20px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#92400e',
                  marginBottom: '8px'
                }}>
                  Important Information:
                </p>
                <ul style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  color: '#92400e',
                  paddingLeft: '1rem',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  <li>Crypto transfers are <strong>irreversible</strong></li>
                  <li>Only send to <strong>Solana</strong> compatible wallets</li>
                  <li>Recipient converts USDC to local currency (MyMoolah does not provide cash-out)</li>
                  <li>Tier 2 KYC required</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Amount Entry & Quote */}
      {currentStep === 'amount' && selectedBeneficiary && (
        <div>
          {/* Selected Beneficiary Card */}
          <div style={{
            backgroundColor: '#f8fafe',
            border: '1px solid #86BE41',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '4px'
                }}>
                  {selectedBeneficiary.name}
                </p>
                <p style={{
                  fontFamily: 'Monaco, monospace',
                  fontSize: '11px',
                  color: '#6b7280',
                  wordBreak: 'break-all'
                }}>
                  {selectedBeneficiary.walletAddress?.substring(0, 12)}...{selectedBeneficiary.walletAddress?.slice(-8)}
                </p>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  {selectedBeneficiary.country} · {selectedBeneficiary.relationship}
                </p>
              </div>
              <div style={{
                backgroundColor: '#9333ea',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                USDC
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="zarAmount" style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              color: '#1f2937',
              marginBottom: '8px',
              display: 'block'
            }}>
              Amount (ZAR)
            </Label>
            <Input
              id="zarAmount"
              type="number"
              min="10"
              max="5000"
              step="0.01"
              value={zarAmount}
              onChange={(e) => setZarAmount(e.target.value)}
              placeholder="Enter amount (R10 - R5,000)"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                width: '100%'
              }}
            />
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '6px'
            }}>
              Limits: R10 min · R5,000 per transaction
            </p>
          </div>

          {/* Quote Card */}
          {quote && quoteExpiry > 0 && (
            <div style={{
              backgroundColor: '#f5f3ff',
              border: '2px solid #9333ea',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#581c87'
                }}>
                  Quote
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock style={{ width: '14px', height: '14px', color: '#9333ea' }} />
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#9333ea',
                    fontWeight: '500'
                  }}>
                    {quoteExpiry}s
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    You pay:
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {formatCurrency(quote.zarAmount)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    Platform fee (7.5%):
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    {formatCurrency(quote.platformFee)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    Network fee (est.):
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    {formatCurrency(quote.networkFee)}
                  </span>
                </div>
                
                <div style={{
                  borderTop: '1px solid #ddd6fe',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#581c87'
                  }}>
                    Recipient receives:
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#9333ea'
                  }}>
                    ${quote.usdcAmount.toFixed(2)} USDC
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '11px',
                    color: '#6b7280'
                  }}>
                    Exchange rate:
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '11px',
                    color: '#6b7280'
                  }}>
                    1 USDC = R{quote.exchangeRate.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #dc2626',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '1rem'
            }}>
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '13px',
                color: '#991b1b',
                margin: 0
              }}>
                {error}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
            <Button
              onClick={handleGetQuote}
              disabled={quoteLoading || !zarAmount || parseFloat(zarAmount) < 10}
              style={{
                flex: 1,
                background: quoteLoading || !zarAmount || parseFloat(zarAmount) < 10
                  ? '#e2e8f0'
                  : quote 
                    ? '#6b7280'
                    : 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                minHeight: '44px'
              }}
            >
              {quoteLoading ? 'Getting quote...' : quote ? 'Refresh Quote' : 'Get Quote'}
            </Button>
          </div>

          {/* Info Card */}
          <div style={{
            backgroundColor: '#e0f2fe',
            border: '1px solid #2D8CCA',
            borderRadius: '12px',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Coins style={{ width: '20px', height: '20px', color: '#2D8CCA', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0c4a6e',
                  marginBottom: '6px'
                }}>
                  About USDC
                </p>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  color: '#0c4a6e',
                  lineHeight: '1.5',
                  margin: 0
                }}>
                  USDC is a stablecoin pegged 1:1 to the US Dollar. Your recipient can convert it to local currency using their preferred exchange or P2P service.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirm (uses ConfirmSheet) */}
      {currentStep === 'confirm' && quote && selectedBeneficiary && (
        <>
          {/* Purpose Selection (above ConfirmSheet) */}
          <div style={{ marginBottom: '100px' }}>
            <Label htmlFor="purpose" style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              color: '#1f2937',
              marginBottom: '8px',
              display: 'block'
            }}>
              Purpose of Transfer
            </Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger id="purpose" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '12px',
                width: '100%',
                minHeight: '44px'
              }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURPOSE_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ConfirmSheet
            title="Confirm USDC Send"
            summaryRows={[
              { label: 'Recipient', value: selectedBeneficiary.name },
              { label: 'Wallet', value: `${selectedBeneficiary.walletAddress?.substring(0, 8)}...${selectedBeneficiary.walletAddress?.slice(-6)}` },
              { label: 'Country', value: selectedBeneficiary.country || 'Unknown' },
              { label: 'You send', value: formatCurrency(quote.zarAmount) },
              { label: 'Platform fee', value: formatCurrency(quote.platformFee) },
              { label: 'Network fee', value: formatCurrency(quote.networkFee) },
              { label: 'Recipient receives', value: `$${quote.usdcAmount.toFixed(2)} USDC`, highlight: true },
              { label: 'Exchange rate', value: `1 USDC = R${quote.exchangeRate.toFixed(2)}` }
            ]}
            notices={[
              {
                id: 'irreversible',
                type: 'error',
                title: 'Irreversible Transaction',
                description: 'Once sent, this transaction CANNOT be cancelled or refunded. Verify all details carefully.'
              },
              {
                id: 'address',
                type: 'warning',
                title: 'Verify Recipient Address',
                description: 'Sending to wrong address = permanent loss of funds. Double-check the address is correct.'
              },
              {
                id: 'network',
                type: 'warning',
                title: 'Solana Network Only',
                description: 'Only send to Solana-compatible wallets. Wrong network = funds lost permanently.'
              },
              {
                id: 'cashout',
                type: 'info',
                title: 'Recipient Responsibility',
                description: 'MyMoolah does not provide cash-out. Recipient must convert USDC using their preferred exchange.'
              }
            ]}
            primaryButtonText="Confirm & Send"
            secondaryButtonText="Back"
            onPrimaryAction={handleConfirmSend}
            onSecondaryAction={() => setCurrentStep('amount')}
            isLoading={loadingState === 'loading'}
            estimatedTime="1-5 minutes"
          />
        </>
      )}

      {/* Step 4: Processing */}
      {currentStep === 'processing' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #9333ea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem'
          }} />
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Processing Transaction
          </p>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Buying USDC and sending to recipient...
          </p>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#9333ea'
          }}>
            This typically takes 1-5 minutes
          </p>
        </div>
      )}

      {/* Step 5: Success */}
      {currentStep === 'success' && transactionResult && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '2rem'
        }}>
          {/* Success Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <CheckCircle style={{ width: '48px', height: '48px', color: '#ffffff' }} />
          </div>

          <h2 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '20px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            USDC Sent Successfully!
          </h2>

          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            ${transactionResult.usdcAmount} USDC sent to {transactionResult.beneficiaryName}
          </p>

          {/* Transaction Details Card */}
          <div style={{
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              Transaction Details
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Transaction ID:
                </span>
                <span style={{
                  fontFamily: 'Monaco, monospace',
                  fontSize: '10px',
                  color: '#1f2937'
                }}>
                  {transactionResult.transactionId.substring(0, 16)}...
                </span>
              </div>

              {transactionResult.blockchainTxHash && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      Blockchain TX:
                    </span>
                    <a
                      href={transactionResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: 'Monaco, monospace',
                        fontSize: '10px',
                        color: '#9333ea',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {transactionResult.blockchainTxHash.substring(0, 8)}...
                      <ExternalLink style={{ width: '12px', height: '12px' }} />
                    </a>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Recipient:
                </span>
                <span style={{
                  fontFamily: 'Monaco, monospace',
                  fontSize: '10px',
                  color: '#1f2937'
                }}>
                  {transactionResult.beneficiaryWalletAddress.substring(0, 8)}...
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Status:
                </span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: transactionResult.blockchainStatus === 'confirmed' ? '#16a34a' : '#f59e0b'
                }}>
                  {transactionResult.blockchainStatus === 'confirmed' ? 'Confirmed ✓' : 'Pending confirmation'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <Button
              onClick={handleStartOver}
              style={{
                flex: 1,
                background: '#ffffff',
                color: '#6b7280',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                minHeight: '44px'
              }}
            >
              Send Another
            </Button>
            <Button
              onClick={() => navigate('/transact')}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                minHeight: '44px'
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Beneficiary Modal */}
      {showBeneficiaryModal && (
        <BeneficiaryModal
          isOpen={showBeneficiaryModal}
          onClose={() => {
            setShowBeneficiaryModal(false);
            setEditingBeneficiary(null);
          }}
          onSave={handleCreateBeneficiary}
          type="usdc"
          editBeneficiary={editingBeneficiary ?? undefined}
        />
      )}

      {/* Remove recipient confirmation */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => {
          setShowConfirmationModal(false);
          setBeneficiaryToRemove(null);
        }}
        onConfirm={handleConfirmRemove}
        title="Remove Recipient"
        message="Are you sure you want to remove"
        confirmText="Yes, remove"
        cancelText="Cancel"
        type="danger"
        beneficiaryName={beneficiaryToRemove?.name}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Transaction Failed"
        message={errorModalMessage}
        type="error"
      />

      {/* Spinner Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
