import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { APP_CONFIG } from '../config/app-config';

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

interface MoolahContextType {
  walletBalance: WalletBalance | null;
  balance: number;
  hideBalance: boolean;
  toggleBalanceVisibility: () => void;
  voucherBalance: number;
  recentTransactions: Transaction[];
  todayActivity: TodayActivity;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  sendMoney: (recipient: string, amount: number) => Promise<void>;
}

const MoolahContext = createContext<MoolahContextType | undefined>(undefined);

export function MoolahProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [balance, setBalance] = useState(0);
  const [hideBalance, setHideBalance] = useState(false);
  const [voucherBalance, setVoucherBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [todayActivity, setTodayActivity] = useState<TodayActivity>({ received: 0, sent: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const toggleBalanceVisibility = () => {
    setHideBalance(!hideBalance);
  };

  const refreshData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { getToken } = await import('../utils/authToken');
      const token = getToken();
      
      if (token && token.startsWith('demo-token-')) {
        // Demo mode - use mock data
        const mockWalletBalance: WalletBalance = {
          available: 12450.75,
          pending: 150.00,
          currency: 'ZAR'
        };
        
        const mockTransactions: Transaction[] = [
          {
            id: 'txn-001',
            type: 'received',
            amount: 500.00,
            currency: 'ZAR',
            description: 'Payment from John Smith',
            date: 'Today, 10:30 AM',
            timestamp: new Date().toISOString(),
            status: 'completed',
            counterparty: '+27 82 123 4567'
          },
          {
            id: 'txn-002',
            type: 'sent',
            amount: 250.00,
            currency: 'ZAR',
            description: 'Groceries - Pick n Pay',
            date: 'Today, 09:15 AM',
            timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
            status: 'completed',
            counterparty: 'Pick n Pay Sandton'
          },
          {
            id: 'txn-003',
            type: 'payment',
            amount: 89.50,
            currency: 'ZAR',
            description: 'Uber Trip',
            date: 'Yesterday, 6:45 PM',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 17).toISOString(),
            status: 'completed',
            counterparty: 'Uber'
          },
          {
            id: 'txn-004',
            type: 'received',
            amount: 1200.00,
            currency: 'ZAR',
            description: 'Salary Payment',
            date: 'Yesterday, 12:00 PM',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            status: 'completed',
            counterparty: 'ABC Company'
          },
          {
            id: 'txn-005',
            type: 'sent',
            amount: 75.00,
            currency: 'ZAR',
            description: 'Airtime Top-up',
            date: '2 days ago',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            status: 'completed',
            counterparty: 'MTN'
          }
        ];

        const mockTodayActivity: TodayActivity = {
          received: 500.00,
          sent: 250.00
        };

        setWalletBalance(mockWalletBalance);
        setBalance(mockWalletBalance.available);
        setVoucherBalance(45.50);
        setRecentTransactions(mockTransactions);
        setTodayActivity(mockTodayActivity);
      } else {
        // Real API calls for production (when backend is ready)
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch wallet balance
        const balanceResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance`, { headers });
        if (!balanceResponse.ok) throw new Error('Failed to fetch balance');
        const balanceData = await balanceResponse.json();
        setWalletBalance(balanceData.data);
        setBalance(balanceData.data.available);

        // Fetch voucher balance
        const voucherResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/vouchers/active`, { headers });
        if (!voucherResponse.ok) throw new Error('Failed to fetch voucher balance');
        const voucherData = await voucherResponse.json();
        setVoucherBalance(voucherData.data?.length || 0);

        // Fetch recent transactions
        const transactionsResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/transactions?limit=5`, { headers });
        if (!transactionsResponse.ok) throw new Error('Failed to fetch transactions');
        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData.data?.transactions || []);

        // Fetch today's activity
        const activityResponse = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/transactions?limit=10`, { headers });
        if (!activityResponse.ok) throw new Error('Failed to fetch activity');
        const activityData = await activityResponse.json();
        const todayTransactions = activityData.data?.transactions || [];
        const todayActivity = {
          received: todayTransactions.filter((t: any) => t.type === 'credit').reduce((sum: number, t: any) => sum + t.amount, 0),
          sent: todayTransactions.filter((t: any) => t.type === 'debit').reduce((sum: number, t: any) => sum + t.amount, 0)
        };
        setTodayActivity(todayActivity);
      }
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      // Fallback to empty/safe values on error
      setWalletBalance({ available: 0, pending: 0, currency: 'ZAR' });
      setBalance(0);
      setVoucherBalance(0);
      setRecentTransactions([]);
      setTodayActivity({ received: 0, sent: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMoney = async (recipient: string, amount: number) => {
    if (!user || !walletBalance) throw new Error('User not authenticated');

    const { getToken } = await import('../utils/authToken');
    const token = getToken();
    
    if (token && token.startsWith('demo-token-')) {
      // Demo mode - simulate transfer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update demo balance
      const newBalance = balance - amount;
      setBalance(newBalance);
      setWalletBalance(prev => prev ? { ...prev, available: newBalance } : null);
      
      // Add transaction to history
      const newTransaction: Transaction = {
        id: `txn-${Date.now()}`,
        type: 'sent',
        amount,
        currency: 'ZAR',
        description: `Transfer to ${recipient}`,
        date: 'Just now',
        timestamp: new Date().toISOString(),
        status: 'completed',
        counterparty: recipient
      };
      
      setRecentTransactions(prev => [newTransaction, ...prev.slice(0, 4)]);
      return;
    }

    // Real API transfer (when backend is ready)
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

    // Refresh data after successful transfer
    await refreshData();
  };

  return (
    <MoolahContext.Provider value={{
      walletBalance,
      balance,
      hideBalance,
      toggleBalanceVisibility,
      voucherBalance,
      recentTransactions,
      todayActivity,
      isLoading,
      refreshData,
      sendMoney
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