import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wifi, Smartphone, CheckCircle, Copy, Share, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { BeneficiaryList } from './shared/BeneficiaryList';
import { BeneficiaryModal } from './shared/BeneficiaryModal';
import { ConfirmationModal } from './shared/ConfirmationModal';
import { ConfirmSheet } from './shared/ConfirmSheet';
import { 
  beneficiaryService, 
  airtimeDataService, 
  generateIdempotencyKey,
  formatCurrency,
  validateMobileNumber,
  type Beneficiary,
  type AirtimeDataCatalog,
  type AirtimeDataProduct,
  type PurchaseResult
} from '../../services/overlayService';

interface AirtimeDataBeneficiary extends Beneficiary {
  // Uses accountType from base Beneficiary interface
}

type Step = 'beneficiary' | 'catalog' | 'confirm';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export function AirtimeDataOverlay() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('beneficiary');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<AirtimeDataBeneficiary | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AirtimeDataProduct | null>(null);
  const [catalog, setCatalog] = useState<AirtimeDataCatalog | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<AirtimeDataBeneficiary[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [beneficiaryToRemove, setBeneficiaryToRemove] = useState<AirtimeDataBeneficiary | null>(null);
  const [beneficiaryIsMyMoolahUser, setBeneficiaryIsMyMoolahUser] = useState(false);
  const [ownAirtimeAmount, setOwnAirtimeAmount] = useState<string>('');
  const [ownDataAmount, setOwnDataAmount] = useState<string>('');
  const [editingBeneficiary, setEditingBeneficiary] = useState<AirtimeDataBeneficiary | null>(null);

  // Load beneficiaries on mount
  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    try {
      setLoadingState('loading');
      const airtimeBeneficiaries = await beneficiaryService.getBeneficiaries('airtime');
      const dataBeneficiaries = await beneficiaryService.getBeneficiaries('data');

      // Banking-grade normalization: unify airtime & data entries by identifier (MSISDN)
      // Prefer the most recently updated entry; default accountType to 'airtime' for display
      const mapByMsisdn = new Map<string, AirtimeDataBeneficiary>();
      [...airtimeBeneficiaries, ...dataBeneficiaries].forEach((b: any) => {
        const key = String(b.identifier).trim();
        const existing = mapByMsisdn.get(key);
        if (!existing) {
          mapByMsisdn.set(key, {
            ...(b as AirtimeDataBeneficiary),
            accountType: 'airtime',
          });
        } else {
          const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const currentUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          if (currentUpdated >= existingUpdated) {
            mapByMsisdn.set(key, {
              ...(b as AirtimeDataBeneficiary),
              accountType: 'airtime',
            });
          }
        }
      });

      const combined = Array.from(mapByMsisdn.values());
      setBeneficiaries(combined);
      setLoadingState('idle');
    } catch (err) {
      console.error('Failed to load beneficiaries:', err);
      setError('Failed to load beneficiaries');
      setLoadingState('error');
    }
  };

  const handleBeneficiarySelect = async (beneficiary: AirtimeDataBeneficiary) => {
    try {
      setLoadingState('loading');
      setSelectedBeneficiary(beneficiary);
      
      // Load catalog for selected beneficiary
      const catalogData = await airtimeDataService.getCatalog(beneficiary.id);
      setCatalog(catalogData);
      
      setCurrentStep('catalog');
      setLoadingState('idle');
    } catch (err) {
      console.error('Failed to load catalog:', err);
      setError('Failed to load product catalog');
      setLoadingState('error');
    }
  };

  const handleProductSelect = (product: AirtimeDataProduct) => {
    setSelectedProduct(product);
    setCurrentStep('confirm');
  };

  const handleOwnAirtimeAmount = () => {
    const amount = parseFloat(ownAirtimeAmount);
    if (amount && amount > 0 && amount <= 1000) {
      const ownProduct: AirtimeDataProduct = {
        id: `airtime_own_${Date.now()}`,
        name: `${selectedBeneficiary?.metadata?.network || 'Vodacom'} Airtime Top-up`,
        size: `R${amount.toFixed(2)}`,
        price: amount,
        provider: selectedBeneficiary?.metadata?.network || 'Vodacom',
        type: 'airtime',
        validity: 'Immediate',
        isBestDeal: false,
        supplier: 'flash',
        description: 'Custom airtime amount',
        commission: 0,
        fixedFee: 0
      };
      setSelectedProduct(ownProduct);
      setCurrentStep('confirm');
    }
  };

  const handleOwnDataAmount = () => {
    const amount = parseFloat(ownDataAmount);
    if (amount && amount > 0 && amount <= 1000) {
      const ownProduct: AirtimeDataProduct = {
        id: `data_own_${Date.now()}`,
        name: `${selectedBeneficiary?.metadata?.network || 'Vodacom'} Data Top-up`,
        size: `${amount.toFixed(0)}MB`,
        price: amount,
        provider: selectedBeneficiary?.metadata?.network || 'Vodacom',
        type: 'data',
        validity: '30 days',
        isBestDeal: false,
        supplier: 'flash',
        description: 'Custom data amount',
        commission: 0,
        fixedFee: 0
      };
      setSelectedProduct(ownProduct);
      setCurrentStep('confirm');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!selectedBeneficiary || !selectedProduct) return;
    
    try {
      setLoadingState('loading');
      setError('');
      
      const idempotencyKey = generateIdempotencyKey();
      
      const result = await airtimeDataService.purchase({
        beneficiaryId: selectedBeneficiary.id,
        productId: selectedProduct.id,
        amount: selectedProduct.price,
        idempotencyKey
      });
      
      setTransactionRef(result.reference);
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
    setEditingBeneficiary(null);
    setShowBeneficiaryModal(true);
  };

  const handleBeneficiaryCreated = (newBeneficiary: Beneficiary) => {
    if (editingBeneficiary) {
      // Update existing beneficiary in the list
      setBeneficiaries(prev => prev.map(b => 
        b.id === editingBeneficiary.id ? newBeneficiary as AirtimeDataBeneficiary : b
      ));
    } else {
      // Add the new beneficiary to the list
      setBeneficiaries(prev => [...prev, newBeneficiary as AirtimeDataBeneficiary]);
    }
    setShowBeneficiaryModal(false);
    setEditingBeneficiary(null);
  };

  const handleEditBeneficiary = (beneficiary: AirtimeDataBeneficiary) => {
    setEditingBeneficiary(beneficiary);
    setShowBeneficiaryModal(true);
  };

  const handleRemoveBeneficiary = (beneficiary: AirtimeDataBeneficiary) => {
    setBeneficiaryToRemove(beneficiary);
    setShowConfirmationModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!beneficiaryToRemove) return;
    
    try {
      await beneficiaryService.removeBeneficiary(beneficiaryToRemove.id);
      // Refresh beneficiaries list
      loadBeneficiaries();
      // Clear selection if this was the selected beneficiary
      if (selectedBeneficiary?.id === beneficiaryToRemove.id) {
        setSelectedBeneficiary(null);
      }
      setBeneficiaryToRemove(null);
    } catch (error) {
      console.error('Failed to remove beneficiary:', error);
      alert('Failed to remove beneficiary. Please try again.');
    }
  };

  const getSummaryRows = () => {
    if (!selectedBeneficiary || !selectedProduct) return [];
    
    return [
      {
        label: 'Recipient',
        value: selectedBeneficiary.name
      },
      {
        label: 'Mobile Number',
        value: selectedBeneficiary.identifier
      },
      {
        label: 'Product',
        value: selectedProduct.name
      },
      {
        label: 'Size',
        value: selectedProduct.size
      },
      {
        label: 'Provider',
        value: selectedProduct.provider
      },
      {
        label: 'Amount',
        value: formatCurrency(selectedProduct.price),
        highlight: true
      }
    ];
  };

  const getConfirmNotices = () => {
    const notices = [];
    
    if (selectedProduct?.type === 'data') {
      notices.push({
        id: 'data-validity',
        type: 'info' as const,
        title: 'Data Bundle',
        description: `Valid for ${selectedProduct.validity || '30 days'}`
      });
    }
    
    notices.push({
      id: 'instant-delivery',
      type: 'info' as const,
      title: 'Instant Delivery',
      description: 'Your airtime/data will be delivered instantly via SMS'
    });
    
    return notices;
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
            Purchase Complete
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
                  Purchase Successful
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
            Airtime & Data
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280',
            margin: 0
          }}>
            Top-up airtime and data instantly.
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
                Select Recipient
              </CardTitle>
            </CardHeader>
          </Card>

          <BeneficiaryList
            type="airtime"
            beneficiaries={beneficiaries}
            selectedBeneficiary={selectedBeneficiary}
            onSelect={handleBeneficiarySelect}
            onAddNew={handleAddNewBeneficiary}
            onEdit={handleEditBeneficiary}
            onRemove={handleRemoveBeneficiary}
            searchPlaceholder="Search recipient name or number"
            isLoading={loadingState === 'loading'}
          />
        </div>
      )}

      {/* Step 2: Product Catalog */}
      {currentStep === 'catalog' && selectedBeneficiary && catalog && (
        <div className="space-y-4">
          {/* Selected Recipient Summary */}
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
                  <Smartphone style={{ width: '20px', height: '20px', color: '#ffffff' }} />
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
                    {selectedBeneficiary.identifier}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Airtime Products */}
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
                Airtime Products
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {catalog.products.filter(product => product.type === 'airtime').map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
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
                        backgroundColor: '#86BE41',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Smartphone style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                      </div>
                      
                      <div>
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1f2937'
                        }}>
                          {product.name}
                        </p>
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {product.size} • {product.provider}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1f2937'
                      }}>
                        {formatCurrency(product.price)}
                      </p>
                      {product.isBestDeal && (
                        <span style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '10px',
                          color: '#16a34a',
                          fontWeight: '500'
                        }}>
                          Best Deal
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Own Airtime Amount */}
                <div style={{
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc'
                }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#86BE41',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Smartphone style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                    </div>
                    <div>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        Own Amount
                      </p>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        Enter custom airtime amount
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Enter amount (max R1,000)"
                      value={ownAirtimeAmount}
                      onChange={(e) => setOwnAirtimeAmount(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                      min="1"
                      max="1000"
                      step="0.01"
                    />
                    <Button
                      onClick={handleOwnAirtimeAmount}
                      disabled={!ownAirtimeAmount || parseFloat(ownAirtimeAmount) <= 0 || parseFloat(ownAirtimeAmount) > 1000}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#86BE41',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Select
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Products */}
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
                Data Products
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {catalog.products.filter(product => product.type === 'data').map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
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
                      e.currentTarget.style.borderColor = '#2D8CCA';
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
                        backgroundColor: '#2D8CCA',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Wifi style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                      </div>
                      
                      <div>
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1f2937'
                        }}>
                          {product.name}
                        </p>
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {product.size} • {product.provider}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1f2937'
                      }}>
                        {formatCurrency(product.price)}
                      </p>
                      {product.isBestDeal && (
                        <span style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '10px',
                          color: '#16a34a',
                          fontWeight: '500'
                        }}>
                          Best Deal
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Own Data Amount */}
                <div style={{
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc'
                }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#2D8CCA',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Wifi style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                    </div>
                    <div>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        Own Amount
                      </p>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        Enter custom data amount
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Enter amount (max R1,000)"
                      value={ownDataAmount}
                      onChange={(e) => setOwnDataAmount(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                      min="1"
                      max="1000"
                      step="0.01"
                    />
                    <Button
                      onClick={handleOwnDataAmount}
                      disabled={!ownDataAmount || parseFloat(ownDataAmount) <= 0 || parseFloat(ownDataAmount) > 1000}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#2D8CCA',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Select
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* International Services */}
          <Card style={{
            backgroundColor: '#f8fafc',
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
                International Services
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {/* International Airtime */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff'
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
                      backgroundColor: '#86BE41',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Smartphone style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                    </div>
                    
                    <div>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        International Airtime
                      </p>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        Top-up international numbers
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#86BE41',
                      fontWeight: '500'
                    }}>
                      Coming Soon
                    </p>
                  </div>
                </div>

                {/* International Data */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#2D8CCA';
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
                      backgroundColor: '#2D8CCA',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Wifi style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                    </div>
                    
                    <div>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        International Data
                      </p>
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        Global data roaming packages
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#2D8CCA',
                      fontWeight: '500'
                    }}>
                      Coming Soon
                    </p>
                  </div>
                </div>
              </div>
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
          </div>
        </div>
      )}

      {/* Step 3: Confirm Sheet */}
      {currentStep === 'confirm' && selectedBeneficiary && selectedProduct && (
        <ConfirmSheet
          title="Confirm Purchase"
          summaryRows={getSummaryRows()}
          notices={getConfirmNotices()}
          primaryButtonText="Buy Now"
          secondaryButtonText="Back"
          onPrimaryAction={handleConfirmTransaction}
          onSecondaryAction={() => setCurrentStep('catalog')}
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
        type="airtime"
        onSuccess={handleBeneficiaryCreated}
        editBeneficiary={editingBeneficiary}
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