import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wifi, Smartphone, CheckCircle, Copy, Share, Download, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
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
import { apiService } from '../../services/apiService';

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
  const [showSendToNewRecipient, setShowSendToNewRecipient] = useState(false);
  const [newRecipientPhone, setNewRecipientPhone] = useState<string>('');
  const [newRecipientName, setNewRecipientName] = useState<string>('');
  const [showSaveRecipientPrompt, setShowSaveRecipientPrompt] = useState(false);
  const [lastTransactionBeneficiary, setLastTransactionBeneficiary] = useState<{ name: string; phone: string; network?: string } | null>(null);

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
      
      // Helper to normalize network names for comparison (must be defined first)
      const normalizeNetwork = (network: string | null | undefined): string => {
        if (!network) return '';
        const normalized = String(network).toLowerCase().trim();
        const networkMap: { [key: string]: string } = {
          'vodacom': 'vodacom',
          'mtn': 'mtn',
          'cellc': 'cellc',
          'cell c': 'cellc',
          'telkom': 'telkom',
          'eeziairtime': 'eeziairtime',
          'eezi airtime': 'eeziairtime',
          'global': 'global'
        };
        return networkMap[normalized] || normalized;
      };
      
      // Get beneficiary network from metadata or service accounts
      // STRICT: For PINless top-up, we MUST filter by network - only show products for the beneficiary's network
      let beneficiaryNetwork: string | null = null;
      const allNetworks: string[] = [];
      
      // Try multiple sources for network information
      const beneficiaryAny = beneficiary as any;
      
      // 1. Check metadata.network
      if (beneficiary.metadata?.network) {
        allNetworks.push(beneficiary.metadata.network);
      }
      
      // 2. Check vasServices (legacy format)
      if (beneficiaryAny.vasServices) {
        const airtimeServices = beneficiaryAny.vasServices.airtime || [];
        const dataServices = beneficiaryAny.vasServices.data || [];
        [...airtimeServices, ...dataServices].forEach((s: any) => {
          if (s.network) allNetworks.push(s.network);
        });
      }
      
      // 3. Check serviceAccountRecords (new unified format)
      if (beneficiaryAny.serviceAccountRecords && Array.isArray(beneficiaryAny.serviceAccountRecords)) {
        beneficiaryAny.serviceAccountRecords
          .filter((acc: any) => acc.serviceType === 'airtime' || acc.serviceType === 'data')
          .forEach((acc: any) => {
            if (acc.serviceData?.network) allNetworks.push(acc.serviceData.network);
          });
      }
      
      // 4. Check accounts (alternative format - most likely for unified beneficiaries)
      if (beneficiaryAny.accounts && Array.isArray(beneficiaryAny.accounts)) {
        beneficiaryAny.accounts
          .filter((acc: any) => acc.type === 'airtime' || acc.type === 'data')
          .forEach((acc: any) => {
            if (acc.metadata?.network) allNetworks.push(acc.metadata.network);
            if (acc.network) allNetworks.push(acc.network);
          });
      }
      
      // Get unique networks
      const uniqueNetworks = [...new Set(allNetworks.map(n => normalizeNetwork(n)).filter(Boolean))];
      
      // If beneficiary has exactly one network, use it for filtering
      // If multiple networks, we could show all, but for PINless we should probably only show if single network
      if (uniqueNetworks.length === 1) {
        beneficiaryNetwork = uniqueNetworks[0];
      } else if (uniqueNetworks.length > 1) {
        // Multiple networks - for PINless, we might want to show all, but let's be strict and require single network
        console.warn('⚠️ Beneficiary has multiple networks:', uniqueNetworks, '- Will show all products');
        beneficiaryNetwork = null; // Show all if multiple networks
      }
      
      // Debug logging - log the FULL beneficiary object to see structure
      console.log('🔍 FULL Beneficiary object:', JSON.stringify(beneficiaryAny, null, 2));
      console.log('🔍 Beneficiary network extraction:', {
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.name,
        metadata: beneficiary.metadata,
        metadataNetwork: beneficiary.metadata?.network,
        vasServices: beneficiaryAny.vasServices,
        vasServicesAirtime: beneficiaryAny.vasServices?.airtime,
        vasServicesData: beneficiaryAny.vasServices?.data,
        serviceAccountRecords: beneficiaryAny.serviceAccountRecords,
        serviceAccountRecordsLength: beneficiaryAny.serviceAccountRecords?.length,
        accounts: beneficiaryAny.accounts,
        accountsLength: beneficiaryAny.accounts?.length,
        accountsAirtimeData: beneficiaryAny.accounts?.filter((acc: any) => acc.type === 'airtime' || acc.type === 'data'),
        allNetworksFound: allNetworks,
        uniqueNetworks: uniqueNetworks,
        extractedNetwork: beneficiaryNetwork,
        willFilter: !!beneficiaryNetwork
      });
      
      // If no network found, log a detailed breakdown
      if (!beneficiaryNetwork && allNetworks.length === 0) {
        console.error('❌ NO NETWORK FOUND - Detailed breakdown:');
        console.error('  - metadata?.network:', beneficiary.metadata?.network);
        console.error('  - vasServices?.airtime:', beneficiaryAny.vasServices?.airtime);
        console.error('  - vasServices?.data:', beneficiaryAny.vasServices?.data);
        console.error('  - serviceAccountRecords:', beneficiaryAny.serviceAccountRecords);
        console.error('  - accounts:', beneficiaryAny.accounts);
        if (beneficiaryAny.accounts && Array.isArray(beneficiaryAny.accounts)) {
          beneficiaryAny.accounts.forEach((acc: any, idx: number) => {
            console.error(`  - accounts[${idx}]:`, {
              type: acc.type,
              identifier: acc.identifier,
              metadata: acc.metadata,
              network: acc.network,
              metadataNetwork: acc.metadata?.network
            });
          });
        }
      }
      
      // Load products using compareSuppliers API (best-deal selection)
      const [airtimeComparison, dataComparison] = await Promise.all([
        apiService.compareSuppliers('airtime'),
        apiService.compareSuppliers('data')
      ]);
      
      // Extract products from bestDeals and suppliers
      const extractProducts = (comparison: any) => {
        const allProds: any[] = [];
        if (comparison.bestDeals && comparison.bestDeals.length > 0) {
          allProds.push(...comparison.bestDeals);
        }
        if (comparison.suppliers) {
          Object.values(comparison.suppliers).forEach((supplier: any) => {
            if (supplier.products && supplier.products.length > 0) {
              allProds.push(...supplier.products);
            }
          });
        }
        return allProds;
      };
      
      // Helper to extract network from product name (NOT provider - provider is supplier like MOBILEMART/FLASH)
      const extractProductNetwork = (product: any): string => {
        // CRITICAL: Check product name FIRST - it contains the network (e.g., "Vodacom Airtime", "MTN Airtime")
        if (product.productName || product.name) {
          const name = (product.productName || product.name).toLowerCase();
          if (name.includes('vodacom')) return 'vodacom';
          if (name.includes('mtn')) return 'mtn';
          if (name.includes('cellc') || name.includes('cell c')) return 'cellc';
          if (name.includes('telkom')) return 'telkom';
          if (name.includes('eeziairtime') || name.includes('eezi airtime')) return 'eeziairtime';
        }
        
        // Fallback: Check if there's a network field directly (some products might have this)
        if (product.network) {
          return normalizeNetwork(product.network);
        }
        
        // DO NOT use provider - it's the supplier (MOBILEMART, FLASH), not the network
        // Provider is only useful for supplier identification, not network filtering
        
        return '';
      };
      
      // Transform to AirtimeDataCatalog format
      const airtimeProds = extractProducts(airtimeComparison)
        .map((p: any, index: number) => {
          const denominationAmount = (p.denominations && p.denominations.length > 0) 
            ? p.denominations[0] 
            : (p.minAmount && p.minAmount === p.maxAmount ? p.minAmount : p.minAmount || 0);
          
          return {
            id: `${p.vasType || 'airtime'}_${p.supplierCode}_${p.supplierProductId}_${denominationAmount}_${index}_${Date.now()}`,
            name: p.productName || p.name || 'Unknown Product',
            size: `R${(denominationAmount / 100).toFixed(0)}`,
            price: denominationAmount / 100, // Convert cents to rands
            provider: p.provider || p.supplierCode || 'Unknown',
            type: 'airtime' as const,
            validity: 'Immediate',
            isBestDeal: p.isBestDeal || false,
            supplier: p.supplierCode?.toLowerCase() || 'flash',
            description: p.description || '',
            commission: p.commission || 0,
            fixedFee: p.fixedFee || 0,
            // Store full data for purchase
            variantId: p.id,
            supplierCode: p.supplierCode,
            supplierProductId: p.supplierProductId,
            vasType: p.vasType || 'airtime',
            denominations: p.denominations || p.predefinedAmounts || [],
            minAmount: p.minAmount,
            maxAmount: p.maxAmount
          };
        })
        // Filter by network if beneficiary has only one network
        .filter((p: any) => {
          if (!beneficiaryNetwork) {
            console.log('🌐 No network filter - showing all airtime products');
            return true; // Show all if no network specified
          }
          const productNetwork = extractProductNetwork(p);
          const beneficiaryNetworkNorm = normalizeNetwork(beneficiaryNetwork);
          const matches = productNetwork === beneficiaryNetworkNorm;
          console.log(`🔍 Airtime product filter: "${p.name}" (provider: ${p.provider}, extracted: ${productNetwork}) vs beneficiary (${beneficiaryNetworkNorm}) = ${matches}`);
          return matches;
        });
      
      const dataProds = extractProducts(dataComparison)
        .map((p: any, index: number) => {
          const dataPrice = p.minAmount || 0;
          return {
            id: `${p.vasType || 'data'}_${p.supplierCode}_${p.supplierProductId}_${dataPrice}_${index}_${Date.now()}`,
            name: p.productName || p.name || 'Unknown Product',
            size: `${(dataPrice / 100).toFixed(0)}MB`,
            price: dataPrice / 100, // Convert cents to rands
            provider: p.provider || p.supplierCode || 'Unknown',
            type: 'data' as const,
            validity: '30 days',
            isBestDeal: p.isBestDeal || false,
            supplier: p.supplierCode?.toLowerCase() || 'flash',
            description: p.description || '',
            commission: p.commission || 0,
            fixedFee: p.fixedFee || 0,
            // Store full data for purchase
            variantId: p.id,
            supplierCode: p.supplierCode,
            supplierProductId: p.supplierProductId,
            vasType: p.vasType || 'data',
            denominations: p.denominations || p.predefinedAmounts || [],
            minAmount: p.minAmount,
            maxAmount: p.maxAmount
          };
        })
        // STRICT FILTERING: For PINless top-up, only show products matching beneficiary's network
        .filter((p: any) => {
          if (!beneficiaryNetwork) {
            console.warn('⚠️ No network found for beneficiary - showing ALL data products (this should not happen for PINless)');
            return true; // Show all if no network specified (shouldn't happen for PINless)
          }
          const productNetwork = extractProductNetwork(p);
          const beneficiaryNetworkNorm = normalizeNetwork(beneficiaryNetwork);
          const matches = productNetwork === beneficiaryNetworkNorm;
          if (!matches) {
            console.log(`❌ Filtered out: "${p.name}" (${productNetwork}) - beneficiary is ${beneficiaryNetworkNorm}`);
          }
          return matches;
        });
      
      // Create catalog in expected format
      const catalogData: AirtimeDataCatalog = {
        beneficiaryId: beneficiary.id,
        products: [...airtimeProds, ...dataProds],
        providers: ['MTN', 'Vodacom', 'CellC', 'Telkom', 'eeziAirtime', 'Global']
      };
      
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
    // If no beneficiary selected, show option to send to new recipient
    if (!selectedBeneficiary) {
      setShowSendToNewRecipient(true);
    } else {
      setCurrentStep('confirm');
    }
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

  const handleSendToNewRecipient = async () => {
    if (!newRecipientPhone || !newRecipientName || !selectedProduct) return;
    
    try {
      setLoadingState('loading');
      setError('');
      
      // Validate phone number
      if (!validateMobileNumber(newRecipientPhone)) {
        setError('Please enter a valid South African mobile number');
        setLoadingState('error');
        return;
      }
      
      // Create beneficiary first
      const network = selectedProduct.provider || 'Vodacom';
      const newBeneficiary = await beneficiaryService.createOrUpdateBeneficiary({
        name: newRecipientName,
        serviceType: selectedProduct.type === 'airtime' ? 'airtime' : 'data',
        serviceData: {
          mobileNumber: newRecipientPhone,
          network: network
        }
      });
      
      // Store for save prompt after purchase
      setLastTransactionBeneficiary({
        name: newRecipientName,
        phone: newRecipientPhone,
        network: network
      });
      
      // Set as selected beneficiary and proceed with purchase
      setSelectedBeneficiary(newBeneficiary as AirtimeDataBeneficiary);
      setShowSendToNewRecipient(false);
      
      // Proceed with purchase
      await handleConfirmTransaction();
      
    } catch (err: any) {
      console.error('Failed to create beneficiary or purchase:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send. Please try again.');
      setLoadingState('error');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!selectedBeneficiary || !selectedProduct) return;
    
    try {
      setLoadingState('loading');
      setError('');
      
      const idempotencyKey = generateIdempotencyKey();
      
      // Ensure productId is in correct format for purchase endpoint
      let productIdForPurchase = selectedProduct.id;
      if ((selectedProduct as any).variantId && (selectedProduct as any).supplierCode && (selectedProduct as any).supplierProductId) {
        // Construct in expected format: type_supplier_productCode_amount
        const amountInCents = Math.round(selectedProduct.price * 100);
        productIdForPurchase = `${(selectedProduct as any).vasType || selectedProduct.type}_${(selectedProduct as any).supplierCode}_${(selectedProduct as any).supplierProductId}_${amountInCents}`;
      }
      
      const result = await airtimeDataService.purchase({
        beneficiaryId: selectedBeneficiary.id,
        productId: productIdForPurchase,
        amount: selectedProduct.price,
        idempotencyKey
      });
      
      // Extract reference from result (handle different response structures)
      const reference = result?.reference || result?.data?.reference || idempotencyKey;
      const beneficiaryIsMyMoolah = result?.beneficiaryIsMyMoolahUser || result?.data?.beneficiaryIsMyMoolahUser || false;
      
      setTransactionRef(reference);
      setBeneficiaryIsMyMoolahUser(beneficiaryIsMyMoolah);
      setLoadingState('success');
      setShowSuccess(true);
      
      // If this was a new recipient, show save prompt (beneficiary already saved, just confirm)
      if (lastTransactionBeneficiary) {
        setShowSaveRecipientPrompt(true);
      }
      
      // Reload beneficiaries to update the list
      await loadBeneficiaries();
    } catch (err: any) {
      console.error('Purchase failed:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status
      });
      
      // Check if error response contains transaction data (partial success)
      const errorResponse = err.response?.data;
      if (errorResponse?.data?.reference) {
        // Transaction might have succeeded but error occurred after
        setTransactionRef(errorResponse.data.reference);
        setBeneficiaryIsMyMoolahUser(errorResponse.data.beneficiaryIsMyMoolahUser || false);
        setLoadingState('success');
        setShowSuccess(true);
      } else {
        setError(err.response?.data?.message || err.message || 'Purchase failed');
        setLoadingState('error');
      }
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
      // Banking-grade: Remove only airtime/data service accounts, not the entire beneficiary
      // This allows the beneficiary to still exist for other services (e.g., if they have electricity)
      // Never affects their user account if they're a registered MyMoolah user
      await beneficiaryService.removeAllServicesOfType(beneficiaryToRemove.id, 'airtime-data');

      // Optimistically update local state
      setBeneficiaries((prev) => prev.filter((b) => b.id !== beneficiaryToRemove.id));
      if (selectedBeneficiary?.id === beneficiaryToRemove.id) {
        setSelectedBeneficiary(null);
      }

      // Refresh from API to stay in sync and ensure backend removal is reflected
      await loadBeneficiaries();

      setBeneficiaryToRemove(null);
      setShowConfirmationModal(false);
    } catch (error) {
      console.error('Failed to remove beneficiary services:', error);
      alert('Failed to remove recipient. Please try again.');
    }
  };

  const handleBrowseProducts = async () => {
    try {
      setLoadingState('loading');
      // Load products without requiring a beneficiary
      const [airtimeComparison, dataComparison] = await Promise.all([
        apiService.compareSuppliers('airtime'),
        apiService.compareSuppliers('data')
      ]);
      
      // Extract and transform products (same logic as handleBeneficiarySelect)
      const extractProducts = (comparison: any) => {
        const allProds: any[] = [];
        if (comparison.bestDeals && comparison.bestDeals.length > 0) {
          allProds.push(...comparison.bestDeals);
        }
        if (comparison.suppliers) {
          Object.values(comparison.suppliers).forEach((supplier: any) => {
            if (supplier.products && supplier.products.length > 0) {
              allProds.push(...supplier.products);
            }
          });
        }
        return allProds;
      };
      
      const airtimeProds = extractProducts(airtimeComparison).map((p: any) => {
        const denominationAmount = (p.denominations && p.denominations.length > 0) 
          ? p.denominations[0] 
          : (p.minAmount && p.minAmount === p.maxAmount ? p.minAmount : p.minAmount || 0);
        
        return {
          id: `${p.vasType || 'airtime'}_${p.supplierCode}_${p.supplierProductId}_${denominationAmount}`,
          name: p.productName || p.name || 'Unknown Product',
          size: `R${(denominationAmount / 100).toFixed(0)}`,
          price: denominationAmount / 100,
          provider: p.provider || p.supplierCode || 'Unknown',
          type: 'airtime' as const,
          validity: 'Immediate',
          isBestDeal: p.isBestDeal || false,
          supplier: p.supplierCode?.toLowerCase() || 'flash',
          description: p.description || '',
          commission: p.commission || 0,
          fixedFee: p.fixedFee || 0,
          variantId: p.id,
          supplierCode: p.supplierCode,
          supplierProductId: p.supplierProductId,
          vasType: p.vasType || 'airtime',
          denominations: p.denominations || p.predefinedAmounts || [],
          minAmount: p.minAmount,
          maxAmount: p.maxAmount
        };
      });
      
      const dataProds = extractProducts(dataComparison).map((p: any) => {
        const dataPrice = p.minAmount || 0;
        return {
          id: `${p.vasType || 'data'}_${p.supplierCode}_${p.supplierProductId}_${dataPrice}`,
          name: p.productName || p.name || 'Unknown Product',
          size: `${(dataPrice / 100).toFixed(0)}MB`,
          price: dataPrice / 100,
          provider: p.provider || p.supplierCode || 'Unknown',
          type: 'data' as const,
          validity: '30 days',
          isBestDeal: p.isBestDeal || false,
          supplier: p.supplierCode?.toLowerCase() || 'flash',
          description: p.description || '',
          commission: p.commission || 0,
          fixedFee: p.fixedFee || 0,
          variantId: p.id,
          supplierCode: p.supplierCode,
          supplierProductId: p.supplierProductId,
          vasType: p.vasType || 'data',
          denominations: p.denominations || p.predefinedAmounts || [],
          minAmount: p.minAmount,
          maxAmount: p.maxAmount
        };
      });
      
      const catalogData: AirtimeDataCatalog = {
        beneficiaryId: '', // No beneficiary selected
        products: [...airtimeProds, ...dataProds],
        providers: ['MTN', 'Vodacom', 'CellC', 'Telkom', 'eeziAirtime', 'Global']
      };
      
      setCatalog(catalogData);
      setCurrentStep('catalog');
      setLoadingState('idle');
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Failed to load products');
      setLoadingState('error');
    }
  };

  const handleGoHome = () => {
    setShowSuccess(false);
    navigate('/');
  };

  const handleDoAnotherTransaction = () => {
    setShowSuccess(false);
    setSelectedBeneficiary(null);
    setSelectedProduct(null);
    setCatalog(null);
    setCurrentStep('beneficiary');
    setTransactionRef('');
    setOwnAirtimeAmount('');
    setOwnDataAmount('');
    setShowSendToNewRecipient(false);
    setNewRecipientPhone('');
    setNewRecipientName('');
    setShowSaveRecipientPrompt(false);
    setLastTransactionBeneficiary(null);
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
      description: 'Your airtime/data will be delivered instantly'
    });
    
    return notices;
  };

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
            showFilters={false}
          />
        </div>
      )}

      {/* Step 2: Product Catalog - Allow browsing without beneficiary */}
      {currentStep === 'catalog' && catalog && (
        <div className="space-y-4">
          {/* Selected Recipient Summary - Only show if beneficiary is selected */}
          {selectedBeneficiary && (
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
          )}
          
          {/* Show message if no beneficiary selected */}
          {!selectedBeneficiary && (
            <Card style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '12px'
            }}>
              <CardContent style={{ padding: '1rem' }}>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  color: '#92400e',
                  margin: 0
                }}>
                  💡 Select a product below to send to a new recipient
                </p>
              </CardContent>
            </Card>
          )}

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
                {/* Own Airtime Amount - Show at top */}
                {selectedBeneficiary && (
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
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter amount (max R1,000)"
                      value={ownAirtimeAmount}
                      onChange={(e) => {
                        // Banking-grade: Preserve exact user input - NO auto-formatting or rounding
                        let inputValue = e.target.value;
                        
                        // Allow empty string, numbers, and single decimal point only
                        // Remove any currency symbols or spaces that user might type
                        inputValue = inputValue.replace(/[^\d.]/g, '');
                        
                        // Ensure only one decimal point
                        const parts = inputValue.split('.');
                        if (parts.length > 2) {
                          inputValue = parts[0] + '.' + parts.slice(1).join('');
                        }
                        
                        // Limit to 2 decimal places (user can type more, but we'll show only 2)
                        // However, we preserve the exact input to prevent auto-changes
                        if (parts.length === 2 && parts[1].length > 2) {
                          // Only trim if user is typing, but preserve their intent
                          const decimalPart = parts[1].substring(0, 2);
                          inputValue = parts[0] + '.' + decimalPart;
                        }
                        
                        // Set exact value - no automatic modification
                        setOwnAirtimeAmount(inputValue);
                      }}
                      onBlur={(e) => {
                        // Only validate/format on blur, not during typing
                        const value = e.target.value.trim();
                        if (value) {
                          const num = parseFloat(value);
                          if (!isNaN(num) && num > 0 && num <= 1000) {
                            // Optional: Format to 2 decimals on blur for display consistency
                            // But only if user typed a valid number
                            if (value !== num.toString() && value.includes('.')) {
                              setOwnAirtimeAmount(num.toFixed(2));
                            }
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        // Prevent browser auto-formatting with number input
                        // Block 'e', 'E', '+', '-' which are allowed in number inputs
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onWheel={(e) => {
                        // Prevent scrolling from changing number input values
                        e.currentTarget.blur();
                      }}
                      style={{
                        flex: '1',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        outline: 'none'
                      }}
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
                )}

                {/* Airtime Product List */}
                {catalog.products.filter(product => product.type === 'airtime').map((product, index) => (
                  <div
                    key={`${product.id}_${index}`}
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
                {catalog.products.filter(product => product.type === 'data').map((product, index) => (
                  <div
                    key={`${product.id}_${index}`}
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
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter amount (max R1,000)"
                      value={ownDataAmount}
                      onChange={(e) => {
                        // Banking-grade: Preserve exact user input - NO auto-formatting or rounding
                        let inputValue = e.target.value;
                        
                        // Allow empty string, numbers, and single decimal point only
                        // Remove any currency symbols or spaces that user might type
                        inputValue = inputValue.replace(/[^\d.]/g, '');
                        
                        // Ensure only one decimal point
                        const parts = inputValue.split('.');
                        if (parts.length > 2) {
                          inputValue = parts[0] + '.' + parts.slice(1).join('');
                        }
                        
                        // Limit to 2 decimal places (user can type more, but we'll show only 2)
                        // However, we preserve the exact input to prevent auto-changes
                        if (parts.length === 2 && parts[1].length > 2) {
                          // Only trim if user is typing, but preserve their intent
                          const decimalPart = parts[1].substring(0, 2);
                          inputValue = parts[0] + '.' + decimalPart;
                        }
                        
                        // Set exact value - no automatic modification
                        setOwnDataAmount(inputValue);
                      }}
                      onBlur={(e) => {
                        // Only validate/format on blur, not during typing
                        const value = e.target.value.trim();
                        if (value) {
                          const num = parseFloat(value);
                          if (!isNaN(num) && num > 0 && num <= 1000) {
                            // Optional: Format to 2 decimals on blur for display consistency
                            // But only if user typed a valid number
                            if (value !== num.toString() && value.includes('.')) {
                              setOwnDataAmount(num.toFixed(2));
                            }
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        // Prevent browser auto-formatting with number input
                        // Block 'e', 'E', '+', '-' which are allowed in number inputs
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onWheel={(e) => {
                        // Prevent scrolling from changing number input values
                        e.currentTarget.blur();
                      }}
                      style={{
                        flex: '1',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        outline: 'none'
                      }}
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

      {/* Send to New Recipient Form */}
      {showSendToNewRecipient && selectedProduct && (
        <Card style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <CardHeader>
            <CardTitle style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '18px',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              Send to New Recipient
            </CardTitle>
          </CardHeader>
          <CardContent style={{ paddingTop: '1rem' }}>
            <div className="space-y-4">
              <div>
                <label style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  placeholder="Enter recipient name"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={newRecipientPhone}
                  onChange={(e) => setNewRecipientPhone(e.target.value)}
                  placeholder="0821234567"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSendToNewRecipient(false);
                    setSelectedProduct(null);
                  }}
                  style={{
                    flex: '1',
                    minHeight: '44px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '12px'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendToNewRecipient}
                  disabled={!newRecipientName || !newRecipientPhone || loadingState === 'loading'}
                  style={{
                    flex: '1',
                    minHeight: '44px',
                    backgroundColor: '#86BE41',
                    color: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '12px'
                  }}
                >
                  {loadingState === 'loading' ? 'Processing...' : 'Send'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Save Recipient Prompt - Show after successful purchase to new recipient */}
      {showSaveRecipientPrompt && lastTransactionBeneficiary && (
        <Dialog open={showSaveRecipientPrompt} onOpenChange={setShowSaveRecipientPrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recipient Saved</DialogTitle>
              <DialogDescription>
                {lastTransactionBeneficiary.name} ({lastTransactionBeneficiary.phone}) has been saved as a recipient. You can send to them again from your recipient list.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveRecipientPrompt(false);
                  setLastTransactionBeneficiary(null);
                }}
                style={{
                  flex: '1',
                  minHeight: '44px'
                }}
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent 
          style={{
            maxWidth: '400px',
            width: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: 0,
            border: 'none',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            zIndex: 9999
          }}
          aria-describedby="airtime-data-success-description"
        >
          <div id="airtime-data-success-description" className="sr-only">
            Purchase successful notification
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
            color: '#ffffff',
            padding: '20px 24px',
            borderRadius: '16px 16px 0 0'
          }}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle style={{ width: '24px', height: '24px' }} />
                <DialogTitle style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#ffffff',
                  margin: 0
                }}>
                  Purchase Successful
                </DialogTitle>
              </div>
              <DialogDescription style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '12px',
                color: '#ffffff',
                opacity: 0.9,
                margin: 0
              }}>
                {new Date().toLocaleString()}
              </DialogDescription>
              {beneficiaryIsMyMoolahUser && (
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  color: '#ffffff',
                  opacity: 0.8,
                  marginTop: '4px',
                  margin: 0
                }}>
                  ✅ Recipient notified via MyMoolah
                </p>
              )}
            </DialogHeader>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {/* Transaction Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="flex justify-between" style={{ alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  Reference
                </span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  maxWidth: '60%',
                  textAlign: 'right',
                  wordBreak: 'break-all'
                }}>
                  {transactionRef?.replace(/^overlay_user_/, '') || transactionRef}
                </span>
              </div>
              
              {getSummaryRows().map((row, index) => (
                <div key={index} className="flex justify-between" style={{ alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    fontWeight: row.highlight ? '700' : '600',
                    color: '#1f2937'
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2" style={{ marginTop: '16px' }}>
              <Button
                onClick={handleDoAnotherTransaction}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  height: '40px',
                  padding: '0'
                }}
              >
                Do Another Transaction
              </Button>
              
              <Button
                onClick={handleGoHome}
                variant="outline"
                style={{
                  width: '100%',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '13px',
                  fontWeight: '500',
                  height: '40px',
                  borderRadius: '8px',
                  borderColor: '#e2e8f0',
                  padding: '0'
                }}
              >
                <Home style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                Go to Home
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}