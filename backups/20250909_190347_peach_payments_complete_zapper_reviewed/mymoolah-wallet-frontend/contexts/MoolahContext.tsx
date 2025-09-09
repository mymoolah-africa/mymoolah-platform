import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

interface WalletBalance {
  available: number;
  pending: number;
  currency: string;
}

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
}

interface TodayActivity {
  received: number;
  sent: number;
}

interface NotificationItem {
  id: number;
  title: string;
  message?: string;
  type: 'txn_wallet_credit' | 'txn_bank_credit' | 'maintenance' | 'promo';
  createdAt: string;
  readAt?: string | null;
  freezeUntilViewed?: boolean;
  payload?: any;
}

interface MoolahContextType {
  walletBalance: WalletBalance | null;
  balance: number;
  hideBalance: boolean;
  toggleBalanceVisibility: () => void;
  voucherBalance: number;
  recentTransactions: Transaction[];
  allTransactions: Transaction[]; // NEW: All transactions for transaction history
  todayActivity: TodayActivity;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  refreshTransactions: () => Promise<void>; // NEW: Dedicated transaction refresh
  sendMoney: (recipient: string, amount: number) => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  blockingNotification: NotificationItem | null;
  respondToPaymentRequest: (requestId: number, action: 'approve' | 'decline', notificationId?: number) => Promise<void>;
  // Event-driven balance refresh
  refreshBalanceAfterAction: (action: 'payment_request_created' | 'payment_request_approved' | 'payment_request_declined' | 'money_sent' | 'money_received') => Promise<void>;
  refreshBalanceAfterTransaction: () => Promise<void>;
}

const MoolahContext = createContext<MoolahContextType | undefined>(undefined);

export function MoolahProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [balance, setBalance] = useState(0);
  const [hideBalance, setHideBalance] = useState(false);
  const [voucherBalance, setVoucherBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // NEW: All transactions
  const [todayActivity, setTodayActivity] = useState<TodayActivity>({ received: 0, sent: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [blockingNotification, setBlockingNotification] = useState<NotificationItem | null>(null);

  useEffect(() => {
    if (user) {
      // Initial data load when user logs in
      refreshData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Initial notification load when user logs in
    refreshNotifications();
    
    // REMOVED: Harmful polling interval
    // Only refresh notifications on-demand or when events occur
    // This follows Mojaloop and banking best practices for scalability
    // 
    // FUTURE: Will implement WebSocket/SSE for real-time updates
    // FUTURE: Will add smart polling fallback with exponential backoff
  }, [user]);

  const toggleBalanceVisibility = () => {
    setHideBalance(!hideBalance);
  };

  // NEW: Transform transactions from backend format to frontend format
  const transformTransactions = (transactions: any[]): Transaction[] => {
    return transactions.map((tx: any) => {
      // Determine the transaction type for display and icon selection
      let type: 'received' | 'sent' | 'payment';
      let amount: number;
      
      // Handle backend transaction types correctly
      if (tx.type === 'deposit' || tx.type === 'receive' || tx.type === 'credit' || tx.type === 'received') {
        // Receive transactions are credits (increase wallet balance) - GREEN
        type = 'received';
        amount = tx.amount;
      } else if (tx.type === 'refund') {
        // Refund transactions are credits (increase wallet balance) - GREEN
        type = 'received';
        amount = tx.amount;
      } else if (tx.type === 'send' || tx.type === 'sent') {
        // Send transactions are debits (decrease wallet balance) - RED
        type = 'sent';
        amount = -tx.amount;
      } else if (tx.type === 'payment') {
        // Payment transactions are debits (decrease wallet balance) - RED
        type = 'payment';
        amount = -tx.amount;
      } else {
        // Treat unknown backend types as standard wallet-to-wallet sends (debit) - RED
        type = 'sent';
        amount = -tx.amount;
      }
      
      const date = new Date(tx.createdAt || tx.date);
      
      return {
        id: tx.id || `tx_${tx.transactionId}`,
        type,
        amount,
        currency: tx.currency || 'ZAR',
        description: tx.description || 'Transaction',
        date: date.toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: date.toISOString(),
        status: tx.status || 'completed',
        counterparty: tx.metadata?.counterpartyIdentifier || 'Unknown'
      };
    });
  };

  const refreshData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const token = getToken();
      
      // Real API calls for production (when backend is ready)
      const headers = { Authorization: `Bearer ${token}` };

        // Fetch wallet balance
        const balanceResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance?_t=${Date.now()}` , { headers });
        if (!balanceResponse.ok) throw new Error('Failed to fetch balance');
        const balanceData = await balanceResponse.json();
        
        // Check if balance actually changed
        const newBalance = balanceData.data?.available;
        const balanceChanged = newBalance !== balance;
        
        setWalletBalance(balanceData.data);
        setBalance(newBalance);

        // Fetch voucher balance
        const voucherResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/active?_t=${Date.now()}` , { headers });
        if (!voucherResponse.ok) throw new Error('Failed to fetch voucher balance');
        const voucherData = await voucherResponse.json();
        setVoucherBalance(voucherData.data?.length || 0);

        // NEW: Fetch all transactions (single API call for both recent and all)
        const transactionsResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/transactions?limit=50&_t=${Date.now()}`, { headers });
        if (!transactionsResponse.ok) throw new Error('Failed to fetch transactions');
        const transactionsData = await transactionsResponse.json();
        
        // Transform transactions using the new function
        const allTransactions = transformTransactions(transactionsData.data?.transactions || []);
        setAllTransactions(allTransactions);
        setRecentTransactions(allTransactions.slice(0, 10)); // Recent 10 for dashboard
        
        // Calculate today's activity from transformed transactions
        const today = new Date().toDateString();
        const todayTransactions = allTransactions.filter(tx => 
          new Date(tx.timestamp).toDateString() === today
        );
        const todayActivity = {
          received: todayTransactions.filter(tx => tx.type === 'received').reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
          sent: todayTransactions.filter(tx => tx.type === 'sent' || tx.type === 'payment').reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        };
        setTodayActivity(todayActivity);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      // Fallback to empty/safe values on error
      setWalletBalance({ available: 0, pending: 0, currency: 'ZAR' });
      setBalance(0);
      setVoucherBalance(0);
      setRecentTransactions([]);
      setAllTransactions([]); // NEW: Reset all transactions
      setTodayActivity({ received: 0, sent: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Dedicated transaction refresh function
  const refreshTransactions = async () => {
    if (!user) return;
    
    try {
      const token = getToken();
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all transactions
      const transactionsResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/transactions?limit=50&_t=${Date.now()}`, { headers });
      if (!transactionsResponse.ok) throw new Error('Failed to fetch transactions');
      const transactionsData = await transactionsResponse.json();
      
      // Transform and update transactions
      const allTransactions = transformTransactions(transactionsData.data?.transactions || []);
      setAllTransactions(allTransactions);
      setRecentTransactions(allTransactions.slice(0, 10)); // Recent 10 for dashboard
      

    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    }
  };

  const sendMoney = async (recipient: string, amount: number) => {
    if (!user || !walletBalance) throw new Error('User not authenticated');

    const token = getToken();
    
    // Real API transfer
    const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/send-money`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        recipientPhoneNumber: recipient,
        amount,
        currency: walletBalance.currency
      })
    });

    if (!response.ok) {
      throw new Error('Transfer failed');
    }

            // Balance refresh after transfer
    // await refreshData();
  };

  const refreshNotifications = async () => {
    try {
      const token = getToken();
      if (!token) {
        // No token yet (e.g., before login) – avoid hitting API with "Bearer null"
        setNotifications([]);
        setUnreadCount(0);
        setBlockingNotification(null);
        return;
      }

      const res = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/notifications?status=unread&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Silently ignore unauthorized responses (token expired/not yet set)
      if (!res.ok) {
        return;
      }

      const json = await res.json();
      const list: NotificationItem[] = json?.data || [];
      setNotifications(list);
      setUnreadCount(list.length);
      const blocker = list.find(n => n.freezeUntilViewed);
      setBlockingNotification(blocker || null);
      

      // Event-driven balance refresh after transaction notifications
      const hasTransactionNotification = list.some(n => {
        // Check for transaction notification types
        const isTransactionType = n.type === 'txn_wallet_credit' || n.type === 'txn_bank_credit';
        
        // Check for balance refresh reason in payload
        const hasBalanceRefreshReason = n.payload?.reason === 'balance_refresh';
        
        // Check for transaction-related titles
        const isTransactionTitle = n.title?.includes('Payment') || 
                                 n.title?.includes('Received') || 
                                 n.title?.includes('Sent') ||
                                 n.title?.includes('Transaction');
        
        return isTransactionType || hasBalanceRefreshReason || isTransactionTitle;
      });
      
      // Only refresh if we have transaction notifications AND haven't refreshed recently
      if (hasTransactionNotification) {
        const now = Date.now();
        const lastRefreshTime = (window as any).lastBalanceRefreshTime || 0;
        const timeSinceLastRefresh = now - lastRefreshTime;
        
        // Debounce: only refresh if it's been more than 2 seconds since last refresh
        if (timeSinceLastRefresh > 2000) {
          (window as any).lastBalanceRefreshTime = now;
          await refreshBalanceAfterAction('money_received');
          await refreshTransactions(); // NEW: Also refresh transactions
        }
      }
    } catch (_) {}
  };

  const markRead = async (id: number) => {
    try {
      const token = getToken();
      if (!token) return;
      await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshNotifications();
    } catch (_) {}
  };

  const respondToPaymentRequest = async (requestId: number, action: 'approve' | 'decline', notificationId?: number) => {
    try {
      const token = getToken();
      if (!token) return;
      await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      if (notificationId) {
        await markRead(notificationId);
      } else {
        await refreshNotifications();
      }
      // Event-driven balance refresh after payment request response
      await refreshBalanceAfterAction(action === 'approve' ? 'payment_request_approved' : 'payment_request_declined');
    } catch (_) {}
  };

  // Event-driven balance refresh system
  const refreshBalanceAfterAction = async (action: 'payment_request_created' | 'payment_request_approved' | 'payment_request_declined' | 'money_sent' | 'money_received') => {
    
    try {
      // Debounce multiple rapid calls
      if (isLoading) {
        return;
      }

      // Refresh balance based on action type
      switch (action) {
        case 'payment_request_created':
          // For created requests, only refresh if it's a bank request (affects pending balance)
          await refreshData();
          break;
          
        case 'payment_request_approved':
          // Approved requests affect actual balance
          await refreshData();
          break;
          
        case 'payment_request_declined':
          // Declined requests don't affect balance, but refresh for consistency
          await refreshData();
          break;
          
        case 'money_sent':
          // Money sent affects sender's balance
          await refreshData();
          break;
          
        case 'money_received':
          // Money received affects recipient's balance
          await refreshData();
          break;
          
        default:
          // Unknown action, skip balance refresh
      }
    } catch (error) {
      console.error('❌ Event-driven balance refresh failed:', error);
      // Don't throw error to prevent breaking the main flow
    }
  };

  // Convenience function for transaction-related balance refresh
  const refreshBalanceAfterTransaction = async () => {
    await refreshBalanceAfterAction('money_sent');
  };

  return (
    <MoolahContext.Provider value={{
      walletBalance,
      balance,
      hideBalance,
      toggleBalanceVisibility,
      voucherBalance,
      recentTransactions,
      allTransactions, // NEW: All transactions
      todayActivity,
      isLoading,
      refreshData,
      refreshTransactions, // NEW: Dedicated transaction refresh
      sendMoney,
      notifications,
      unreadCount,
      refreshNotifications,
      markRead,
      blockingNotification,
      respondToPaymentRequest,
      // Event-driven balance refresh
      refreshBalanceAfterAction,
      refreshBalanceAfterTransaction
    }}>
      {children}
    </MoolahContext.Provider>
  );
}

export function useMoolah() {
  const context = useContext(MoolahContext);
  if (context === undefined) {
    throw new Error('useMoolah must be used within a MoolahProvider');
  }
  return context;
}