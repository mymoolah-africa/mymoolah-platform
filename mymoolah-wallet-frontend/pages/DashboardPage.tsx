import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/app-config';

// Import icons directly from lucide-react
import { 
  User, 
  Bell,
  ChevronRight,
  ShoppingBag,
  ArrowDownLeft,
  Phone,
  ArrowUpRight,
  Coffee,
  Car,
  CreditCard,
  Wallet,
  Gift,
  Home,
  Utensils,
  ShoppingCart,
  Bus,
  Train,
  Plane,
  Wifi,
  Zap
} from 'lucide-react';

// Enhanced logo component with better styling and sizing
function Logo3Component() {
  const [logoError, setLogoError] = useState(false);

  if (logoError) {
    return (
      <div 
        style={{ 
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'var(--font-weight-bold)',
          color: '#1f2937',
          fontFamily: 'Montserrat, sans-serif',
          textAlign: 'center'
        }}
      >
        MyMoolah
      </div>
    );
  }

  return (
    <img 
      src="/src/assets/logo3.svg"
      alt="MyMoolah Logo" 
      style={{ 
        height: '40px', // Increased from 32px for better prominence
        width: 'auto',
        maxWidth: '180px', // Increased max width
        objectFit: 'contain',
        display: 'block'
      }}
      onError={() => setLogoError(true)}
    />
  );
}

// Format currency function
function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Format date function for transactions
function formatTransactionDate(date: Date): string {
  // Format as dd:mmm:yyyy hh:mm
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-ZA', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}:${month}:${year} ${hours}:${minutes}`;
}

// Get transaction icon based on transaction type and description
function getTransactionIcon(transaction: Transaction) {
  const iconStyle = { width: '20px', height: '20px' };
  
  switch (transaction.type) {
    case 'received':
      return <ArrowDownLeft style={iconStyle} />;
    case 'sent':
      return <ArrowUpRight style={iconStyle} />;
    case 'purchase':
      // Smart icon selection based on description
      const desc = transaction.description.toLowerCase();
      if (desc.includes('woolworths') || desc.includes('grocery') || desc.includes('food') || desc.includes('supermarket')) {
        return <ShoppingCart style={iconStyle} />;
      }
      if (desc.includes('caf') || desc.includes('coffee') || desc.includes('restaurant') || desc.includes('food')) {
        return <Utensils style={iconStyle} />;
      }
      if (desc.includes('uber') || desc.includes('taxi') || desc.includes('transport') || desc.includes('ride')) {
        return <Car style={iconStyle} />;
      }
      if (desc.includes('airtime') || desc.includes('vodacom') || desc.includes('mtn') || desc.includes('cell')) {
        return <Phone style={iconStyle} />;
      }
      if (desc.includes('electricity') || desc.includes('power') || desc.includes('eskom')) {
        return <Zap style={iconStyle} />;
      }
      if (desc.includes('internet') || desc.includes('wifi') || desc.includes('data')) {
        return <Wifi style={iconStyle} />;
      }
      if (desc.includes('flight') || desc.includes('airline') || desc.includes('travel')) {
        return <Plane style={iconStyle} />;
      }
      if (desc.includes('bus') || desc.includes('public transport')) {
        return <Bus style={iconStyle} />;
      }
      if (desc.includes('train') || desc.includes('rail')) {
        return <Train style={iconStyle} />;
      }
      if (desc.includes('home') || desc.includes('rent') || desc.includes('property')) {
        return <Home style={iconStyle} />;
      }
      if (desc.includes('gift') || desc.includes('present')) {
        return <Gift style={iconStyle} />;
      }
      // Default to shopping bag for purchases
      return <ShoppingBag style={iconStyle} />;
    case 'payment':
      // Smart icon selection based on description
      const paymentDesc = transaction.description.toLowerCase();
      if (paymentDesc.includes('airtime') || paymentDesc.includes('vodacom') || paymentDesc.includes('mtn') || paymentDesc.includes('cell')) {
        return <Phone style={iconStyle} />;
      }
      if (paymentDesc.includes('uber') || paymentDesc.includes('taxi') || paymentDesc.includes('transport') || paymentDesc.includes('ride')) {
        return <Car style={iconStyle} />;
      }
      if (paymentDesc.includes('electricity') || paymentDesc.includes('power') || paymentDesc.includes('eskom')) {
        return <Zap style={iconStyle} />;
      }
      if (paymentDesc.includes('internet') || paymentDesc.includes('wifi') || paymentDesc.includes('data')) {
        return <Wifi style={iconStyle} />;
      }
      if (paymentDesc.includes('flight') || paymentDesc.includes('airline') || paymentDesc.includes('travel')) {
        return <Plane style={iconStyle} />;
      }
      if (paymentDesc.includes('bus') || paymentDesc.includes('public transport')) {
        return <Bus style={iconStyle} />;
      }
      if (paymentDesc.includes('train') || paymentDesc.includes('rail')) {
        return <Train style={iconStyle} />;
      }
      if (paymentDesc.includes('home') || paymentDesc.includes('rent') || paymentDesc.includes('property')) {
        return <Home style={iconStyle} />;
      }
      if (paymentDesc.includes('gift') || paymentDesc.includes('present')) {
        return <Gift style={iconStyle} />;
      }
      // Default to credit card for payments
      return <CreditCard style={iconStyle} />;
    default:
      return <Wallet style={iconStyle} />;
  }
}

// Transaction interface
interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'purchase' | 'payment';
  description: string;
  amount: number;
  date: Date;
  recipient?: string;
  icon: React.ReactNode;
  category: string;
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

// Wallet Balance interface
interface WalletBalance {
  available: number;
  pending: number;
  total: number;
  currency: string;
  lastUpdated: string;
}

// Voucher interface
interface Voucher {
  id: number;
  voucherId: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  expiryDate: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State for real data from backend
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    available: 0,
    pending: 0,
    total: 0,
    currency: 'ZAR',
    lastUpdated: new Date().toISOString()
  });
  
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [openVouchers, setOpenVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real data from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('mymoolah_token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch wallet balance
        const balanceResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance`, { headers });
        if (!balanceResponse.ok) throw new Error('Failed to fetch wallet balance');
        const balanceData = await balanceResponse.json();
        
        // Fetch recent transactions
        const transactionsResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/transactions?limit=5`, { headers });
        if (!transactionsResponse.ok) throw new Error('Failed to fetch transactions');
        const transactionsData = await transactionsResponse.json();
        
        // Fetch active vouchers
        const vouchersResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/active`, { headers });
        if (!vouchersResponse.ok) throw new Error('Failed to fetch vouchers');
        const vouchersData = await vouchersResponse.json();

        // Update state with real data
        setWalletBalance(balanceData.data);
        
        // Transform transactions to match frontend format
        const transformedTransactions: Transaction[] = (transactionsData.data?.transactions || []).map((tx: any) => {
          // Determine the transaction type for display and icon selection
          let type: 'sent' | 'received' | 'purchase' | 'payment';
          let amount: number;
          
          if (tx.type === 'credit') {
            type = 'received';
            amount = tx.amount;
          } else if (tx.type === 'debit') {
            // For debit transactions, determine if it's a purchase or payment based on description
            const desc = tx.description.toLowerCase();
            if (desc.includes('woolworths') || desc.includes('grocery') || desc.includes('food') || 
                desc.includes('supermarket') || desc.includes('restaurant') || desc.includes('cafe') ||
                desc.includes('coffee') || desc.includes('shopping')) {
              type = 'purchase';
            } else if (desc.includes('airtime') || desc.includes('vodacom') || desc.includes('mtn') ||
                       desc.includes('electricity') || desc.includes('power') || desc.includes('eskom') ||
                       desc.includes('internet') || desc.includes('wifi') || desc.includes('data') ||
                       desc.includes('uber') || desc.includes('taxi') || desc.includes('transport')) {
              type = 'payment';
            } else {
              type = 'sent';
            }
            amount = -tx.amount;
          } else {
            type = 'payment';
            amount = -tx.amount;
          }
          
          const date = new Date(tx.createdAt || tx.date);
          const category = tx.category || 'Transfer';
          const description = tx.description || 'Transaction';

          return {
            id: tx.id || `tx_${tx.transactionId}`,
            type,
            description,
            amount,
            date,
            category,
            icon: getTransactionIcon({ id: tx.id, type, description, amount, date, category, icon: null } as Transaction)
          };
        });

        setRecentTransactions(transformedTransactions);
        setOpenVouchers(vouchersData.data || []);
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Handle wallet balance card click - navigate to transaction history
  const handleWalletClick = () => {
    // TODO: Create WalletTransactionHistoryPage or TransactionHistoryPage
    // For now, we'll show an alert that this feature is coming soon
    alert('Wallet transaction history page coming soon!');
    // When page is created, use: navigate('/wallet/transactions');
  };

  // Handle vouchers card click - navigate to vouchers page
  const handleVouchersClick = () => {
    navigate('/vouchers');
  };

  // Handle recent transactions card click - navigate to full transaction history
  const handleRecentTransactionsClick = () => {
    // TODO: Create full transaction history page
    alert('Full transaction history page coming soon!');
    // When page is created, use: navigate('/transactions');
  };

  // Get transaction color based on type and amount
  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.type === 'received') {
      return '#16a34a'; // Green for received money
    } else {
      return '#dc2626'; // Red for debit transactions (sent, purchase, payment)
    }
  };

  // Get transaction icon background color
  const getIconBackgroundColor = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'received':
        return '#f0fdf4'; // Light green background
      case 'sent':
        return '#fef3f2'; // Light red background  
      case 'purchase':
        return '#f8fafc'; // Light gray background
      case 'payment':
        return '#f0f9ff'; // Light blue background
      default:
        return '#f8fafc';
    }
  };

  // Get transaction icon color
  const getIconColor = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'received':
        return '#16a34a'; // Green
      case 'sent':
        return '#dc2626'; // Red
      case 'purchase':
        return '#6b7280'; // Gray
      case 'payment':
        return '#2D8CCA'; // MyMoolah blue
      default:
        return '#6b7280';
    }
  };

  // Calculate voucher totals
  const openVouchersCount = openVouchers.length;
  const openVouchersValue = openVouchers.reduce((total, voucher) => total + voucher.amount, 0);

  // Generate the greeting with user's first name
  const greetingName = getGreetingName(user?.name);

  if (isLoading) {
    return (
      <div style={{ 
        fontFamily: 'Montserrat, sans-serif',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        fontFamily: 'Montserrat, sans-serif',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#dc2626'
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Top Card: User | Logo3 | Bell */}
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
            height: '68px', // Slightly increased height for better logo spacing
            padding: '0 16px'
          }}
        >
          {/* Left: User Icon */}
          <button 
            onClick={() => navigate('/profile')}
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
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Go to Profile"
          >
            <User style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>

          {/* Center: Logo3 - Enhanced with better container */}
          <div 
            style={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 16px' // Add padding to prevent logo from touching icons
            }}
          >
            <Logo3Component />
          </div>

          {/* Right: Bell Icon with notification badge */}
          <button 
            onClick={() => alert('Notifications coming soon!')}
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
              position: 'relative',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Messages and Notifications"
          >
            <Bell style={{ width: '24px', height: '24px', color: '#6b7280' }} />
            {/* Red notification badge */}
            <span 
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                backgroundColor: '#dc2626',
                borderRadius: '50%'
              }}
            />
          </button>
        </div>
      </div>

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
                color: walletBalance.available >= 0 ? '#16a34a' : '#dc2626', // Green for positive, red for negative
                lineHeight: '1.2'
              }}
            >
              {formatCurrency(walletBalance.available)}
            </span>
          </div>
        </button>

        {/* Open Vouchers Card - CLICKABLE with Square Box Count */}
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
              Open Vouchers
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
                    borderBottom: index === recentTransactions.length - 1 ? 'none' : '1px solid #f8fafc'
                  }}
                >
                  {/* Left: Icon and Description */}
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: 1
                    }}
                  >
                    {/* Transaction Icon */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: getIconBackgroundColor(transaction),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ color: getIconColor(transaction) }}>
                        {transaction.icon}
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: '#1f2937',
                          margin: '0 0 2px 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {transaction.description}
                      </p>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-normal)',
                          color: '#6b7280',
                          margin: '0'
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
                      paddingLeft: '12px'
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
                      {transaction.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(transaction.amount))}
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
                    <ShoppingBag style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
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