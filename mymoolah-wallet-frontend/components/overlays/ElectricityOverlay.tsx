import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap, CheckCircle, AlertTriangle, Copy, Share, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { BeneficiaryList } from './shared/BeneficiaryList';
import { BeneficiaryModal } from './shared/BeneficiaryModal';
import { ConfirmationModal } from './shared/ConfirmationModal';
import { AmountInput } from './shared/AmountInput';
import { ConfirmSheet } from './shared/ConfirmSheet';
import { 
  beneficiaryService, 
  electricityService, 
  generateIdempotencyKey,
  formatCurrency,
  validateMeterNumber,
  type Beneficiary,
  type ElectricityCatalog,
  type PurchaseResult
} from '../../services/overlayService';

interface ElectricityBeneficiary extends Beneficiary {
  // Uses accountType from base Beneficiary interface
}

type Step = 'beneficiary' | 'amount' | 'confirm';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export function ElectricityOverlay() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('beneficiary');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<ElectricityBeneficiary | null>(null);
  const [editingBeneficiary, setEditingBeneficiary] = useState<ElectricityBeneficiary | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [catalog, setCatalog] = useState<ElectricityCatalog | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<ElectricityBeneficiary[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [electricityToken, setElectricityToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [beneficiaryToRemove, setBeneficiaryToRemove] = useState<ElectricityBeneficiary | null>(null);
  const [beneficiaryIsMyMoolahUser, setBeneficiaryIsMyMoolahUser] = useState(false);

  // Load beneficiaries on mount
  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    try {
      setLoadingState('loading');
      const electricityBeneficiaries = await beneficiaryService.getBeneficiaries('electricity');
      setBeneficiaries(electricityBeneficiaries as ElectricityBeneficiary[]);
      setLoadingState('idle');
    } catch (err) {
      console.error('Failed to load beneficiaries:', err);
      setError('Failed to load beneficiaries');
      setLoadingState('error');
    }
  };

  const handleBeneficiarySelect = (beneficiary: any, accountId?: number): void => {
    void (async () => {
      try {
        setLoadingState('loading');
        const normalized = {
          ...(beneficiary as any),
          id: beneficiary.id != null ? String(beneficiary.id) : ''
        } as Beneficiary;
        setSelectedBeneficiary(normalized);
        
        // Load catalog for selected beneficiary
        const catalogData = await electricityService.getCatalog(normalized.id);
        setCatalog(catalogData);
        
        setCurrentStep('amount');
        setLoadingState('idle');
      } catch (err) {
        console.error('Failed to load catalog:', err);
        setError('Failed to load electricity catalog');
        setLoadingState('error');
      }
    })();
  };

  const handleAmountNext = () => {
    if (amount && parseFloat(amount) >= 20) {
      setCurrentStep('confirm');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!selectedBeneficiary || !amount) return;
    
    try {
      setLoadingState('loading');
      setError('');
      
      const idempotencyKey = generateIdempotencyKey();
      
      const result = await electricityService.purchase({
        beneficiaryId: selectedBeneficiary.id,
        amount: parseFloat(amount),
        idempotencyKey
      });
      
      setTransactionRef(result.reference);
      setElectricityToken(result.token || `${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}`);
      setBeneficiaryIsMyMoolahUser(result.beneficiaryIsMyMoolahUser || false);
      setLoadingState('success');
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Purchase failed:', err);
      setError(err.response?.data?.message || 'Purchase failed');
      setLoadingState('error');
    }
  };

  const handleAddNewBeneficiary = () => {
    setShowBeneficiaryModal(true);
  };

  const handleBeneficiaryCreated = (newBeneficiary: Beneficiary) => {
    // Add the new beneficiary to the list and reload
    setBeneficiaries(prev => [...prev, newBeneficiary as ElectricityBeneficiary]);
    setShowBeneficiaryModal(false);
  };

  // Handlers accept any beneficiary from BeneficiaryList; cast when storing locally
  const handleEditBeneficiary = (beneficiary: any): void => {
    setEditingBeneficiary(beneficiary as Beneficiary);
    setShowBeneficiaryModal(true);
  };

  const handleRemoveBeneficiary = (beneficiary: any): void => {
    setBeneficiaryToRemove(beneficiary as Beneficiary);
    setShowConfirmationModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!beneficiaryToRemove) return;
    
    try {
      // Banking-grade: Remove only electricity service accounts, not the entire beneficiary
      // This allows the beneficiary to still exist for other services (e.g., if they have airtime/data)
      // Never affects their user account if they're a registered MyMoolah user
      await beneficiaryService.removeAllServicesOfType(beneficiaryToRemove.id, 'electricity');
      
      // Refresh beneficiaries list
      loadBeneficiaries();
      // Clear selection if this was the selected beneficiary
      if (selectedBeneficiary?.id === beneficiaryToRemove.id) {
        setSelectedBeneficiary(null);
      }
      setBeneficiaryToRemove(null);
    } catch (error) {
      console.error('Failed to remove beneficiary services:', error);
      alert('Failed to remove recipient. Please try again.');
    }
  };

  const getSummaryRows = () => {
    if (!selectedBeneficiary || !amount) return [];
    
    const numericAmount = parseFloat(amount);
    const estimatedUnits = (numericAmount * 1.2).toFixed(1); // Mock rate
    
    return [
      {
        label: 'Meter',
        value: `${selectedBeneficiary.name}`
      },
      {
        label: 'Meter Number',
        value: selectedBeneficiary.identifier
      },
      {
        label: 'Meter Type',
        value: selectedBeneficiary.metadata?.meterType || 'Prepaid'
      },
      {
        label: 'Amount',
        value: formatCurrency(numericAmount)
      },
      {
        label: 'Est. Units',
        value: `${estimatedUnits} kWh`
      },
      {
        label: 'Total',
        value: formatCurrency(numericAmount),
        highlight: true
      }
    ];
  };

  const getConfirmNotices = () => {
    const notices = [];
    
    if (selectedBeneficiary?.metadata?.isValid === false) {
      notices.push({
        id: 'invalid-meter',
        type: 'error' as const,
        title: 'Meter Validation Required',
        description: 'This meter number needs to be verified before purchase'
      });
    }
    
    notices.push({
      id: 'token-delivery',
      type: 'info' as const,
      title: 'Token Delivery',
      description: 'Your electricity token will be delivered via SMS and in-app notification'
    });
    
    return notices;
  };

  const getEstimatedUnits = (currentAmount: string): string => {
    const numericAmount = parseFloat(currentAmount);
    if (isNaN(numericAmount)) return '';
    
    const units = (numericAmount * 1.2).toFixed(1);
    return `${units} kWh`;
  };

  if (showSuccess) {
    return (
      <div style={{ padding: '1rem' }}>
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
          >
            <ArrowLeft style={{ width: '20px', height: '20px' }} />
          </Button>
          
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            Token Generated
          </h1>
          
          <div style={{ width: '44px' }}></div>
        </div>

        {/* Token Card */}
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
                  Token Ready
                </CardTitle>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#ffffff',
                  opacity: 0.9
                }}>
                  {new Date().toLocaleString()}
                </p>
                {beneficiaryIsMyMoolahUser && (
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '10px',
                    color: '#ffffff',
                    opacity: 0.8,
                    marginTop: '4px'
                  }}>
                    ✅ Recipient notified via MyMoolah
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent style={{ padding: '1rem' }}>
            <div className="space-y-4">
              {/* Electricity Token Display */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                border: '2px dashed #d1d5db'
              }}>
                <div className="text-center">
                  <Zap style={{
                    width: '32px',
                    height: '32px',
                    color: '#f59e0b',
                    margin: '0 auto 8px'
                  }} />
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    Your Electricity Token
                  </p>
                  <p style={{
                    fontFamily: 'Monaco, Courier, monospace',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1f2937',
                    letterSpacing: '2px',
                    wordBreak: 'break-all'
                  }}>
                    {electricityToken}
                  </p>
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
                
                {getSummaryRows().map((row, index) => (
                  <div key={index} className="flex justify-between">
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      {row.label}
                    </span>
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: row.highlight ? '700' : '500',
                      color: '#1f2937'
                    }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(electricityToken)}
                  style={{
                    flex: '1',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    minHeight: '44px',
                    borderRadius: '12px'
                  }}
                >
                  <Copy style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Copy Token
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
                variant="outline"
                style={{
                  width: '100%',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  borderRadius: '12px'
                }}
              >
                <Download style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Download Receipt
              </Button>
              
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

  return (
    <div style={{ padding: '1rem' }}>
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
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#1f2937',
            margin: 0
          }}>
            Electricity
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280',
            margin: 0
          }}>
            Prepaid tokens delivered instantly.
          </p>
        </div>
      </div>

      {/* Step 1: Beneficiary Selection */}
      {currentStep === 'beneficiary' && (
        <div>
          <Card style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            marginBottom: '1rem'
          }}>
            <CardHeader>
              <CardTitle style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                Select Meter
              </CardTitle>
            </CardHeader>
          </Card>

          <BeneficiaryList
            type="electricity"
            beneficiaries={beneficiaries}
            selectedBeneficiary={selectedBeneficiary}
            onSelect={handleBeneficiarySelect}
            onAddNew={handleAddNewBeneficiary}
            onEdit={handleEditBeneficiary}
            onRemove={handleRemoveBeneficiary}
            searchPlaceholder="Search meter name or number"
            isLoading={loadingState === 'loading'}
            showFilters={false}
          />
        </div>
      )}

      {/* Step 2: Amount Input */}
      {currentStep === 'amount' && selectedBeneficiary && catalog && (
        <div className="space-y-4">
          {/* Selected Meter Summary */}
          <Card style={{
            backgroundColor: '#f8fafe',
            border: '1px solid #86BE41',
            borderRadius: '12px'
          }}>
            <CardContent style={{ padding: '1rem' }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#86BE41',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Zap style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
                <div>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    {selectedBeneficiary.name}
                  </p>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {selectedBeneficiary.identifier} • {selectedBeneficiary.metadata?.meterType || 'Prepaid'}
                  </p>
                </div>
                {selectedBeneficiary.metadata?.isValid === false && (
                  <AlertTriangle style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Amount Input Card */}
          <Card style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px'
          }}>
            <CardContent style={{ padding: '1rem' }}>
              <AmountInput
                label="Purchase Amount"
                value={amount}
                onChange={setAmount}
                currency="ZAR"
                currencySymbol="R"
                min={20}
                max={2000}
                suggestedAmounts={catalog.suggestedAmounts}
                placeholder="0.00"
                helperText="Minimum R20, Maximum R2000"
                showEstimatedUnits={true}
                estimatedUnits={getEstimatedUnits(amount)}
                required={true}
              />
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('beneficiary')}
              style={{
                flex: '1',
                minHeight: '44px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '12px'
              }}
            >
              Back
            </Button>
            
            <Button
              onClick={handleAmountNext}
              disabled={!amount || parseFloat(amount) < 20 || selectedBeneficiary?.metadata?.isValid === false}
              style={{
                flex: '2',
                minHeight: '44px',
                background: (!amount || parseFloat(amount) < 20 || selectedBeneficiary?.metadata?.isValid === false) 
                  ? '#e2e8f0' 
                  : 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                color: (!amount || parseFloat(amount) < 20 || selectedBeneficiary?.metadata?.isValid === false) 
                  ? '#6b7280' 
                  : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm Sheet */}
      {currentStep === 'confirm' && selectedBeneficiary && amount && (
        <ConfirmSheet
          title="Confirm Purchase"
          summaryRows={getSummaryRows()}
          notices={getConfirmNotices()}
          primaryButtonText="Buy Token"
          secondaryButtonText="Back"
          onPrimaryAction={handleConfirmTransaction}
          onSecondaryAction={() => setCurrentStep('amount')}
          isPrimaryDisabled={selectedBeneficiary?.metadata?.isValid === false}
          isLoading={loadingState === 'loading'}
          estimatedTime="Instant"
        />
      )}

      {/* Beneficiary Modal */}
      <BeneficiaryModal
        isOpen={showBeneficiaryModal}
        onClose={() => {
          setShowBeneficiaryModal(false);
          setEditingBeneficiary(null);
        }}
        type="electricity"
        editBeneficiary={editingBeneficiary}
        onSuccess={handleBeneficiaryCreated}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => {
          setShowConfirmationModal(false);
          setBeneficiaryToRemove(null);
        }}
        onConfirm={handleConfirmRemove}
        title="Remove Beneficiary"
        message="Are you sure you want to remove"
        confirmText="Yes, remove"
        cancelText="Cancel"
        type="danger"
        beneficiaryName={beneficiaryToRemove?.name}
      />
    </div>
  );
}