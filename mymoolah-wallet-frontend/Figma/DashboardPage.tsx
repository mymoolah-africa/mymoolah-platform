import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Import icons directly from lucide-react for testing
import { 
  User, 
  Bell,
  ChevronRight,
  ShoppingBag,
  ArrowDownLeft,
  Phone,
  ArrowUpRight,
  Coffee,
  Car
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
          fontWeight: '700',
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
      if (transaction.description.toLowerCase().includes('woolworths') || 
          transaction.description.toLowerCase().includes('grocery') ||
          transaction.description.toLowerCase().includes('food')) {
        return <ShoppingBag style={iconStyle} />;
      }
      if (transaction.description.toLowerCase().includes('caf') || 
          transaction.description.toLowerCase().includes('coffee')) {
        return <Coffee style={iconStyle} />;
      }
      // Default to shopping bag for purchases
      return <ShoppingBag style={iconStyle} />;
    case 'payment':
      // Smart icon selection based on description
      if (transaction.description.toLowerCase().includes('airtime') || 
          transaction.description.toLowerCase().includes('vodacom') ||
          transaction.description.toLowerCase().includes('mtn')) {
        return <Phone style={iconStyle} />;
      }
      if (transaction.description.toLowerCase().includes('uber') || 
          transaction.description.toLowerCase().includes('taxi') ||
          transaction.description.toLowerCase().includes('transport')) {
        return <Car style={iconStyle} />;
      }
      // Default to phone for payments
      return <Phone style={iconStyle} />;
    default:
      return <ShoppingBag style={iconStyle} />;
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

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Mock wallet balance - you can connect this to your context later
  const walletBalance = 12345.67; // This would come from your MoolahContext or API
  
  // Mock vouchers data - you can connect this to your context later
  const openVouchersCount = 5;
  const openVouchersValue = 2450.00; // This would come from your MoolahContext or API

  // Mock recent transactions - 6 most recent (with proper icons restored)
  const recentTransactions: Transaction[] = [
    {
      id: 'tx_001',
      type: 'purchase',
      description: 'Woolworths Sandton',
      amount: -245.50,
      date: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      category: 'Groceries',
      icon: getTransactionIcon({
        id: 'tx_001',
        type: 'purchase',
        description: 'Woolworths Sandton',
        amount: -245.50,
        date: new Date(),
        category: 'Groceries',
        icon: null
      } as Transaction)
    },
    {
      id: 'tx_002',
      type: 'received',
      description: 'From Sarah M.',
      amount: 500.00,
      date: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      recipient: 'Sarah M.',
      category: 'Transfer',
      icon: getTransactionIcon({
        id: 'tx_002',
        type: 'received',
        description: 'From Sarah M.',
        amount: 500.00,
        date: new Date(),
        category: 'Transfer',
        icon: null
      } as Transaction)
    },
    {
      id: 'tx_003',
      type: 'payment',
      description: 'Vodacom Airtime',
      amount: -55.00,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
      category: 'Airtime',
      icon: getTransactionIcon({
        id: 'tx_003',
        type: 'payment',
        description: 'Vodacom Airtime',
        amount: -55.00,
        date: new Date(),
        category: 'Airtime',
        icon: null
      } as Transaction)
    },
    {
      id: 'tx_004',
      type: 'sent',
      description: 'To John K.',
      amount: -120.00,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      recipient: 'John K.',
      category: 'Transfer',
      icon: getTransactionIcon({
        id: 'tx_004',
        type: 'sent',
        description: 'To John K.',
        amount: -120.00,
        date: new Date(),
        category: 'Transfer',
        icon: null
      } as Transaction)
    },
    {
      id: 'tx_005',
      type: 'purchase',
      description: 'Vida e Caffè',
      amount: -42.90,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      category: 'Food & Drink',
      icon: getTransactionIcon({
        id: 'tx_005',
        type: 'purchase',
        description: 'Vida e Caffè',
        amount: -42.90,
        date: new Date(),
        category: 'Food & Drink',
        icon: null
      } as Transaction)
    },
    {
      id: 'tx_006',
      type: 'payment',
      description: 'Uber Trip',
      amount: -67.50,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
      category: 'Transport',
      icon: getTransactionIcon({
        id: 'tx_006',
        type: 'payment',
        description: 'Uber Trip',
        amount: -67.50,
        date: new Date(),
        category: 'Transport',
        icon: null
      } as Transaction)
    }
  ];

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
        <h1 
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
            textAlign: 'center'
          }}
        >
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        
        <p 
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: '24px'
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
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          aria-label="View wallet transaction history"
        >
          {/* Left side: Wallet info */}
          <div style={{ flex: 1 }}>
            <h3 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '18px',
                fontWeight: '700',
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
                fontSize: '14px',
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
                fontSize: '24px',
                fontWeight: '700',
                color: walletBalance >= 0 ? '#16a34a' : '#dc2626', // Green for positive, red for negative
                lineHeight: '1.2'
              }}
            >
              {formatCurrency(walletBalance)}
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
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          aria-label="View vouchers page"
        >
          {/* Left side: Vouchers info */}
          <div style={{ flex: 1 }}>
            <h3 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '18px',
                fontWeight: '700',
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
                  fontWeight: '600',
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
                fontSize: '22px',
                fontWeight: '700',
                color: '#2D8CCA', // MyMoolah blue for voucher asset class
                lineHeight: '1.2'
              }}
            >
              {formatCurrency(openVouchersValue)}
            </span>
          </div>
        </button>

        {/* Recent Transactions Card - AWARD-WINNING DESIGN WITH RESTORED ICONS */}
        <button
          onClick={handleRecentTransactionsClick}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '0',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
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
                fontSize: '18px',
                fontWeight: '700',
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
            {recentTransactions.map((transaction, index) => (
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
                  {/* Transaction Icon - RESTORED WITH PROPER ICONS */}
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
                        fontSize: '12px',
                        fontWeight: '500',
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
                        fontSize: '12px',
                        fontWeight: '400',
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
                      fontSize: '16px',
                      fontWeight: '700',
                      color: getTransactionColor(transaction),
                      lineHeight: '1.2'
                    }}
                  >
                    {transaction.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </button>
      </div>
    </div>
  );
}