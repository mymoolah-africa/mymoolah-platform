/**
 * Modern Airtime & Data Overlay - World-Class UX
 * 
 * Features:
 * - Recent recipients with one-tap repeat purchase
 * - Network filtering (MTN, Vodacom, Cell C, Telkom, All)
 * - Smart product grid with search
 * - AI-powered suggestions based on purchase history
 * - Card-based modern design
 * - Responsive and mobile-optimized
 * 
 * @version 2.4.22
 * @date 2025-12-13
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecentRecipients } from './RecentRecipients';
import { NetworkFilter, type NetworkType } from './NetworkFilter';
import { SmartProductGrid, type Product } from './SmartProductGrid';
import { SmartSuggestions, generateSuggestions, type Suggestion } from './SmartSuggestions';
import { apiService } from '../../../services/apiService';

type ViewMode = 'home' | 'products' | 'confirm' | 'success';

interface Beneficiary {
  id: string;
  name: string;
  msisdn: string;
  network?: string;
  isFavorite?: boolean;
  lastPurchase?: {
    amount: number;
    type: 'airtime' | 'data';
    date: string;
  };
  vasServices?: {
    airtime?: Array<{ mobileNumber: string; network: string; isActive: boolean; description?: string }>;
    data?: Array<{ mobileNumber: string; network: string; isActive: boolean; description?: string }>;
  };
}

export function AirtimeDataOverlayModern() {
  const navigate = useNavigate();
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load beneficiaries (airtime + data) - with fallback for errors
      let airtimeBenefs: any[] = [];
      let dataBenefs: any[] = [];
      let recentTx: any[] = [];
      
      try {
        const allBenefs = await apiService.getBeneficiaries();
        airtimeBenefs = allBenefs.filter((b: any) => 
          b.vasServices?.airtime?.length > 0 || b.accountType === 'airtime'
        );
        dataBenefs = allBenefs.filter((b: any) => 
          b.vasServices?.data?.length > 0 || b.accountType === 'data'
        );
      } catch (err) {
        console.error('Failed to load beneficiaries:', err);
        // Continue with empty beneficiaries
      }
      
      try {
        recentTx = await apiService.getRecentTransactions(50);
      } catch (err) {
        console.error('Failed to load transactions:', err);
        // Continue with empty transactions
      }

      // Merge and deduplicate beneficiaries
      const allBenefs = [...airtimeBenefs, ...dataBenefs];
      const uniqueBenefs = Array.from(
        new Map(allBenefs.map(b => [b.id, b])).values()
      ) as Beneficiary[];

      // Sort by favorite, then last purchase
      const sortedBenefs = uniqueBenefs.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        if (a.lastPurchase && b.lastPurchase) {
          return new Date(b.lastPurchase.date).getTime() - new Date(a.lastPurchase.date).getTime();
        }
        return 0;
      });

      setBeneficiaries(sortedBenefs);
      setTransactions(recentTx);

      // Load product catalog from comparison API
      await loadProducts();

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load data. Please try again.');
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      // Use supplier comparison API for airtime and data - with error handling
      let airtimeComparison: any = { bestDeals: [], products: [] };
      let dataComparison: any = { bestDeals: [], products: [] };
      
      try {
        [airtimeComparison, dataComparison] = await Promise.all([
          apiService.compareSuppliers('airtime'),
          apiService.compareSuppliers('data')
        ]);
      } catch (err) {
        console.error('Failed to load product comparisons:', err);
        // Continue with empty products
        return;
      }

      const airtimeProds = (airtimeComparison.bestDeals || airtimeComparison.products || []).map((p: any) => ({
        id: p.id || p.productId,
        name: p.productName || p.name,
        size: p.size || `R${(p.price / 100).toFixed(0)}`,
        price: p.price || p.minAmount,
        provider: p.provider || p.supplierCode,
        type: 'airtime' as const,
        validity: p.validity || 'Immediate',
        isBestDeal: p.isBestDeal || false,
        isPopular: p.isPopular || false,
        discount: p.discount || 0,
        description: p.description,
        commission: p.commission || 0
      }));

      const dataProds = (dataComparison.bestDeals || dataComparison.products || []).map((p: any) => ({
        id: p.id || p.productId,
        name: p.productName || p.name,
        size: p.size || `${(p.minAmount / 100).toFixed(0)}MB`,
        price: p.price || p.minAmount,
        provider: p.provider || p.supplierCode,
        type: 'data' as const,
        validity: p.validity || '30 days',
        isBestDeal: p.isBestDeal || false,
        isPopular: p.isPopular || false,
        discount: p.discount || 0,
        description: p.description,
        commission: p.commission || 0
      }));

      const allProducts = [...airtimeProds, ...dataProds];
      setProducts(allProducts);
      setFilteredProducts(allProducts);

      // Generate AI suggestions
      const aiSuggestions = generateSuggestions(transactions, beneficiaries, allProducts);
      setSuggestions(aiSuggestions);

    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  // Handle beneficiary selection
  const handleBeneficiarySelect = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    
    // Filter products by beneficiary's network if available
    const network = beneficiary.vasServices?.airtime?.[0]?.network || 
                    beneficiary.vasServices?.data?.[0]?.network;
    if (network) {
      setSelectedNetwork(network as NetworkType);
    }
    
    setViewMode('products');
  };

  // Handle repeat purchase
  const handleRepeatPurchase = async (beneficiary: Beneficiary) => {
    if (!beneficiary.lastPurchase) return;
    
    setSelectedBeneficiary(beneficiary);
    
    // Find the product that matches the last purchase
    const product = products.find(p => 
      p.price === beneficiary.lastPurchase?.amount &&
      p.type === beneficiary.lastPurchase?.type
    );
    
    if (product) {
      setSelectedProduct(product);
      setViewMode('confirm');
    } else {
      // If exact product not found, go to product selection
      setViewMode('products');
    }
  };

  // Handle network filter change
  const handleNetworkChange = (network: NetworkType) => {
    setSelectedNetwork(network);
    
    if (network === 'All') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => 
        p.provider?.toLowerCase() === network.toLowerCase()
      ));
    }
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setViewMode('confirm');
  };

  // Handle suggestion action
  const handleSuggestionAction = (suggestion: Suggestion) => {
    if (suggestion.action?.beneficiaryId) {
      const beneficiary = beneficiaries.find(b => b.id === suggestion.action?.beneficiaryId);
      if (beneficiary) {
        handleBeneficiarySelect(beneficiary);
      }
    } else if (suggestion.action?.productId) {
      const product = products.find(p => p.id === suggestion.action?.productId);
      if (product) {
        handleProductSelect(product);
      }
    }
  };

  // Handle purchase confirmation
  const handleConfirmPurchase = async () => {
    if (!selectedProduct || !selectedBeneficiary) return;

    try {
      setIsLoading(true);
      
      // TODO: Implement actual purchase API call
      // const result = await apiService.purchaseAirtimeOrData({
      //   productId: selectedProduct.id,
      //   beneficiaryId: selectedBeneficiary.id,
      //   amount: selectedProduct.price
      // });

      // Simulate success for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setViewMode('success');
      setIsLoading(false);
      
      // Reload beneficiaries to update last purchase
      setTimeout(() => {
        loadInitialData();
      }, 2000);

    } catch (err) {
      console.error('Purchase failed:', err);
      setError('Purchase failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Calculate product counts per network
  const productCounts = {
    all: products.length,
    mtn: products.filter(p => p.provider?.toLowerCase() === 'mtn').length,
    vodacom: products.filter(p => p.provider?.toLowerCase() === 'vodacom').length,
    cellc: products.filter(p => p.provider?.toLowerCase() === 'cell c').length,
    telkom: products.filter(p => p.provider?.toLowerCase() === 'telkom').length
  };

  // Render different views
  const renderHomeView = () => (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={20} />
          Airtime & Data
        </button>

        <button
          onClick={() => {/* TODO: Open add beneficiary modal */}}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: '#86BE41',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '20px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#75A835'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#86BE41'}
        >
          <Plus size={16} />
          Add Recipient
        </button>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <SmartSuggestions
          suggestions={suggestions}
          onActionClick={handleSuggestionAction}
          maxDisplay={2}
        />
      )}

      {/* Recent Recipients */}
      {beneficiaries.length > 0 && (
        <RecentRecipients
          recipients={beneficiaries.map(b => ({
            id: b.id,
            name: b.name,
            msisdn: b.msisdn,
            network: b.vasServices?.airtime?.[0]?.network || b.vasServices?.data?.[0]?.network,
            lastPurchase: b.lastPurchase,
            isFavorite: b.isFavorite
          }))}
          onSelect={handleBeneficiarySelect}
          onRepeat={handleRepeatPurchase}
          maxDisplay={5}
        />
      )}

      {/* Search/Browse Section */}
      <div style={{
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px'
      }}>
        <h3 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '16px',
          fontWeight: '700',
          color: '#1F2937',
          marginBottom: '16px'
        }}>
          Browse Products
        </h3>

        {/* Network Filter */}
        <NetworkFilter
          selectedNetwork={selectedNetwork}
          onNetworkChange={handleNetworkChange}
          productCounts={productCounts}
        />

        {/* Product Grid */}
        <SmartProductGrid
          products={filteredProducts}
          onProductSelect={(product) => {
            setSelectedProduct(product);
            setViewMode('products'); // Show product details first
          }}
          selectedNetwork={selectedNetwork}
          showSearch={true}
          maxInitialDisplay={8}
        />
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginTop: '24px'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '24px',
            fontWeight: '700',
            color: '#86BE41'
          }}>
            {beneficiaries.length}
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#6B7280'
          }}>
            Recipients
          </div>
        </div>
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '24px',
            fontWeight: '700',
            color: '#2D8CCA'
          }}>
            {products.length}
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#6B7280'
          }}>
            Products
          </div>
        </div>
      </div>
    </div>
  );

  const renderProductsView = () => (
    <div style={{ padding: '20px' }}>
      {/* Header with Back */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setViewMode('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={20} />
          {selectedBeneficiary ? `For ${selectedBeneficiary.name}` : 'Select Product'}
        </button>
      </div>

      {/* Selected Beneficiary Info */}
      {selectedBeneficiary && (
        <div style={{
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <User size={20} color="#6B7280" />
          <div>
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1F2937'
            }}>
              {selectedBeneficiary.name}
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: '#6B7280'
            }}>
              {selectedBeneficiary.msisdn}
            </div>
          </div>
        </div>
      )}

      {/* Network Filter */}
      <NetworkFilter
        selectedNetwork={selectedNetwork}
        onNetworkChange={handleNetworkChange}
        productCounts={productCounts}
      />

      {/* Product Grid */}
      <SmartProductGrid
        products={filteredProducts}
        onProductSelect={(product) => {
          setSelectedProduct(product);
          setViewMode('confirm');
        }}
        selectedNetwork={selectedNetwork}
        showSearch={true}
      />
    </div>
  );

  const renderConfirmView = () => {
    if (!selectedProduct || !selectedBeneficiary) return null;

    return (
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setViewMode('products')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1F2937',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
            Confirm Purchase
          </button>
        </div>

        {/* Purchase Summary Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          {/* To */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: '#6B7280',
              marginBottom: '8px'
            }}>
              To
            </div>
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1F2937'
            }}>
              {selectedBeneficiary.name}
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              color: '#6B7280'
            }}>
              {selectedBeneficiary.msisdn}
            </div>
          </div>

          <div style={{
            height: '1px',
            backgroundColor: '#E5E7EB',
            margin: '20px 0'
          }} />

          {/* Product */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: '#6B7280',
              marginBottom: '8px'
            }}>
              Product
            </div>
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1F2937'
            }}>
              {selectedProduct.size} {selectedProduct.provider} {selectedProduct.type}
            </div>
            {selectedProduct.validity && (
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                color: '#6B7280'
              }}>
                Valid: {selectedProduct.validity}
              </div>
            )}
          </div>

          <div style={{
            height: '1px',
            backgroundColor: '#E5E7EB',
            margin: '20px 0'
          }} />

          {/* Amount */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              color: '#6B7280'
            }}>
              Amount
            </span>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '24px',
              fontWeight: '700',
              color: '#10B981'
            }}>
              R {(selectedProduct.price / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirmPurchase}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#86BE41',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: isLoading ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = '#75A835';
          }}
          onMouseOut={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = '#86BE41';
          }}
        >
          {isLoading ? 'Processing...' : `Confirm Purchase`}
        </button>

        <button
          onClick={() => setViewMode('products')}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '14px',
            backgroundColor: 'transparent',
            color: '#6B7280',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Change Product
        </button>
      </div>
    );
  };

  const renderSuccessView = () => (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#ECFDF5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <div style={{
          fontSize: '48px'
        }}>
          ✓
        </div>
      </div>

      <h2 style={{
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '24px',
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: '12px'
      }}>
        Purchase Successful!
      </h2>

      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        color: '#6B7280',
        marginBottom: '32px'
      }}>
        {selectedProduct?.size} {selectedProduct?.type} sent to {selectedBeneficiary?.name}
      </p>

      <button
        onClick={() => {
          setViewMode('home');
          setSelectedProduct(null);
          setSelectedBeneficiary(null);
        }}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#86BE41',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '12px',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        Done
      </button>
    </div>
  );

  // Main render
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6'
    }}>
      {viewMode === 'home' && renderHomeView()}
      {viewMode === 'products' && renderProductsView()}
      {viewMode === 'confirm' && renderConfirmView()}
      {viewMode === 'success' && renderSuccessView()}

      {/* Error Toast */}
      {error && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          padding: '16px',
          borderRadius: '12px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '12px',
              background: 'none',
              border: 'none',
              color: '#DC2626',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

