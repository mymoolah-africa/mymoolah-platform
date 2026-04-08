import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../utils/authToken';
import { APP_CONFIG } from '../config/app-config';

// Import centralized transaction icon utility
import { getTransactionIcon } from '../utils/transactionIcons.tsx';
import { TransactionDetailModal } from '../components/TransactionDetailModal';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { 
  Search, 
  Download, 
  Calendar as CalendarIcon, 
  X,
  ArrowLeft
} from 'lucide-react';

// Transaction types for filtering
type TransactionType = 'all' | 'money_in' | 'money_out';
type TransactionStatus = 'completed' | 'pending' | 'failed';

interface Transaction {
  id: string;
  transactionId?: string;
  type: 'money_in' | 'money_out';
  amount: number;
  currency: 'ZAR';
  recipient?: string;
  sender?: string;
  description: string;
  status: TransactionStatus;
  timestamp: string;
  reference: string;
  fee?: number;
  method?: string;
  // Add wallet IDs for proper icon classification
  senderWalletId?: string;
  receiverWalletId?: string;
  metadata?: any;
}


export function TransactionHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Local state management for scalable architecture with keyset pagination
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isExporting, setIsExporting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [itemsPerPage] = useState(50);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch transactions from API with keyset pagination
  const fetchTransactions = async (cursor?: string | null, append: boolean = false) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const params = new URLSearchParams({
        limit: itemsPerPage.toString()
      });
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/transactions?${params}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const sourceList = Array.isArray(data.data)
            ? data.data
            : (data.data.transactions || []);

          const transformedTransactions = sourceList.map((tx: any) => {
            // Determine if this is a credit (money received) or debit (money sent)
            // Backend transforms: credit->deposit, debit->payment, send->sent, receive->received
            // Treat 'refund' as credit and 'fee' as debit for display purposes
            const isCredit = ['deposit', 'received', 'refund'].includes(tx.type);
            const isDebit = ['sent', 'payment', 'withdrawal', 'fee'].includes(tx.type);
            
            const metaProductName =
              tx.metadata?.productName ||
              tx.metadata?.voucher?.productName;
            const isVoucherTx =
              tx.metadata?.productType === 'voucher' ||
              tx.metadata?.voucher ||
              (tx.description || '').toLowerCase().includes('voucher');
            const rawDescription = metaProductName
              ? (isVoucherTx ? `Voucher purchase - ${metaProductName}` : metaProductName)
              : tx.description;
            // Strip "(incl. VAT)" suffix from fee descriptions for cleaner display
            const displayDescription = (rawDescription || '').replace(/\s*\(incl\.?\s*VAT\)/i, '').trim() || rawDescription;
            
                         return {
               id: tx.id,
               transactionId: tx.transactionId, // Add for deduplication
               type: (isCredit ? 'money_in' : 'money_out') as 'money_in' | 'money_out',
               amount: isCredit ? Math.abs(tx.amount) : -Math.abs(tx.amount),
               currency: 'ZAR' as const,
               recipient: tx.metadata?.counterpartyIdentifier,
               sender: tx.metadata?.counterpartyIdentifier,
              description: displayDescription,
               status: tx.status,
               timestamp: new Date(tx.createdAt || tx.date).toISOString(),
               reference: tx.id,
               fee: 0,
               method: 'MyMoolah Internal',
               senderWalletId: tx.senderWalletId || tx.metadata?.senderWalletId,
               receiverWalletId: tx.receiverWalletId || tx.metadata?.receiverWalletId,
               metadata: tx.metadata || {}
             };
           });

          if (append) {
            setTransactions(prev => [...prev, ...transformedTransactions]);
          } else {
            setTransactions(transformedTransactions);
          }
          
          // Handle keyset pagination data from backend
          const pagination = data.data?.pagination || {};
          setHasMore(pagination.hasMore || false);
          setNextCursor(pagination.nextCursor || null);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load transactions on component mount
  useEffect(() => {
    fetchTransactions(null, false);
  }, [user]);

  // Filtered and sorted transactions based on search and filters
  const filteredTransactions = useMemo(() => {

    const filtered = transactions.filter(transaction => {
      // Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (transaction.reference && String(transaction.reference).toLowerCase().includes(searchQuery.toLowerCase()));

      // Type filter
      const matchesType = filterType === 'all' || transaction.type === filterType;

      // Date range filter
      let matchesDate = true;
      if (dateRange.from || dateRange.to) {
        const transactionDate = new Date(transaction.timestamp);
        
        // Normalize dates to start/end of day for accurate comparison
        const normalizedTransactionDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
        
        if (dateRange.from) {
          const normalizedFromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
          if (normalizedTransactionDate < normalizedFromDate) matchesDate = false;
        }
        
        if (dateRange.to) {
          const normalizedToDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
          if (normalizedTransactionDate > normalizedToDate) matchesDate = false;
        }
      }

      return matchesSearch && matchesType && matchesDate;
    });

    // Sort by newest first
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, searchQuery, filterType, dateRange]);

  // Helper to display primary line - clean up description format
  const getPrimaryText = (t: Transaction) => {
    // Prefer product name from metadata (ensures accurate voucher labels)
    const metaProductName =
      t.metadata?.productName ||
      t.metadata?.voucher?.productName;

    // If voucher metadata exists, show a clear voucher label
    if (metaProductName) {
      const isVoucher =
        t.metadata?.productType === 'voucher' ||
        t.metadata?.voucher ||
        (t.description || '').toLowerCase().includes('voucher');
      if (isVoucher) {
        return `Voucher purchase - ${metaProductName}`;
      }
      return metaProductName;
    }

    let description = t.description || '';
    
    // Remove "Ref:" prefix and extract the actual description
    // Convert transaction description format
    if (description.includes('| Ref:')) {
      // Extract the name part (before the pipe)
      const namePart = description.split('|')[0].trim();
      
      // Extract the description part (after "Ref:")
      const refPart = description.split('| Ref:')[1] || '';
      const cleanDescription = refPart.trim();
      
      // Limit description to 20 characters
      const truncatedDescription = cleanDescription.length > 20 
        ? cleanDescription.substring(0, 20) + '...' 
        : cleanDescription;
      
      return `${namePart} | ${truncatedDescription}`;
    }
    
    // For other transaction types, clean up common prefixes
    if (t.type === 'money_out') {
      description = description.replace(/^sent to\s+/i, '').replace(/^payment to\s+/i, '').trim();
    }
    
    return description;
  };

  // Load transactions function (kept for potential future use)
  const loadTransactions = async () => {
    try {
      setLoading(true);
      await fetchTransactions(null, false);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // REMOVED: fetchTransactions function - now using MoolahContext
  // Format voucher numbers based on length
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

  // Format currency with proper negative sign placement
  const formatCurrency = (amount: number): string => {
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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Normalize dates to start of day for accurate day comparison
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((nowStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-ZA', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setDateRange({});
    // Reload transactions from the beginning
    loadTransactions();
  };

  // Export transactions
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Create CSV content
      const headers = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Reference', 'Method'];
      const csvContent = [
        headers.join(','),
        ...filteredTransactions.map(tx => [
          new Date(tx.timestamp).toLocaleDateString('en-ZA'),
          tx.type === 'money_in' ? 'Money In' : 'Money Out',
          `"${tx.description}"`,
          (tx.type === 'money_in' ? '' : '-') + tx.amount.toFixed(2),
          tx.status,
          tx.reference,
          `"${tx.method || 'N/A'}"`
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `MyMoolah_Statement_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() || filterType !== 'all' || dateRange.from || dateRange.to;

  return (
    <div 
      style={{
        backgroundColor: '#ffffff',
        minHeight: 'auto',
        fontFamily: 'Montserrat, sans-serif'
      }}
    >
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
              Transaction History
            </h1>
          </div>

          {/* Right: Placeholder for balance */}
          <div style={{ width: '44px' }}></div>
        </div>
      </div>

      <div style={{ padding: 'var(--mobile-padding)' }}>
        {/* Page Description */}
        <div className="mb-6">
          <p 
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-base)',
              fontWeight: 'var(--font-weight-normal)',
              color: '#6b7280',
              marginTop: '0.5rem',
              marginBottom: '1.5rem'
            }}
          >
            View and manage your transaction history
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-4" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
          <CardContent style={{ padding: 'var(--mobile-padding)' }}>
            {/* Search Bar */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{
                    height: 'var(--mobile-touch-target)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-normal)',
                    borderRadius: 'var(--mobile-border-radius)'
                  }}
                />
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-2 gap-3">
                {/* Transaction Type Filter */}
                <div className="space-y-1">
                  <Label 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#6b7280'
                    }}
                  >
                    Type
                  </Label>
                  <Select value={filterType} onValueChange={(value: TransactionType) => setFilterType(value)}>
                    <SelectTrigger 
                      style={{
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="money_in">Money In</SelectItem>
                      <SelectItem value="money_out">Money Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-1">
                  <Label 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#6b7280'
                    }}
                  >
                    Date Range
                  </Label>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <div
                        className={`w-full justify-start text-left cursor-pointer border rounded-md px-3 py-2 ${(dateRange.from || dateRange.to) ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                        style={{
                          height: 'var(--mobile-touch-target)',
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          borderRadius: 'var(--mobile-border-radius)',
                          borderColor: (dateRange.from || dateRange.to) ? '#3b82f6' : undefined,
                          backgroundColor: (dateRange.from || dateRange.to) ? '#eff6ff' : undefined
                        }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 inline" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                          ) : (
                            `From ${dateRange.from.toLocaleDateString()}`
                          )
                        ) : (
                          'Select dates'
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={{
                          from: dateRange.from,
                          to: dateRange.to
                        }}
                        onSelect={(range) => {
                          setDateRange({
                            from: range?.from,
                            to: range?.to
                          });
                          if (range?.from && range?.to) {
                            setShowDatePicker(false);
                          }
                        }}
                        numberOfMonths={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Active Filters & Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-gray-600 hover:text-gray-900"
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)'
                      }}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear filters
                    </Button>
                  )}
                  <span 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      color: hasActiveFilters ? '#3b82f6' : '#6b7280',
                      fontWeight: hasActiveFilters ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
                    }}
                  >
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                    {hasActiveFilters && transactions.length !== filteredTransactions.length && (
                      <span style={{ color: '#6b7280', fontWeight: 'var(--font-weight-normal)' }}>
                        {' '}of {transactions.length}
                      </span>
                    )}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting || filteredTransactions.length === 0}
                  className="border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    fontWeight: 'var(--font-weight-medium)',
                    borderRadius: 'var(--mobile-border-radius)'
                  }}
                >
                  <Download className="w-3 h-3 mr-1" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <div className="space-y-3">
          {loading && transactions.length === 0 ? (
            <Card style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardContent style={{ padding: 'var(--mobile-padding)' }}>
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      color: '#6b7280'
                    }}
                  >
                    Loading transactions...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : filteredTransactions.length === 0 ? (
            <Card style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardContent style={{ padding: 'var(--mobile-padding)' }}>
                <div className="text-center py-8">
                                      <div className="w-12 h-12 mx-auto text-gray-300 mb-3 flex items-center justify-center">
                      📄
                    </div>
                  <h3 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}
                  >
                    No transactions found
                  </h3>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      color: '#9ca3af'
                    }}
                  >
                    {hasActiveFilters ? 'Try adjusting your filters' : 'Your transactions will appear here'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((transaction) => {
              return (
                <Card 
                  key={transaction.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderRadius: 'var(--mobile-border-radius)' }}
                  onClick={() => {
                    setSelectedTransaction(transaction);
                    setShowDetailModal(true);
                  }}
                >
                  <CardContent style={{ padding: 'var(--mobile-padding)' }}>
                    <div className="flex items-center justify-between">
                      {/* Transaction Icon and Details */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'money_in' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {getTransactionIcon({
                            id: transaction.id,
                            type: transaction.type === 'money_in' ? 'receive' : 'send',
                            amount: transaction.amount,
                            description: transaction.description,
                            senderWalletId: transaction.senderWalletId,
                            receiverWalletId: transaction.receiverWalletId,
                            metadata: transaction.metadata || {}
                          }, 20)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p 
                                style={{
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: 'var(--mobile-font-small)',
                                  fontWeight: 'var(--font-weight-medium)',
                                  color: '#1f2937',
                                  marginBottom: '0.25rem'
                                }}
                              >
                                {getPrimaryText(transaction)}
                              </p>
                              <div className="flex items-center gap-2 mb-1">
                                <span 
                                  style={{
                                    fontFamily: 'Montserrat, sans-serif',
                                    fontSize: 'var(--mobile-font-small)',
                                    color: '#6b7280'
                                  }}
                                >
                                  {formatDate(transaction.timestamp)}
                                </span>
                              </div>
                              {transaction.metadata?.voucher?.maskedCode && (
                                <div className="flex items-center gap-2">
                                  <span
                                    style={{
                                      fontFamily: 'Montserrat, sans-serif',
                                      fontSize: 'var(--mobile-font-small)',
                                      color: '#6b7280'
                                    }}
                                  >
                                    Voucher:
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: 'Montserrat, sans-serif',
                                      fontSize: 'var(--mobile-font-small)',
                                      fontWeight: 600,
                                      color: '#1f2937',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {transaction.metadata.voucher.maskedCode}
                                  </span>
                                </div>
                              )}

                            </div>
                            
                            {/* Amount */}
                            <div className="text-right ml-2">
                              <p 
                                style={{
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: 'var(--mobile-font-base)',
                                  fontWeight: 'var(--font-weight-bold)',
                                  color: transaction.type === 'money_in' ? '#16a34a' : '#dc2626',
                                  marginBottom: '0.25rem'
                                }}
                              >
                                {formatCurrency(transaction.amount)}
                              </p>
                              {transaction.fee && transaction.fee > 0 && (
                                <p 
                                  style={{
                                    fontFamily: 'Montserrat, sans-serif',
                                    fontSize: 'var(--mobile-font-small)',
                                    color: '#6b7280'
                                  }}
                                >
                                  Fee: {formatCurrency(transaction.fee)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Load More Button - Keyset Pagination */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button
              onClick={() => fetchTransactions(nextCursor, true)}
              disabled={loading}
              className="w-full"
              style={{
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                borderRadius: 'var(--mobile-border-radius)',
                padding: 'var(--mobile-padding)',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-bold)'
              }}
            >
              {loading ? 'Loading...' : 'Load More Transactions'}
            </Button>
          </div>
        )}

        {/* Summary Footer */}
        {filteredTransactions.length > 0 && (
          <Card className="mt-6" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <CardContent style={{ padding: 'var(--mobile-padding)' }}>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Money In
                  </p>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: '#16a34a'
                    }}
                  >
                    {formatCurrency(
                      filteredTransactions
                        .filter(tx => tx.type === 'money_in' && tx.status === 'completed')
                        .reduce((sum, tx) => sum + tx.amount, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Money Out
                  </p>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: '#dc2626'
                    }}
                  >
                    {formatCurrency(
                      filteredTransactions
                        .filter(tx => tx.type === 'money_out' && tx.status === 'completed')
                        .reduce((sum, tx) => sum + tx.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
}