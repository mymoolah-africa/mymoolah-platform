import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, type RecipientInfo, type RecipientMethod, type PaymentQuote, type TransferResult } from '../services/apiService';
import { beneficiaryService, type PaymentBeneficiary } from '../services/beneficiaryService';
import { getToken } from '../utils/authToken';
import { APP_CONFIG } from '../config/app-config';
import { validateMobileNumber } from '../services/overlayService';
import { logError, logErrorWithContext } from '../services/loggingService';

// Import centralized transaction icon utility
import { getTransactionIcon } from '../utils/transactionIcons.tsx';

import { 
  Search, 
  Plus, 
  ArrowLeft,
  Building2,
  Send,
  Star,
  Loader2,
  Wallet,
  ChevronRight,
  ChevronDown,
  Edit2,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { ConfirmationModal } from '../components/overlays/shared/ConfirmationModal';
import { ErrorModal } from '../components/ui/ErrorModal';

// Beneficiary Types - Using centralized service types
// Note: SendMoneyPage only handles PaymentBeneficiary types (mymoolah and bank)
// Service-specific beneficiaries (airtime, electricity, biller) are handled separately

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
  type: 'send' | 'receive' | 'deposit' | 'withdraw' | 'transfer' | 'payment' | 'refund' | 'fee';
  senderWalletId?: string;
  metadata?: any;
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

// Function to clean up transaction descriptions - remove "Ref:" prefix
function getCleanTransactionText(description: string): string {
  let cleanDescription = description || '';
  
  // Remove "Ref:" prefix and extract the actual description
          // Convert transaction description format
  if (cleanDescription.includes('| Ref:')) {
    // Extract the name part (before the pipe)
    const namePart = cleanDescription.split('|')[0].trim();
    
    // Extract the description part (after "Ref:")
    const refPart = cleanDescription.split('| Ref:')[1] || '';
    const actualDescription = refPart.trim();
    
    // Limit description to 20 characters
    const truncatedDescription = actualDescription.length > 20 
      ? actualDescription.substring(0, 20) + '...' 
      : actualDescription;
    
    return `${namePart} | ${truncatedDescription}`;
  }
  
  // Also handle variations like "Ref:" without the pipe
  if (cleanDescription.includes('Ref:')) {
    // Extract the name part (before "Ref:")
    const namePart = cleanDescription.split('Ref:')[0].trim();
    
    // Extract the description part (after "Ref:")
    const refPart = cleanDescription.split('Ref:')[1] || '';
    const actualDescription = refPart.trim();
    
    // Limit description to 20 characters
    const truncatedDescription = actualDescription.length > 20 
      ? actualDescription.substring(0, 20) + '...' 
      : actualDescription;
    
    return `${namePart}${truncatedDescription}`;
  }
  
  return cleanDescription;
}

export function SendMoneyPage() {
  const navigate = useNavigate();
  const { requiresKYC, user } = useAuth();
  
  // Constants to replace magic numbers and hardcoded values
  const CURRENT_USER_ID = user?.id || '1'; // Use actual user ID from context
  const TRANSACTION_ID_LENGTH = 8;
  const TRANSACTION_PREFIX = 'TX';
  const MAX_REFERENCE_LENGTH = 20;
  const DEFAULT_CURRENCY = 'ZAR';
  const DEFAULT_TRANSACTION_LIMIT = 50;
  
  // Helper function to show errors professionally
  const showError = (title: string, message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    setErrorModalData({ title, message, type });
    setShowErrorModal(true);
  };
  
  // Local state management for scalable architecture
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/transactions?limit=${DEFAULT_TRANSACTION_LIMIT}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const sourceList = Array.isArray(data.data)
            ? data.data
            : (data.data.transactions || []);

          const transformedTransactions = sourceList.map((tx: any) => {
            // Backend transforms: credit->deposit, debit->payment, send->sent, receive->received
            // Also treat 'refund' as credit for display
            const isCredit = ['deposit', 'received', 'refund'].includes(tx.type);
            const displayType = isCredit ? 'received' : 'sent';

            return {
              id: tx.id || `tx_${tx.transactionId}`,
              type: displayType,
              amount: isCredit ? Math.abs(tx.amount) : -Math.abs(tx.amount),
              currency: tx.currency || DEFAULT_CURRENCY,
              description: tx.description || 'Transaction',
              date: new Date(tx.createdAt || tx.date).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              timestamp: new Date(tx.createdAt || tx.date).toISOString(),
              status: tx.status || 'completed',
              counterparty: tx.metadata?.counterpartyIdentifier || 'Unknown',
              // Preserve identifiers and metadata for classification
              senderWalletId: tx.senderWalletId || tx.metadata?.senderWalletId,
              receiverWalletId: tx.receiverWalletId || tx.metadata?.receiverWalletId,
              metadata: tx.metadata || {}
            };
          });
          setAllTransactions(transformedTransactions);
        }
      }
    } catch (error) {
      logError('SendMoneyPage', 'Failed to fetch transactions', error as Error);
    }
  };

  // Load transactions on component mount
  useEffect(() => {
    fetchTransactions();
    fetchWalletBalance();
  }, []);
  
  // State Management
  const [beneficiaries, setBeneficiaries] = useState<PaymentBeneficiary[]>([]);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false);

  const loadBeneficiaries = useCallback(async () => {
    try {
      setBeneficiariesLoading(true);
      const backendBeneficiaries = await beneficiaryService.getPaymentBeneficiaries();
      setBeneficiaries(backendBeneficiaries);
    } catch (error) {
      logError('SendMoneyPage', 'Failed to load beneficiaries', error as Error);
    } finally {
      setBeneficiariesLoading(false);
    }
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'lastPaid' | 'favorite'>('lastPaid');
  const [filterType, setFilterType] = useState<'all' | 'mymoolah' | 'bank'>('all');
  const [isOneTimeMode, setIsOneTimeMode] = useState(false);
  
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
    msisdn: '', // NEW: Mobile number (MSISDN)
    identifier: '',
    bankName: '',
    accountNumber: ''
  });
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<PaymentBeneficiary | null>(null);
  // Track selected account ID for beneficiaries with multiple accounts (beneficiaryId -> accountId)
  const [selectedAccountIds, setSelectedAccountIds] = useState<Record<string, number>>({});
  // Track expanded account selectors (beneficiaryId -> boolean)
  const [expandedAccountSelectors, setExpandedAccountSelectors] = useState<Record<string, boolean>>({});
  
  // Confirmation Modal State
  const [showPaymentConfirmationModal, setShowPaymentConfirmationModal] = useState(false);
  const [beneficiaryForPayment, setBeneficiaryForPayment] = useState<PaymentBeneficiary | null>(null);
  
  // Edit/Remove Beneficiary State
  const [showEditBeneficiaryModal, setShowEditBeneficiaryModal] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<PaymentBeneficiary | null>(null);
  const [showRemoveConfirmationModal, setShowRemoveConfirmationModal] = useState(false);
  const [beneficiaryToRemove, setBeneficiaryToRemove] = useState<PaymentBeneficiary | null>(null);
  
  // Error Modal State
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
  }>({
    title: 'Error',
    message: 'An error occurred',
    type: 'error'
  });
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>('R0.00');

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.balance) {
          const balance = parseFloat(data.data.balance);
          const formattedBalance = balance.toLocaleString('en-ZA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          setWalletBalance(`R${formattedBalance}`);
        }
      }
    } catch (error) {
      logError('SendMoneyPage', 'Failed to fetch wallet balance', error as Error);
    }
  };

  // Transform MoolahContext transactions to SendMoneyPage format
  const transformedTransactions = useMemo(() => {
    return allTransactions.map((tx) => {
      // Map MoolahContext types to SendMoneyPage types
      const mapType = (moolahType: string): 'send' | 'receive' | 'deposit' | 'withdraw' | 'transfer' | 'payment' | 'refund' | 'fee' => {
        switch (moolahType) {
          case 'sent': return 'send';
          case 'received': return 'receive';
          case 'payment': return 'payment';
          case 'deposit': return 'deposit';
          default: return 'send';
        }
      };

      const desc = String(tx.description || '');
      const isCreditTx = (tx as any).type === 'received';
      const isDebitTx = (tx as any).type === 'sent' || (tx as any).type === 'payment';

      // Create a user-friendly primary text
      let displayName = desc || 'Transaction';
      
      // Handle voucher transactions
      if (tx.description && tx.description.toLowerCase().includes('voucher')) {
        // Extract voucher number if present
        const voucherMatch = tx.description.match(/(\d{12,16})/);
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
          
          if (tx.description.toLowerCase().includes('purchase')) {
            displayName = `Voucher purchase: ${formattedVoucher}`;
          } else if (tx.description.toLowerCase().includes('redemption')) {
            displayName = `Voucher redemption: ${formattedVoucher}`;
          } else {
            displayName = `Voucher transaction: ${formattedVoucher}`;
          }
        } else {
          if (tx.description.toLowerCase().includes('purchase')) {
            displayName = 'Voucher purchase';
          } else if (tx.description.toLowerCase().includes('redemption')) {
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
      const originalDescription = desc || 'Transaction';

      // Infer account type for this transaction row
      // Determine account type using icon classification helpers
      const looksBank = /external bank|bank transfer|absa|nedbank|standard bank|fnb|capitec|investec|discovery bank|african bank|bidvest bank|postbank|paygate|payfast|paypal/i.test(desc);
      const looksWallet = /sent to|payment to|transfer to|received from|\|/i.test(desc) || !!(tx as any).senderWalletId || !!(tx as any).receiverWalletId;
      const txAccountType: 'mymoolah' | 'bank' = looksBank && !looksWallet ? 'bank' : 'mymoolah';

      return {
        id: String(tx.id || Date.now()),
        beneficiaryName: displayName,
        amount: isCreditTx ? Number(tx.amount || 0) : -Math.abs(Number(tx.amount || 0)),
        date: new Date((tx as any).timestamp || Date.now()),
        status: (tx.status || 'completed') as 'completed' | 'pending' | 'failed',
        reference: tx.id || '',
        accountType: txAccountType,
        description: originalDescription, // Keep original for icon logic
        kind: isDebitTx ? ('send' as const) : ('other' as const),
        receiverWalletId: (tx as any).receiverWalletId,
        senderWalletId: (tx as any).senderWalletId,
        type: mapType(tx.type), // Map to SendMoneyPage type
        metadata: {} // Add metadata field
      };
    });
  }, [allTransactions]);

  // Check KYC requirements
  useEffect(() => {
    if (requiresKYC('send')) {
      navigate('/kyc/documents?returnTo=/send-money');
    }
  }, [requiresKYC, navigate]);

  // Initial data load from backend
  useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  // Compute last 10 most recent transactions (wallet + bank only; exclude vouchers)
  const lastTenSendTx = useMemo(() => {
    const nonVoucher = transformedTransactions.filter((t) => {
      const d = String(t.description || '').toLowerCase();
      if (d.includes('voucher')) return false;
      if (filterType === 'bank') return t.accountType === 'bank';
      if (filterType === 'mymoolah') return t.accountType === 'mymoolah';
      return true;
    });
    return nonVoucher
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [transformedTransactions, filterType]);

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

  // Helper: Get selected account for a beneficiary (or default)
  const getSelectedAccount = (b: PaymentBeneficiary) => {
    if (!b.accounts || b.accounts.length === 0) {
      return null; // No accounts, use legacy format
    }
    const selectedAccountId = selectedAccountIds[b.id];
    if (selectedAccountId) {
      const account = b.accounts.find(a => a.id === selectedAccountId);
      if (account) return account;
    }
    // Return default account or first account
    return b.accounts.find(a => a.isDefault) || b.accounts[0] || null;
  };

  // Helper: Toggle account selector expansion
  const toggleAccountSelector = (beneficiaryId: string) => {
    setExpandedAccountSelectors(prev => ({
      ...prev,
      [beneficiaryId]: !prev[beneficiaryId]
    }));
  };

  // Helper: Select account for a beneficiary
  const selectAccount = (beneficiaryId: string, accountId: number) => {
    setSelectedAccountIds(prev => ({
      ...prev,
      [beneficiaryId]: accountId
    }));
    setExpandedAccountSelectors(prev => ({
      ...prev,
      [beneficiaryId]: false // Collapse after selection
    }));
  };

  // Prefill from a saved beneficiary (Frequent list)
  const prefillFromBeneficiary = (b: PaymentBeneficiary, accountId?: number) => {
    // If accountId provided, use that account; otherwise use selected or default
    const account = accountId 
      ? b.accounts?.find(a => a.id === accountId)
      : getSelectedAccount(b);
    
    // Determine account type and details from selected account or legacy format
    let accountType: 'mymoolah' | 'bank' = b.accountType;
    let identifier = b.identifier;
    let bankName = b.bankName;
    
    if (account) {
      accountType = account.type === 'bank' ? 'bank' : 'mymoolah';
      identifier = account.identifier;
      bankName = account.metadata?.bankName || b.bankName;
    }
    
    setSelectedAccountType(accountType);
    const toDisplaySA = (num: string): string => {
      const digits = String(num || '').replace(/\D/g, '');
      if (!digits) return '';
      if (digits.startsWith('27')) return '27' + digits.slice(-9);
      if (digits.startsWith('0')) return '27' + digits.slice(1);
      if (digits.length === 9) return '27' + digits;
      return digits;
    };
    if (accountType === 'mymoolah') {
      setNewBeneficiary(prev => ({ 
        ...prev, 
        name: b.name, 
        identifier: identifier, // Keep original format (078XXXXXXXX)
        msisdn: identifier, // Also set msisdn for MyMoolah users
        bankName: '', 
        accountNumber: '' 
      }));
    } else {
      // Bank account: use identifier and bankName from selected account
      setNewBeneficiary(prev => ({ 
        ...prev, 
        name: b.name, 
        identifier: identifier, // Use identifier from selected account
        bankName: bankName || '', 
        accountNumber: identifier // Account number is the identifier for bank accounts
      }));
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
        logError('SendMoneyPage', 'Failed to resolve recipient', err as Error);
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
        logError('SendMoneyPage', 'Failed to get payment quote', err as Error);
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

      }
      
          } catch (err) {
        logError('SendMoneyPage', 'Failed to process transfer', err as Error);
        setError(err instanceof Error ? err.message : 'Failed to process transfer');
      } finally {
      setIsProcessingTransfer(false);
    }
  };

  // Filtered and Sorted Beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    let filtered = beneficiaries.filter(beneficiary => {
      const matchesSearch = beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           beneficiary.identifier.includes(searchQuery) ||
                           (beneficiary.msisdn && beneficiary.msisdn.includes(searchQuery)); // NEW: Search by MSISDN
      
      const matchesFilter = filterType === 'all' || beneficiary.accountType === filterType;
      
      return matchesSearch && matchesFilter;
    });

    // Sort beneficiaries
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'lastPaid':
          // Prioritize beneficiaries by most recent activity
          // First: beneficiaries with recent payments (most recent first)
          // Second: beneficiaries with older payments
          // Third: beneficiaries never paid (alphabetical)
          if (!a.lastPaid && !b.lastPaid) {
            // Both never paid - sort alphabetically
            return a.name.localeCompare(b.name);
          }
          if (!a.lastPaid) return 1; // a never paid, b has payments
          if (!b.lastPaid) return -1; // b never paid, a has payments
          
          // Both have payments - sort by most recent first
          const timeDiff = b.lastPaid.getTime() - a.lastPaid.getTime();
          if (timeDiff !== 0) return timeDiff;
          
          // If same last payment date, prioritize by payment count (most frequent first)
          return (b.paymentCount || 0) - (a.paymentCount || 0);
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
    // Validate required fields including MSISDN
    if (!newBeneficiary.name || !newBeneficiary.msisdn) {
      showError('Validation Error', 'Please fill in all required fields: Name and Mobile Number (MSISDN)', 'warning');
      return;
    }

    // For bank accounts, also require bank name and account number
    if (selectedAccountType === 'bank' && (!newBeneficiary.bankName || !newBeneficiary.identifier)) {
      showError('Validation Error', 'For bank payments, please also select a bank and enter the account number', 'warning');
      return;
    }

    // Validate mobile number format using the same validation as registration/login
    if (!validateMobileNumber(newBeneficiary.msisdn)) {
      showError('Validation Error', 'Invalid South African mobile number format. Please enter a valid mobile number (e.g., 078 123 4567)', 'warning');
      return;
    }

    try {
      const createdBeneficiary = await beneficiaryService.createPaymentBeneficiary({
        name: newBeneficiary.name.trim(),
        msisdn: newBeneficiary.msisdn.trim(),
        accountType: selectedAccountType,
        bankName: selectedAccountType === 'bank' ? newBeneficiary.bankName?.trim() : undefined,
        accountNumber: selectedAccountType === 'bank' ? newBeneficiary.identifier.trim() : undefined
      });

      setBeneficiaries(prev => [createdBeneficiary, ...prev.filter(b => b.id !== createdBeneficiary.id)]);
      setNewBeneficiary({ name: '', msisdn: '', identifier: '', bankName: '', accountNumber: '' });
      setShowAddBeneficiary(false);

      // Show confirmation modal asking if user wants to make payment now
      setBeneficiaryForPayment(createdBeneficiary);
      setShowPaymentConfirmationModal(true);
    } catch (error: any) {
      logError('SendMoneyPage', 'Failed to add beneficiary', error as Error);
      showError('Error', error?.message || 'Failed to add beneficiary. Please try again.', 'error');
    }
  };

  // Handle Edit Beneficiary
  const handleEditBeneficiary = (beneficiary: PaymentBeneficiary) => {
    setEditingBeneficiary(beneficiary);
    setShowEditBeneficiaryModal(true);
  };

  // Handle Remove Beneficiary
  const handleRemoveBeneficiary = (beneficiary: PaymentBeneficiary) => {
    setBeneficiaryToRemove(beneficiary);
    setShowRemoveConfirmationModal(true);
  };

  // Handle Confirm Remove Beneficiary
  const handleConfirmRemoveBeneficiary = async () => {
    if (!beneficiaryToRemove) return;
    
    try {
      // Backend removal (payment context)
      await beneficiaryService.removeBeneficiary(Number(beneficiaryToRemove.id), 'payment');

      // Remove from local state
      setBeneficiaries(prev => prev.filter(b => b.id !== beneficiaryToRemove.id));
      
      // Clear selection if this was the selected beneficiary
      if (selectedBeneficiary?.id === beneficiaryToRemove.id) {
        setSelectedBeneficiary(null);
      }
      
      setBeneficiaryToRemove(null);
      setShowRemoveConfirmationModal(false);
    } catch (error) {
      logError('SendMoneyPage', 'Failed to remove beneficiary', error as Error);
      showError('Error', 'Failed to remove beneficiary. Please try again.', 'error');
    }
  };

  // One-time payment flow (Pay Now card)
  const handlePayNow = async () => {
    // Validate required fields including MSISDN
    if (!newBeneficiary.name || !newBeneficiary.msisdn || !paymentAmount) {
      showError('Validation Error', 'Please fill in all required fields: Name, Mobile Number (MSISDN), and Amount', 'warning');
      return;
    }



    // For bank accounts, also require bank name and account number
    if (selectedAccountType === 'bank' && (!newBeneficiary.bankName || !newBeneficiary.identifier)) {
      showError('Validation Error', 'For bank payments, please also select a bank and enter the account number', 'warning');
      return;
    }

    // Validate mobile number format using the same validation as registration/login
    if (!validateMobileNumber(newBeneficiary.msisdn)) {
      showError('Validation Error', 'Invalid South African mobile number format. Please enter a valid mobile number (e.g., 078 123 4567)', 'warning');
      return;
    }

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
          const added: PaymentBeneficiary = {
            id: `b-${Date.now()}`,
            name: newBeneficiary.name,
            msisdn: newBeneficiary.msisdn, // MANDATORY: MSISDN for all beneficiaries
            identifier: newBeneficiary.identifier, // Bank account number
            accountType: 'bank',
            userId: CURRENT_USER_ID,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timesPaid: 0,
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
          showError('Success', 'Beneficiary saved. Bank payments will be enabled soon.', 'info');
        } catch (e: any) {
          showError('Error', e?.message || 'Failed to save beneficiary', 'error');
        }
      } else {
        showError('Info', 'Bank payments will be enabled soon. Please choose MyMoolah account for now.', 'info');
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
        type: 'send', // Add type field
        metadata: {} // Add metadata field
      };
      // Refresh transactions from API
      await fetchTransactions();

      setShowPayNow(false);
      
      // Check if beneficiary already exists before showing "Add to Contacts?" prompt
      const beneficiaryExists = beneficiaries.some(b => 
        b.accountType === 'mymoolah' && 
        b.identifier === newBeneficiary.identifier
      );
      
      if (!beneficiaryExists) {
        // Only show "Add to Contacts?" for NEW beneficiaries
        setLastPaidContact({
          name: newBeneficiary.name,
          identifier: newBeneficiary.identifier,
          accountType: 'mymoolah'
        });
        setShowAddContactPrompt(true);
      } else {
        // Beneficiary already exists - update their stats and show success message
        setBeneficiaries(prev => prev.map(b => 
          b.accountType === 'mymoolah' && b.identifier === newBeneficiary.identifier
            ? {
                ...b,
                lastPaid: new Date(),
                totalPaid: b.totalPaid + parseFloat(paymentAmount),
                paymentCount: b.paymentCount + 1
              }
            : b
        ));
        showError('Success', `Payment of ${formatCurrency(parseFloat(paymentAmount))} sent successfully to ${newBeneficiary.name}!`, 'info');
      }

      // reset one-time form
      setNewBeneficiary({ name: '', msisdn: '', identifier: '', bankName: '', accountNumber: '' });
      setPaymentAmount('');
      setPaymentDescription('');
      setPaymentReference('');
      setIsRecurring(false);
      setIsOneTimeMode(false);
    } catch (err: any) {
      logError('SendMoneyPage', 'Pay Now payment failed', err as Error);
      showError('Error', err?.message || 'Payment failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Persist contacts locally (temporary until backend is available)
  const addContactToLocalList = (contact: { name: string; identifier: string; accountType: 'mymoolah' | 'bank' }) => {
    // Prevent users from adding themselves as beneficiaries
    if (contact.accountType === 'mymoolah' && contact.identifier === CURRENT_USER_ID.toString()) {
      logError('SendMoneyPage', 'User attempted to add themselves as beneficiary', new Error('Self-beneficiary not allowed'));
      return;
    }
    
    const beneficiary: PaymentBeneficiary = {
      id: Date.now().toString(),
      name: contact.name,
      msisdn: contact.accountType === 'mymoolah' ? contact.identifier : '', // For MyMoolah: identifier IS the mobile number
      identifier: contact.identifier, // Keep original identifier (mobile number for MyMoolah, bank account for Bank)
      accountType: contact.accountType,
      userId: CURRENT_USER_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timesPaid: 1,
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
          userId: CURRENT_USER_ID, // Store the user ID who created this contact
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
      // Real API call to PostgreSQL database with optional reference (max chars)
      const ref = (paymentReference || '').trim().slice(0, MAX_REFERENCE_LENGTH);
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
        reference: data?.transactionId || `${TRANSACTION_PREFIX}${Date.now().toString().slice(-TRANSACTION_ID_LENGTH)}`,
        accountType: selectedBeneficiary.accountType,
        description: `Sent to ${selectedBeneficiary.name}`, // Keep original for icon logic
        type: 'send' // Add type field
      };

      // Refresh transactions from API
      await fetchTransactions();
      
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
      
      showError('Success', `Payment of ${formatCurrency(parseFloat(paymentAmount))} sent successfully to ${selectedBeneficiary.name}!`, 'info');
      
    } catch (error: any) {
      logError('SendMoneyPage', 'Payment processing failed', error as Error);
      showError('Error', error?.message || 'Payment failed. Please try again.', 'error');
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
      {/* Page Title Section */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative'
      }}>
        <button 
          onClick={() => navigate('/transact')}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            padding: '0',
            minHeight: '44px',
            minWidth: '44px',
            position: 'absolute',
            left: '16px',
            zIndex: 1
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft style={{ width: '20px', height: '20px', color: '#6b7280' }} />
        </button>
        <h1 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '18px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0',
          textAlign: 'center',
          width: '100%'
        }}>
          Send Money
        </h1>
        {/* Wallet Balance Badge */}
        <div 
          style={{
            position: 'absolute',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '44px'
          }}
        >
          <Badge 
            style={{
              backgroundColor: '#86BE41',
              color: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '9.18px',
              fontWeight: '600',
              padding: '3.06px 6.12px',
              borderRadius: '9.18px',
              border: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {walletBalance}
          </Badge>
        </div>
      </div>

      {/* Search and Add Section */}
      <div style={{
        padding: '16px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              color: '#9ca3af'
            }} />
            <Input
              placeholder="Search beneficiaries"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                height: '44px',
                paddingLeft: '40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
          <Dialog open={showAddBeneficiary} onOpenChange={setShowAddBeneficiary}>
            <DialogTrigger asChild>
              <Button style={{
                backgroundColor: '#86BE41',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0 16px',
                height: '44px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7AB139'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#86BE41'}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-auto" aria-describedby="add-beneficiary-description">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Add New Beneficiary
                </DialogTitle>
                <div id="add-beneficiary-description" className="sr-only">
                  Add a new beneficiary for future payments
                </div>
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

                  {/* Mobile Number Field - For MyMoolah: this IS their account number. For Bank: this is MSISDN for verification */}
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {selectedAccountType === 'mymoolah' 
                        ? 'Mobile Number (Account Number)' 
                        : 'Mobile Number (MSISDN)'} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g., 078 123 4567"
                      value={selectedAccountType === 'mymoolah' ? (newBeneficiary.identifier || newBeneficiary.msisdn) : newBeneficiary.msisdn}
                      onChange={(e) => {
                        const value = e.target.value;
                        
                        // Only allow digits, spaces, and hyphens for mobile numbers
                        const cleanValue = value.replace(/[^\d\s\-]/g, '');
                        
                        if (selectedAccountType === 'mymoolah') {
                          // For MyMoolah: update both identifier (account number) and msisdn
                          setNewBeneficiary(prev => ({ 
                            ...prev, 
                            identifier: cleanValue,
                            msisdn: cleanValue 
                          }));
                        } else {
                          // For Bank: only update msisdn
                          setNewBeneficiary(prev => ({ ...prev, msisdn: cleanValue }));
                        }
                      }}

                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        height: 'var(--mobile-touch-target)'
                      }}
                      className="font-mono"
                    />
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      color: '#6b7280',
                      marginTop: '0.5rem'
                    }}>
                      {selectedAccountType === 'mymoolah' 
                        ? 'This mobile number is their MyMoolah account number' 
                        : 'Required for FICA compliance and verification'}
                    </p>
                    {/* Real-time validation feedback */}
                    {selectedAccountType === 'mymoolah' && (newBeneficiary.identifier || newBeneficiary.msisdn) && (
                      (() => {
                        const value = newBeneficiary.identifier || newBeneficiary.msisdn;
                        const isValid = validateMobileNumber(value);
                        if (!isValid) {
                          return (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                              <p className="text-sm text-red-600 font-medium">Invalid mobile number format</p>
                              <p className="text-xs text-red-500 mt-1">Please enter a valid South African mobile number (e.g., 078 123 4567)</p>
                            </div>
                          );
                        }
                        return (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-600 font-medium">✓ Valid mobile number</p>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {selectedAccountType === 'bank' && (
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
                    disabled={!newBeneficiary.name || !newBeneficiary.msisdn}
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
      <div style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger style={{
              flex: 1,
              height: '44px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-base)'
            }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
                              <SelectItem value="lastPaid">Most Recent Activity</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="favorite">Favorites First</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger style={{
              flex: 1,
              height: '44px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-base)'
            }}>
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
      <div style={{ padding: '16px' }}>
        {/* Quick Filter Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => { setFilterType('all'); setIsOneTimeMode(false); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: 'var(--mobile-font-small)',
              fontWeight: '500',
              fontFamily: 'Montserrat, sans-serif',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: filterType === 'all' ? '#2D8CCA' : 'transparent',
              color: filterType === 'all' ? '#ffffff' : '#6b7280'
            }}
            onMouseOver={(e) => {
              if (filterType !== 'all') {
                e.currentTarget.style.color = '#1f2937';
              }
            }}
            onMouseOut={(e) => {
              if (filterType !== 'all') {
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            Frequent
          </button>
          <button
            onClick={() => { setFilterType('mymoolah'); setIsOneTimeMode(true); setShowPayNow(true); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: 'var(--mobile-font-small)',
              fontWeight: '500',
              fontFamily: 'Montserrat, sans-serif',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: isOneTimeMode ? '#2D8CCA' : 'transparent',
              color: isOneTimeMode ? '#ffffff' : '#6b7280'
            }}
            onMouseOver={(e) => {
              if (!isOneTimeMode) {
                e.currentTarget.style.color = '#1f2937';
              }
            }}
            onMouseOut={(e) => {
              if (!isOneTimeMode) {
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            Pay Now
          </button>
        </div>

        {/* Beneficiaries by Recent Activity */}
        <div className="mb-4">
          <h3 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1f2937',
            margin: '0 0 8px 0'
          }}>
            Your Beneficiaries
          </h3>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-small)',
            color: '#6b7280',
            margin: '0 0 16px 0'
          }}>
            Organized by most recent activity • {filteredBeneficiaries.length} total
          </p>
        </div>
        
        <div className="space-y-3 mb-8">
          {filteredBeneficiaries.map((beneficiary) => {
            const hasMultipleAccounts = beneficiary.accounts && beneficiary.accounts.length > 1;
            const selectedAccount = getSelectedAccount(beneficiary);
            const isExpanded = expandedAccountSelectors[beneficiary.id] || false;
            const displayAccount = selectedAccount || null;
            const accountType = displayAccount 
              ? (displayAccount.type === 'bank' ? 'bank' : 'mymoolah')
              : beneficiary.accountType;
            const accountIdentifier = displayAccount 
              ? displayAccount.identifier 
              : beneficiary.identifier;
            const accountBankName = displayAccount?.metadata?.bankName || beneficiary.bankName;
            
            return (
              <div key={beneficiary.id} className="space-y-2">
            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (hasMultipleAccounts && !isExpanded) {
                      toggleAccountSelector(beneficiary.id);
                    } else {
                      prefillFromBeneficiary(beneficiary);
                    }
                  }}
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
                          {hasMultipleAccounts && (
                            <Badge 
                              variant="secondary"
                              style={{
                                fontSize: '10px',
                                backgroundColor: '#e2e8f0',
                                color: '#6b7280',
                                padding: '2px 6px'
                              }}
                            >
                              {beneficiary.accounts.length} accounts
                            </Badge>
                          )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                          {getAccountTypeBadge(accountType)}
                    </div>

                        {/* Account Identifier */}
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      color: '#6b7280'
                    }}>
                          {accountType === 'mymoolah' ? (
                            <>📱 {accountIdentifier}</>
                          ) : (
                            <>
                              🏦 {accountBankName || 'Bank'} • {accountIdentifier}
                            </>
                          )}
                    </p>

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
                  <div className="flex flex-col items-end gap-2">
                        {/* Account Selector Toggle (if multiple accounts) */}
                        {hasMultipleAccounts && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 p-0 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAccountSelector(beneficiary.id);
                            }}
                            style={{
                              minWidth: '32px',
                              minHeight: '32px'
                            }}
                          >
                            <ChevronDown 
                              className="w-4 h-4 text-gray-500"
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                              }}
                            />
                          </Button>
                        )}
                        
                    {/* Pay Button */}
                    <Button
                      size="sm"
                      className="bg-[#86BE41] hover:bg-[#7AB139] text-white px-3 py-1"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            prefillFromBeneficiary(beneficiary); 
                          }}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Pay
                    </Button>
                    
                    {/* Edit & Remove Buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0 hover:bg-gray-100"
                        onClick={(e) => { e.stopPropagation(); handleEditBeneficiary(beneficiary); }}
                        style={{
                          minWidth: '32px',
                          minHeight: '32px'
                        }}
                      >
                        <Edit2 className="w-3 h-3 text-gray-500 hover:text-[#2D8CCA]" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleRemoveBeneficiary(beneficiary); }}
                        style={{
                          minWidth: '32px',
                          minHeight: '32px'
                        }}
                      >
                        <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
                      </Button>
                    </div>
                    
                    {/* Payment Count */}
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
                
                {/* Account Selector Dropdown (when expanded) */}
                {hasMultipleAccounts && isExpanded && beneficiary.accounts && (
                  <div
                    className="account-selector-dropdown"
                    style={{
                      padding: '8px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginTop: '-8px',
                      marginLeft: '16px',
                      marginRight: '16px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s ease-out',
                      opacity: 1,
                      transform: 'translateY(0)'
                    }}
                  >
                    {beneficiary.accounts.map((account) => {
                      const isSelected = selectedAccountIds[beneficiary.id] === account.id || 
                        (!selectedAccountIds[beneficiary.id] && account.isDefault);
                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAccount(beneficiary.id, account.id);
                            prefillFromBeneficiary(beneficiary, account.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            backgroundColor: isSelected ? 'rgba(134, 190, 65, 0.1)' : 'transparent',
                            border: isSelected ? '1px solid #86BE41' : '1px solid transparent',
                            cursor: 'pointer',
                            marginBottom: '4px',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {account.type === 'mymoolah' ? (
                              <Wallet className="w-4 h-4 text-[#86BE41]" />
                            ) : (
                              <Building2 className="w-4 h-4 text-[#2D8CCA]" />
                            )}
                            <div>
                              <p style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#1f2937',
                                margin: 0
                              }}>
                                {account.type === 'mymoolah' 
                                  ? 'MyMoolah Wallet'
                                  : `${account.metadata?.bankName || 'Bank'} Account`}
                              </p>
                              <p style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '12px',
                                color: '#6b7280',
                                margin: 0
                              }}>
                                {account.identifier}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#86BE41',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff'
                              }} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>


      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-sm mx-auto" aria-describedby="payment-modal-description">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Pay {selectedBeneficiary?.name}
            </DialogTitle>
            <div id="payment-modal-description" className="sr-only">
              Make a payment to {selectedBeneficiary?.name}
            </div>
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
                  onChange={(e) => {
                    // Banking-grade: Preserve exact user input - NO auto-formatting
                    let inputValue = e.target.value;
                    
                    // Allow empty string, numbers, and single decimal point only
                    // Remove any currency symbols or spaces that user might type
                    inputValue = inputValue.replace(/[^\d.]/g, '');
                    
                    // Ensure only one decimal point
                    const parts = inputValue.split('.');
                    if (parts.length > 2) {
                      inputValue = parts[0] + '.' + parts.slice(1).join('');
                    }
                    
                    // Limit to 2 decimal places (preserve user intent)
                    if (parts.length === 2 && parts[1].length > 2) {
                      inputValue = parts[0] + '.' + parts[1].substring(0, 2);
                    }
                    
                    // Set exact value - no automatic modification
                    setPaymentAmount(inputValue);
                  }}
                  type="text"
                  inputMode="decimal"
                  onKeyDown={(e) => {
                    // Prevent browser auto-formatting quirks
                    if (['e', 'E', '+', '-'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onWheel={(e) => {
                    // Prevent scroll-to-change number input values
                    e.currentTarget.blur();
                  }}
                  onBlur={(e) => {
                    // Optional: Format on blur only (not during typing)
                    const value = e.target.value.trim();
                    if (value) {
                      const num = parseFloat(value);
                      if (!isNaN(num) && num > 0 && value.includes('.')) {
                        setPaymentAmount(num.toFixed(2));
                      }
                    }
                  }}
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
        <DialogContent className="max-w-sm mx-auto" aria-describedby="pay-now-modal-description">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Pay Now
            </DialogTitle>
            <DialogDescription id="pay-now-modal-description" className="sr-only">
              Make a one-time payment to a new recipient
            </DialogDescription>
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
              
              {/* Mobile Number Field - For MyMoolah: this IS their account number. For Bank: this is MSISDN for verification */}
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {selectedAccountType === 'mymoolah' 
                    ? 'Mobile Number (Account Number)' 
                    : 'Mobile Number (MSISDN)'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g., 078 123 4567"
                  value={selectedAccountType === 'mymoolah' ? (newBeneficiary.identifier || newBeneficiary.msisdn) : newBeneficiary.msisdn}
                  onChange={(e) => {
                    const value = e.target.value;
                    
                    // Only allow digits, spaces, and hyphens for mobile numbers
                    const cleanValue = value.replace(/[^\d\s\-]/g, '');
                    
                    if (selectedAccountType === 'mymoolah') {
                      // For MyMoolah: update both identifier (account number) and msisdn
                      setNewBeneficiary(prev => ({ 
                        ...prev, 
                        identifier: cleanValue,
                        msisdn: cleanValue 
                      }));
                    } else {
                      // For Bank: only update msisdn
                      setNewBeneficiary(prev => ({ ...prev, msisdn: cleanValue }));
                    }
                  }}
                  style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', height: 'var(--mobile-touch-target)' }}
                  className="font-mono"
                />
                <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {selectedAccountType === 'mymoolah' 
                    ? 'This mobile number is their MyMoolah account number' 
                    : 'Required for FICA compliance and verification'}
                </p>
                {/* Real-time validation feedback */}
                {selectedAccountType === 'mymoolah' && (newBeneficiary.identifier || newBeneficiary.msisdn) && (
                  (() => {
                    const value = newBeneficiary.identifier || newBeneficiary.msisdn;
                    const isValid = validateMobileNumber(value);
                    if (!isValid) {
                      return (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-600 font-medium">Invalid mobile number format</p>
                          <p className="text-xs text-red-500 mt-1">Please enter a valid South African mobile number (e.g., 078 123 4567)</p>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-600 font-medium">✓ Valid mobile number</p>
                      </div>
                    );
                  })()
                )}
              </div>

              {selectedAccountType === 'bank' && (
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
                    <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Bank Account Number</Label>
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
                onChange={(e) => {
                  // Banking-grade: Preserve exact user input - NO auto-formatting
                  let inputValue = e.target.value;
                  
                  // Allow empty string, numbers, and single decimal point only
                  // Remove any currency symbols or spaces that user might type
                  inputValue = inputValue.replace(/[^\d.]/g, '');
                  
                  // Ensure only one decimal point
                  const parts = inputValue.split('.');
                  if (parts.length > 2) {
                    inputValue = parts[0] + '.' + parts.slice(1).join('');
                  }
                  
                  // Limit to 2 decimal places (preserve user intent)
                  if (parts.length === 2 && parts[1].length > 2) {
                    inputValue = parts[0] + '.' + parts[1].substring(0, 2);
                  }
                  
                  // Set exact value - no automatic modification
                  setPaymentAmount(inputValue);
                }}
                type="text"
                inputMode="decimal"
                onKeyDown={(e) => {
                  // Prevent browser auto-formatting quirks
                  if (['e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onWheel={(e) => {
                  // Prevent scroll-to-change number input values
                  e.currentTarget.blur();
                }}
                onBlur={(e) => {
                  // Optional: Format on blur only (not during typing)
                  const value = e.target.value.trim();
                  if (value) {
                    const num = parseFloat(value);
                    if (!isNaN(num) && num > 0 && value.includes('.')) {
                      setPaymentAmount(num.toFixed(2));
                    }
                  }
                }}
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
              <Button onClick={handlePayNow} disabled={!newBeneficiary.name || !(selectedAccountType === 'mymoolah' ? newBeneficiary.identifier : newBeneficiary.msisdn) || !paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessing} className="flex-1 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white">
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
        <DialogContent className="max-w-sm mx-auto" aria-describedby="add-contacts-prompt-description">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Add to Contacts?
            </DialogTitle>
            <div id="add-contacts-prompt-description" className="sr-only">
              Save recipient for future quick access
            </div>
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

      {/* Payment Confirmation Modal */}
      <ConfirmationModal
        isOpen={showPaymentConfirmationModal}
        onClose={() => setShowPaymentConfirmationModal(false)}
        onConfirm={() => {
          if (beneficiaryForPayment) {
            setSelectedBeneficiary(beneficiaryForPayment);
            setShowPaymentModal(true);
          }
          setShowPaymentConfirmationModal(false);
        }}
        title="Beneficiary Added Successfully!"
        message="Would you like to make a payment now to"
        confirmText="Yes, make payment"
        cancelText="Not now"
        type="info"
        beneficiaryName={beneficiaryForPayment?.name}
      />

      {/* Edit Beneficiary Modal */}
      <Dialog open={showEditBeneficiaryModal} onOpenChange={setShowEditBeneficiaryModal}>
        <DialogContent className="max-w-sm mx-auto" aria-describedby="edit-beneficiary-description">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Edit Beneficiary
            </DialogTitle>
            <div id="edit-beneficiary-description" className="sr-only">
              Edit beneficiary information
            </div>
          </DialogHeader>
          
          {editingBeneficiary && (
            <div className="space-y-4">
              {/* Beneficiary Name */}
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Beneficiary Name</Label>
                <Input
                  placeholder="Enter beneficiary name"
                  value={editingBeneficiary.name}
                  onChange={(e) => setEditingBeneficiary(prev => prev ? { ...prev, name: e.target.value } : null)}
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    height: 'var(--mobile-touch-target)'
                  }}
                />
              </div>

              {/* Mobile Number (MSISDN) - Required for MyMoolah, optional for Bank */}
              {editingBeneficiary.accountType !== 'bank' && (
              <div>
                  <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Mobile Number <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g., 078 123 4567"
                  value={editingBeneficiary.msisdn || ''}
                  onChange={(e) => setEditingBeneficiary(prev => prev ? { ...prev, msisdn: e.target.value } : null)}
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    height: 'var(--mobile-touch-target)'
                  }}
                  className="font-mono"
                />
                <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  This number uniquely identifies the beneficiary
                </p>
              </div>
              )}

              {/* Account Type */}
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Account Type</Label>
                <Select 
                  value={editingBeneficiary.accountType} 
                  onValueChange={(value: 'mymoolah' | 'bank') => 
                    setEditingBeneficiary(prev => prev ? { ...prev, accountType: value } : null)
                  }
                >
                  <SelectTrigger style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    height: 'var(--mobile-touch-target)'
                  }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mymoolah">MyMoolah</SelectItem>
                    <SelectItem value="bank">Bank Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bank Name (only for bank accounts) */}
              {editingBeneficiary.accountType === 'bank' && (
                <>
                <div>
                  <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Bank Name</Label>
                  <Select 
                    value={editingBeneficiary.bankName || ''} 
                    onValueChange={(value) => 
                      setEditingBeneficiary(prev => prev ? { ...prev, bankName: value } : null)
                    }
                  >
                    <SelectTrigger style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      height: 'var(--mobile-touch-target)'
                    }}>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {SA_BANKS.map(bank => (
                        <SelectItem key={bank.code} value={bank.name}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  
                  {/* Account Number (only for bank accounts) */}
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>Account Number <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g., 1234567890"
                      value={editingBeneficiary.identifier || ''}
                      onChange={(e) => {
                        // Only allow digits
                        const value = e.target.value.replace(/\D/g, '');
                        setEditingBeneficiary(prev => prev ? { ...prev, identifier: value } : null);
                      }}
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        height: 'var(--mobile-touch-target)'
                      }}
                      className="font-mono"
                    />
                    <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Enter the bank account number (8-12 digits)
                    </p>
                  </div>
                  
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditBeneficiaryModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (!editingBeneficiary) return;
                    
                    // Validate required fields
                    if (!editingBeneficiary.name?.trim()) {
                      showError('Validation Error', 'Beneficiary name is required', 'warning');
                      return;
                    }
                    
                    // MSISDN required for MyMoolah, optional for Bank
                    if (editingBeneficiary.accountType !== 'bank' && !editingBeneficiary.msisdn?.trim()) {
                      showError('Validation Error', 'Mobile number is required for MyMoolah accounts', 'warning');
                      return;
                    }
                    
                    if (editingBeneficiary.accountType === 'bank') {
                      if (!editingBeneficiary.bankName?.trim()) {
                        showError('Validation Error', 'Bank name is required for bank accounts', 'warning');
                        return;
                      }
                      if (!editingBeneficiary.identifier?.trim()) {
                        showError('Validation Error', 'Account number is required for bank accounts', 'warning');
                        return;
                      }
                      if (!/^[0-9]{8,12}$/.test(editingBeneficiary.identifier)) {
                        showError('Validation Error', 'Account number must be 8-12 digits', 'warning');
                        return;
                      }
                    }
                    
                    try {
                      // Update beneficiary via backend API
                      const updated = await beneficiaryService.createPaymentBeneficiary({
                        name: editingBeneficiary.name.trim(),
                        msisdn: editingBeneficiary.accountType === 'bank' ? undefined : editingBeneficiary.msisdn.trim(),
                        accountType: editingBeneficiary.accountType,
                        bankName: editingBeneficiary.accountType === 'bank' ? editingBeneficiary.bankName?.trim() : undefined,
                        accountNumber: editingBeneficiary.accountType === 'bank' ? editingBeneficiary.identifier.trim() : undefined
                      });
                      
                      // Update local state
                      setBeneficiaries(prev => 
                        prev.map(b => 
                          b.id === editingBeneficiary.id ? updated : b
                        )
                      );
                      
                    setShowEditBeneficiaryModal(false);
                    setEditingBeneficiary(null);
                      showError('Success', 'Beneficiary updated successfully', 'info');
                    } catch (error: any) {
                      logError('SendMoneyPage', 'Failed to update beneficiary', error as Error);
                      showError('Error', error?.message || 'Failed to update beneficiary. Please try again.', 'error');
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Beneficiary Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveConfirmationModal}
        onClose={() => setShowRemoveConfirmationModal(false)}
        onConfirm={handleConfirmRemoveBeneficiary}
        title="Remove Beneficiary"
        message="Are you sure you want to remove"
        confirmText="Yes, remove"
        cancelText="Cancel"
        type="danger"
        beneficiaryName={beneficiaryToRemove?.name}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal && errorModalData.message.length > 0}
        onClose={() => setShowErrorModal(false)}
        title={errorModalData.title}
        message={errorModalData.message}
        type={errorModalData.type}
      />
    </div>
  );
}
