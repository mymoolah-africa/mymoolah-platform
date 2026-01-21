import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getToken as getSessionToken } from '../utils/authToken';
import { APP_CONFIG } from '../config/app-config';

// Import centralized transaction icon utility
import { getTransactionIcon } from '../utils/transactionIcons.tsx';

// Import icons directly from lucide-react (for other UI elements)
import { 
  ChevronRight,
  Users,
  Gift
} from 'lucide-react';

// Format currency function
function formatCurrency(amount: number | undefined): string {
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
}

// Format date function for transactions
function formatTransactionDate(date: Date | string): string {
  // If it's already a formatted string (from MoolahContext), return it
  if (typeof date === 'string') {
    return date;
  }
  
  // If it's a Date object, format it
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Derive primary text for display - clean up description format
function getPrimaryDisplayText(transaction: Transaction): string {
  let description = transaction.description || '';
  
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
  
  // Also handle variations like "Ref:" without the pipe
  if (description.includes('Ref:')) {
    // Extract the name part (before "Ref:")
    const namePart = description.split('Ref:')[0].trim();
    
    // Extract the description part (after "Ref:")
    const refPart = description.split('Ref:')[1] || '';
    const cleanDescription = refPart.trim();
    
    // Limit description to 20 characters
    const truncatedDescription = cleanDescription.length > 20 
      ? cleanDescription.substring(0, 20) + '...' 
      : cleanDescription;
    
    return `${namePart}${truncatedDescription}`;
  }
  
  return description;
}

// Transaction interface - compatible with MoolahContext
interface Transaction {
  id: string;
  type: 'received' | 'sent' | 'payment';
  amount: number;
  currency: string;
  description: string;
  date: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  counterparty?: string;
  // Add wallet IDs for proper icon classification
  senderWalletId?: string;
  receiverWalletId?: string;
  metadata?: any;
}

// Helper function to extract and format user's first name for greeting
function getGreetingName(fullName: string | undefined): string {
  if (!fullName || !fullName.trim()) {
    return '';
  }
  
  // Split by space and take the first part (first name)
  const firstName = fullName.trim().split(' ')[0];
  
  // Capitalize first letter if needed
  const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  
  return formattedName;
}

// Format voucher numbers in groups of 4 digits
// function formatVoucherNumber(description: string): string {
//   // Check if description contains a voucher number (12-16 digits)
//   const voucherMatch = description.match(/(\d{12,16})/);
//   if (voucherMatch) {
//     const voucherNumber = voucherMatch[1];
//     
//     // Format based on length
//     let formattedVoucher: string;
//     if (voucherNumber.length === 14) {
//       // EasyPay PIN (14 digits): 9 1234 0371 6648 2
//       formattedVoucher = voucherNumber.slice(0, 1) + ' ' + 
//                         voucherNumber.slice(1, 5) + ' ' + 
//                         voucherNumber.slice(5, 9) + ' ' + 
//                         voucherNumber.slice(9, 13) + ' ' + 
//                         voucherNumber.slice(13);
//     } else if (voucherNumber.length === 16) {
//       // MMVoucher PIN (16 digits): 9562 4205 7827 9406
//       formattedVoucher = voucherNumber.slice(0, 4) + ' ' + 
//                         voucherNumber.slice(4, 8) + ' ' + 
//                         voucherNumber.slice(8, 12) + ' ' + 
//                         voucherNumber.slice(12);
//     } else {
//       // Fallback for other lengths: groups of 4
//       formattedVoucher = voucherNumber.slice(0, 4) + ' ' + 
//                         voucherNumber.slice(4, 8) + ' ' + 
//                         voucherNumber.slice(8);
//     }
//     
//     return description.replace(voucherNumber, formattedVoucher);
//   }
//   return description;
// }

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Local state management for scalable architecture
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [openVouchersCount, setOpenVouchersCount] = useState<number>(0);
  const [openVouchersValue, setOpenVouchersValue] = useState<number>(0);
  // const [isLoading, setIsLoading] = useState<boolean>(false);

    // Fetch dashboard data function
  const fetchDashboardData = async () => {
      if (!user) return;
      
      // setIsLoading(true);
      try {
        const token = getSessionToken();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch wallet balance
        const balanceResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance`, { headers });
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          if (balanceData.success && balanceData.data) {
            setWalletBalance(balanceData.data.available || 0);
          }
        }

        // Fetch recent transactions
        const transactionsResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/transactions?limit=10`, { headers });
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          if (transactionsData.success && transactionsData.data) {
            const sourceList = Array.isArray(transactionsData.data)
              ? transactionsData.data
              : (transactionsData.data.transactions || []);

            const transformedTransactions = sourceList.map((tx: any) => {
              // Determine if this is a credit (money received) or debit (money sent)
              // Backend transforms: credit->deposit, debit->payment, send->sent, receive->received
              // Treat 'refund' as a credit, and 'fee' as a debit
              const isCredit = ['deposit', 'received', 'refund'].includes(tx.type);
              const isDebit = ['sent', 'payment', 'withdrawal', 'fee'].includes(tx.type);
              
              // For credits: positive amount, green color
              // For debits: negative amount, red color
              const displayType = isCredit ? 'received' : 'sent';
              const displayAmount = isCredit ? Math.abs(tx.amount) : -Math.abs(tx.amount);
              
              return {
                id: tx.id || `tx_${tx.transactionId}`,
                transactionId: tx.transactionId, // Add transactionId for deduplication
                type: displayType,
                amount: displayAmount,
                currency: tx.currency || 'ZAR',
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
                // Add wallet IDs for proper icon classification
                senderWalletId: tx.senderWalletId || tx.metadata?.senderWalletId,
                receiverWalletId: tx.receiverWalletId || tx.metadata?.receiverWalletId,
                metadata: tx.metadata || {}
              };
            });
            
            setRecentTransactions(transformedTransactions);
          }
        }

        // Fetch voucher balance
        const voucherResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/balance-summary`, { headers });
        if (voucherResponse.ok) {
          const voucherData = await voucherResponse.json();
          if (voucherData.success && voucherData.data) {
            const summary = voucherData.data;
            // Dashboard counter should use active.count which already includes both active AND pending vouchers
            const dashboardVoucherCount = summary.active.count || 0;
            
                  // Voucher count calculation for dashboard display
            
            setOpenVouchersCount(dashboardVoucherCount);
            const totalVoucherValue = parseFloat(summary.active.value);
            
            setOpenVouchersValue(totalVoucherValue);
          }
        } else {
          console.error('❌ Voucher balance fetch failed:', voucherResponse.status);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        // setIsLoading(false);
      }
    };

  // Fetch wallet balance and recent transactions
  useEffect(() => {
    if (user) {
      // Initial data load when user logs in
      fetchDashboardData();
    }
  }, [user]);

  // Refresh data when component comes into focus (fixes caching issues)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {

        fetchDashboardData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);



  // Handle wallet balance card click - navigate to transaction history
  const handleWalletClick = () => {
    // Navigate to transaction history page
    // For now, we'll show an alert that this feature is coming soon
    navigate('/transactions');
    // Navigate to transaction history page
  };

  // Handle vouchers card click - navigate to vouchers page
  const handleVouchersClick = () => {
    navigate('/vouchers');
  };

  // Handle recent transactions card click - navigate to full transaction history
  const handleRecentTransactionsClick = () => {
    navigate('/transactions');
  };

  // Get transaction color based on type and amount
  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.type === 'received') {
      return '#16a34a'; // Green for received money
    } else {
      return '#dc2626'; // Red for debit transactions (sent, payment)
    }
  };

  // Get transaction icon background color
  const getIconBackgroundColor = (transaction: Transaction) => {
    // Check for voucher transactions first
    if (transaction.description.toLowerCase().includes('voucher')) {
      if (transaction.type === 'received') {
        return '#f0fdf4'; // Light green background for voucher redemptions
      } else {
        return '#fef3f2'; // Light red background for voucher purchases
      }
    }
    
    switch (transaction.type) {
      case 'received':
        return '#f0fdf4'; // Light green background
      case 'sent':
        return '#fef3f2'; // Light red background  
      case 'payment':
        return '#f8fafc'; // Light gray background
      default:
        return '#f8fafc';
    }
  };

  // Get transaction icon color
  const getIconColor = (transaction: Transaction) => {
    // Check for voucher transactions first
    if (transaction.description.toLowerCase().includes('voucher')) {
      if (transaction.type === 'received') {
        return '#16a34a'; // Green for voucher redemptions
      } else {
        return '#dc2626'; // Red for voucher purchases
      }
    }
    
    switch (transaction.type) {
      case 'received':
        return '#16a34a'; // Green
      case 'sent':
        return '#dc2626'; // Red
      case 'payment':
        return '#6b7280'; // Gray
      default:
        return '#6b7280';
    }
  };

  // Generate the greeting with user's first name
  const greetingName = getGreetingName(user?.name);

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* CLEAN GREETING MESSAGE */}
        <h1 
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1f2937',
            marginBottom: '8px',
            textAlign: 'center',
            lineHeight: '1.3'
          }}
        >
          Welcome back{greetingName ? `, ${greetingName}` : ''}!
        </h1>
        
        <p 
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-base)',
            fontWeight: 'var(--font-weight-normal)',
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}
        >
          Your digital wallet dashboard
        </p>
        


        {/* KYC banner removed: KYC is now enforced contextually only on restricted flows */}

        {/* Wallet Balance Card - CLICKABLE */}
        <button
          onClick={handleWalletClick}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 'var(--mobile-border-radius)',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: 'var(--mobile-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.boxShadow = 'var(--mobile-shadow)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          aria-label="View wallet transaction history"
        >
          {/* Left side: Wallet info */}
          <div style={{ flex: 1 }}>
            <h3 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                marginBottom: '4px',
                margin: '0 0 4px 0'
              }}
            >
              My Wallet
            </h3>
            <p 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-normal)',
                color: '#6b7280',
                margin: '0'
              }}
            >
              Available balance
            </p>
          </div>

          {/* Right side: Balance amount */}
          <div 
            style={{
              textAlign: 'right'
            }}
          >
            <span 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: walletBalance >= 0 ? '#16a34a' : '#dc2626', // Green for positive, red for negative
                lineHeight: '1.2'
              }}
            >
              {formatCurrency(walletBalance)}
            </span>
          </div>
        </button>

        {/* Active Vouchers Card - CLICKABLE with Square Box Count */}
        <button
          onClick={handleVouchersClick}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 'var(--mobile-border-radius)',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: 'var(--mobile-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.boxShadow = 'var(--mobile-shadow)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          aria-label="View vouchers page"
        >
          {/* Left side: Vouchers info */}
          <div style={{ flex: 1 }}>
            <h3 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                marginBottom: '4px',
                margin: '0'
              }}
            >
              Active Vouchers
            </h3>
          </div>

          {/* Center: Number of vouchers - IN LIGHT SHADED SQUARE BOX */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '50px',
              paddingRight: '16px'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#f1f5f9', // Light gray background
                borderRadius: '6px', // Rounded square
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0' // Subtle border
              }}
            >
              <span 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px', // Slightly smaller to fit in box
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#374151',
                  lineHeight: '1'
                }}
              >
                {openVouchersCount}
              </span>
            </div>
          </div>

          {/* Right side: Combined value */}
          <div 
            style={{
              textAlign: 'right',
              flex: 1,
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <span 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#2D8CCA', // MyMoolah blue for voucher asset class
                lineHeight: '1.2'
              }}
            >
              {formatCurrency(openVouchersValue)}
            </span>
          </div>
        </button>

        {/* Referral Card - NEW */}
        <button
          onClick={() => navigate('/referrals')}
          style={{
            width: '100%',
            backgroundColor: '#f0f9ff',
            border: '2px solid #2D8CCA',
            borderRadius: 'var(--mobile-border-radius)',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: 'var(--mobile-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e0f2fe';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(45, 140, 202, 0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f9ff';
            e.currentTarget.style.boxShadow = 'var(--mobile-shadow)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          aria-label="View referral program"
        >
          {/* Left side: Icon */}
          <div 
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: '#2D8CCA',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              flexShrink: 0
            }}
          >
            <Gift style={{ width: '24px', height: '24px', color: '#ffffff' }} />
          </div>

          {/* Center: Info */}
          <div style={{ flex: 1 }}>
            <h3 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                marginBottom: '2px',
                margin: '0 0 2px 0'
              }}
            >
              Earn with Referrals
            </h3>
            <p 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-small)',
                fontWeight: 'var(--font-weight-normal)',
                color: '#6b7280',
                margin: '0'
              }}
            >
              Invite friends • Earn up to 15% commission
            </p>
          </div>

          {/* Right side: Arrow */}
          <ChevronRight 
            style={{ 
              width: '20px', 
              height: '20px', 
              color: '#2D8CCA',
              flexShrink: 0
            }} 
          />
        </button>

        {/* Recent Transactions Card - AWARD-WINNING DESIGN WITH ICONS */}
        <button
          onClick={handleRecentTransactionsClick}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 'var(--mobile-border-radius)',
            padding: '0',
            marginBottom: '24px',
            boxShadow: 'var(--mobile-shadow)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#fafbfc';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.boxShadow = 'var(--mobile-shadow)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          aria-label="View full transaction history"
        >
          {/* Card Header */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 20px 16px 20px',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <h3 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                margin: '0'
              }}
            >
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

          {/* Transaction List */}
          <div style={{ padding: '0 20px 20px 20px' }}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: index === recentTransactions.length - 1 ? '0' : '16px',
                    marginBottom: index === recentTransactions.length - 1 ? '0' : '16px',
                    borderBottom: index === recentTransactions.length - 1 ? 'none' : '1px solid #f8fafc',
                    width: '100%'
                  }}
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
                      {getTransactionIcon({
                        id: transaction.id,
                        type: transaction.type === 'received' ? 'receive' : 'send',
                        amount: transaction.amount,
                        description: transaction.description,
                        senderWalletId: transaction.senderWalletId,
                        receiverWalletId: transaction.receiverWalletId,
                        metadata: transaction.metadata || {}
                      }, 20)}
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
                        {getPrimaryDisplayText(transaction)}
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
                        {formatTransactionDate(transaction.date)}
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
                        color: getTransactionColor(transaction),
                        lineHeight: '1.2'
                      }}
                    >
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                color: '#6b7280',
                fontSize: 'var(--mobile-font-base)',
                textAlign: 'center'
              }}>
                <div>
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
                    {/* ShoppingBag style={{ width: '24px', height: '24px', color: '#9ca3af' }} /> */}
                  </div>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'var(--font-weight-medium)' }}>
                    No recent transactions
                  </p>
                  <p style={{ margin: '0', fontSize: 'var(--mobile-font-small)' }}>
                    Your transaction history will appear here
                  </p>
                </div>
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}