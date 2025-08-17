import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, type RecipientInfo, type RecipientMethod, type PaymentQuote, type TransferResult } from '../services/apiService';
import { 
  Search, 
  Plus, 
  ArrowLeft,
  
  
  
  
  Phone,
  Building2,
  
  Send,
  Star,
  
  Loader2,
  
  Wallet,
  
  Ticket,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Coffee,
  Car,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';

// Beneficiary Types
interface Beneficiary {
  id: string;
  name: string;
  identifier: string; // Phone number for MyMoolah, account number for bank
  accountType: 'mymoolah' | 'bank';
  bankName?: string; // Only for bank accounts
  lastPaid?: Date;
  isFavorite: boolean;
  totalPaid: number;
  paymentCount: number;
  avatar?: string;
}

// Transaction Types (frontend view)
interface Transaction {
  id: string;
  beneficiaryId?: string;
  beneficiaryName: string;
  amount: number;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  accountType: 'mymoolah' | 'bank';
  description?: string;
  kind?: 'send' | 'other';
  receiverWalletId?: string;
}

// South African Banks Supporting PayShap
const SA_BANKS = [
  { code: 'ABSA', name: 'ABSA Bank' },
  { code: 'FNB', name: 'First National Bank' },
  { code: 'NEDBANK', name: 'Nedbank' },
  { code: 'STANDARD', name: 'Standard Bank' },
  { code: 'CAPITEC', name: 'Capitec Bank' },
  { code: 'DISCOVERY', name: 'Discovery Bank' },
  { code: 'INVESTEC', name: 'Investec Bank' },
  { code: 'AFRICAN', name: 'African Bank' },
  { code: 'BIDVEST', name: 'Bidvest Bank' },
  { code: 'POSTBANK', name: 'Postbank' }
];

// No mock data; pull from backend

export function SendMoneyPage() {
  const navigate = useNavigate();
  const { requiresKYC } = useAuth();
  
  // State Management
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'lastPaid' | 'favorite'>('lastPaid');
  const [filterType, setFilterType] = useState<'all' | 'mymoolah' | 'bank'>('all');
  const [isOneTimeMode, setIsOneTimeMode] = useState(false);
  const [showAllTransactions] = useState(false);
  
  // API Integration State
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<RecipientMethod | null>(null);
  const [paymentQuote, setPaymentQuote] = useState<PaymentQuote | null>(null);
  const [isResolvingRecipient, setIsResolvingRecipient] = useState(false);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Add Beneficiary Modal State
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [showPayNow, setShowPayNow] = useState(false);
  const [showAddContactPrompt, setShowAddContactPrompt] = useState(false);
  const [lastPaidContact, setLastPaidContact] = useState<{
    name: string;
    identifier: string;
    accountType: 'mymoolah' | 'bank';
  } | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<'mymoolah' | 'bank'>('mymoolah');
  const [newBeneficiary, setNewBeneficiary] = useState({
    name: '',
    identifier: '',
    bankName: '',
    accountNumber: ''
  });
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);

  // Check KYC requirements
  useEffect(() => {
    if (requiresKYC('send')) {
      navigate('/kyc/documents?returnTo=/send-money');
    }
  }, [requiresKYC, navigate]);

  // Initial data load from backend
  useEffect(() => {
    const load = async () => {
      try {
        // Load recent transactions from backend
        const recent = await apiService.getRecentTransactions(20);
        const mapped: Transaction[] = (recent || []).map((t: any) => {
          // Normalized backend type
          const rawType = String(t.type || '').toLowerCase();
          const desc = String(t.description || '');
          const creditTypes = ['receive', 'deposit', 'refund', 'credit'];
          const debitTypes = ['send', 'payment', 'withdraw', 'fee', 'transfer', 'debit'];

          const isCreditTx = creditTypes.includes(rawType);
          const isDebitTx = debitTypes.includes(rawType) || (!isCreditTx && (/^sent to\s+/i.test(desc) || /^payment to\s+/i.test(desc)));

          // Create a user-friendly primary text
          let displayName = desc || t.reference || 'Transaction';
          
          // Handle voucher transactions
          if (t.description && t.description.toLowerCase().includes('voucher')) {
            // Extract voucher number if present
            const voucherMatch = t.description.match(/(\d{12,16})/);
            if (voucherMatch) {
              const voucherNumber = voucherMatch[1];
              let formattedVoucher: string;
              if (voucherNumber.length === 14) {
                formattedVoucher = voucherNumber.slice(0, 1) + ' ' + 
                                  voucherNumber.slice(1, 5) + ' ' + 
                                  voucherNumber.slice(5, 9) + ' ' + 
                                  voucherNumber.slice(9, 13) + ' ' + 
                                  voucherNumber.slice(13);
              } else if (voucherNumber.length === 16) {
                formattedVoucher = voucherNumber.slice(0, 4) + ' ' + 
                                  voucherNumber.slice(4, 8) + ' ' + 
                                  voucherNumber.slice(8, 12) + ' ' + 
                                  voucherNumber.slice(12);
              } else {
                formattedVoucher = voucherNumber.slice(0, 4) + ' ' + 
                                  voucherNumber.slice(4, 8) + ' ' + 
                                  voucherNumber.slice(8);
              }
              
              if (t.description.toLowerCase().includes('purchase')) {
                displayName = `Voucher purchase: ${formattedVoucher}`;
              } else if (t.description.toLowerCase().includes('redemption')) {
                displayName = `Voucher redemption: ${formattedVoucher}`;
              } else {
                displayName = `Voucher transaction: ${formattedVoucher}`;
              }
            } else {
              if (t.description.toLowerCase().includes('purchase')) {
                displayName = 'Voucher purchase';
              } else if (t.description.toLowerCase().includes('redemption')) {
                displayName = 'Voucher redemption';
              } else {
                displayName = 'Voucher transaction';
              }
            }
          } else if (isDebitTx) {
            // Parse name and optional reference from description
            const nameMatch = desc.match(/sent to\s+([^|]+)/i) || desc.match(/payment to\s+([^|]+)/i);
            const name = (nameMatch && nameMatch[1]) ? nameMatch[1].trim() : desc.trim();
            const refMatch = desc.match(/ref\s*:\s*([^|]+)/i);
            const ref = refMatch ? refMatch[1].trim().slice(0, 20) : '';
            displayName = name;
          } else if (isCreditTx) {
            // Credit: prefer sender name + optional reference
            const fromMatch = desc.match(/received from\s+([^|]+)/i);
            if (fromMatch && fromMatch[1]) {
              const sender = fromMatch[1].trim();
              const refMatch = desc.match(/ref\s*:\s*([^|]+)/i);
              const ref = refMatch ? refMatch[1].trim().slice(0, 20) : '';
              displayName = sender;
            }
          }
          
          // Preserve original description for icon logic
          const originalDescription = desc || t.reference || 'Transaction';
 
          // Infer account type for this transaction row
          const txAccountType: 'mymoolah' | 'bank' = isDebitTx
            ? (t.receiverWalletId ? 'mymoolah' : 'bank')
            : 'bank';

          return {
            id: String(t.id || t.transactionId || Date.now()),
            beneficiaryName: displayName,
            amount: isCreditTx ? Number(t.amount || 0) : -Math.abs(Number(t.amount || 0)),
            date: new Date(t.createdAt || Date.now()),
            status: (t.status || 'completed') as any,
            reference: t.transactionId || t.reference,
            accountType: txAccountType,
            description: originalDescription, // Keep original for icon logic
            kind: isDebitTx ? 'send' : 'other',
            receiverWalletId: t.receiverWalletId,
            senderWalletId: t.senderWalletId as any,
          };
        });
        setTransactions(mapped);

        // Resolve sender names for ALL credit rows that have a senderWalletId
        // This ensures legacy descriptions like "Sent to ..." are corrected to show the sender's name
        try {
          const updated = await Promise.all(mapped.map(async (tx: any) => {
            if (!(tx.amount > 0 && tx.senderWalletId)) {
              return tx;
            }
            try {
              const wallet = await apiService.getWalletById(tx.senderWalletId);
              const user = wallet?.user || {};
              const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sender';
              const refMatch = String(tx.description || '').match(/ref\s*:\s*([^|]+)/i);
              const ref = refMatch ? refMatch[1].trim().slice(0, 20) : '';
              return { ...tx, beneficiaryName: senderName };
            } catch (_) {
              return tx;
            }
          }));
          setTransactions(updated as any);
        } catch (_) {}

        // Load beneficiaries from localStorage (temporary until backend API is ready)
        try {
          const savedContacts = JSON.parse(localStorage.getItem('mymoolah_contacts') || '[]');
          const mappedBeneficiaries: Beneficiary[] = savedContacts.map((contact: any, index: number) => ({
            id: String(index + 1),
            name: contact.name,
            identifier: contact.identifier,
            accountType: contact.accountType,
            lastPaid: contact.lastPaid ? new Date(contact.lastPaid) : undefined,
            isFavorite: contact.isFavorite || false,
            totalPaid: contact.totalPaid || 0,
            paymentCount: contact.paymentCount || 0
          }));
          // Fetch bank beneficiaries from backend and merge
          let backendBeneficiaries: Beneficiary[] = [];
          try {
            const apiBeneficiaries = await apiService.getBeneficiaries();
            backendBeneficiaries = (apiBeneficiaries || []).map((b: any, idx: number) => ({
              id: `b-${b.id || idx}`,
              name: b.name,
              identifier: b.identifier,
              accountType: b.accountType === 'bank' ? 'bank' : 'mymoolah',
              lastPaid: b.lastPaidAt ? new Date(b.lastPaidAt) : undefined,
              isFavorite: false,
              totalPaid: 0,
              paymentCount: b.timesPaid || 0,
              bankName: b.bankName || ''
            }));
          } catch (e) {
            // Non-fatal; continue with local only
          }
          setBeneficiaries([...
            backendBeneficiaries,
            ...mappedBeneficiaries,
          ]);
        } catch (e) {
          console.error('Failed to load saved contacts', e);
        }

        // TODO: When beneficiaries API is ready, replace localStorage with:
        // const beneficiaries = await apiService.getBeneficiaries();
        // setBeneficiaries(beneficiaries);
      } catch (e) {
        console.error('Failed to load initial data', e);
      }
    };
    load();
  }, []);

  // Compute last 10 most recent transactions (show both send and receive for context)
  const lastTenSendTx = useMemo(() => {
    return transactions
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [transactions]);

  // Helper: When clicking a recent row, prefill payment (saved or one-time)
  const prefillPaymentFromTransaction = async (t: Transaction) => {
    // Always drive the one-time Pay Now flow as requested
    const clickedNameRaw = (t.beneficiaryName || '').split(' — Ref:')[0].trim();
    const clickedName = clickedNameRaw.toLowerCase();
    const match = beneficiaries.find(b => (b.name || '').trim().toLowerCase() === clickedName);

    // Prefer the PRECEDING TRANSACTION's account type; fall back to saved, then MyMoolah
    let accountType: 'mymoolah' | 'bank' = (t.accountType as any) || match?.accountType || 'mymoolah';

    let name = match?.name || clickedNameRaw;
    let identifier = '';
    let bankName = '';

    const toDisplaySA = (num: string): string => {
      const digits = String(num || '').replace(/\D/g, '');
      if (!digits) return '';
      if (digits.startsWith('27')) return '27' + digits.slice(-9);
      if (digits.startsWith('0')) return '27' + digits.slice(1);
      if (digits.length === 9) return '27' + digits;
      return digits;
    };

    if (accountType === 'mymoolah') {
      // Resolve phone via wallet if possible
      try {
        if (t.receiverWalletId) {
          const wallet = await apiService.getWalletById(t.receiverWalletId);
          const user = wallet?.user;
          if (user?.phoneNumber) identifier = toDisplaySA(String(user.phoneNumber));
          if (!name && (user?.firstName || user?.lastName)) {
            name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          }
        }
      } catch (_) {}
      // If still no phone, use saved only if saved is also MyMoolah
      if (!identifier && match?.accountType === 'mymoolah') {
        identifier = toDisplaySA(match.identifier);
      }
    } else {
      // Bank payment: use saved bank details if available
      if (match?.accountType === 'bank') {
        identifier = match.identifier;
        bankName = match.bankName || '';
      }
    }

    // Prefill one-time modal based on chosen account type
    setSelectedAccountType(accountType);
    if (accountType === 'mymoolah') {
      setNewBeneficiary(prev => ({
        ...prev,
        name,
        identifier,
        bankName: '',
        accountNumber: ''
      }));
    } else {
      setNewBeneficiary(prev => ({
        ...prev,
        name,
        identifier, // account number
        bankName,
        accountNumber: identifier
      }));
    }

    // Clear amount and reference/description for fresh entry
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentDescription('');

    // Open Pay Now
    setIsOneTimeMode(true);
    setShowPayNow(true);
  };

  // Prefill from a saved beneficiary (Frequent list)
  const prefillFromBeneficiary = (b: Beneficiary) => {
    setSelectedAccountType(b.accountType);
    const toDisplaySA = (num: string): string => {
      const digits = String(num || '').replace(/\D/g, '');
      if (!digits) return '';
      if (digits.startsWith('27')) return '27' + digits.slice(-9);
      if (digits.startsWith('0')) return '27' + digits.slice(1);
      if (digits.length === 9) return '27' + digits;
      return digits;
    };
    if (b.accountType === 'mymoolah') {
      setNewBeneficiary(prev => ({ ...prev, name: b.name, identifier: toDisplaySA(b.identifier), bankName: '', accountNumber: '' }));
    } else {
      setNewBeneficiary(prev => ({ ...prev, name: b.name, identifier: b.identifier, bankName: b.bankName || '', accountNumber: b.identifier }));
    }
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentDescription('');
    setIsOneTimeMode(true);
    setShowPayNow(true);
  };

  // API Functions
  const resolveRecipient = async (identifier: string) => {
    try {
      setIsResolvingRecipient(true);
      setError(null);
      setRecipientInfo(null);
      setSelectedPaymentMethod(null);
      setPaymentQuote(null);

      const info = await apiService.resolveRecipient(identifier);
      setRecipientInfo(info);
      
      // Auto-select preferred method if available
      const preferredMethod = info.availableMethods.find(method => method.preferred);
      if (preferredMethod) {
        setSelectedPaymentMethod(preferredMethod);
      }
      
    } catch (err) {
      console.error('Error resolving recipient:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve recipient');
    } finally {
      setIsResolvingRecipient(false);
    }
  };

  const getPaymentQuote = async (paymentMethodId: string, amount: number, recipient: string) => {
    try {
      setIsGettingQuote(true);
      setError(null);

      const quote = await apiService.getPaymentQuote(paymentMethodId, amount, recipient);
      setPaymentQuote(quote);
      
    } catch (err) {
      console.error('Error getting payment quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to get payment quote');
    } finally {
      setIsGettingQuote(false);
    }
  };

  const processTransfer = async (paymentMethodId: string, amount: number, recipient: string, reference: string) => {
    try {
      setIsProcessingTransfer(true);
      setError(null);

      const result = await apiService.initiateTransfer(paymentMethodId, amount, recipient, reference);
      setTransferResult(result);
      
      // Close payment modal on success
      setShowPaymentModal(false);
      
      // Show success message or redirect
      if (result.status === 'processing') {
        // Could show a success modal or redirect to status page
        console.log('Transfer initiated successfully:', result);
      }
      
    } catch (err) {
      console.error('Error processing transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to process transfer');
    } finally {
      setIsProcessingTransfer(false);
    }
  };

  // Filtered and Sorted Beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    let filtered = beneficiaries.filter(beneficiary => {
      const matchesSearch = beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           beneficiary.identifier.includes(searchQuery);
      
      const matchesFilter = filterType === 'all' || beneficiary.accountType === filterType;
      
      return matchesSearch && matchesFilter;
    });

    // Sort beneficiaries
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'lastPaid':
          if (!a.lastPaid && !b.lastPaid) return 0;
          if (!a.lastPaid) return 1;
          if (!b.lastPaid) return -1;
          return b.lastPaid.getTime() - a.lastPaid.getTime();
        case 'favorite':
          if (a.isFavorite === b.isFavorite) {
            return a.name.localeCompare(b.name);
          }
          return a.isFavorite ? -1 : 1;
        default:
          return 0;
      }
    });

    return filtered;
  }, [beneficiaries, searchQuery, sortBy, filterType]);

  // Handle Add Beneficiary
  const handleAddBeneficiary = async () => {
    if (!newBeneficiary.name || !newBeneficiary.identifier) return;

    try {
      // TODO: When beneficiaries API is ready, use this instead:
      // const data = await apiService.addBeneficiary({
      //   name: newBeneficiary.name,
      //   identifier: newBeneficiary.identifier,
      //   accountType: selectedAccountType,
      //   bankName: selectedAccountType === 'bank' ? newBeneficiary.bankName : undefined
      // });

      const beneficiary: Beneficiary = {
        id: Date.now().toString(),
        name: newBeneficiary.name,
        identifier: newBeneficiary.identifier,
        accountType: selectedAccountType,
        bankName: selectedAccountType === 'bank' ? newBeneficiary.bankName : undefined,
        lastPaid: undefined,
        isFavorite: false,
        totalPaid: 0,
        paymentCount: 0
      };

      setBeneficiaries(prev => [...prev, beneficiary]);
      setNewBeneficiary({ name: '', identifier: '', bankName: '', accountNumber: '' });
      setShowAddBeneficiary(false);

      // Ask if user wants to make payment now
      const makePaymentNow = window.confirm(`Beneficiary "${beneficiary.name}" added successfully! Would you like to make a payment now?`);
      if (makePaymentNow) {
        setSelectedBeneficiary(beneficiary);
        setShowPaymentModal(true);
      }
    } catch (error: any) {
      console.error('Error adding beneficiary:', error);
      alert(error?.message || 'Failed to add beneficiary. Please try again.');
    }
  };

  // One-time payment flow (Pay Now card)
  const handlePayNow = async () => {
    if (!newBeneficiary.name || !newBeneficiary.identifier || !paymentAmount) return;

    if (selectedAccountType === 'bank') {
      // Persist beneficiary if user opted in, even while bank payment flow is not yet enabled
      if (saveAsBeneficiary && newBeneficiary.name && newBeneficiary.identifier) {
        try {
          await apiService.addBeneficiary({
            name: newBeneficiary.name,
            identifier: newBeneficiary.identifier,
            accountType: selectedAccountType,
            bankName: newBeneficiary.bankName || undefined,
          });
          const added: Beneficiary = {
            id: `b-${Date.now()}`,
            name: newBeneficiary.name,
            identifier: newBeneficiary.identifier,
            accountType: 'bank',
            bankName: newBeneficiary.bankName || '',
            lastPaid: undefined,
            isFavorite: false,
            totalPaid: 0,
            paymentCount: 0,
          };
          setBeneficiaries(prev => {
            const dedup = prev.filter(b => !(b.accountType === 'bank' && b.identifier === added.identifier));
            return [added, ...dedup];
          });
          alert('Beneficiary saved. Bank payments will be enabled soon.');
        } catch (e: any) {
          alert(e?.message || 'Failed to save beneficiary');
        }
      } else {
        alert('Bank payments will be enabled soon. Please choose MyMoolah account for now.');
      }
      return;
    }

    setIsProcessing(true);
    try {
      // Compose banking-style description with optional reference (max 20 chars)
      const ref = (paymentReference || '').trim().slice(0, 20);
      const desc = (paymentDescription || '').trim();
      const combinedDescription = [ref ? `Ref:${ref}` : '', desc].filter(Boolean).join(' - ') || undefined;

      // Real API call to debit/credit wallets using PostgreSQL
      const nameForDesc = newBeneficiary.name?.trim();
      const descForBackend = [
        ref ? `Ref:${ref}` : undefined,
        desc || undefined,
      ].filter(Boolean).join(' | ');

      const data = await apiService.sendWalletToWallet(
        newBeneficiary.identifier,
        parseFloat(paymentAmount),
        descForBackend,
      );

      // Insert a simplified transaction row locally for instant feedback
      const txn: Transaction = {
        id: (data && data.transactionId) ? String(data.transactionId) : Date.now().toString(),
        beneficiaryName: newBeneficiary.name,
        amount: -parseFloat(paymentAmount), // Negative for sent money (debit)
        date: new Date(),
        status: 'completed',
        reference: data?.transactionId,
        accountType: 'mymoolah',
        description: `${newBeneficiary.name} | Ref:${paymentReference || 'Payment'}`, // Show recipient name and user reference
        kind: 'send',
      };
      setTransactions(prev => [txn, ...prev]);

      setShowPayNow(false);
      setLastPaidContact({
        name: newBeneficiary.name,
        identifier: newBeneficiary.identifier,
        accountType: 'mymoolah'
      });
      setShowAddContactPrompt(true);

      // reset one-time form
      setNewBeneficiary({ name: '', identifier: '', bankName: '', accountNumber: '' });
      setPaymentAmount('');
      setPaymentDescription('');
      setPaymentReference('');
      setIsRecurring(false);
      setIsOneTimeMode(false);
    } catch (err: any) {
      console.error('Pay Now error', err);
      alert(err?.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Persist contacts locally (temporary until backend is available)
  const addContactToLocalList = (contact: { name: string; identifier: string; accountType: 'mymoolah' | 'bank' }) => {
    const beneficiary: Beneficiary = {
      id: Date.now().toString(),
      name: contact.name,
      identifier: contact.identifier,
      accountType: contact.accountType,
      lastPaid: new Date(),
      isFavorite: false,
      totalPaid: 0,
      paymentCount: 1 // Increment payment count
    };
    setBeneficiaries(prev => [beneficiary, ...prev]);
    try {
      const existing = JSON.parse(localStorage.getItem('mymoolah_contacts') || '[]');
      const updated = [
        { 
          name: contact.name, 
          identifier: contact.identifier, 
          accountType: contact.accountType,
          lastPaid: new Date().toISOString(),
          isFavorite: false,
          totalPaid: 0,
          paymentCount: 1
        },
        ...existing.filter((c: any) => c.identifier !== contact.identifier)
      ];
      localStorage.setItem('mymoolah_contacts', JSON.stringify(updated));
    } catch {}
  };

  // Handle Payment
  const handlePayment = async () => {
    if (!selectedBeneficiary || !paymentAmount) return;

    setIsProcessing(true);
    
    try {
      // Real API call to PostgreSQL database with optional reference (max 20 chars)
      const ref = (paymentReference || '').trim().slice(0, 20);
      const desc = (paymentDescription || '').trim();
      const combinedDescription = [ref ? `Ref:${ref}` : '', desc].filter(Boolean).join(' - ') || undefined;
      const nameForDesc = selectedBeneficiary.name?.trim();
      const descForBackend = [
        ref ? `Ref:${ref}` : undefined,
        desc || undefined,
      ].filter(Boolean).join(' | ');
      const data = await apiService.sendWalletToWallet(
        selectedBeneficiary.identifier,
        parseFloat(paymentAmount),
        descForBackend,
      );

      // Create transaction record for UI
      const transaction: Transaction = {
        id: (data && data.transactionId) ? String(data.transactionId) : Date.now().toString(),
        beneficiaryId: selectedBeneficiary.id,
        beneficiaryName: selectedBeneficiary.name,
        amount: -parseFloat(paymentAmount), // Negative for sent money (debit)
        date: new Date(),
        status: 'completed',
        reference: data?.transactionId || `TX${Date.now().toString().slice(-8)}`,
        accountType: selectedBeneficiary.accountType,
        description: `Sent to ${selectedBeneficiary.name}` // Keep original for icon logic
      };

      setTransactions(prev => [transaction, ...prev]);
      
      // Update beneficiary stats
      setBeneficiaries(prev => prev.map(b => 
        b.id === selectedBeneficiary.id 
          ? {
              ...b,
              lastPaid: new Date(),
              totalPaid: b.totalPaid + parseFloat(paymentAmount),
              paymentCount: b.paymentCount + 1
            }
          : b
      ));

      setPaymentAmount('');
      setPaymentDescription('');
      setPaymentReference('');
      setIsRecurring(false);
      setShowPaymentModal(false);
      setSelectedBeneficiary(null);
      
      alert(`Payment of ${formatCurrency(parseFloat(paymentAmount))} sent successfully to ${selectedBeneficiary.name}!`);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error?.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format currency - consistent with Dashboard
  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) {
      return 'R 0.00';
    }
    
    const formattedAmount = amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // For negative amounts, show R -amount (negative sign after R)
    if (amount < 0) {
      return `R -${Math.abs(amount).toLocaleString('en-ZA', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    
    return `R ${formattedAmount}`;
  };

  // Format voucher numbers - consistent with Dashboard and Transaction History
  const formatVoucherNumber = (description: string): string => {
    // Check if description contains a voucher number (12-16 digits)
    const voucherMatch = description.match(/(\d{12,16})/);
    if (voucherMatch) {
      const voucherNumber = voucherMatch[1];
      
      // Format based on length
      let formattedVoucher: string;
      if (voucherNumber.length === 14) {
        // EasyPay PIN (14 digits): 9 1234 0371 6648 2
        formattedVoucher = voucherNumber.slice(0, 1) + ' ' + 
                          voucherNumber.slice(1, 5) + ' ' + 
                          voucherNumber.slice(5, 9) + ' ' + 
                          voucherNumber.slice(9, 13) + ' ' + 
                          voucherNumber.slice(13);
      } else if (voucherNumber.length === 16) {
        // MMVoucher PIN (16 digits): 9562 4205 7827 9406
        formattedVoucher = voucherNumber.slice(0, 4) + ' ' + 
                          voucherNumber.slice(4, 8) + ' ' + 
                          voucherNumber.slice(8, 12) + ' ' + 
                          voucherNumber.slice(12);
      } else {
        // Fallback for other lengths: groups of 4
        formattedVoucher = voucherNumber.slice(0, 4) + ' ' + 
                          voucherNumber.slice(4, 8) + ' ' + 
                          voucherNumber.slice(8);
      }
      
      return description.replace(voucherNumber, formattedVoucher);
    }
    return description;
  };

  // Format date - consistent with Dashboard
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get transaction icon based on transaction type and description - Award-winning design
  const getTransactionIcon = (transaction: Transaction) => {
    const iconStyle = { width: '20px', height: '20px' };
    
    // Check for voucher transactions first
    if (transaction.description && transaction.description.toLowerCase().includes('voucher')) {
      // Use a proper voucher/ticket icon
      return <Ticket style={iconStyle} />;
    }
    
    // Determine transaction type based on amount and description
    let type: 'sent' | 'received' | 'purchase' | 'payment';
    
    if (transaction.amount < 0) {
      // Negative amount = debit (sent money)
      if (transaction.description && transaction.description.toLowerCase().includes('sent to')) {
        type = 'sent';
      } else if (transaction.description && (
        transaction.description.toLowerCase().includes('woolworths') || 
        transaction.description.toLowerCase().includes('grocery') ||
        transaction.description.toLowerCase().includes('food') ||
        transaction.description.toLowerCase().includes('shopping')
      )) {
        type = 'purchase';
      } else if (transaction.description && (
        transaction.description.toLowerCase().includes('airtime') || 
        transaction.description.toLowerCase().includes('vodacom') ||
        transaction.description.toLowerCase().includes('mtn') ||
        transaction.description.toLowerCase().includes('electricity') ||
        transaction.description.toLowerCase().includes('power')
      )) {
        type = 'payment';
      } else {
        type = 'sent';
      }
    } else {
      // Positive amount = credit (received money)
      type = 'received';
    }
    
    // Return appropriate icon based on type - Award-winning icon selection
    switch (type) {
      case 'received':
        // Money received (credit) - Arrow pointing down and left (money coming in)
        return <ArrowDownLeft style={iconStyle} />;
      case 'sent':
        // Money sent (debit) - Arrow pointing up and right (money going out)
        return <ArrowUpRight style={iconStyle} />;
      case 'purchase':
        if (transaction.description && (
          transaction.description.toLowerCase().includes('woolworths') || 
          transaction.description.toLowerCase().includes('grocery') ||
          transaction.description.toLowerCase().includes('food')
        )) {
          return <ShoppingBag style={iconStyle} />;
        }
        if (transaction.description && (
          transaction.description.toLowerCase().includes('caf') || 
          transaction.description.toLowerCase().includes('coffee')
        )) {
          return <Coffee style={iconStyle} />;
        }
        return <ShoppingBag style={iconStyle} />;
      case 'payment':
        if (transaction.description && (
          transaction.description.toLowerCase().includes('airtime') || 
          transaction.description.toLowerCase().includes('vodacom') ||
          transaction.description.toLowerCase().includes('mtn')
        )) {
          return <Phone style={iconStyle} />;
        }
        if (transaction.description && (
          transaction.description.toLowerCase().includes('uber') || 
          transaction.description.toLowerCase().includes('taxi') ||
          transaction.description.toLowerCase().includes('transport')
        )) {
          return <Car style={iconStyle} />;
        }
        return <Phone style={iconStyle} />;
      default:
        return <ShoppingBag style={iconStyle} />;
    }
  };

  // Get account type badge
  const getAccountTypeBadge = (accountType: 'mymoolah' | 'bank') => {
    return accountType === 'mymoolah' ? (
      <Badge className="bg-[#86BE41]/10 text-[#86BE41] border-[#86BE41]/20" style={{ fontSize: '10px' }}>
        <Wallet className="w-3 h-3 mr-1" />
        MyMoolah
      </Badge>
    ) : (
      <Badge className="bg-[#2D8CCA]/10 text-[#2D8CCA] border-[#2D8CCA]/20" style={{ fontSize: '10px' }}>
        <Building2 className="w-3 h-3 mr-1" />
        Bank
      </Badge>
    );
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Montserrat, sans-serif'
    }}>
      {/* Header */}
      <div className="bg-[#2D8CCA] text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate('/transact')}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            style={{ minHeight: 'var(--mobile-touch-target)', minWidth: 'var(--mobile-touch-target)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'white'
          }}>
            Pay Beneficiary
          </h1>
        </div>

        {/* Search and Add */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search beneficiaries"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/90 border-0 text-gray-900"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                height: 'var(--mobile-touch-target)'
              }}
            />
          </div>
          <Dialog open={showAddBeneficiary} onOpenChange={setShowAddBeneficiary}>
            <DialogTrigger asChild>
              <Button className="bg-[#86BE41] hover:bg-[#7AB139] text-white border-0 px-4">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Add New Beneficiary
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Account Type Selection */}
                <div className="space-y-3">
                  <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Account Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={selectedAccountType === 'mymoolah' ? 'default' : 'outline'}
                      onClick={() => setSelectedAccountType('mymoolah')}
                      className={`h-16 flex-col ${selectedAccountType === 'mymoolah' 
                        ? 'bg-[#86BE41] text-white border-[#86BE41]' 
                        : 'border-gray-200'}`}
                    >
                      <Wallet className="w-5 h-5 mb-1" />
                      <span style={{ fontSize: 'var(--mobile-font-small)' }}>MyMoolah</span>
                    </Button>
                    <Button
                      variant={selectedAccountType === 'bank' ? 'default' : 'outline'}
                      onClick={() => setSelectedAccountType('bank')}
                      className={`h-16 flex-col ${selectedAccountType === 'bank' 
                        ? 'bg-[#2D8CCA] text-white border-[#2D8CCA]' 
                        : 'border-gray-200'}`}
                    >
                      <Building2 className="w-5 h-5 mb-1" />
                      <span style={{ fontSize: 'var(--mobile-font-small)' }}>Bank</span>
                    </Button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Beneficiary Name
                    </Label>
                    <Input
                      placeholder="Enter full name"
                      value={newBeneficiary.name}
                      onChange={(e) => setNewBeneficiary(prev => ({ ...prev, name: e.target.value }))}
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        height: 'var(--mobile-touch-target)'
                      }}
                    />
                  </div>

                  {selectedAccountType === 'mymoolah' ? (
                    <div>
                      <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        SA Mobile Number
                      </Label>
                      <Input
                        placeholder="27XXXXXXXXX"
                        value={newBeneficiary.identifier}
                        onChange={(e) => setNewBeneficiary(prev => ({ ...prev, identifier: e.target.value }))}
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          height: 'var(--mobile-touch-target)'
                        }}
                      />
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
                        color: '#6b7280',
                        marginTop: '0.5rem'
                      }}>
                        This is also their MyMoolah account number
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          Bank
                        </Label>
                        <Select value={newBeneficiary.bankName} onValueChange={(value) => 
                          setNewBeneficiary(prev => ({ ...prev, bankName: value }))
                        }>
                          <SelectTrigger style={{ height: 'var(--mobile-touch-target)' }}>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {SA_BANKS.map((bank) => (
                              <SelectItem key={bank.code} value={bank.name}>
                                {bank.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          Account Number
                        </Label>
                        <Input
                          placeholder="Enter account number"
                          value={newBeneficiary.identifier}
                          onChange={(e) => setNewBeneficiary(prev => ({ ...prev, identifier: e.target.value }))}
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: 'var(--mobile-font-base)',
                            height: 'var(--mobile-touch-target)'
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddBeneficiary(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddBeneficiary}
                    disabled={!newBeneficiary.name || !newBeneficiary.identifier}
                    className="flex-1 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white"
                  >
                    Add Beneficiary
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className="flex gap-3 items-center justify-center">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastPaid">Last Paid</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="favorite">Favorites First</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All</SelectItem>
              <SelectItem value="mymoolah">MyMoolah Only</SelectItem>
              <SelectItem value="bank">Bank Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--mobile-padding)' }}>
        {/* Quick Filter Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setFilterType('all'); setIsOneTimeMode(false); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-[#2D8CCA] text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Frequent
          </button>
          <button
            onClick={() => { setFilterType('mymoolah'); setIsOneTimeMode(true); setShowPayNow(true); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isOneTimeMode
                ? 'bg-[#2D8CCA] text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Pay Now
          </button>
        </div>

        {/* Beneficiaries List */}
        <div className="space-y-3 mb-8">
          {filteredBeneficiaries.map((beneficiary) => (
            <Card 
              key={beneficiary.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => prefillFromBeneficiary(beneficiary)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-[#2D8CCA] rounded-full flex items-center justify-center text-white font-bold">
                    {beneficiary.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>

                  {/* Beneficiary Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: '#1f2937'
                      }}>
                        {beneficiary.name}
                      </h3>
                      {beneficiary.isFavorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      {getAccountTypeBadge(beneficiary.accountType)}
                    </div>

                    {beneficiary.lastPaid ? (
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
                        color: '#6b7280'
                      }}>
                        Last paid: {formatDate(beneficiary.lastPaid)}
                      </p>
                    ) : (
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
                        color: '#6b7280'
                      }}>
                        Never paid
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      size="sm"
                      className="bg-[#86BE41] hover:bg-[#7AB139] text-white px-3 py-1"
                      onClick={(e) => { e.stopPropagation(); prefillFromBeneficiary(beneficiary); }}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Pay
                    </Button>
                    {beneficiary.paymentCount > 0 && (
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '10px',
                        color: '#6b7280'
                      }}>
                        {beneficiary.paymentCount} payments
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader style={{ padding: '20px 20px 0 20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%'
            }}>
              <h3 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                margin: '0'
              }}>
                Recent Transactions
              </h3>
              <ChevronRight 
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  color: '#6b7280' 
                }} 
              />
            </div>
          </CardHeader>
          <CardContent style={{ padding: '0 20px 20px 20px' }}>
            {lastTenSendTx.map((transaction, index) => (
              <div
                key={transaction.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: index === lastTenSendTx.length - 1 ? '0' : '16px',
                  marginBottom: index === lastTenSendTx.length - 1 ? '0' : '16px',
                  borderBottom: index === lastTenSendTx.length - 1 ? 'none' : '1px solid #f8fafc',
                  width: '100%'
                }}
                onClick={() => { prefillPaymentFromTransaction(transaction); }}
              >
                {/* Left: Icon and Description */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0
                  }}
                >
                  {/* Transaction Icon */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: transaction.amount >= 0 ? '#f0fdf4' : '#fef3f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      flexShrink: 0,
                      minWidth: '40px'
                    }}
                  >
                    <div style={{ color: transaction.amount >= 0 ? '#10b981' : '#ef4444' }}>
                                              {getTransactionIcon(transaction)}
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div style={{ 
                    flex: 1, 
                    minWidth: 0,
                    maxWidth: '60%'
                  }}>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: '#1f2937',
                        margin: '0 0 2px 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        display: 'block'
                      }}
                    >
                      {transaction.beneficiaryName}
                    </p>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
                        fontWeight: 'var(--font-weight-normal)',
                        color: '#6b7280',
                        margin: '0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%'
                      }}
                    >
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>

                {/* Right: Amount */}
                <div 
                  style={{
                    textAlign: 'right',
                    paddingLeft: '12px',
                    flexShrink: 0,
                    minWidth: '80px'
                  }}
                >
                  <span 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: transaction.amount >= 0 ? '#10b981' : '#ef4444',
                      lineHeight: '1.2'
                    }}
                  >
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Pay {selectedBeneficiary?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBeneficiary && (
            <div className="space-y-4">
              {/* Beneficiary Summary */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2D8CCA] rounded-full flex items-center justify-center text-white font-bold">
                    {selectedBeneficiary.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}>
                      {selectedBeneficiary.name}
                    </p>
                    {getAccountTypeBadge(selectedBeneficiary.accountType)}
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Amount (ZAR)</Label>
                <Input
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  type="number"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    height: 'var(--mobile-touch-target)'
                  }}
                />
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 500].map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount(amount.toString())}
                    className="text-[#2D8CCA] border-[#2D8CCA] hover:bg-[#2D8CCA] hover:text-white"
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>

              {/* Reference (banking standard: 20 characters) */}
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Reference (Optional, max 20 chars)
                </Label>
                <Input
                  placeholder="e.g. Rent Aug"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value.slice(0, 20))}
                  maxLength={20}
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    height: 'var(--mobile-touch-target)'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Description (Optional)
                </Label>
                <Textarea
                  placeholder="What's this payment for?"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  rows={3}
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)'
                  }}
                />
              </div>

              {/* Recurring Payment */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    Set up recurring payment
                  </p>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    color: '#6b7280'
                  }}>
                    Pay this amount monthly
                  </p>
                </div>
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Pay {paymentAmount ? formatCurrency(parseFloat(paymentAmount)) : 'R 0.00'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* One-time Pay Now Modal (reuses add-beneficiary fields) */}
      <Dialog open={showPayNow} onOpenChange={(v) => { setShowPayNow(v); if (!v) setIsOneTimeMode(false); }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Pay Now
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Account Type Selection */}
            <div className="space-y-3">
              <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Account Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={selectedAccountType === 'mymoolah' ? 'default' : 'outline'}
                  onClick={() => setSelectedAccountType('mymoolah')}
                  className={`h-16 flex-col ${selectedAccountType === 'mymoolah' 
                    ? 'bg-[#86BE41] text-white border-[#86BE41]' 
                    : 'border-gray-200'}`}
                >
                  <Wallet className="w-5 h-5 mb-1" />
                  <span style={{ fontSize: 'var(--mobile-font-small)' }}>MyMoolah</span>
                </Button>
                <Button
                  variant={selectedAccountType === 'bank' ? 'default' : 'outline'}
                  onClick={() => setSelectedAccountType('bank')}
                  className={`h-16 flex-col ${selectedAccountType === 'bank' 
                    ? 'bg-[#2D8CCA] text-white border-[#2D8CCA]' 
                    : 'border-gray-200'}`}
                >
                  <Building2 className="w-5 h-5 mb-1" />
                  <span style={{ fontSize: 'var(--mobile-font-small)' }}>Bank</span>
                </Button>
              </div>
            </div>

            {/* Recipient fields */}
            <div className="space-y-3">
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Beneficiary Name
                </Label>
                <Input
                  placeholder="Enter full name"
                  value={newBeneficiary.name}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, name: e.target.value }))}
                  style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', height: 'var(--mobile-touch-target)' }}
                />
              </div>
              {selectedAccountType === 'mymoolah' ? (
                <div>
                  <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>SA Mobile Number</Label>
                  <Input
                    placeholder="27XXXXXXXXX"
                    value={newBeneficiary.identifier}
                    onChange={(e) => setNewBeneficiary(prev => ({ ...prev, identifier: e.target.value }))}
                    style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', height: 'var(--mobile-touch-target)' }}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Bank</Label>
                    <Select value={newBeneficiary.bankName} onValueChange={(value) => setNewBeneficiary(prev => ({ ...prev, bankName: value }))}>
                      <SelectTrigger style={{ height: 'var(--mobile-touch-target)' }}>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {SA_BANKS.map((bank) => (
                          <SelectItem key={bank.code} value={bank.name}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Account Number</Label>
                    <Input
                      placeholder="Enter account number"
                      value={newBeneficiary.identifier}
                      onChange={(e) => setNewBeneficiary(prev => ({ ...prev, identifier: e.target.value }))}
                      style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', height: 'var(--mobile-touch-target)' }}
                    />
                  </div>
                  {/* Save as Beneficiary toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)' }}>
                        Save as Beneficiary
                      </p>
                      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', color: '#6b7280' }}>
                        Keep this bank recipient for easy future payments
                      </p>
                    </div>
                    <Switch checked={saveAsBeneficiary} onCheckedChange={setSaveAsBeneficiary} />
                  </div>
                </>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Amount (ZAR)</Label>
              <Input
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                type="number"
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', height: 'var(--mobile-touch-target)' }}
              />
            </div>

            {/* Reference (banking standard: 20 characters) */}
            <div>
              <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Reference (Optional, max 20 chars)</Label>
              <Input
                placeholder="e.g. Rent Aug"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value.slice(0, 20))}
                maxLength={20}
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', height: 'var(--mobile-touch-target)' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowPayNow(false)} className="flex-1" disabled={isProcessing}>Cancel</Button>
              <Button onClick={handlePayNow} disabled={!newBeneficiary.name || !newBeneficiary.identifier || !paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessing} className="flex-1 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay Now</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post-payment: Add to contacts prompt */}
      <Dialog open={showAddContactPrompt} onOpenChange={setShowAddContactPrompt}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Add to Contacts?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Payment successful to {lastPaidContact?.name}. Would you like to save this recipient for quick access next time?
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddContactPrompt(false)}
              >
                Not now
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white"
                onClick={() => {
                  if (lastPaidContact) addContactToLocalList(lastPaidContact);
                  setShowAddContactPrompt(false);
                }}
              >
                Add to Contacts
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}