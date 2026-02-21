import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Building, Tv, GraduationCap, MapPin, Phone, CreditCard, CheckCircle, Copy, Share } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { BeneficiaryList } from './shared/BeneficiaryList';
import { BeneficiaryModal } from './shared/BeneficiaryModal';
import { AmountInput } from './shared/AmountInput';
import { ConfirmSheet } from './shared/ConfirmSheet';
import { ErrorModal } from '../ui/ErrorModal';
import { 
  beneficiaryService, 
  billPaymentsService, 
  generateIdempotencyKey,
  formatCurrency,
  type Beneficiary,
  type Biller,
  type BillCategory,
  type PurchaseResult
} from '../../services/overlayService';

interface BillBeneficiary extends Beneficiary {
  // Uses accountType from base Beneficiary interface
}

type Step = 'search' | 'beneficiary' | 'amount' | 'confirm';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

const CATEGORIES = [
  { id: 'insurance', name: 'Insurance', icon: Building, color: '#2D8CCA' },
  { id: 'entertainment', name: 'Entertainment', icon: Tv, color: '#8b5cf6' },
  { id: 'education', name: 'Education', icon: GraduationCap, color: '#16a34a' },
  { id: 'municipal', name: 'Municipal', icon: MapPin, color: '#f59e0b' },
  { id: 'telecoms', name: 'Telecoms', icon: Phone, color: '#86BE41' },
  { id: 'retail', name: 'Retail Credit', icon: CreditCard, color: '#dc2626' }
];

export function BillPaymentOverlay() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [selectedBeneficiary, setBeneficiary] = useState<BillBeneficiary | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billBeneficiaries, setBillBeneficiaries] = useState<BillBeneficiary[]>([]);
  const [searchResults, setSearchResults] = useState<Biller[]>([]);
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState<string>('Payment Failed');
  const [errorModalMessage, setErrorModalMessage] = useState<string>('');
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [beneficiaryIsMyMoolahUser, setBeneficiaryIsMyMoolahUser] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingState('loading');
      
      // Load bill beneficiaries
      const beneficiaries = await beneficiaryService.getBeneficiaries('biller');
      setBillBeneficiaries(beneficiaries as BillBeneficiary[]);
      
      // Load categories
      const categoriesData = await billPaymentsService.getCategories();
      setCategories(categoriesData);
      
      setLoadingState('idle');
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setErrorModalTitle('Failed to load');
      setErrorModalMessage(err?.response?.data?.message || err?.message || 'Failed to load bill payment data. Please try again.');
      setShowErrorModal(true);
      setLoadingState('error');
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const searchBillers = async () => {
      try {
        setIsSearching(true);
        const results = await billPaymentsService.searchBillers(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } catch (err) {
        console.error('Search failed:', err);
        setIsSearching(false);
      }
    };

    const timeout = setTimeout(searchBillers, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleCategoryClick = async (categoryId: string) => {
    try {
      setIsSearching(true);
      const results = await billPaymentsService.searchBillers(undefined, categoryId);
      setSearchResults(results);
      setSearchQuery('');
      setIsSearching(false);
    } catch (err) {
      console.error('Category search failed:', err);
      setIsSearching(false);
    }
  };

  const handleBillerSelect = (biller: Biller) => {
    setSelectedBiller(biller);
    setCurrentStep('beneficiary');
  };

  const handleBeneficiarySelect = (beneficiary: any, accountId?: number): void => {
    const normalized = {
      ...(beneficiary as any),
      id: beneficiary.id != null ? String(beneficiary.id) : ''
    } as Beneficiary;
    setBeneficiary(normalized);
    setAmount('');
    setCurrentStep('amount');
  };

  const handleAmountNext = () => {
    const num = parseFloat(amount);
    if (amount && !isNaN(num) && num >= 1) {
      setCurrentStep('confirm');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!selectedBeneficiary || !amount) return;
    
    try {
      setLoadingState('loading');
      
      const idempotencyKey = generateIdempotencyKey();
      
      const result = await billPaymentsService.payBill({
        beneficiaryId: selectedBeneficiary.id,
        amount: parseFloat(amount),
        idempotencyKey
      });
      
      setTransactionRef(result.reference);
      setBeneficiaryIsMyMoolahUser(result.beneficiaryIsMyMoolahUser || false);
      setLoadingState('success');
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Bill payment failed:', err);
      setErrorModalTitle('Payment Failed');
      setErrorModalMessage(err?.response?.message || err?.response?.error || err?.message || 'Bill payment failed. Please try again.');
      setCurrentStep('amount'); // Close confirm sheet so only error modal is visible (match AirtimeDataOverlay)
      setShowErrorModal(true);
      setLoadingState('error');
    }
  };

  const handleAddNewBeneficiary = () => {
    setShowBeneficiaryModal(true);
  };

  const handleBeneficiaryCreated = (newBeneficiary: Beneficiary) => {
    // Ensure metadata.billerName matches selectedBiller so new recipient appears in filtered list
    const beneficiaryWithBiller: BillBeneficiary = {
      ...newBeneficiary,
      metadata: {
        ...(newBeneficiary.metadata || {}),
        billerName: newBeneficiary.metadata?.billerName || selectedBiller?.name || null
      }
    } as BillBeneficiary;
    setBillBeneficiaries(prev => [...prev, beneficiaryWithBiller]);
    setShowBeneficiaryModal(false);
  };

  // For now, edit just logs; accept any beneficiary shape coming from BeneficiaryList
  const handleEditBeneficiary = (beneficiary: any): void => {
    console.log('Edit bill account:', beneficiary);
  };

  const getSummaryRows = () => {
    if (!selectedBeneficiary || !amount) return [];
    
    const numericAmount = parseFloat(amount) || 0;
    
    return [
      {
        label: 'Biller',
        value: selectedBeneficiary.metadata?.billerName || 'Unknown Biller'
      },
      {
        label: 'Account',
        value: selectedBeneficiary.identifier
      },
      {
        label: 'Amount',
        value: formatCurrency(numericAmount),
        highlight: true
      }
    ];
  };

  const getConfirmNotices = () => {
    return [
      {
        id: 'bill-payment-info',
        type: 'info' as const,
        title: 'Payment Processing',
        description: 'Your payment will be processed within 24 hours and a confirmation sent via SMS'
      }
    ];
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return Building;
    return category.icon;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    return category?.color || '#6b7280';
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
            Payment Sent
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
                  Payment Successful
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

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', position: 'relative' }}>
        <Button
          variant="ghost"
          onClick={() => {
            if (currentStep === 'search') navigate('/transact');
            else if (currentStep === 'beneficiary') setCurrentStep('search');
            else if (currentStep === 'amount') setCurrentStep('beneficiary');
            else if (currentStep === 'confirm') setCurrentStep('amount');
          }}
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
            Bill Payments
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280',
            margin: 0
          }}>
            Pay your bills in one place.
          </p>
        </div>
      </div>

      {/* Step 1: Select Biller - single Card layout (match Electricity/Airtime) */}
      {currentStep === 'search' && (
        <div>
          <Card style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            marginBottom: '1rem'
          }}>
            <CardHeader style={{ paddingBottom: '0.5rem' }}>
              <CardTitle style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '18px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                Select Biller
              </CardTitle>
            </CardHeader>
            
            <CardContent style={{ padding: '1rem', paddingTop: '0.5rem' }}>
              {/* Search Input - same style as BeneficiaryList */}
              <div className="relative mb-4">
                <Search style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: '#6b7280'
                }} />
                <Input
                  placeholder="Search biller name or browse categories"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '40px',
                    height: '44px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px'
                  }}
                />
              </div>

              {/* Search Results - list style like BeneficiaryList */}
              {searchResults.length > 0 && (
                <div className="space-y-3 mb-4">
                  {searchResults.map((biller) => {
                    const IconComponent = getCategoryIcon(biller.category);
                    return (
                      <div
                        key={biller.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleBillerSelect(biller)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBillerSelect(biller); } }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#86BE41';
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <IconComponent style={{ width: '20px', height: '20px', color: getCategoryColor(biller.category) }} />
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                              {biller.name}
                            </p>
                            <Badge variant="secondary" style={{ fontSize: '10px', backgroundColor: getCategoryColor(biller.category) + '20', color: getCategoryColor(biller.category) }}>
                              {biller.category}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" style={{ borderRadius: '12px' }}>Select</Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty Search State */}
              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-6 mb-4">
                  <div style={{ width: '48px', height: '48px', backgroundColor: '#f3f4f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Search style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                  </div>
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>No billers found</p>
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280' }}>Try a different search or browse categories below</p>
                </div>
              )}

              {/* Categories - show when no search results or no search */}
              {(searchResults.length === 0 || searchQuery.length < 2) && (
                <>
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Browse by category</p>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map((category) => {
                      const IconComponent = category.icon;
                      return (
                        <div
                          key={category.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleCategoryClick(category.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCategoryClick(category.id); } }}
                          style={{
                            padding: '12px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'center'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = category.color;
                            e.currentTarget.style.backgroundColor = category.color + '10';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                        >
                          <div style={{ width: '40px', height: '40px', backgroundColor: category.color + '20', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                            <IconComponent style={{ width: '20px', height: '20px', color: category.color }} />
                          </div>
                          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: '500', color: '#1f2937' }}>{category.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Beneficiary Selection - match Electricity/Airtime layout */}
      {currentStep === 'beneficiary' && selectedBiller && (
        <div>
          {/* Selected Biller Summary */}
          <Card style={{
            backgroundColor: '#f8fafe',
            border: '1px solid #86BE41',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            marginBottom: '1rem'
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
                  <Building style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
                <div>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    {selectedBiller.name}
                  </p>
                  <Badge 
                    variant="secondary"
                    style={{
                      fontSize: '10px',
                      backgroundColor: getCategoryColor(selectedBiller.category) + '20',
                      color: getCategoryColor(selectedBiller.category)
                    }}
                  >
                    {selectedBiller.category}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Beneficiary List - same Card style as Electricity/Airtime */}
          <BeneficiaryList
            type="biller"
            title="Select Recipient"
            beneficiaries={billBeneficiaries.filter(b => 
              b.metadata?.billerName === selectedBiller.name
            )}
            selectedBeneficiary={selectedBeneficiary}
            onSelect={handleBeneficiarySelect}
            onAddNew={handleAddNewBeneficiary}
            onEdit={handleEditBeneficiary}
            searchPlaceholder="Search account name or number"
            isLoading={loadingState === 'loading'}
            showFilters={false}
          />
        </div>
      )}

      {/* Step 3: Amount Input - match Electricity layout */}
      {currentStep === 'amount' && selectedBeneficiary && selectedBiller && (
        <div className="space-y-4">
          {/* Selected Biller & Account Summary */}
          <Card style={{
            backgroundColor: '#f8fafe',
            border: '1px solid #86BE41',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
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
                  <Building style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
                <div>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    {selectedBiller.name}
                  </p>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {selectedBeneficiary.name} • {selectedBeneficiary.identifier}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent style={{ padding: '1rem' }}>
              <AmountInput
                label="Amount to pay"
                value={amount}
                onChange={setAmount}
                currency="ZAR"
                currencySymbol="R"
                min={1}
                max={100000}
                suggestedAmounts={[50, 100, 200, 500, 1000]}
                placeholder="0.00"
                helperText="Enter the amount you want to pay towards this bill"
                required
              />
              <Button
                onClick={handleAmountNext}
                disabled={!amount || parseFloat(amount) < 1 || isNaN(parseFloat(amount))}
                style={{
                  width: '100%',
                  marginTop: '1rem',
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
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Confirm Sheet */}
      {currentStep === 'confirm' && selectedBeneficiary && amount && (
        <ConfirmSheet
          title="Confirm Payment"
          summaryRows={getSummaryRows()}
          notices={getConfirmNotices()}
          primaryButtonText="Pay Now"
          secondaryButtonText="Back"
          onPrimaryAction={handleConfirmTransaction}
          onSecondaryAction={() => setCurrentStep('amount')}
          isLoading={loadingState === 'loading'}
          estimatedTime="24 hours"
        />
      )}

      {/* Beneficiary Modal - pass selected biller name so new recipient appears in filtered list */}
      <BeneficiaryModal
        isOpen={showBeneficiaryModal}
        onClose={() => setShowBeneficiaryModal(false)}
        type="biller"
        initialBillerName={selectedBiller?.name}
        onSuccess={handleBeneficiaryCreated}
      />

      {/* Error Modal - plain explanation when payment or load fails */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorModalTitle}
        message={errorModalMessage}
        type="error"
      />
    </div>
  );
}