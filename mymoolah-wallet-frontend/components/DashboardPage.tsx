import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChevronRight,
  ShoppingBag,
  ArrowDownLeft,
  Phone,
  ArrowUpRight,
  Coffee,
  Car
} from 'lucide-react';

// Transaction type
interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'purchase' | 'payment';
  description: string;
  amount: number;
  date: Date;
  recipient?: string;
  icon?: React.ReactNode;
  category?: string;
}

// Helper: Get transaction icon based on type and description
function getTransactionIcon(transaction: Omit<Transaction, 'icon'>) {
  const iconStyle = { width: '20px', height: '20px' };
  switch (transaction.type) {
    case 'received':
      return <ArrowDownLeft style={iconStyle} />;
    case 'sent':
      return <ArrowUpRight style={iconStyle} />;
    case 'purchase':
      if (
        transaction.description.toLowerCase().includes('woolworths') ||
        transaction.description.toLowerCase().includes('grocery') ||
        transaction.description.toLowerCase().includes('food')
      ) {
        return <ShoppingBag style={iconStyle} />;
      }
      if (
        transaction.description.toLowerCase().includes('caf') ||
        transaction.description.toLowerCase().includes('coffee')
      ) {
        return <Coffee style={iconStyle} />;
      }
      return <ShoppingBag style={iconStyle} />;
    case 'payment':
      if (
        transaction.description.toLowerCase().includes('airtime') ||
        transaction.description.toLowerCase().includes('vodacom') ||
        transaction.description.toLowerCase().includes('mtn')
      ) {
        return <Phone style={iconStyle} />;
      }
      if (
        transaction.description.toLowerCase().includes('uber') ||
        transaction.description.toLowerCase().includes('taxi') ||
        transaction.description.toLowerCase().includes('transport')
      ) {
        return <Car style={iconStyle} />;
      }
      return <Phone style={iconStyle} />;
    default:
      return <ShoppingBag style={iconStyle} />;
  }
}

// Helper: Format currency
function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Helper: Format date
function formatTransactionDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-ZA', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}:${month}:${year} ${hours}:${minutes}`;
}

// Helper: Extract first name for greeting
function getGreetingName(fullName: string | undefined): string {
  if (!fullName || !fullName.trim()) return '';
  return fullName.trim().split(' ')[0];
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for real data
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [openVouchersCount, setOpenVouchersCount] = useState<number>(0);
  const [openVouchersValue, setOpenVouchersValue] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Fetch wallet balance
    const fetchBalance = fetch('/api/v1/wallet/balance')
      .then(res => res.json())
      .then(data => {
        if (typeof data.balance === 'number') setWalletBalance(data.balance);
      })
      .catch(() => setWalletBalance(null));

    // Fetch open vouchers
    const fetchVouchers = fetch('/api/v1/wallet/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.vouchers)) {
          setOpenVouchersCount(data.vouchers.length);
          setOpenVouchersValue(
            data.vouchers.reduce((sum: number, v: any) => sum + (v.amount || 0), 0)
          );
        }
      })
      .catch(() => {
        setOpenVouchersCount(0);
        setOpenVouchersValue(0);
      });

    // Fetch recent transactions
    const fetchTransactions = fetch('/api/v1/wallet/transactions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.transactions)) {
          setRecentTransactions(
            data.transactions.map((t: any) => ({
              ...t,
              date: new Date(t.date),
            }))
          );
        }
      })
      .catch(() => setRecentTransactions([]));

    Promise.all([fetchBalance, fetchVouchers, fetchTransactions])
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 375, margin: '0 auto', padding: 16 }}>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
        Welcome back{user?.name ? `, ${getGreetingName(user.name)}!` : '!'}
      </h2>
      <div style={{
        background: '#f3f4f6',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ fontSize: 16, color: '#6b7280', marginBottom: 4 }}>Wallet Balance</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>
          {walletBalance !== null ? formatCurrency(walletBalance) : '—'}
        </div>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 24
      }}>
        <div style={{
          flex: 1,
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          marginRight: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Open Vouchers</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{openVouchersCount}</div>
        </div>
        <div style={{
          flex: 1,
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          marginLeft: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Voucher Value</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            {openVouchersValue ? formatCurrency(openVouchersValue) : '—'}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Recent Transactions</div>
        {recentTransactions.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 14 }}>No recent transactions.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recentTransactions.slice(0, 5).map((tx, idx) => (
              <li
                key={tx.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: idx < recentTransactions.length - 1 ? '1px solid #e5e7eb' : 'none',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/transact/${tx.id}`)}
              >
                <span style={{ marginRight: 16 }}>
                                      {getTransactionIcon(tx)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{tx.description}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    {formatTransactionDate(tx.date)}
                  </div>
                </div>
                <div style={{
                  fontWeight: 600,
                  color: tx.type === 'received' ? '#059669' : '#ef4444',
                  fontSize: 15,
                  marginLeft: 12
                }}>
                  {tx.type === 'received' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
                <ChevronRight style={{ width: 18, height: 18, color: '#9ca3af', marginLeft: 8 }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 