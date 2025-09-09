import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Building, Tv, GraduationCap, MapPin, Phone, CreditCard, CheckCircle, Copy, Share } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SearchBar } from './shared/SearchBar';
import { BeneficiaryList } from './shared/BeneficiaryList';
import { BeneficiaryModal } from './shared/BeneficiaryModal';
import { ConfirmSheet } from './shared/ConfirmSheet';
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

type Step = 'search' | 'beneficiary' | 'confirm';
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
  const [error, setError] = useState<string>('');
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
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load bill payment data');
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

  const handleBeneficiarySelect = (beneficiary: BillBeneficiary) => {
    setBeneficiary(beneficiary);
    setCurrentStep('confirm');
  };

  const handleConfirmTransaction = async () => {
    if (!selectedBeneficiary || !amount) return;
    
    try {
      setLoadingState('loading');
      setError('');
      
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
      setError(err.response?.data?.message || 'Bill payment failed');
      setLoadingState('error');
    }
  };

  const handleAddNewBeneficiary = () => {
    setShowBeneficiaryModal(true);
  };

  const handleBeneficiaryCreated = (newBeneficiary: Beneficiary) => {
    // Add the new beneficiary to the list and reload
    setBillBeneficiaries(prev => [...prev, newBeneficiary as BillBeneficiary]);
    setShowBeneficiaryModal(false);
  };

  const handleEditBeneficiary = (beneficiary: BillBeneficiary) => {
    console.log('Edit bill account:', beneficiary);
  };

  const getSummaryRows = () => {
    if (!selectedBeneficiary || !amount) return [];
    
    const numericAmount = parseFloat(amount) || 100; // Default for demo
    
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
          onClick={() => currentStep === 'search' ? navigate('/transact') : setCurrentStep('search')}
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
            Search billers or pick a category.
          </p>
        </div>
      </div>

      {/* Step 1: Search & Categories */}
      {currentStep === 'search' && (
        <div className="space-y-6">
          {/* Search Section */}
          <Card style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px'
          }}>
            <CardHeader>
              <CardTitle style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                Search Billers
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <SearchBar
                placeholder="Search by company name..."
                value={searchQuery}
                onChange={setSearchQuery}
                isLoading={isSearching}
              />
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-3">
                  {searchResults.map((biller) => {
                    const IconComponent = getCategoryIcon(biller.category);
                    return (
                      <div
                        key={biller.id}
                        onClick={() => handleBillerSelect(biller)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#86BE41';
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = '#ffffff';
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
                            <IconComponent style={{ 
                              width: '20px', 
                              height: '20px', 
                              color: getCategoryColor(biller.category) 
                            }} />
                          </div>
                          
                          <div>
                            <p style={{
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#1f2937'
                            }}>
                              {biller.name}
                            </p>
                            <Badge 
                              variant="secondary"
                              style={{
                                fontSize: '10px',
                                backgroundColor: getCategoryColor(biller.category) + '20',
                                color: getCategoryColor(biller.category)
                              }}
                            >
                              {biller.category}
                            </Badge>
                          </div>
                        </div>
                        
                        <Button size="sm" variant="outline">
                          Select
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Empty Search State */}
              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="mt-4 text-center py-6">
                  <Search style={{
                    width: '48px',
                    height: '48px',
                    color: '#d1d5db',
                    margin: '0 auto 12px'
                  }} />
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    No billers found
                  </p>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    Try browsing categories below
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories Grid */}
          <Card style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px'
          }}>
            <CardHeader>
              <CardTitle style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                Browse Categories
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <div
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      style={{
                        padding: '16px',
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
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: category.color + '20',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px'
                      }}>
                        <IconComponent style={{ 
                          width: '24px', 
                          height: '24px', 
                          color: category.color 
                        }} />
                      </div>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {category.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Beneficiary Selection */}
      {currentStep === 'beneficiary' && selectedBiller && (
        <div className="space-y-4">
          {/* Selected Biller Summary */}
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

          {/* Beneficiary List */}
          <BeneficiaryList
            type="biller"
            beneficiaries={billBeneficiaries.filter(b => 
              b.metadata?.billerName === selectedBiller.name
            )}
            selectedBeneficiary={selectedBeneficiary}
            onSelect={handleBeneficiarySelect}
            onAddNew={handleAddNewBeneficiary}
            onEdit={handleEditBeneficiary}
            searchPlaceholder="Search account name or number"
            isLoading={loadingState === 'loading'}
          />
        </div>
      )}

      {/* Step 3: Confirm Sheet */}
      {currentStep === 'confirm' && selectedBeneficiary && (
        <ConfirmSheet
          title="Confirm Payment"
          summaryRows={getSummaryRows()}
          notices={getConfirmNotices()}
          primaryButtonText="Pay Now"
          secondaryButtonText="Back"
          onPrimaryAction={handleConfirmTransaction}
          onSecondaryAction={() => setCurrentStep('beneficiary')}
          isLoading={loadingState === 'loading'}
          estimatedTime="24 hours"
        />
      )}

      {/* Beneficiary Modal */}
      <BeneficiaryModal
        isOpen={showBeneficiaryModal}
        onClose={() => setShowBeneficiaryModal(false)}
        type="biller"
        onSuccess={handleBeneficiaryCreated}
      />
    </div>
  );
}