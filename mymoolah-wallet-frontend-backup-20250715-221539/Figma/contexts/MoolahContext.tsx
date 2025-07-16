import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface WalletBalance {
  available: number;
  pending: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  counterparty?: string;
}

interface MoolahContextType {
  walletBalance: WalletBalance | null;
  voucherBalance: number;
  recentTransactions: Transaction[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  sendMoney: (recipient: string, amount: number) => Promise<void>;
}

const MoolahContext = createContext<MoolahContextType | undefined>(undefined);

export function MoolahProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [voucherBalance, setVoucherBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('mymoolah_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch wallet balance
      const balanceResponse = await fetch(`/api/wallet/${user.walletId}/balance`, { headers });
      const balanceData = await balanceResponse.json();
      setWalletBalance(balanceData);

      // Fetch voucher balance
      const voucherResponse = await fetch(`/api/vouchers/${user.id}/balance`, { headers });
      const voucherData = await voucherResponse.json();
      setVoucherBalance(voucherData.total);

      // Fetch recent transactions
      const transactionsResponse = await fetch(`/api/transactions/${user.walletId}?limit=5`, { headers });
      const transactionsData = await transactionsResponse.json();
      setRecentTransactions(transactionsData.transactions);

    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMoney = async (recipient: string, amount: number) => {
    if (!user || !walletBalance) throw new Error('User not authenticated');

    const token = localStorage.getItem('mymoolah_token');
    const response = await fetch('/api/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fromWalletId: user.walletId,
        toPhoneNumber: recipient,
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
      voucherBalance,
      recentTransactions,
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