import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Import icons directly from lucide-react
import { 
  Gift,
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
  Image
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
  status: 'all' | 'active' | 'pending_payment' | 'redeemed' | 'expired';
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

  // Sell voucher state
  const [sellVoucherType, setSellVoucherType] = useState<'mm_voucher' | 'easypay_voucher' | 'third_party_voucher'>('mm_voucher');
  const [sellAmount, setSellAmount] = useState('');
  const [sellDescription, setSellDescription] = useState('');
  const [sellMerchant, setSellMerchant] = useState('');

  // Redeem voucher state
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');

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
      // Check if this is a paid EasyPay voucher (has MMVoucher PIN and is active)
      if (voucher.status === 'active' && voucher.easyPayNumber && voucher.voucherCode && voucher.voucherCode.startsWith('MM')) {
        // Paid EasyPay voucher - show MMVoucher code with EP number below
        const numericCode = voucher.voucherCode.replace(/\D/g, '');
        const paddedCode = numericCode.padEnd(16, '0').substring(0, 16);
        const mmCode = `${paddedCode.substring(0, 4)} ${paddedCode.substring(4, 8)} ${paddedCode.substring(8, 12)} ${paddedCode.substring(12, 16)}`;
        
        // Format EP number below
        const epNumber = voucher.easyPayNumber;
        const epCode = `${epNumber.substring(0, 1)} ${epNumber.substring(1, 5)} ${epNumber.substring(5, 9)} ${epNumber.substring(9, 13)} ${epNumber.substring(13, 14)}`;
        
        return {
          mainCode: mmCode,
          subCode: epCode
        };
      } else {
        // Unpaid EasyPay voucher - show only EP number
        if (voucher.easyPayNumber) {
          const epNumber = voucher.easyPayNumber;
          return {
            mainCode: `${epNumber.substring(0, 1)} ${epNumber.substring(1, 5)} ${epNumber.substring(5, 9)} ${epNumber.substring(9, 13)} ${epNumber.substring(13, 14)}`
          };
        }
        return { mainCode: voucher.voucherCode };
      }
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

  // Fetch vouchers from backend
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('mymoolah_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch all vouchers (including pending, active, redeemed)
        let vouchersResponse = await fetch('/api/v1/vouchers/', { headers });
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
          let status: 'active' | 'pending_payment' | 'redeemed' | 'expired';
          if (voucher.status === 'pending') {
            status = 'pending_payment';
          } else if (voucher.status === 'expired') {
            status = 'expired';
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

          return {
            id: voucher.id.toString(),
            type: voucherType,
            status: status,
            amount: parseFloat(voucher.originalAmount || 0),
            currency: 'ZAR',
            voucherCode: voucher.voucherCode || `VOUCHER-${voucher.id}`,
            easyPayNumber: voucher.easyPayCode, // Direct field in new structure
            createdDate: voucher.createdAt || new Date().toISOString(),
            expiryDate: voucher.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            description: voucherType === 'easypay_voucher' ? 'EasyPay voucher' : 'MMVoucher',
            transactionId: `VOUCHER-${voucher.id}`,
            redemptionLocations: voucherType === 'easypay_voucher' ? ['EasyPay Network', 'MyMoolah Network'] : ['MyMoolah Network'],
            remainingValue: parseFloat(voucher.balance || 0),
            isPartialRedemption: voucher.status === 'redeemed' && parseFloat(voucher.balance || 0) > 0
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

        // Create real transactions from voucher data (no more mock data)
        const realTransactions: VoucherTransaction[] = sortedVouchers.map(voucher => ({
          id: `VT${voucher.id}`,
          voucherId: voucher.id,
          type: 'generate',
          amount: voucher.amount,
          currency: 'ZAR',
          timestamp: voucher.createdDate + 'T10:30:00Z',
          description: `Generated voucher`,
          reference: `REF-${voucher.id}-GEN`,
          status: 'completed',
          voucherType: voucher.type
        }));

        setVoucherTransactions(realTransactions);

      } catch (err) {
        console.error('Error fetching vouchers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load vouchers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVouchers();
  }, []);

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

  // Generate new voucher
  const handleGenerateVoucher = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(sellAmount);
    
    // Validate amount based on voucher type
    if (sellVoucherType === 'easypay_voucher') {
      if (amount < 50 || amount > 4000) {
        alert('EasyPay vouchers must be between R50 and R4,000');
        return;
      }
    } else {
      if (amount < 5 || amount > 4000) {
        alert('Vouchers must be between R5 and R4,000');
        return;
      }
    }

    setIsLoading(true);

    try {
      
      // Generate voucher code based on type
      let voucherCode: string;
      let easyPayNumber: string | undefined;
      
      if (sellVoucherType === 'mm_voucher') {
        voucherCode = generateMMVoucherCode();
      } else if (sellVoucherType === 'easypay_voucher') {
        voucherCode = generateMMVoucherCode(); // Will be replaced after EasyPay payment
        easyPayNumber = generateEasyPayNumber();
      } else {
        // Third party voucher - different format
        voucherCode = `${sellMerchant?.toUpperCase().substring(0, 4) || '1VCH'}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      const newVoucher: MMVoucher = {
        id: `${sellVoucherType.toUpperCase().substring(0, 3)}${Date.now().toString().slice(-3)}`,
        type: sellVoucherType,
        status: sellVoucherType === 'easypay_voucher' ? 'pending_payment' : 'active',
        amount: amount,
        currency: 'ZAR',
        voucherCode: voucherCode,
        easyPayNumber: easyPayNumber,
        createdDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + (sellVoucherType === 'easypay_voucher' ? 4 : 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: sellDescription || `${sellVoucherType === 'mm_voucher' ? 'MyMoolah' : sellVoucherType === 'easypay_voucher' ? 'EasyPay' : 'Third Party'} voucher`,
        transactionId: `TX${Date.now().toString().slice(-8)}`,
        merchantName: sellMerchant || undefined,
        redemptionLocations: sellVoucherType === 'easypay_voucher' 
          ? ['8000+ EasyPay Retail Stores'] 
          : sellVoucherType === 'mm_voucher' 
          ? ['MyMoolah Network', 'Partner Retailers'] 
          : ['Third Party Platform'],
        remainingValue: amount,
        isPartialRedemption: false
      };

      // Add to vouchers list
      setMMVouchers(prev => [newVoucher, ...prev]);

      // Add transaction record
      const newTransaction: VoucherTransaction = {
        id: `VT${Date.now()}`,
        voucherId: newVoucher.id,
        type: 'generate',
        amount: amount,
        currency: 'ZAR',
        timestamp: new Date().toISOString(),
        description: `Generated ${sellVoucherType.replace('_', ' ')} voucher`,
        reference: `REF-${newVoucher.id}-GEN`,
        status: 'completed',
        easyPayNumber: newVoucher.easyPayNumber,
        voucherType: sellVoucherType
      };

      setVoucherTransactions(prev => [newTransaction, ...prev]);

      // Show success message with voucher details
      const successMessage = sellVoucherType === 'easypay_voucher' 
        ? `🎟️ EasyPay Voucher Generated!\n\nEasyPay Number: ${newVoucher.easyPayNumber}\nAmount: R${amount}\nValid for 4 days\n\nTake this number to any of 8000+ EasyPay retail stores to pay. Once paid, your MyMoolah voucher will be activated automatically.`
        : `🎟️ ${sellVoucherType === 'mm_voucher' ? 'MyMoolah' : 'Third Party'} Voucher Generated!\n\nVoucher Code: ${newVoucher.voucherCode}\nAmount: R${amount}\n\nVoucher is ready for use and redemption.`;

      alert(successMessage);

      // Clear form
      setSellAmount('');
      setSellDescription('');
      setSellMerchant('');
      
      // Switch to vouchers tab to see the new voucher
      setActiveTab('vouchers');

    } catch (error) {
      alert('Failed to generate voucher. Please try again.');
      console.error('Voucher generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Redeem voucher
  const handleRedeemVoucher = async () => {
    if (!redeemCode.trim()) {
      alert('Please enter a voucher code');
      return;
    }

    setIsLoading(true);

    try {
      // Find voucher by code
      const voucher = mmVouchers.find(v => 
        v.voucherCode === redeemCode.trim() ||
        v.easyPayNumber === redeemCode.trim()
      );

      if (!voucher) {
        alert('Voucher not found. Please check the code and try again.');
        setIsLoading(false);
        return;
      }

      if (voucher.status !== 'active') {
        alert(`Cannot redeem voucher. Status: ${voucher.status}`);
        setIsLoading(false);
        return;
      }

      const redeemAmountNum = redeemAmount ? parseFloat(redeemAmount) : voucher.remainingValue;

      if (redeemAmountNum <= 0 || redeemAmountNum > voucher.remainingValue) {
        alert(`Invalid redemption amount. Available: R${voucher.remainingValue}`);
        setIsLoading(false);
        return;
      }

      // Update voucher
      const updatedVoucher: MMVoucher = {
        ...voucher,
        remainingValue: voucher.remainingValue - redeemAmountNum,
        isPartialRedemption: (voucher.remainingValue - redeemAmountNum) > 0,
        status: (voucher.remainingValue - redeemAmountNum) > 0 ? 'active' : 'redeemed',
        redeemedDate: (voucher.remainingValue - redeemAmountNum) <= 0 ? new Date().toISOString().split('T')[0] : voucher.redeemedDate
      };

      setMMVouchers(prev => prev.map(v => v.id === voucher.id ? updatedVoucher : v));

      // Add transaction record
      const redeemTransaction: VoucherTransaction = {
        id: `VT${Date.now()}`,
        voucherId: voucher.id,
        type: updatedVoucher.remainingValue > 0 ? 'partial_redeem' : 'redeem',
        amount: redeemAmountNum,
        currency: 'ZAR',
        timestamp: new Date().toISOString(),
        description: `${updatedVoucher.remainingValue > 0 ? 'Partial redemption' : 'Full redemption'} to wallet`,
        reference: `REF-${voucher.id}-RED${Date.now().toString().slice(-3)}`,
        status: 'completed',
        voucherType: voucher.type
      };

      setVoucherTransactions(prev => [redeemTransaction, ...prev]);

      alert(`✅ Voucher Redeemed Successfully!\n\nAmount: R${redeemAmountNum}\nRemaining Balance: R${updatedVoucher.remainingValue}\n\nFunds have been added to your MyMoolah wallet.`);

      // Clear form
      setRedeemCode('');
      setRedeemAmount('');

    } catch (error) {
      alert('Failed to redeem voucher. Please try again.');
      console.error('Voucher redemption error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate EasyPay payment
  

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
      
      // Show user feedback
      console.log('✅ Voucher code copied to clipboard:', codeToCopy);
      
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
      console.error('❌ Failed to copy code:', error);
      // Show error feedback to user
      alert('Failed to copy voucher code. Please try again.');
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
      case 'pending':
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
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

          {/* Right: Search */}
          <button 
            onClick={() => document.getElementById('search-input')?.focus()}
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
            aria-label="Search Vouchers"
          >
            <Search style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Search Bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ position: 'relative' }}>
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
              id="search-input"
              type="text"
              placeholder="Search vouchers, codes, or EasyPay numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                height: '44px',
                paddingLeft: '44px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            />
          </div>
        </div>

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
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '8px',
                height: '36px',
                padding: '0 8px'
              }}
            >
              Vouchers
            </TabsTrigger>
            <TabsTrigger 
              value="sell"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '8px',
                height: '36px',
                padding: '0 8px'
              }}
            >
              Sell
            </TabsTrigger>
            <TabsTrigger 
              value="redeem"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '8px',
                height: '36px',
                padding: '0 8px'
              }}
            >
              Redeem
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '8px',
                height: '36px',
                padding: '0 8px'
              }}
            >
              History
            </TabsTrigger>
          </TabsList>

          {/* Vouchers Tab - Open MMVouchers List */}
          <TabsContent value="vouchers">
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
                      paddingLeft: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                </div>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    width: '44px',
                    height: '44px',
                    backgroundColor: showFilters ? '#86BE41' : '#f8fafc',
                    color: showFilters ? '#ffffff' : '#6b7280',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                >
                  <Filter style={{ width: '20px', height: '20px' }} />
                </Button>
              </div>

              {/* Filter Options */}
              {showFilters && (
                <Card style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                        Type
                      </Label>
                      <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as FilterOptions['type'] }))}>
                        <SelectTrigger style={{ height: '36px', fontSize: '14px', fontFamily: 'Montserrat, sans-serif' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="mm_voucher">MyMoolah</SelectItem>
                          <SelectItem value="easypay_voucher">EasyPay</SelectItem>
                          <SelectItem value="third_party_voucher">3rd Party</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                        Status
                      </Label>
                      <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as FilterOptions['status'] }))}>
                        <SelectTrigger style={{ height: '36px', fontSize: '14px', fontFamily: 'Montserrat, sans-serif' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending_payment">Pending Payment</SelectItem>
                          <SelectItem value="redeemed">Redeemed</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                      Date Range
                    </Label>
                    <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value as FilterOptions['dateRange'] }))}>
                      <SelectTrigger style={{ height: '36px', fontSize: '14px', fontFamily: 'Montserrat, sans-serif' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Past Week</SelectItem>
                        <SelectItem value="month">Past Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              )}
            </div>

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
                  {formatCurrency(mmVouchers.filter(v => v.status === 'active').reduce((sum, v) => sum + v.remainingValue, 0))}
                </p>
              </Card>
            </div>

            {/* Sleek Vouchers List */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {filteredVouchers.length === 0 ? (
                <Card style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <CardContent style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <Gift style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
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
                  </CardContent>
                </Card>
              ) : (
                filteredVouchers.map((voucher) => {
                  const typeBadge = getVoucherTypeBadge(voucher.type);
                  const statusBadge = getVoucherStatusBadge(voucher.status);
                  
                  return (
                    <Card
                      key={voucher.id}
                      style={{
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
                      <CardContent style={{ padding: '20px' }}>
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
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
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
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Sell Tab - Generate Vouchers */}
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
                      placeholder="0.00"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      style={{
                        height: '44px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderRadius: '12px'
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
            <Card style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    <History style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    Transaction History
                  </CardTitle>
                  <Button
                    onClick={() => alert('Export functionality coming soon!')}
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
                    margin: 0
                  }}
                >
                  Complete voucher transaction statements
                </p>
              </CardHeader>
              <CardContent style={{ padding: '24px' }}>
                {voucherTransactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <Receipt style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
                    <h4 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#6b7280',
                        marginBottom: '8px'
                      }}
                    >
                      No transactions yet
                    </h4>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#9ca3af',
                        margin: 0
                      }}
                    >
                      Your voucher transactions will appear here
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {voucherTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        style={{
                          padding: '16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Logo Placeholder for Transaction */}
                            <div 
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e5e7eb',
                                position: 'relative'
                              }}
                            >
                              <Image style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                              <span 
                                style={{
                                  position: 'absolute',
                                  fontSize: '6px',
                                  fontFamily: 'Montserrat, sans-serif',
                                  color: '#6b7280',
                                  bottom: '-8px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {transaction.voucherType === 'mm_voucher' ? 'logo3.svg' : 
                                 transaction.voucherType === 'easypay_voucher' ? 'EPlogo.svg' : 
                                 'logo.svg'}
                              </span>
                            </div>
                            <div>
                              <p 
                                style={{
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#1f2937',
                                  margin: '0 0 4px 0'
                                }}
                              >
                                {transaction.description}
                              </p>
                              <p 
                                style={{
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: '12px',
                                  color: '#6b7280',
                                  margin: 0
                                }}
                              >
                                {transaction.reference}
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p 
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '16px',
                                fontWeight: '700',
                                color: transaction.type === 'generate' ? '#86BE41' : '#16a34a',
                                margin: '0 0 4px 0'
                              }}
                            >
                              {transaction.type === 'generate' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </p>
                            <p 
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '12px',
                                color: '#6b7280',
                                margin: 0
                              }}
                            >
                              {new Date(transaction.timestamp).toLocaleDateString('en-ZA', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        {transaction.easyPayNumber && (
                          <div 
                            style={{
                              backgroundColor: '#dbeafe',
                              border: '1px solid #93c5fd',
                              borderRadius: '8px',
                              padding: '8px',
                              marginTop: '8px'
                            }}
                          >
                            <p 
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '12px',
                                color: '#1e40af',
                                margin: 0
                              }}
                            >
                              <strong>EasyPay Number:</strong> {transaction.easyPayNumber}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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

                {/* Voucher Code */}
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
                                                  {formatVoucherCodeForDisplay(selectedVoucher)}
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

                {/* EasyPay Number (if applicable) */}
                {selectedVoucher.easyPayNumber && (
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
                        {selectedVoucher.easyPayNumber}
                      </span>
                      <button
                                                    onClick={() => handleCopyCode(selectedVoucher)}
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
    </div>
  );
}