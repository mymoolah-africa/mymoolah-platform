import { useState, useEffect, useMemo, useRef } from 'react';
import { getToken as getSessionToken } from '../utils/authToken';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/app-config';

// Import icons directly from lucide-react
import { 
  Ticket,
  Plus,
  Minus,
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  History,
  Receipt,
  CreditCard,
  Smartphone,
  ShoppingBag,
  DollarSign,
  RefreshCw,
  Download,
  MoreHorizontal,
  Wallet,
  Building2,
  Users,
  Zap,
  Image,
  X
} from 'lucide-react';

// Import logo from assets/
import logo3 from "../assets/logo3.svg";

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';

// MMVoucher interfaces following Mojaloop standards
interface MMVoucher {
  id: string;
  type: 'mm_voucher' | 'easypay_voucher' | 'third_party_voucher';
  status: 'active' | 'pending_payment' | 'redeemed' | 'expired' | 'cancelled';
  amount: number;
  originalAmount: number; // Add this field
  currency: 'ZAR';
  voucherCode: string;
  easyPayNumber?: string; // For EasyPay vouchers
  qrCode?: string;
  createdDate: string;
  expiryDate: string;
  redeemedDate?: string;
  merchantName?: string;
  merchantId?: string;
  description: string;
  transactionId: string;
  linkedVoucherId?: string; // For EasyPay → MM voucher linking
  redemptionLocations: string[];
  remainingValue: number;
  isPartialRedemption: boolean;
  metadata?: {
    description?: string;
    merchant?: string;
  };
  redeemedAt?: {
    type?: string;
    userId?: string | number;
    walletId?: string | number;
    name?: string;
    phoneNumber?: string;
    timestamp?: string;
  } | null;
}

interface VoucherTransaction {
  id: string;
  voucherId: string;
  type: 'generate' | 'purchase' | 'redeem' | 'partial_redeem' | 'expire' | 'cancel';
  amount: number;
  currency: 'ZAR';
  timestamp: string;
  description: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
  merchantName?: string;
  easyPayNumber?: string;
  voucherType: 'mm_voucher' | 'easypay_voucher' | 'third_party_voucher';
}

interface FilterOptions {
  type: 'all' | 'mm_voucher' | 'easypay_voucher' | 'third_party_voucher';
  status: 'all' | 'active' | 'pending_payment' | 'redeemed' | 'expired' | 'cancelled';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}

// FIXED: Named export to match App.tsx import
export function VouchersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState<'vouchers' | 'sell' | 'redeem' | 'history'>('vouchers');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<MMVoucher | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    status: 'all',
    dateRange: 'all'
  });

  // Create voucher state
  const [sellVoucherType, setSellVoucherType] = useState<'mm_voucher' | 'easypay_voucher' | 'third_party_voucher'>('mm_voucher');
  const [sellAmount, setSellAmount] = useState('');
  const [sellDescription, setSellDescription] = useState('');
  const [sellMerchant, setSellMerchant] = useState('');

  // Redeem voucher state
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    title: string;
    message: string;
    voucherCode?: string;
    amount?: string;
    walletBalance?: string;
    type: 'easypay' | 'mm_voucher' | 'third_party';
  } | null>(null);

  // Cancel confirmation modal state
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [voucherToCancel, setVoucherToCancel] = useState<MMVoucher | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Validation error modal state
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState<string>('');

  // Voucher formatting functions
  const generateMMVoucherCode = (): string => {
    // Generate 16 numerical digits grouped in 4 groups of 4 with spaces
    const digits = Math.random().toString().substring(2, 18);
    const paddedDigits = digits.padEnd(16, '0');
    return `${paddedDigits.substring(0, 4)} ${paddedDigits.substring(4, 8)} ${paddedDigits.substring(8, 12)} ${paddedDigits.substring(12, 16)}`;
  };

  // Get proper display name for voucher type
  const getVoucherTypeDisplayName = (voucherType: string): string => {
    switch (voucherType) {
      case 'premium':
        return 'MMVoucher';
      case 'business':
        return 'EasyPay';
      case 'standard':
        return 'Standard Voucher';
      case 'student':
        return 'Student Voucher';
      case 'senior':
        return 'Senior Voucher';
      case 'corporate':
        return 'Corporate Voucher';
      default:
        return 'Voucher';
    }
  };

  // Format voucher code for display based on type
  const formatVoucherCodeForDisplay = (voucher: MMVoucher): { mainCode: string; subCode?: string } => {
    if (voucher.type === 'mm_voucher') {
      // For MMVouchers, format as 16 digits in groups of 4
      const numericCode = voucher.voucherCode.replace(/\D/g, ''); // Remove non-digits
      const paddedCode = numericCode.padEnd(16, '0').substring(0, 16);
      return {
        mainCode: `${paddedCode.substring(0, 4)} ${paddedCode.substring(4, 8)} ${paddedCode.substring(8, 12)} ${paddedCode.substring(12, 16)}`
      };
    } else if (voucher.type === 'easypay_voucher') {
      // For EasyPay vouchers, check status
      if (voucher.status === 'pending_payment') {
        // Pending EasyPay voucher - show only EasyPay number
        if (voucher.easyPayNumber) {
          const epNumber = voucher.easyPayNumber;
          return {
            mainCode: `${epNumber.substring(0, 1)} ${epNumber.substring(1, 5)} ${epNumber.substring(5, 9)} ${epNumber.substring(9, 13)} ${epNumber.substring(13, 14)}`
          };
        }
        return { mainCode: voucher.voucherCode };
      } else if (voucher.status === 'active' || voucher.status === 'redeemed') {
        // Active or Redeemed EasyPay voucher - show MMVoucher code as main, EasyPay as sub
        if (voucher.voucherCode && voucher.voucherCode.length >= 16) {
          // Has MMVoucher code - show it as main
          const numericCode = voucher.voucherCode.replace(/\D/g, '');
          const paddedCode = numericCode.padEnd(16, '0').substring(0, 16);
          const mmCode = `${paddedCode.substring(0, 4)} ${paddedCode.substring(4, 8)} ${paddedCode.substring(8, 12)} ${paddedCode.substring(12, 16)}`;
          
          // Show EasyPay number as subcode if available
          if (voucher.easyPayNumber) {
            const epNumber = voucher.easyPayNumber;
            const epCode = `${epNumber.substring(0, 1)} ${epNumber.substring(1, 5)} ${epNumber.substring(5, 9)} ${epNumber.substring(9, 13)} ${epNumber.substring(13, 14)}`;
            return {
              mainCode: mmCode,
              subCode: epCode
            };
          }
          
          return { mainCode: mmCode };
        }
      } else if (voucher.status === 'cancelled') {
        // Cancelled EasyPay voucher - show only EasyPay number (formatted)
        if (voucher.easyPayNumber) {
          const epNumber = voucher.easyPayNumber;
          return {
            mainCode: `${epNumber.substring(0, 1)} ${epNumber.substring(1, 5)} ${epNumber.substring(5, 9)} ${epNumber.substring(9, 13)} ${epNumber.substring(13, 14)}`
          };
        }
        return { mainCode: voucher.voucherCode };
      }
      
      // Fallback - show original code
      return { mainCode: voucher.voucherCode };
    } else {
      // For other vouchers, show the original code
      return { mainCode: voucher.voucherCode };
    }
  };

  const generateEasyPayNumber = (): string => {
    // Generate 14 numerical digits starting with "9" (no grouping)
    const randomDigits = Math.random().toString().substring(2, 15);
    const paddedDigits = randomDigits.padEnd(13, '0');
    return `9${paddedDigits}`;
  };

  // Real voucher data from API
  const [mmVouchers, setMMVouchers] = useState<MMVoucher[]>([]);
  const [voucherTransactions, setVoucherTransactions] = useState<VoucherTransaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<string>('R0.00');
  
  // Auto-refresh timer for pending EasyPay vouchers
  const autoRefreshRef = useRef<number | null>(null);

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    try {
      const token = getSessionToken();
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
      console.error('Failed to fetch wallet balance:', error);
    }
  };

  // Fetch vouchers from backend
  const fetchVouchers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getSessionToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all vouchers (including pending, active, redeemed)
      let vouchersResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/`, { headers });
      let vouchersData;
      
      if (!vouchersResponse.ok) {
        const errorData = await vouchersResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch vouchers: ${vouchersResponse.status}`);
      }
      
      vouchersData = await vouchersResponse.json();

      // Validate response structure
      if (!vouchersData.success) {
        throw new Error(vouchersData.message || 'Invalid response from vouchers API');
      }

      // Transform backend data to frontend format
      const vouchersArray = vouchersData.data?.vouchers || vouchersData.data || [];
      
      // Transform regular vouchers (including EasyPay vouchers from main table)
      const transformedVouchers: MMVoucher[] = vouchersArray.map((voucher: any) => {
        // Determine voucher type based on new structure
        let voucherType: 'mm_voucher' | 'easypay_voucher' | 'third_party_voucher';
        
        if (voucher.voucherType === 'easypay_pending' || voucher.voucherType === 'easypay_active') {
          voucherType = 'easypay_voucher';
        } else {
          voucherType = 'mm_voucher';
        }

        // Determine status
        let status: 'active' | 'pending_payment' | 'redeemed' | 'expired' | 'cancelled';
        if (voucher.status === 'pending' || voucher.status === 'pending_payment') {
          status = 'pending_payment';
        } else if (voucher.status === 'expired') {
          status = 'expired';
        } else if (voucher.status === 'cancelled') {
          status = 'cancelled';
        } else if (voucher.status === 'redeemed') {
          // Check if it's fully redeemed (balance = 0) or partially redeemed
          const balance = parseFloat(voucher.balance || 0);
          if (balance === 0) {
            status = 'redeemed'; // Fully redeemed
          } else {
            status = 'active'; // Partially redeemed - still active
          }
        } else {
          status = 'active';
        }

        const createdTs = new Date(voucher.createdAt || new Date().toISOString()).getTime();
        const computedExpiry = (status === 'pending_payment' && voucherType === 'easypay_voucher')
          ? new Date(createdTs + 96 * 60 * 60 * 1000).toISOString()
          : new Date(createdTs + 365 * 24 * 60 * 60 * 1000).toISOString();

        // Compute remaining value per business rules:
        // - EasyPay pending: remaining = originalAmount
        // - EasyPay active: remaining = originalAmount if DB balance is 0/undefined (no wallet-side balance tracked)
        // - Otherwise use balance (for standard MM vouchers)
        const dbBalance = parseFloat(voucher.balance || 0);
        const computedRemainingValue = (voucherType === 'easypay_voucher')
          ? (status === 'pending_payment'
              ? parseFloat(voucher.originalAmount || 0)
              : (status === 'active'
                  ? (dbBalance === 0 ? parseFloat(voucher.originalAmount || 0) : dbBalance)
                  : dbBalance))
          : dbBalance;

        return {
          id: voucher.id.toString(),
          type: voucherType,
          status: status,
          amount: parseFloat(voucher.originalAmount || 0),
          originalAmount: parseFloat(voucher.originalAmount || 0), // Add this field
          currency: 'ZAR',
          voucherCode: voucher.voucherCode || `VOUCHER-${voucher.id}`,
          easyPayNumber: voucher.easyPayCode, // Direct field in new structure
          createdDate: voucher.createdAt || new Date().toISOString(),
          expiryDate: voucher.expiresAt || computedExpiry,
          // expose expiresAt for export logic
          expiresAt: voucher.expiresAt || undefined,
          description: voucher.metadata?.description || (voucherType === 'easypay_voucher' ? 'EasyPay voucher' : 'MMVoucher'),
          transactionId: `VOUCHER-${voucher.id}`,
          redemptionLocations: voucherType === 'easypay_voucher' ? ['EasyPay Network', 'MyMoolah Network'] : ['MyMoolah Network'],
          remainingValue: computedRemainingValue,
          isPartialRedemption: parseFloat(voucher.balance || 0) > 0 && parseFloat(voucher.balance || 0) < parseFloat(voucher.originalAmount || 0)
        };
      });

      // All vouchers come from the main table (no need to combine separate arrays)
      const allVouchers = transformedVouchers;
      
      // Sort vouchers by creation date (newest first)
      const sortedVouchers = allVouchers.sort((a, b) => {
        const dateA = new Date(a.createdDate).getTime();
        const dateB = new Date(b.createdDate).getTime();
        return dateB - dateA; // Newest first
      });

      setMMVouchers(sortedVouchers);
      setError(null);

    } catch (error) {
      console.error('❌ Error fetching vouchers:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch vouchers');
      setMMVouchers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
    fetchWalletBalance();
  }, []);

  // If there are any pending EasyPay vouchers, auto-refresh every 5 seconds
  const hasPendingEasyPay = useMemo(
    () => mmVouchers.some(v => v.type === 'easypay_voucher' && v.status === 'pending_payment'),
    [mmVouchers]
  );

  useEffect(() => {
    // Clear any existing timer first
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    if (hasPendingEasyPay) {
      autoRefreshRef.current = window.setInterval(() => {
        fetchVouchers();
      }, 5000); // refresh within 5 seconds
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [hasPendingEasyPay]);

  // Filter vouchers based on search and filters
  const filteredVouchers = mmVouchers.filter(voucher => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const formattedCode = formatVoucherCodeForDisplay(voucher);
      const matchesSearch = 
        formattedCode.mainCode.toLowerCase().includes(searchLower) ||
        (formattedCode.subCode && formattedCode.subCode.toLowerCase().includes(searchLower)) ||
        voucher.easyPayNumber?.includes(searchLower) ||
        voucher.merchantName?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filters.type !== 'all' && voucher.type !== filters.type) return false;

    // Status filter
    if (filters.status !== 'all' && voucher.status !== filters.status) return false;

    // Date filter
    if (filters.dateRange !== 'all') {
      const voucherDate = new Date(voucher.createdDate);
      const now = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          if (voucherDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (voucherDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (voucherDate < monthAgo) return false;
          break;
        case 'custom':
          if (filters.startDate && voucherDate < new Date(filters.startDate)) return false;
          if (filters.endDate && voucherDate > new Date(filters.endDate)) return false;
          break;
      }
    }

    return true;
  });

  // Dashboard vouchers: 10 newest Active and Pending vouchers
  const dashboardVouchers = mmVouchers
    .filter(voucher => voucher.status === 'active' || voucher.status === 'pending_payment')
    .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
    .slice(0, 10);

  // Generate new voucher
  const handleGenerateVoucher = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      setValidationErrorMessage('Please enter a valid amount');
      setShowValidationErrorModal(true);
      return;
    }

    const amount = parseFloat(sellAmount);
    
    // Validate amount based on voucher type
    if (sellVoucherType === 'easypay_voucher') {
      if (amount < 50 || amount > 4000) {
        setValidationErrorMessage('EasyPay vouchers must be between R 50 and R 4000');
        setShowValidationErrorModal(true);
        return;
      }
    } else {
      if (amount < 5 || amount > 4000) {
        setValidationErrorMessage('Voucher amount must be between R 5 and R 4000');
        setShowValidationErrorModal(true);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Determine API endpoint based on voucher type
      const apiEndpoint = sellVoucherType === 'easypay_voucher' 
        ? `${APP_CONFIG.API.baseUrl}/api/v1/vouchers/easypay/issue`
        : `${APP_CONFIG.API.baseUrl}/api/v1/vouchers/issue`;

      // Call backend API to issue voucher
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSessionToken()}`
        },
        body: JSON.stringify({
          original_amount: amount,
          voucher_type: sellVoucherType,
          description: sellDescription,
          merchant: sellMerchant,
          issued_to: sellVoucherType === 'easypay_voucher' ? 'customer' : undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate voucher');
      }

      // Show success modal
      if (sellVoucherType === 'easypay_voucher') {
        setSuccessModalData({
          title: 'EasyPay Voucher Generated!',
          message: 'Take this number to any of 8000+ EasyPay retail stores to pay. Once paid, your MyMoolah voucher will be activated automatically.',
          voucherCode: result.data.easypay_code,
          amount: `R ${amount}`,
          type: 'easypay'
        });
      } else {
        setSuccessModalData({
          title: `${sellVoucherType === 'mm_voucher' ? 'MyMoolah' : 'Third Party'} Voucher Generated!`,
          message: 'Voucher is ready for use and redemption.',
          voucherCode: result.data.voucher_code,
          amount: `R ${amount}`,
          walletBalance: `R ${result.data.wallet_balance}`,
          type: sellVoucherType === 'mm_voucher' ? 'mm_voucher' : 'third_party'
        });
      }
      setShowSuccessModal(true);

      // Clear form
      setSellAmount('');
      setSellDescription('');
      setSellMerchant('');
      
      // Refresh vouchers list
      await fetchVouchers();
      
      // Switch to vouchers tab to see the new voucher
      setActiveTab('vouchers');

    } catch (error) {
      console.error('Voucher generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate voucher. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Redeem voucher
  const handleRedeemVoucher = async () => {
    if (!redeemCode.trim()) {
      setError('Please enter a voucher code');
      return;
    }

    setIsLoading(true);

    try {
      const redeemAmountNum = redeemAmount ? parseFloat(redeemAmount) : 0;

      if (redeemAmountNum < 0) {
        setError('Invalid redemption amount');
        setIsLoading(false);
        return;
      }

      // Call backend API to redeem voucher
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSessionToken()}`
        },
        body: JSON.stringify({
          voucher_code: cleanVoucherCode(redeemCode.trim()),
          amount: redeemAmountNum || null, // Send null if no amount specified (full redemption)
          redeemer_id: localStorage.getItem('userId'),
          merchant_id: 'MM_MERCHANT',
          service_provider_id: 'MM_SYSTEM'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to redeem voucher');
      }

      // Show success modal
      setSuccessModalData({
        title: 'Voucher Redeemed Successfully!',
        message: 'Funds have been added to your MyMoolah wallet.',
        amount: `R ${result.data.redeemed_amount}`,
        walletBalance: `R ${result.data.wallet_balance}`,
        type: 'mm_voucher'
      });
      setShowSuccessModal(true);

      // Clear form
      setRedeemCode('');
      setRedeemAmount('');

      // Refresh vouchers list
      await fetchVouchers();

    } catch (error) {
      console.error('Voucher redemption error:', error);
      setError(error instanceof Error ? error.message : 'Failed to redeem voucher. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate EasyPay payment
  

  // Clean voucher code by removing spaces and non-digits
  const cleanVoucherCode = (code: string): string => {
    return code.replace(/\s/g, '').replace(/\D/g, '');
  };

  // Copy voucher code to clipboard
  const handleCopyCode = async (voucher: MMVoucher) => {
    try {
      const formattedCode = formatVoucherCodeForDisplay(voucher);
      const codeToCopy = formattedCode.mainCode;
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codeToCopy);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = codeToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // Set success state
      setCopiedCode(voucher.voucherCode);
      setTimeout(() => setCopiedCode(null), 2000);
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #16a34a;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      toast.textContent = 'Voucher code copied!';
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to copy voucher code:', error);
      // Show error feedback to user
      alert('Failed to copy voucher code. Please try again.');
    }
  };

  // Handle copying EasyPay numbers specifically
  const handleCopyEasyPayNumber = async (easyPayNumber: string) => {
    try {
      const formattedNumber = easyPayNumber.slice(0, 1) + ' ' + 
                             easyPayNumber.slice(1, 5) + ' ' + 
                             easyPayNumber.slice(5, 9) + ' ' + 
                             easyPayNumber.slice(9, 13) + ' ' + 
                             easyPayNumber.slice(13);
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(formattedNumber);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = formattedNumber;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // Set success state
      setCopiedCode(formattedNumber);
      setTimeout(() => setCopiedCode(''), 2000);
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #16a34a;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      toast.textContent = 'EasyPay number copied!';
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to copy EasyPay number:', error);
      // Show error feedback to user
      alert('Failed to copy EasyPay number. Please try again.');
    }
  };

  // Get voucher type badge
  const getVoucherTypeBadge = (type: MMVoucher['type']) => {
    switch (type) {
      case 'mm_voucher':
        return { text: 'MMVoucher', color: 'bg-[#86BE41] text-white' };
      case 'easypay_voucher':
        return { text: 'EasyPay', color: 'bg-[#2D8CCA] text-white' };
      case 'third_party_voucher':
        return { text: '3rd Party', color: 'bg-orange-500 text-white' };
      default:
        return { text: 'MMVoucher', color: 'bg-[#86BE41] text-white' };
    }
  };

  // Get voucher status badge
  const getVoucherStatusBadge = (status: MMVoucher['status']) => {
    switch (status) {
      case 'active':
        return { text: 'Active', color: 'bg-green-100 text-green-700' };
      case 'pending_payment':
        return { text: 'Pending', color: 'bg-orange-100 text-orange-700' };
      case 'redeemed':
        return { text: 'Redeemed', color: 'bg-blue-100 text-blue-700' };
      case 'expired':
        return { text: 'Expired', color: 'bg-red-100 text-red-700' };
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-700' };
      default:
        return { text: 'Active', color: 'bg-green-100 text-green-700' };
    }
  };

  // Format currency
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

  // Special formatting for Total Value card (no space between R and amount)
  const formatCurrencyCompact = (amount: number) => {
    if (!amount && amount !== 0) {
      return 'R0.00';
    }
    
    const formattedAmount = amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // For negative amounts, show R-amount (negative sign after R)
    if (amount < 0) {
      return `R-${Math.abs(amount).toLocaleString('en-ZA', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    
    return `R${formattedAmount}`;
  };

  // Format date with time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if voucher is expired
  const isVoucherExpired = (voucher: MMVoucher): boolean => {
    if (!voucher.expiryDate) return false;
    return new Date(voucher.expiryDate) < new Date();
  };

  // Handle opening cancel confirmation modal
  const handleCancelEasyPayVoucher = (voucher: MMVoucher) => {
    // Check if voucher is expired before showing modal
    if (isVoucherExpired(voucher)) {
      // Show error message for expired vouchers
      const errorToast = document.createElement('div');
      errorToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc2626;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      errorToast.textContent = 'Cannot cancel expired voucher. It will be automatically refunded.';
      document.body.appendChild(errorToast);
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 4000);
      return;
    }
    
    setVoucherToCancel(voucher);
    setShowCancelConfirmModal(true);
  };

  // Handle confirming cancellation
  const handleConfirmCancel = async () => {
    if (!voucherToCancel) return;

    try {
      setIsCancelling(true);

      // Show loading state
      const loadingToast = document.createElement('div');
      loadingToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f59e0b;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      loadingToast.textContent = 'Cancelling voucher...';
      document.body.appendChild(loadingToast);

      // Make API call
      const token = getSessionToken();
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/${voucherToCancel.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Remove loading toast
      document.body.removeChild(loadingToast);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel voucher');
      }

      const result = await response.json();

      // Show success toast
      const successToast = document.createElement('div');
      successToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #16a34a;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      successToast.textContent = `Voucher cancelled! R ${result.data.refundAmount} refunded to wallet`;
      document.body.appendChild(successToast);
      setTimeout(() => {
        document.body.removeChild(successToast);
      }, 3000);

      // Refresh vouchers list
      await fetchVouchers();

      // Close modal
      setShowCancelConfirmModal(false);
      setVoucherToCancel(null);

    } catch (error) {
      console.error('Error cancelling voucher:', error);
      
      // Show error toast
      const errorToast = document.createElement('div');
      errorToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc2626;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      errorToast.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      document.body.appendChild(errorToast);
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 3000);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="mobile-container">
      {/* Top Navigation Bar */}
      <div 
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          zIndex: 10
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
            padding: '0 16px'
          }}
        >
          {/* Left: Back Button */}
          <button 
            onClick={() => navigate('/dashboard')}
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
              fontFamily: 'Montserrat, sans-serif'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Back to Dashboard"
          >
            <ArrowLeft style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>

          {/* Center: Page Title */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}
            >
              MMVouchers
            </h1>
          </div>

          {/* Right: Wallet Balance Badge */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
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
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Error Alert */}
        {error && (
          <Alert 
            style={{
              marginBottom: '16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px'
            }}
          >
            <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626', marginRight: '8px' }} />
            <AlertDescription 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#dc2626',
                margin: 0
              }}
            >
              {error}
            </AlertDescription>
            <button
              onClick={() => setError(null)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X style={{ width: '16px', height: '16px', color: '#dc2626' }} />
            </button>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'vouchers' | 'sell' | 'redeem' | 'history')}>
          <TabsList 
            style={{
              width: '100%',
              backgroundColor: '#f8fafc',
              padding: '4px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px'
            }}
          >
            <TabsTrigger 
              value="vouchers"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '8px',
                height: '36px',
                padding: '0 8px',
                backgroundColor: 'transparent',
                color: activeTab === 'vouchers' ? '#86BE41' : '#374151',
                border: '1px solid transparent'
              }}
            >
              Vouchers
            </TabsTrigger>
            <TabsTrigger 
              value="sell"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '8px',
                height: '36px',
                padding: '0 8px',
                backgroundColor: 'transparent',
                color: activeTab === 'sell' ? '#86BE41' : '#374151',
                border: '1px solid transparent'
              }}
            >
              Create
            </TabsTrigger>
            <TabsTrigger 
              value="redeem"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '8px',
                height: '36px',
                padding: '0 8px',
                backgroundColor: 'transparent',
                color: activeTab === 'redeem' ? '#86BE41' : '#374151',
                border: '1px solid transparent'
              }}
            >
              Redeem
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '8px',
                height: '36px',
                padding: '0 8px',
                backgroundColor: 'transparent',
                color: activeTab === 'history' ? '#86BE41' : '#374151',
                border: '1px solid transparent'
              }}
            >
              History
            </TabsTrigger>
          </TabsList>

          {/* Vouchers Tab - Open MMVouchers List */}
          <TabsContent value="vouchers">
            {/* Vouchers Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <Card style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <Wallet style={{ width: '20px', height: '20px', color: '#86BE41' }} />
                </div>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>
                  Active
                </p>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                  {mmVouchers.filter(v => v.status === 'active').length}
                </p>
              </Card>
              <Card style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <Clock style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                </div>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>
                  Pending
                </p>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                  {mmVouchers.filter(v => v.status === 'pending_payment').length}
                </p>
              </Card>
              <Card style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <DollarSign style={{ width: '20px', height: '20px', color: '#16a34a' }} />
                </div>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>
                  Total Value
                </p>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                  {formatCurrencyCompact(
                    mmVouchers.filter(v => v.status === 'active').reduce((sum, v) => sum + v.remainingValue, 0) +
                    mmVouchers.filter(v => v.status === 'pending_payment').reduce((sum, v) => sum + v.amount, 0)
                  )}
                </p>
              </Card>
            </div>

            {/* Sleek Vouchers List */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {(activeTab === 'vouchers' ? dashboardVouchers : filteredVouchers).length === 0 ? (
                <Card style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                  <CardContent style={{ padding: 'var(--mobile-padding)' }}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto'
                      }}>
                        <Ticket style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
                      </div>
                      <h4 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px'
                        }}
                      >
                        {activeTab === 'vouchers' ? 'No active vouchers' : 'No vouchers found'}
                      </h4>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '14px',
                          color: '#9ca3af',
                          margin: 0
                        }}
                      >
                        {activeTab === 'vouchers' 
                          ? 'Create your first voucher to get started' 
                          : 'Try adjusting your search or filters'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                (activeTab === 'vouchers' ? dashboardVouchers : filteredVouchers).map((voucher) => {
                  const typeBadge = getVoucherTypeBadge(voucher.type);
                  const statusBadge = getVoucherStatusBadge(voucher.status);
                  
                  return (
                    <div
                      key={voucher.id}
                      style={{
                        width: '100%',
                        minWidth: '100%',
                        maxWidth: 'none',
                        margin: '0',
                        padding: '0',
                        boxSizing: 'border-box',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#86BE41';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(134, 190, 65, 0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      }}
                      onClick={() => setSelectedVoucher(voucher)}
                    >
                      <div style={{ padding: '20px', width: '100%', boxSizing: 'border-box' }}>
                        {/* Header with Logo and Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Logo */}
                            <div 
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                backgroundColor: '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden'
                              }}
                            >
                                                             <img 
                                 src={voucher.type === 'mm_voucher' ? logo3 : 
                                      voucher.type === 'easypay_voucher' ? logo3 : 
                                      logo3}
                                 alt={voucher.type === 'mm_voucher' ? 'MMVoucher Logo' : 
                                      voucher.type === 'easypay_voucher' ? 'EasyPay Logo' : 
                                      'Voucher Logo'}
                                style={{ 
                                  width: '24px', 
                                  height: '24px',
                                  objectFit: 'contain'
                                }}
                                onError={(e) => {
                                  // Fallback to a simple icon if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                                  if (sibling) sibling.style.display = 'flex';
                                }}
                              />
                              <div 
                                style={{
                                  display: 'none',
                                  width: '24px',
                                  height: '24px',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                                                   backgroundColor: voucher.type === 'mm_voucher' ? '#86BE41' : 
                                                voucher.type === 'easypay_voucher' ? '#86BE41' : '#9ca3af',
                                 borderRadius: '6px',
                                 color: 'white',
                                 fontSize: '12px',
                                 fontWeight: 'bold'
                               }}
                             >
                               {voucher.type === 'mm_voucher' ? 'MM' : 
                                voucher.type === 'easypay_voucher' ? 'MM' : 'V'}
                              </div>
                            </div>
                            
                            {/* Type and Status Badges */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <Badge 
                                className={typeBadge.color}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontFamily: 'Montserrat, sans-serif'
                                }}
                              >
                                {typeBadge.text}
                              </Badge>
                              <Badge 
                                className={statusBadge.color}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontFamily: 'Montserrat, sans-serif'
                                }}
                              >
                                {statusBadge.text}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Amount */}
                          <div style={{ textAlign: 'right' }}>
                            <p 
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: voucher.remainingValue > 0 ? '#16a34a' : '#9ca3af',
                                margin: 0,
                                lineHeight: 1
                              }}
                            >
                              {formatCurrency(voucher.remainingValue)}
                            </p>
                            {voucher.isPartialRedemption && (
                              <p 
                                style={{
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: '11px',
                                  color: '#9ca3af',
                                  margin: '2px 0 0 0',
                                  lineHeight: 1
                                }}
                              >
                                of {formatCurrency(voucher.amount)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Voucher Code - Dual Display for EasyPay */}
                        <div style={{ marginBottom: '12px' }}>
                          {(() => {
                            const formattedCode = formatVoucherCodeForDisplay(voucher);
                            return (
                              <>
                                <p 
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '16px', // Always use 16px for main code (MM PIN)
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    margin: 0,
                                    letterSpacing: '0.5px',
                                    lineHeight: 1.2
                                  }}
                                >
                                  {formattedCode.mainCode}
                                </p>
                                
                                {/* Sub-code for paid EasyPay vouchers */}
                                {formattedCode.subCode && (
                                  <p 
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      color: '#2D8CCA',
                                      margin: '2px 0 0 0',
                                      letterSpacing: '0.3px',
                                      lineHeight: 1
                                    }}
                                  >
                                    {formattedCode.subCode}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        {/* Description - Shorter and smaller */}
                        <p 
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '12px',
                            color: '#6b7280',
                            margin: '0 0 12px 0',
                            lineHeight: 1.3
                          }}
                        >
                          
                        </p>

                        {/* Bottom Info */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar style={{ width: '12px', height: '12px', color: '#9ca3af' }} />
                            <span 
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '11px',
                                color: new Date(voucher.expiryDate) < new Date() ? '#dc2626' : '#9ca3af',
                                fontWeight: '500'
                              }}
                            >
                              {formatDate(voucher.createdDate)}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCode(voucher);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: copiedCode === voucher.voucherCode ? '#16a34a' : '#9ca3af',
                                padding: '4px',
                                borderRadius: '4px',
                                transition: 'color 0.2s ease',
                                fontFamily: 'Montserrat, sans-serif'
                              }}
                              aria-label="Copy voucher code"
                            >
                              {copiedCode === voucher.voucherCode ? 
                                <Check style={{ width: '14px', height: '14px' }} /> : 
                                <Copy style={{ width: '14px', height: '14px' }} />
                              }
                            </button>
                          </div>
                        </div>

                        {/* EasyPay Pending Expiry Information with Cancel Button */}
                        {voucher.type === 'easypay_voucher' && voucher.status === 'pending_payment' && !isVoucherExpired(voucher) && (
                          <div style={{ 
                            marginTop: '8px',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'flex-start'
                          }}>
                            {/* Expiry Notice - Narrower */}
                            <div style={{ 
                              flex: 1,
                              padding: '8px 12px', 
                              backgroundColor: '#fef3c7', 
                              border: '1px solid #f59e0b', 
                              borderRadius: '6px',
                              borderLeft: '3px solid #f59e0b'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                <Clock style={{ width: '10px', height: '10px', color: '#f59e0b' }} />
                                <span 
                                  style={{
                                    fontFamily: 'Montserrat, sans-serif',
                                    fontSize: '11px',
                                    color: '#f59e0b',
                                    fontWeight: '600'
                                  }}
                                >
                                  Expires: {formatDate(voucher.expiryDate)}
                                </span>
                              </div>
                              <span 
                                style={{
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: '10px',
                                  color: '#d97706',
                                  fontWeight: '500'
                                }}
                              >
                                Make payment at any EasyPay terminal
                              </span>
                            </div>
                            
                            {/* Cancel Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEasyPayVoucher(voucher);
                              }}
                              style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontFamily: 'Montserrat, sans-serif',
                                transition: 'background-color 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                              title="Cancel voucher and get refund"
                            >
                              <X style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Create Tab - Generate Vouchers */}
          <TabsContent value="sell">
            <Card style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <CardHeader>
                <CardTitle 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Plus style={{ width: '24px', height: '24px', color: '#86BE41' }} />
                  Generate New Voucher
                </CardTitle>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}
                >
                  Create MyMoolah, EasyPay, or 3rd Party vouchers
                </p>
              </CardHeader>
              <CardContent style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Voucher Type Selection */}
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'block'
                      }}
                    >
                      Voucher Type
                    </Label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                      {[
                        { id: 'mm_voucher', name: 'MyMoolah Voucher', desc: 'Redeemable at MyMoolah network and partner retailers', icon: <Wallet style={{ width: '20px', height: '20px' }} /> },
                        { id: 'easypay_voucher', name: 'EasyPay Voucher', desc: 'Pay at 8000+ retail stores, auto-convert to MyMoolah voucher', icon: <Building2 style={{ width: '20px', height: '20px' }} /> },
                        { id: 'third_party_voucher', name: '3rd Party Voucher', desc: 'External vouchers like 1Voucher, OTT, Blu vouchers', icon: <Users style={{ width: '20px', height: '20px' }} /> }
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSellVoucherType(type.id as typeof sellVoucherType)}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: `2px solid ${sellVoucherType === type.id ? '#86BE41' : '#e2e8f0'}`,
                            backgroundColor: sellVoucherType === type.id ? '#86BE41' : '#ffffff',
                            color: sellVoucherType === type.id ? '#ffffff' : '#1f2937',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            width: '100%',
                            fontFamily: 'Montserrat, sans-serif'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ color: sellVoucherType === type.id ? '#ffffff' : '#6b7280' }}>
                              {type.icon}
                            </div>
                            <span 
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '16px',
                                fontWeight: '600'
                              }}
                            >
                              {type.name}
                            </span>
                          </div>
                          <p 
                            style={{
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '12px',
                              margin: 0,
                              opacity: 0.9
                            }}
                          >
                            {type.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'block'
                      }}
                    >
                      Amount (ZAR)
                    </Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={sellAmount}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                        // block non‑digits often allowed by number inputs
                        if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
                      }}
                      onChange={(e) => {
                        // normalize to digits only; keep as string
                        const v = e.target.value.replace(/[^0-9]/g, "");
                        setSellAmount(v);
                      }}
                      onBlur={() => {
                        if (!sellAmount) return;
                        const v = Math.min(4000, Math.max(5, Number(sellAmount)));
                        setSellAmount(String(v));
                      }}
                      style={{
                        height: "44px",
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "16px",
                        fontWeight: 600,
                        borderRadius: "12px",
                      }}
                    />
                  </div>

                  {/* Description Input */}
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'block'
                      }}
                    >
                      Description (Optional)
                    </Label>
                    <Textarea
                      placeholder="Enter voucher description..."
                      value={sellDescription}
                      onChange={(e) => setSellDescription(e.target.value)}
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        borderRadius: '12px',
                        minHeight: '80px'
                      }}
                    />
                  </div>

                  {/* Merchant Name (for 3rd party vouchers) */}
                  {sellVoucherType === 'third_party_voucher' && (
                    <div>
                      <Label 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px',
                          display: 'block'
                        }}
                      >
                        Merchant Name
                      </Label>
                      <Input
                        type="text"
                        placeholder="e.g., 1Voucher, OTT, Blu"
                        value={sellMerchant}
                        onChange={(e) => setSellMerchant(e.target.value)}
                        style={{
                          height: '44px',
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '14px',
                          borderRadius: '12px'
                        }}
                      />
                    </div>
                  )}

                  {/* Voucher Format Info */}
                  <Alert style={{ backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe' }}>
                    <AlertCircle style={{ width: '16px', height: '16px', color: '#1d4ed8' }} />
                    <AlertDescription>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1e3a8a',
                          margin: '0 0 4px 0'
                        }}
                      >
                        Voucher Format Information
                      </p>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          color: '#1e40af',
                          margin: 0
                        }}
                      >
                        {sellVoucherType === 'mm_voucher' && 'MyMoolah vouchers use 16 digits in format: XXXX XXXX XXXX XXXX'}
                        {sellVoucherType === 'easypay_voucher' && 'EasyPay numbers are 14 digits starting with "9". Customer pays at retail stores, then auto-converts to MyMoolah voucher.'}
                        {sellVoucherType === 'third_party_voucher' && 'Third party vouchers use custom merchant format codes.'}
                      </p>
                    </AlertDescription>
                  </Alert>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateVoucher}
                    disabled={!sellAmount || parseFloat(sellAmount) <= 0 || isLoading}
                    style={{
                      height: '44px',
                      background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: !sellAmount || parseFloat(sellAmount) <= 0 || isLoading ? 'not-allowed' : 'pointer',
                      opacity: !sellAmount || parseFloat(sellAmount) <= 0 || isLoading ? 0.5 : 1
                    }}
                  >
                    {isLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Generating...
                      </div>
                    ) : (
                      `Generate ${sellVoucherType === 'mm_voucher' ? 'MyMoolah' : sellVoucherType === 'easypay_voucher' ? 'EasyPay' : '3rd Party'} Voucher`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redeem Tab - Redeem Vouchers */}
          <TabsContent value="redeem">
            <Card style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <CardHeader>
                <CardTitle 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Minus style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                  Redeem Voucher
                </CardTitle>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}
                >
                  Deposit voucher value into your MyMoolah wallet
                </p>
              </CardHeader>
              <CardContent style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Voucher Code Input */}
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'block'
                      }}
                    >
                      Voucher Code or EasyPay Number
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter voucher code or EasyPay number..."
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      style={{
                        height: '44px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        borderRadius: '12px'
                      }}
                    />
                  </div>

                  {/* Amount Input (Optional for partial redemption) */}
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'block'
                      }}
                    >
                      Amount (Optional - for partial redemption)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Leave empty to redeem full amount"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      style={{
                        height: '44px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        borderRadius: '12px'
                      }}
                    />
                  </div>

                  {/* Info Alert */}
                  <Alert style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <CheckCircle style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                    <AlertDescription>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#166534',
                          margin: '0 0 4px 0'
                        }}
                      >
                        Instant Redemption
                      </p>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          color: '#15803d',
                          margin: 0
                        }}
                      >
                        Voucher value will be instantly added to your MyMoolah wallet balance.
                      </p>
                    </AlertDescription>
                  </Alert>

                  {/* Redeem Button */}
                  <Button
                    onClick={handleRedeemVoucher}
                    disabled={!redeemCode.trim() || isLoading}
                    style={{
                      height: '44px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: !redeemCode.trim() || isLoading ? 'not-allowed' : 'pointer',
                      opacity: !redeemCode.trim() || isLoading ? 0.5 : 1
                    }}
                  >
                    {isLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Redeeming...
                      </div>
                    ) : (
                      'Redeem Voucher'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab - Transaction History */}
          <TabsContent value="history">
            {/* Search and Filter Bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    width: '20px', 
                    height: '20px', 
                    color: '#6b7280' 
                  }} />
                  <Input
                    type="text"
                    placeholder="Search vouchers, codes, or EasyPay numbers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      height: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      borderRadius: '12px',
                      paddingLeft: '44px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff'
                    }}
                  />
                </div>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  style={{
                    height: '44px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: showFilters ? '#f0f9ff' : '#ffffff',
                    color: showFilters ? '#1d4ed8' : '#374151'
                  }}
                >
                  <Filter style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Filters
                </Button>
              </div>

              {/* Filter Options */}
              {showFilters && (
                <Card style={{ borderRadius: '12px', marginBottom: '16px' }}>
                  <CardContent style={{ padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {/* Type Filter */}
                      <div>
                        <Label style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Voucher Type
                        </Label>
                        <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value as any })}>
                          <SelectTrigger style={{
                            height: '36px',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '14px',
                            borderRadius: '8px'
                          }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="mm_voucher">MMVoucher</SelectItem>
                            <SelectItem value="easypay_voucher">EasyPay</SelectItem>
                            <SelectItem value="third_party_voucher">Third Party</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <Label style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Status
                        </Label>
                        <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value as any })}>
                          <SelectTrigger style={{
                            height: '36px',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '14px',
                            borderRadius: '8px'
                          }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending_payment">Pending</SelectItem>
                            <SelectItem value="redeemed">Redeemed</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Range Filter */}
                      <div>
                        <Label style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Date Range
                        </Label>
                        <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value as any })}>
                          <SelectTrigger style={{
                            height: '36px',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '14px',
                            borderRadius: '8px'
                          }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Clear Filters */}
                      <div style={{ display: 'flex', alignItems: 'end' }}>
                        <Button
                          onClick={() => {
                            setFilters({
                              type: 'all',
                              status: 'all',
                              dateRange: 'all',
                              startDate: undefined,
                              endDate: undefined
                            });
                            setSearchQuery('');
                          }}
                          variant="outline"
                          style={{
                            height: '36px',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#6b7280'
                          }}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {/* Custom Date Range */}
                    {filters.dateRange === 'custom' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div>
                          <Label style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px',
                            display: 'block'
                          }}>
                            Start Date
                          </Label>
                          <Input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            style={{
                              height: '36px',
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '14px',
                              borderRadius: '8px'
                            }}
                          />
                        </div>
                        <div>
                          <Label style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px',
                            display: 'block'
                          }}>
                            End Date
                          </Label>
                          <Input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            style={{
                              height: '36px',
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '14px',
                              borderRadius: '8px'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Vouchers List */}
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', marginBottom: '24px' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <History style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    Voucher History
                  </div>
                  <Button
                    onClick={() => {
                      // Export functionality - create CSV of filtered vouchers
                      // Ensure expiry follows business rules: 96h for EasyPay pending; 12 months for MMVoucher
                      const csvContent = "data:text/csv;charset=utf-8," 
                        + "Voucher Code,Type,Status,Amount,Currency,Created Date,Expiry Date,Description\n"
                        + filteredVouchers.map(v => {
                          const createdMs = new Date(v.createdDate).getTime();
                          const computedExpiry = (v.status === 'pending_payment' && v.type === 'easypay_voucher')
                            ? new Date(createdMs + 96 * 60 * 60 * 1000).toISOString()
                            : new Date(createdMs + 365 * 24 * 60 * 60 * 1000).toISOString();
                          const expiry = (v as any).expiresAt || v.expiryDate || computedExpiry;
                          return `"${v.voucherCode}","${v.type}","${v.status}","${v.amount}","${v.currency}","${v.createdDate}","${expiry}","${v.description}"`;
                        }).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `voucher_history_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#6b7280',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      height: '36px',
                      fontSize: '12px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: '600'
                    }}
                  >
                    <Download style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                    Export
                  </Button>
                </div>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '8px 0 0 0'
                  }}
                >
                  Complete voucher transaction history ({filteredVouchers.length} vouchers)
                </p>
              </div>
            </div>

            {/* Vouchers Grid - Loose Standing Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {filteredVouchers.length === 0 ? (
                <Card style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                  <CardContent style={{ padding: 'var(--mobile-padding)' }}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto'
                      }}>
                        <Ticket style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
                      </div>
                      <h4 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px'
                        }}
                      >
                        No vouchers found
                      </h4>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '14px',
                          color: '#9ca3af',
                          margin: 0
                        }}
                      >
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredVouchers.map((voucher) => {
                  const typeBadge = getVoucherTypeBadge(voucher.type);
                  const statusBadge = getVoucherStatusBadge(voucher.status);
                  const formattedCode = formatVoucherCodeForDisplay(voucher);
                  
                  return (
                    <div key={voucher.id} style={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', 
                      overflow: 'hidden',
                      width: '100%', 
                      minWidth: '100%', 
                      maxWidth: 'none', 
                      flex: '1 1 100%', 
                      margin: '0', 
                      padding: '0', 
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#86BE41';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(134, 190, 65, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                    }}
                    onClick={() => setSelectedVoucher(voucher)}
                    >
                      <div style={{ padding: '20px', width: '100%', boxSizing: 'border-box' }}>
                        {/* Header with Logo and Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Logo */}
                            <div 
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                backgroundColor: '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden'
                              }}
                            >
                              <img 
                                src={voucher.type === 'mm_voucher' ? logo3 : 
                                     voucher.type === 'easypay_voucher' ? logo3 : 
                                     logo3}
                                alt={voucher.type === 'mm_voucher' ? 'MMVoucher Logo' : 
                                     voucher.type === 'easypay_voucher' ? 'EasyPay Logo' : 
                                     'Voucher Logo'}
                                style={{ 
                                  width: '24px', 
                                  height: '24px',
                                  objectFit: 'contain'
                                }}
                                onError={(e) => {
                                  // Fallback to a simple icon if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  const sibling2 = e.currentTarget.nextElementSibling as HTMLElement | null;
                                  if (sibling2) sibling2.style.display = 'flex';
                                }}
                              />
                              <div 
                                style={{
                                  display: 'none',
                                  width: '24px',
                                  height: '24px',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: voucher.type === 'mm_voucher' ? '#86BE41' : 
                                                 voucher.type === 'easypay_voucher' ? '#86BE41' : '#9ca3af',
                                  borderRadius: '6px',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {voucher.type === 'mm_voucher' ? 'MM' : 
                                 voucher.type === 'easypay_voucher' ? 'MM' : 'V'}
                              </div>
                            </div>
                            
                            {/* Type and Status Badges */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <Badge 
                                className={typeBadge.color}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontFamily: 'Montserrat, sans-serif'
                                }}
                              >
                                {typeBadge.text}
                              </Badge>
                              <Badge 
                                className={statusBadge.color}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontFamily: 'Montserrat, sans-serif'
                                }}
                              >
                                {statusBadge.text}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Amount */}
                          <div style={{ textAlign: 'right' }}>
                            <p 
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: voucher.remainingValue > 0 ? '#16a34a' : '#9ca3af',
                                margin: 0,
                                lineHeight: 1
                              }}
                            >
                              {formatCurrency(voucher.remainingValue)}
                            </p>
                            {voucher.isPartialRedemption && (
                              <p 
                                style={{
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: '11px',
                                  color: '#9ca3af',
                                  margin: '2px 0 0 0',
                                  lineHeight: 1
                                }}
                              >
                                of {formatCurrency(voucher.amount)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Voucher Code - Dual Display for EasyPay */}
                        <div style={{ marginBottom: '12px' }}>
                          {(() => {
                            const formattedCode = formatVoucherCodeForDisplay(voucher);
                            return (
                              <>
                                <p 
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '16px', // Always use 16px for main code (MM PIN)
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    margin: 0,
                                    letterSpacing: '0.5px',
                                    lineHeight: 1.2
                                  }}
                                >
                                  {formattedCode.mainCode}
                                </p>
                                
                                {/* Sub-code for paid EasyPay vouchers */}
                                {formattedCode.subCode && (
                                  <p 
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      color: '#2D8CCA',
                                      margin: '2px 0 0 0',
                                      letterSpacing: '0.3px',
                                      lineHeight: 1
                                    }}
                                  >
                                    {formattedCode.subCode}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        {/* Description - Shorter and smaller */}
                        <p 
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '12px',
                            color: '#6b7280',
                            margin: '0 0 12px 0',
                            lineHeight: 1.3
                          }}
                        >
                          
                        </p>

                        {/* Bottom Info */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar style={{ width: '12px', height: '12px', color: '#9ca3af' }} />
                            <span 
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '11px',
                                color: new Date(voucher.expiryDate) < new Date() ? '#dc2626' : '#9ca3af',
                                fontWeight: '500'
                              }}
                            >
                              {formatDate(voucher.createdDate)}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCode(voucher);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: copiedCode === voucher.voucherCode ? '#16a34a' : '#9ca3af',
                                padding: '4px',
                                borderRadius: '4px',
                                transition: 'color 0.2s ease',
                                fontFamily: 'Montserrat, sans-serif'
                              }}
                              aria-label="Copy voucher code"
                            >
                              {copiedCode === voucher.voucherCode ? 
                                <Check style={{ width: '14px', height: '14px' }} /> : 
                                <Copy style={{ width: '14px', height: '14px' }} />
                              }
                            </button>
                          </div>
                        </div>

                        {/* EasyPay Pending Expiry Information with Cancel Button */}
                        {voucher.type === 'easypay_voucher' && voucher.status === 'pending_payment' && !isVoucherExpired(voucher) && (
                          <div style={{ 
                            marginTop: '8px',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'flex-start'
                          }}>
                            {/* Expiry Notice - Narrower */}
                            <div style={{ 
                              flex: 1,
                              padding: '8px 12px', 
                              backgroundColor: '#fef3c7', 
                              border: '1px solid #f59e0b', 
                              borderRadius: '6px',
                              borderLeft: '3px solid #f59e0b'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                <Clock style={{ width: '10px', height: '10px', color: '#f59e0b' }} />
                                <span 
                                  style={{
                                    fontFamily: 'Montserrat, sans-serif',
                                    fontSize: '11px',
                                    color: '#f59e0b',
                                    fontWeight: '600'
                                  }}
                                >
                                  Expires: {formatDate(voucher.expiryDate)}
                                </span>
                              </div>
                              <span 
                                style={{
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: '10px',
                                  color: '#d97706',
                                  fontWeight: '500'
                                }}
                              >
                                Make payment at any EasyPay terminal
                              </span>
                            </div>
                            
                            {/* Cancel Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEasyPayVoucher(voucher);
                              }}
                              style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontFamily: 'Montserrat, sans-serif',
                                transition: 'background-color 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                              title="Cancel voucher and get refund"
                            >
                              <X style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Voucher Details Dialog */}
      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent 
          style={{
            fontFamily: 'Montserrat, sans-serif',
            maxWidth: '340px',
            backgroundColor: '#ffffff',
            borderRadius: '16px'
          }}
          aria-describedby="voucher-details-description"
        >
          {selectedVoucher && (
            <>
              <DialogHeader>
                <DialogTitle 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1f2937'
                  }}
                >
                  Voucher Details
                </DialogTitle>
                <div id="voucher-details-description" className="sr-only">
                  Detailed information about the selected voucher
                </div>
              </DialogHeader>
              
              <div style={{ padding: '16px 0' }}>
                {/* Voucher Type and Status */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <Badge 
                    className={getVoucherTypeBadge(selectedVoucher.type).color}
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {getVoucherTypeBadge(selectedVoucher.type).text}
                  </Badge>
                  <Badge 
                    className={getVoucherStatusBadge(selectedVoucher.status).color}
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {getVoucherStatusBadge(selectedVoucher.status).text}
                  </Badge>
                </div>

                {/* Voucher Code - Only show for non-EasyPay vouchers */}
                {selectedVoucher.type !== 'easypay_voucher' && (
                  <div style={{ marginBottom: '16px' }}>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'block'
                      }}
                    >
                      Voucher Code
                    </Label>
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    >
                      <span 
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937',
                          flex: 1
                        }}
                      >
                        {(() => {
                          const formatted = formatVoucherCodeForDisplay(selectedVoucher);
                          return (
                            <div>
                              <div>{formatted.mainCode}</div>
                              {formatted.subCode && (
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                  {formatted.subCode}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </span>
                      <button
                        onClick={() => handleCopyCode(selectedVoucher)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: copiedCode === selectedVoucher.voucherCode ? '#16a34a' : '#6b7280',
                          fontFamily: 'Montserrat, sans-serif'
                        }}
                      >
                        {copiedCode === selectedVoucher.voucherCode ? <Check style={{ width: '16px', height: '16px' }} /> : <Copy style={{ width: '16px', height: '16px' }} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* EasyPay Number - Only show for EasyPay vouchers */}
                {selectedVoucher.type === 'easypay_voucher' && selectedVoucher.easyPayNumber && (
                  <div style={{ marginBottom: '16px' }}>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'block'
                      }}
                    >
                      EasyPay Number
                    </Label>
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#dbeafe',
                        border: '1px solid #93c5fd',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    >
                      <span 
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1e40af',
                          flex: 1
                        }}
                      >
                        {selectedVoucher.easyPayNumber && (
                          selectedVoucher.easyPayNumber.slice(0, 1) + ' ' + 
                          selectedVoucher.easyPayNumber.slice(1, 5) + ' ' + 
                          selectedVoucher.easyPayNumber.slice(5, 9) + ' ' + 
                          selectedVoucher.easyPayNumber.slice(9, 13) + ' ' + 
                          selectedVoucher.easyPayNumber.slice(13)
                        )}
                      </span>
                                              <button
                          onClick={() => {
                            if (selectedVoucher.easyPayNumber) {
                              handleCopyEasyPayNumber(selectedVoucher.easyPayNumber);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedCode === selectedVoucher.easyPayNumber ? '#16a34a' : '#1e40af',
                            fontFamily: 'Montserrat, sans-serif'
                          }}
                        >
                          {copiedCode === selectedVoucher.easyPayNumber ? <Check style={{ width: '16px', height: '16px' }} /> : <Copy style={{ width: '16px', height: '16px' }} />}
                        </button>
                    </div>
                  </div>
                )}

                {/* Amount and Value */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px',
                        display: 'block'
                      }}
                    >
                      Original Amount
                    </Label>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1f2937',
                        margin: 0
                      }}
                    >
                      {formatCurrency(selectedVoucher.amount)}
                    </p>
                  </div>
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px',
                        display: 'block'
                      }}
                    >
                      Remaining Value
                    </Label>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: selectedVoucher.remainingValue > 0 ? '#16a34a' : '#6b7280',
                        margin: 0
                      }}
                    >
                      {formatCurrency(selectedVoucher.remainingValue)}
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px',
                        display: 'block'
                      }}
                    >
                      Created
                    </Label>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: 0
                      }}
                    >
                      {formatDate(selectedVoucher.createdDate)}
                    </p>
                  </div>
                  <div>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px',
                        display: 'block'
                      }}
                    >
                      Expires
                    </Label>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: new Date(selectedVoucher.expiryDate) < new Date() ? '#dc2626' : '#6b7280',
                        margin: 0
                      }}
                    >
                      {formatDate(selectedVoucher.expiryDate)}
                    </p>
                  </div>
                </div>

                {/* Redeemed At (if applicable) */}
                {selectedVoucher.redeemedAt && (
                  <div style={{ marginBottom: '16px' }}>
                    <Label 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px',
                        display: 'block'
                      }}
                    >
                      Redeemed In
                    </Label>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: 0
                      }}
                    >
                      {selectedVoucher.redeemedAt.type === 'wallet' ? 'Wallet' : selectedVoucher.redeemedAt.type}
                      {selectedVoucher.redeemedAt.name ? ` (${selectedVoucher.redeemedAt.name})` : ''}
                      {selectedVoucher.redeemedAt.phoneNumber ? `, ${selectedVoucher.redeemedAt.phoneNumber}` : ''}
                      {selectedVoucher.redeemedAt.timestamp ? ` on ${formatDate(selectedVoucher.redeemedAt.timestamp)}` : ''}
                    </p>
                  </div>
                )}

                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <Label 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '4px',
                      display: 'block'
                    }}
                  >
                    Description
                  </Label>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}
                  >
                    {selectedVoucher.description && selectedVoucher.description !== 'MMVoucher' && selectedVoucher.description !== 'EasyPay voucher' 
                      ? selectedVoucher.description 
                      : 'No description provided'}
                  </p>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => setSelectedVoucher(null)}
                  style={{
                    width: '100%',
                    height: '44px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent 
          style={{
            maxWidth: '400px',
            width: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: 'none',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          aria-describedby="voucher-success-description"
        >
          <div id="voucher-success-description" className="sr-only">
            Success notification for voucher purchase
          </div>
          <div style={{ textAlign: 'center' }}>
            {/* Success Icon */}
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <CheckCircle style={{ width: '32px', height: '32px', color: '#16a34a' }} />
            </div>

            {/* Title */}
            <h2 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}
            >
              {successModalData?.title}
            </h2>

            {/* Voucher Code (if applicable) */}
            {successModalData?.voucherCode && (
              <div 
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  padding: '16px',
                  margin: '16px 0',
                  border: '1px solid #e2e8f0'
                }}
              >
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    margin: '0 0 4px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {successModalData.type === 'easypay' ? 'EasyPay Number' : 'Voucher Code'}
                </p>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0,
                    letterSpacing: '1px'
                  }}
                >
                  {successModalData.voucherCode}
                </p>
              </div>
            )}

            {/* Amount */}
            {successModalData?.amount && (
              <div style={{ marginBottom: '16px' }}>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6b7280',
                    margin: '0 0 4px 0'
                  }}
                >
                  Amount
                </p>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#16a34a',
                    margin: 0
                  }}
                >
                  {successModalData.amount}
                </p>
              </div>
            )}

            {/* Wallet Balance (if applicable) */}
            {successModalData?.walletBalance && (
              <div style={{ marginBottom: '16px' }}>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6b7280',
                    margin: '0 0 4px 0'
                  }}
                >
                  Wallet Balance
                </p>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}
                >
                  {successModalData.walletBalance}
                </p>
              </div>
            )}

            {/* Message */}
            <p 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 24px 0',
                lineHeight: '1.5'
              }}
            >
              {successModalData?.message}
            </p>

            {/* Action Button */}
            <Button
              onClick={() => setShowSuccessModal(false)}
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#86BE41',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7caf3a'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#86BE41'}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel EasyPay Voucher Confirmation Modal */}
      <AlertDialog open={showCancelConfirmModal} onOpenChange={setShowCancelConfirmModal}>
        <AlertDialogContent style={{ zIndex: 9999 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              Cancel this EasyPay voucher?
            </AlertDialogTitle>
            <AlertDialogDescription style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              {voucherToCancel && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1f2937' }}>
                      EasyPay Number: {voucherToCancel.easyPayNumber}
                    </p>
                    <p style={{ margin: '0', fontWeight: '600', color: '#1f2937' }}>
                      Amount: R {voucherToCancel.originalAmount}
                    </p>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1f2937' }}>
                      This will:
                    </p>
                    <ul style={{ margin: '0 0 16px 0', paddingLeft: '20px', listStyle: 'disc' }}>
                      <li>Cancel the voucher immediately</li>
                      <li>Refund R {voucherToCancel.originalAmount} to your wallet</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px'
          }}>
            <AlertDialogCancel
              onClick={() => {
                setShowCancelConfirmModal(false);
                setVoucherToCancel(null);
              }}
              disabled={isCancelling}
              style={{
                flex: 1,
                height: '44px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '8px'
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              style={{
                flex: 1,
                height: '44px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                cursor: isCancelling ? 'not-allowed' : 'pointer',
                opacity: isCancelling ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!isCancelling) {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }
              }}
              onMouseOut={(e) => {
                if (!isCancelling) {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }
              }}
            >
              {isCancelling ? 'Cancelling...' : 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}