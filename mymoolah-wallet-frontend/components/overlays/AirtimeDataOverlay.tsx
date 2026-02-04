import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wifi, Smartphone, CheckCircle, Copy, Share, Download, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ErrorModal } from '../ui/ErrorModal';
import { BeneficiaryList } from './shared/BeneficiaryList';
import { BeneficiaryModal } from './shared/BeneficiaryModal';
import { AddAdditionalNumberModal } from './shared/AddAdditionalNumberModal';
import { AccountSelectorModal } from './shared/AccountSelectorModal';
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
import { beneficiaryService as centralizedBeneficiaryService } from '../../services/beneficiaryService';
import { unifiedBeneficiaryService } from '../../services/unifiedBeneficiaryService';

interface AirtimeDataBeneficiary extends Beneficiary {
  // Uses accountType from base Beneficiary interface
}

type Step = 'beneficiary' | 'catalog' | 'confirm';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export function AirtimeDataOverlay() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('beneficiary');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AirtimeDataProduct | null>(null);
  const [catalog, setCatalog] = useState<AirtimeDataCatalog | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState<string>('Purchase Failed');
  const [errorModalMessage, setErrorModalMessage] = useState<string>('');
  const [errorModalType, setErrorModalType] = useState<'error' | 'warning' | 'info'>('error');
  const [alternativeProduct, setAlternativeProduct] = useState<any>(null);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showAddNumberModal, setShowAddNumberModal] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [pendingBeneficiary, setPendingBeneficiary] = useState<Beneficiary | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [beneficiaryToRemove, setBeneficiaryToRemove] = useState<Beneficiary | null>(null);
  const [beneficiaryIsMyMoolahUser, setBeneficiaryIsMyMoolahUser] = useState(false);
  const [ownAirtimeAmount, setOwnAirtimeAmount] = useState<string>('');
  const [ownDataAmount, setOwnDataAmount] = useState<string>('');
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [showSendToNewRecipient, setShowSendToNewRecipient] = useState(false);
  const [newRecipientPhone, setNewRecipientPhone] = useState<string>('');
  const [newRecipientName, setNewRecipientName] = useState<string>('');
  const [showSaveRecipientPrompt, setShowSaveRecipientPrompt] = useState(false);
  const [lastTransactionBeneficiary, setLastTransactionBeneficiary] = useState<{ name: string; phone: string; network?: string } | null>(null);

  // Load beneficiaries on mount
  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async (): Promise<Beneficiary[]> => {
    try {
      setLoadingState('loading');
      // Single call: airtime and data both use airtime-data service; no need to call twice
      const airtimeDataList = await beneficiaryService.getBeneficiaries('airtime');

      // Banking-grade: one display row per (identifier + network) so same number with different
      // networks (e.g. eeziAirtime vs Global Airtime) are shown as separate selectable recipients
      const normalizeNetwork = (network: string | null | undefined): string => {
        if (!network) return 'unknown';
        const n = String(network).toLowerCase().trim();
        const map: Record<string, string> = {
          vodacom: 'vodacom', mtn: 'mtn', cellc: 'cellc', 'cell c': 'cellc',
          telkom: 'telkom', eeziairtime: 'eeziairtime', 'eezi airtime': 'eeziairtime',
          global: 'global', 'global airtime': 'global', 'global data': 'global'
        };
        return map[n] || n;
      };

      const expanded: AirtimeDataBeneficiary[] = [];
      const seenKey = new Set<string>();

      (airtimeDataList as any[]).forEach((b: any) => {
        const accounts = b.accounts || [];
        const hasUnifiedAccounts = accounts.length > 0;

        if (hasUnifiedAccounts) {
          (accounts as any[]).forEach((acc: any) => {
            if (acc.type !== 'airtime' && acc.type !== 'data') return;
            const identifier = String(acc.identifier || b.identifier || '').trim();
            if (!identifier) return;
            const network = normalizeNetwork(acc.metadata?.network || acc.network || b.metadata?.network);
            const key = `${identifier}|${network}`;
            if (seenKey.has(key)) return;
            seenKey.add(key);
            const networkLabel = (acc.metadata?.network || acc.network || b.metadata?.network || network) as string;
            const displayName = acc.metadata?.label || acc.label || (networkLabel ? `${b.name} (${networkLabel})` : b.name);
            expanded.push({
              id: `${b.id}-${acc.id}`,
              name: displayName,
              identifier,
              accountType: 'airtime',
              metadata: {
                ...(b.metadata || {}),
                network: networkLabel,
                _beneficiaryId: b.id,
                _accountId: acc.id
              },
              lastPaidAt: b.lastPaidAt,
              timesPaid: (b.timesPaid ?? 0),
              createdAt: b.createdAt,
              updatedAt: b.updatedAt,
              accounts: [acc],
              serviceAccountRecords: b.serviceAccountRecords,
              vasServices: b.vasServices
            } as AirtimeDataBeneficiary);
          });
        } else {
          const identifier = String(b.identifier || '').trim();
          if (!identifier) return;
          const network = normalizeNetwork(b.metadata?.network);
          const key = `${identifier}|${network}`;
          if (seenKey.has(key)) return;
          seenKey.add(key);
          expanded.push({
            ...(b as AirtimeDataBeneficiary),
            accountType: 'airtime',
          });
        }
      });

      // Stable sort: most recently updated first, then by name
      expanded.sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return (a.name || '').localeCompare(b.name || '');
      });

      setBeneficiaries(expanded);
      setLoadingState('idle');
      return expanded;
    } catch (err) {
      console.error('Failed to load beneficiaries:', err);
      setError('Failed to load beneficiaries');
      setLoadingState('error');
      return [];
    }
  };

  const handleBeneficiarySelect = (beneficiary: any, accountId?: number): void => {
    const normalized = {
      ...(beneficiary as any),
      id: beneficiary.id != null ? String(beneficiary.id) : ''
    } as Beneficiary;
    
    // Check if beneficiary has multiple accounts
    const beneficiaryAny = normalized as any;
    const accounts = beneficiaryAny.accounts || [];
    const hasMultipleAccounts = accounts.length > 1;
    
    // If multiple accounts and no accountId specified, show account selector modal
    if (hasMultipleAccounts && !accountId) {
      setPendingBeneficiary(normalized);
      setShowAccountSelector(true);
      return;
    }
    
    // Otherwise, proceed with selection
    void (async () => {
      try {
        setLoadingState('loading');
        setSelectedBeneficiary(normalized);
        setSelectedAccountId(accountId || null);
      
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
          'global': 'global',
          'global-airtime': 'global',
          'global airtime': 'global',
          'global data': 'global'
        };
        return networkMap[normalized] || normalized;
      };
      
      // Get beneficiary network from metadata or service accounts
      // STRICT: For PINless top-up, we MUST filter by network - only show products for the beneficiary's network
      let beneficiaryNetwork: string | null = null;
      const allNetworks: string[] = [];
      
      // Try multiple sources for network information
      const beneficiaryAny = normalized as any;
      
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
      // CRITICAL: If accountId is provided, only use that specific account's network
      if (accountId && beneficiaryAny.accounts && Array.isArray(beneficiaryAny.accounts)) {
        const selectedAccount = beneficiaryAny.accounts.find((acc: any) => acc.id === accountId);
        if (selectedAccount) {
          // Use the selected account's network for filtering
          if (selectedAccount.metadata?.network) {
            beneficiaryNetwork = normalizeNetwork(selectedAccount.metadata.network);
          } else if (selectedAccount.network) {
            beneficiaryNetwork = normalizeNetwork(selectedAccount.network);
          }
        }
      } else if (beneficiaryAny.accounts && Array.isArray(beneficiaryAny.accounts)) {
        // No specific account selected - check all accounts
        beneficiaryAny.accounts
          .filter((acc: any) => acc.type === 'airtime' || acc.type === 'data')
          .forEach((acc: any) => {
            if (acc.metadata?.network) allNetworks.push(acc.metadata.network);
            if (acc.network) allNetworks.push(acc.network);
          });
      }
      
      // Get unique networks (only if we haven't already set beneficiaryNetwork from selected account)
      let uniqueNetworks: string[] = [];
      if (!beneficiaryNetwork) {
        uniqueNetworks = [...new Set(allNetworks.map(n => normalizeNetwork(n)).filter(Boolean))];
        
        // If beneficiary has exactly one network, use it for filtering
        if (uniqueNetworks.length === 1) {
          beneficiaryNetwork = uniqueNetworks[0];
        } else if (uniqueNetworks.length > 1) {
          // Multiple networks - show all products
          console.warn('⚠️ Beneficiary has multiple networks:', uniqueNetworks, '- Will show all products');
          beneficiaryNetwork = null; // Show all if multiple networks
        }
      }
      
      // Global Airtime (Flash): no network filter, but show only Flash products (recipient is Flash)
      const isGlobalAirtimeBeneficiary = (beneficiaryNetwork === 'global');
      if (isGlobalAirtimeBeneficiary) {
        beneficiaryNetwork = null;
        console.log('🌐 Global Airtime (Flash) beneficiary - showing Flash products only (no network filter)');
      }
      
      // Debug logging - log the FULL beneficiary object to see structure
      console.log('🔍 FULL Beneficiary object:', JSON.stringify(beneficiaryAny, null, 2));
      console.log('🔍 Beneficiary network extraction:', {
        beneficiaryId: normalized.id,
        beneficiaryName: normalized.name,
        accountId: accountId || null,
        selectedAccountNetwork: accountId ? beneficiaryAny.accounts?.find((acc: any) => acc.id === accountId)?.metadata?.network : null,
        metadata: normalized.metadata,
        metadataNetwork: normalized.metadata?.network,
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
        console.error('  - metadata?.network:', normalized.metadata?.network);
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
      
      // Extract products from bestDeals ONLY
      // The comparison service (findBestDeals) already selects the best product based on:
      // 1. Highest commission first
      // 2. Cheapest price if commission is the same
      // 3. Preferred supplier (Flash) if commission and price are the same
      // We should ONLY show bestDeals, not all products from all suppliers
      const extractProducts = (comparison: any) => {
        // CRITICAL: Only use bestDeals - these are already selected by the comparison service
        // Do NOT include suppliers.products as that shows ALL products from ALL suppliers
        if (comparison.bestDeals && comparison.bestDeals.length > 0) {
          return comparison.bestDeals;
        }
        
        // Fallback: If no bestDeals, return empty array (should not happen)
        console.warn('⚠️ No bestDeals found in comparison result - this should not happen');
        return [];
      };
      
      // Helper to extract network from product name (NOT provider - provider is supplier like MOBILEMART/FLASH)
      const extractProductNetwork = (product: any): string => {
        // CRITICAL: Check product name FIRST - it contains the network (e.g., "Vodacom Airtime", "MTN Airtime", "Global Airtime")
        if (product.productName || product.name) {
          const name = (product.productName || product.name).toLowerCase();
          if (name.includes('vodacom')) return 'vodacom';
          if (name.includes('mtn')) return 'mtn';
          if (name.includes('cellc') || name.includes('cell c')) return 'cellc';
          if (name.includes('telkom')) return 'telkom';
          if (name.includes('eeziairtime') || name.includes('eezi airtime')) return 'eeziairtime';
          if (name.includes('global')) return 'global';
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
        })
        // Global Airtime (Flash) recipient: show only Flash-supplied products
        .filter((p: any) => {
          if (!isGlobalAirtimeBeneficiary) return true;
          const supplier = (p.supplierCode || p.supplier || '').toString().toUpperCase();
          const isFlash = supplier === 'FLASH';
          if (!isFlash) console.log(`🔍 Global Airtime: filtered out non-Flash product "${p.name}" (supplier: ${supplier || 'unknown'})`);
          return isFlash;
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
        })
        // Global Airtime (Flash) recipient: show only Flash-supplied products
        .filter((p: any) => {
          if (!isGlobalAirtimeBeneficiary) return true;
          const supplier = (p.supplierCode || p.supplier || '').toString().toUpperCase();
          const isFlash = supplier === 'FLASH';
          if (!isFlash) console.log(`🔍 Global Airtime: filtered out non-Flash data product "${p.name}" (supplier: ${supplier || 'unknown'})`);
          return isFlash;
        });
      
      // Create catalog in expected format
      const catalogData: AirtimeDataCatalog = {
        beneficiary: {
          id: beneficiary.id.toString(),
          label: beneficiary.name,
          identifier: beneficiary.identifier || '',
          // network is optional on AirtimeDataCatalog; avoid passing null
          network: beneficiaryNetwork || undefined
        },
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
    })();
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
      // Prefer a catalog product with matching amount so we send a valid variantId
      const match = catalog?.products?.find(
        (p: any) => p.type === 'airtime' && (
          Math.abs((p.price ?? 0) - amount) < 0.02 ||
          (Array.isArray(p.denominations) && p.denominations.includes(Math.round(amount * 100)))
        )
      );
      const product: AirtimeDataProduct = match
        ? { ...match, name: match.name || `${selectedBeneficiary?.metadata?.network || 'Vodacom'} Airtime R${amount}`, size: `R${amount.toFixed(2)}`, price: amount }
        : {
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
      setSelectedProduct(product);
      setCurrentStep('confirm');
    }
  };

  const handleOwnDataAmount = () => {
    const amount = parseFloat(ownDataAmount);
    if (amount && amount > 0 && amount <= 1000) {
      // Prefer a catalog product with matching amount so we send a valid variantId
      const match = catalog?.products?.find(
        (p: any) => p.type === 'data' && (
          Math.abs((p.price ?? 0) - amount) < 0.02 ||
          (p.minAmount != null && Math.abs((p.minAmount / 100) - amount) < 0.02)
        )
      );
      const product: AirtimeDataProduct = match
        ? { ...match, name: match.name || `${selectedBeneficiary?.metadata?.network || 'Vodacom'} Data ${amount}MB`, size: `${amount.toFixed(0)}MB`, price: amount }
        : {
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
      setSelectedProduct(product);
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
      const newBeneficiary = await centralizedBeneficiaryService.createOrUpdateBeneficiary({
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
      // Normalize id to string to satisfy overlay Beneficiary type
      const normalizedNew = {
        ...(newBeneficiary as any),
        id: newBeneficiary.id != null ? String(newBeneficiary.id) : ''
      } as Beneficiary;
      setSelectedBeneficiary(normalizedNew);
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
      
      // Resolve "own" product (airtime_own_* / data_own_*) to a catalog variant when possible
      let productToUse = selectedProduct;
      const isOwnProduct = typeof selectedProduct.id === 'string' && /^(airtime|data)_own_/.test(selectedProduct.id);
      if (isOwnProduct && catalog?.products?.length) {
        const match = catalog.products.find(
          (p: any) => p.type === selectedProduct.type && (
            Math.abs((p.price ?? 0) - selectedProduct.price) < 0.02 ||
            (selectedProduct.type === 'airtime' && Array.isArray(p.denominations) && p.denominations.includes(Math.round(selectedProduct.price * 100))) ||
            (selectedProduct.type === 'data' && p.minAmount != null && Math.abs((p.minAmount / 100) - selectedProduct.price) < 0.02)
          )
        );
        if (match && (match as any).variantId) {
          productToUse = { ...selectedProduct, ...match, variantId: (match as any).variantId };
        } else if (match) {
          productToUse = { ...selectedProduct, ...match };
        }
      }
      
      // Determine productId format for purchase endpoint
      // Backend supports two formats:
      // 1. Numeric variantId (from ProductVariant table - preferred for bestDeals)
      // 2. Old string format: type_supplier_productCode_amount (for legacy VasProduct)
      let productIdForPurchase: string | number;
      
      // CRITICAL: If variantId exists (from bestDeals/ProductVariant), use it directly
      if ((productToUse as any).variantId) {
        productIdForPurchase = (productToUse as any).variantId;
        console.log('✅ Using variantId for purchase:', productIdForPurchase);
      } else if ((productToUse as any).supplierCode && (productToUse as any).supplierProductId) {
        const amountInCents = Math.round(productToUse.price * 100);
        productIdForPurchase = `${(productToUse as any).vasType || productToUse.type}_${(productToUse as any).supplierCode}_${(productToUse as any).supplierProductId}_${amountInCents}`;
        console.log('⚠️ Using legacy string format for purchase:', productIdForPurchase);
      } else if (isOwnProduct) {
        setLoadingState('error');
        const msg = 'This amount isn\'t available for this recipient. Please pick a product from the list, or try a different amount.';
        setError(msg);
        setErrorModalTitle('Amount not available');
        setErrorModalMessage(msg);
        setErrorModalType('error');
        setCurrentStep('catalog'); // Close confirm sheet so only the error modal is visible
        setShowErrorModal(true);
        return;
      } else {
        productIdForPurchase = productToUse.id;
        console.warn('⚠️ Using product.id as fallback:', productIdForPurchase);
      }
      
      // Log purchase request data for debugging
      const realBeneficiaryId = (selectedBeneficiary as any).metadata?._beneficiaryId ?? selectedBeneficiary.id;
      const purchaseData = {
        beneficiaryId: String(realBeneficiaryId),
        productId: String(productIdForPurchase),
        amount: selectedProduct.price,
        idempotencyKey: String(idempotencyKey)
      };
      console.log('📤 Sending purchase request:', purchaseData);
      
      const result = await airtimeDataService.purchase(purchaseData);
      
      // Extract reference from result
      const reference = result?.reference || idempotencyKey;
      const beneficiaryIsMyMoolah = result?.beneficiaryIsMyMoolahUser || false;
      
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
        // Check if there's an alternative product available for automatic retry
        if (errorResponse?.alternativeProduct && errorResponse?.autoRetry) {
          console.log('🔄 Automatic retry with alternative product:', errorResponse.alternativeProduct);
          
          // Store alternative product for automatic retry
          setAlternativeProduct(errorResponse.alternativeProduct);
          
          // Automatically retry with alternative product
          try {
            setLoadingState('loading');
            setError('');
            
            const retryIdempotencyKey = generateIdempotencyKey();
            const retryRealBeneficiaryId = (selectedBeneficiary as any)?.metadata?._beneficiaryId ?? selectedBeneficiary?.id;
            const retryPurchaseData = {
              beneficiaryId: String(retryRealBeneficiaryId),
              productId: String(errorResponse.alternativeProduct.variantId || errorResponse.alternativeProduct.productId),
              amount: errorResponse.alternativeProduct.amount || errorResponse.alternativeProduct.price / 100,
              idempotencyKey: retryIdempotencyKey
            };
            
            console.log('🔄 Retrying purchase with alternative:', retryPurchaseData);
            const retryResult = await airtimeDataService.purchase(retryPurchaseData);
            
            // Success with alternative
            const reference = retryResult?.reference || retryIdempotencyKey;
            setTransactionRef(reference);
            setBeneficiaryIsMyMoolahUser(retryResult?.beneficiaryIsMyMoolahUser || false);
            setLoadingState('success');
            setShowSuccess(true);
            
            // Show success message indicating alternative was used
            setErrorModalTitle('Purchase Successful');
            setErrorModalMessage(`The original product was unavailable, but we successfully processed your purchase using an alternative: ${errorResponse.alternativeProduct.productName} from ${errorResponse.alternativeProduct.supplierName}.`);
            setErrorModalType('info');
            setShowErrorModal(true);
            
            await loadBeneficiaries();
          } catch (retryErr: any) {
            console.error('Automatic retry also failed:', retryErr);
            // Show error with alternative suggestion
            setErrorModalTitle('Product Unavailable');
            setErrorModalMessage(errorResponse?.message || err.response?.data?.message || err.message || 'Purchase failed. Please try again.');
            setErrorModalType('error');
            setAlternativeProduct(errorResponse?.alternativeProduct || null);
            setShowErrorModal(true);
            setLoadingState('error');
            // Close confirm modal when showing error
            setCurrentStep('catalog');
          }
        } else {
          // Regular error - show error modal
          // Backend sends error in both 'error' and 'message' fields, prioritize 'message' as it's more user-friendly
          const errorMessage = errorResponse?.message || errorResponse?.error || err.message || 'Purchase failed. Please try again.';
          setErrorModalTitle('Purchase Failed');
          setErrorModalMessage(errorMessage);
          setErrorModalType('error');
          setAlternativeProduct(errorResponse?.alternativeProduct || null);
          setShowErrorModal(true);
          setError(errorMessage);
          setLoadingState('error');
          // Close confirm modal when showing error
          setCurrentStep('catalog');
        }
      }
    }
  };

  const handleAddNewBeneficiary = () => {
    setEditingBeneficiary(null);
    setShowBeneficiaryModal(true);
  };

  const handleBeneficiaryCreated = async (newBeneficiary: Beneficiary) => {
    if (editingBeneficiary) {
      // Update existing beneficiary in the list
      setBeneficiaries(prev => prev.map(b => 
        b.id === editingBeneficiary.id ? newBeneficiary : b
      ));
    } else {
      // Add the new beneficiary to the list
      setBeneficiaries(prev => [...prev, newBeneficiary]);
    }
    setShowBeneficiaryModal(false);
    setEditingBeneficiary(null);

    // Reload beneficiaries from backend so we get full accounts[] + metadata.network
    // for the new unified airtime/data service account. Then select the freshly
    // created beneficiary so network-based filtering works immediately.
    const refreshed = await loadBeneficiaries();
    const newId = String(newBeneficiary.id);
    const hydrated = refreshed.find((b) => String(b.id) === newId);
    if (hydrated) {
      setSelectedBeneficiary(hydrated);
    }
  };

  const handleEditBeneficiary = (beneficiary: any): void => {
    const normalized = {
      ...(beneficiary as any),
      id: beneficiary.id != null ? String(beneficiary.id) : ''
    } as Beneficiary;
    setEditingBeneficiary(normalized);
    setShowBeneficiaryModal(true);
  };

  const handleRemoveBeneficiary = (beneficiary: any): void => {
    const normalized = {
      ...(beneficiary as any),
      id: beneficiary.id != null ? String(beneficiary.id) : ''
    } as Beneficiary;
    setBeneficiaryToRemove(normalized);
    setShowConfirmationModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!beneficiaryToRemove) return;
    
    try {
      const meta = (beneficiaryToRemove as any).metadata;
      const realBeneficiaryId = meta?._beneficiaryId ?? beneficiaryToRemove.id;
      const accounts = (beneficiaryToRemove as any).accounts || [];

      // Banking-grade: Remove only the specific service account when this is an expanded row
      // (one recipient = one account, e.g. eeziAirtime vs Global for same number). Otherwise remove all airtime-data.
      if (meta?._accountId != null && accounts.length === 1) {
        const serviceType = accounts[0].type === 'data' ? 'data' : 'airtime';
        await unifiedBeneficiaryService.removeServiceFromBeneficiary(
          String(realBeneficiaryId),
          serviceType,
          String(meta._accountId ?? accounts[0].id)
        );
      } else {
        await beneficiaryService.removeAllServicesOfType(realBeneficiaryId, 'airtime-data');
      }

      setBeneficiaries((prev) => prev.filter((b) => b.id !== beneficiaryToRemove.id));
      if (selectedBeneficiary?.id === beneficiaryToRemove.id) {
        setSelectedBeneficiary(null);
        setSelectedAccountId(null);
      }

      await loadBeneficiaries();
      setBeneficiaryToRemove(null);
      setShowConfirmationModal(false);
    } catch (error) {
      console.error('Failed to remove beneficiary services:', error);
      alert('Failed to remove recipient. Please try again.');
    }
  };

  const handleRemoveAccount = async (accountId: number) => {
    if (!pendingBeneficiary) return;
    
    try {
      // Find the account to get its type and real service account ID
      const accountToRemove = ((pendingBeneficiary as any).accounts || []).find(
        (acc: any) => acc.id === accountId
      );
      
      if (!accountToRemove) {
        console.error('Account not found:', accountId);
        alert('Account not found. Please try again.');
        return;
      }
      
      // Determine service type from account type ('airtime' or 'data')
      const serviceType = accountToRemove.type === 'airtime' ? 'airtime' : 'data';
      
      // Get the real service account ID
      // If account.id is from backend accounts array, it's the real ID
      // If it's computed (legacy.id * 1000 + ...), we need to find it from serviceAccountRecords
      let realServiceAccountId: string | null = null;
      
      const beneficiaryAny = pendingBeneficiary as any;
      
      // Check if we have serviceAccountRecords (new unified format)
      if (beneficiaryAny.serviceAccountRecords && Array.isArray(beneficiaryAny.serviceAccountRecords)) {
        const matchingRecord = beneficiaryAny.serviceAccountRecords.find((rec: any) => {
          return rec.serviceType === serviceType && 
                 (rec.serviceData?.mobileNumber === accountToRemove.identifier ||
                  rec.serviceData?.msisdn === accountToRemove.identifier ||
                  rec.serviceData?.network === accountToRemove.metadata?.network);
        });
        
        if (matchingRecord && matchingRecord.id) {
          realServiceAccountId = String(matchingRecord.id);
        }
      }
      
      // If we couldn't find it in serviceAccountRecords, check if account.id is the real ID
      // (accounts from backend should have real IDs)
      if (!realServiceAccountId) {
        // Check if account.id looks like a computed ID (very large number)
        // Real service account IDs are typically smaller
        if (accountId < 1000000) {
          // Likely a real service account ID
          realServiceAccountId = String(accountId);
        } else {
          // Computed ID - we need to fetch the beneficiary services to get real IDs
          try {
            const beneficiaryServices = await unifiedBeneficiaryService.getBeneficiaryServices(
              String(pendingBeneficiary.id)
            );
            const services = (beneficiaryServices as any).serviceAccountRecords || [];
            const matchingService = services.find((s: any) => {
              return s.serviceType === serviceType &&
                     (s.serviceData?.mobileNumber === accountToRemove.identifier ||
                      s.serviceData?.msisdn === accountToRemove.identifier);
            });
            
            if (matchingService && matchingService.id) {
              realServiceAccountId = String(matchingService.id);
            }
          } catch (fetchError) {
            console.error('Failed to fetch beneficiary services:', fetchError);
          }
        }
      }
      
      if (!realServiceAccountId) {
        console.error('Could not determine real service account ID for account:', accountToRemove);
        alert('Could not find service account. Please try again.');
        return;
      }
      
      // Remove the specific service account from the beneficiary
      await unifiedBeneficiaryService.removeServiceFromBeneficiary(
        String(pendingBeneficiary.id),
        serviceType,
        realServiceAccountId
      );
      
      // Reload beneficiaries to reflect the change
      const updatedBeneficiaries = await loadBeneficiaries();
      
      // Find the updated beneficiary in the reloaded list
      const updatedBeneficiary = updatedBeneficiaries.find(
        (b: any) => String(b.id) === String(pendingBeneficiary.id)
      );
      
      // If the removed account was the only one, close the modal
      const remainingAccounts = (updatedBeneficiary as any)?.accounts || [];
      
      if (remainingAccounts.length === 0) {
        // No accounts left, close the modal
        setShowAccountSelector(false);
        setPendingBeneficiary(null);
      } else if (remainingAccounts.length === 1) {
        // Only one account left, auto-select it and close modal
        setShowAccountSelector(false);
        if (updatedBeneficiary) {
          handleBeneficiarySelect(updatedBeneficiary, remainingAccounts[0].id);
        }
        setPendingBeneficiary(null);
      } else {
        // Multiple accounts remain, update the pending beneficiary with fresh data
        if (updatedBeneficiary) {
          setPendingBeneficiary(updatedBeneficiary as any);
          // Modal stays open with updated account list
        } else {
          // Beneficiary not found (shouldn't happen), close modal
          setShowAccountSelector(false);
          setPendingBeneficiary(null);
        }
      }
    } catch (error) {
      console.error('Failed to remove account:', error);
      alert('Failed to remove number. Please try again.');
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
      // Extract products from bestDeals ONLY
      // The comparison service already selects the best product based on:
      // 1. Highest commission first
      // 2. Cheapest price if commission is the same
      // 3. Preferred supplier (Flash) if commission and price are the same
      const extractProducts = (comparison: any) => {
        // CRITICAL: Only use bestDeals - these are already selected by the comparison service
        // Do NOT include suppliers.products as that shows ALL products from ALL suppliers
        if (comparison.bestDeals && comparison.bestDeals.length > 0) {
          return comparison.bestDeals;
        }
        
        // Fallback: If no bestDeals, return empty array (should not happen)
        console.warn('⚠️ No bestDeals found in comparison result - this should not happen');
        return [];
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
        beneficiary: {
          id: '',
          label: '',
          identifier: ''
        },
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
    setSelectedAccountId(null);
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
          <BeneficiaryList
            type="airtime"
            beneficiaries={beneficiaries}
            selectedBeneficiary={selectedBeneficiary}
            selectedAccountId={selectedAccountId}
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
                {/* Own Data Amount - moved to top */}
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
                          } else {
                            // Invalid amount - clear or show error
                            setOwnDataAmount('');
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#1f2937'
                      }}
                    />
                    <button
                      onClick={() => {
                        const value = parseFloat(ownDataAmount);
                        if (!isNaN(value) && value > 0 && value <= 1000) {
                          handleOwnDataAmount();
                        }
                      }}
                      disabled={!ownDataAmount || parseFloat(ownDataAmount) <= 0 || parseFloat(ownDataAmount) > 1000}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: ownDataAmount && parseFloat(ownDataAmount) > 0 && parseFloat(ownDataAmount) <= 1000 ? '#2D8CCA' : '#9ca3af',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: ownDataAmount && parseFloat(ownDataAmount) > 0 && parseFloat(ownDataAmount) <= 1000 ? 'pointer' : 'not-allowed',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      Select
                    </button>
                  </div>
                </div>

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
                        Top-up international numbers · Flash
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
                        Global data roaming packages · Flash
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
        onAddNumber={() => {
          setShowBeneficiaryModal(false);
          setShowAddNumberModal(true);
        }}
      />

      {/* Add Additional Number Modal */}
      {editingBeneficiary && (
        <AddAdditionalNumberModal
          isOpen={showAddNumberModal}
          onClose={() => {
            setShowAddNumberModal(false);
            // Clear editingBeneficiary when add number modal is closed
            setEditingBeneficiary(null);
          }}
          beneficiaryId={editingBeneficiary.id}
          beneficiaryName={editingBeneficiary.name}
          onSuccess={async () => {
            // Reload beneficiaries to show the new number
            await loadBeneficiaries();
            setShowAddNumberModal(false);
            // Clear editingBeneficiary after successful add
            setEditingBeneficiary(null);
          }}
        />
      )}

      {/* Account Selector Modal - for recipients with multiple numbers */}
      {pendingBeneficiary && (
        <AccountSelectorModal
          isOpen={showAccountSelector}
          onClose={() => {
            setShowAccountSelector(false);
            setPendingBeneficiary(null);
          }}
          recipientName={pendingBeneficiary.name}
          accounts={(pendingBeneficiary as any).accounts || []}
          onSelectAccount={(accountId) => {
            setShowAccountSelector(false);
            // Now call handleBeneficiarySelect with the chosen accountId
            handleBeneficiarySelect(pendingBeneficiary, accountId);
            setPendingBeneficiary(null);
          }}
          onRemoveAccount={handleRemoveAccount}
        />
      )}

      {/* Confirmation Modal */}
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

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setAlternativeProduct(null);
        }}
        title={errorModalTitle}
        message={errorModalMessage}
        type={errorModalType}
      />
    </div>
  );
}