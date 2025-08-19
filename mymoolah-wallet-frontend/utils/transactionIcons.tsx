import React from 'react';
import { 
  Ticket, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Phone, 
  Zap,
  Wifi
} from 'lucide-react';

// Transaction interface for type safety
export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'deposit' | 'withdraw' | 'transfer' | 'payment' | 'refund' | 'fee';
  description?: string;
  amount: number;
  senderWalletId?: string;
  receiverWalletId?: string;
  metadata?: any;
}

// Centralized transaction icon function
export function getTransactionIcon(transaction: Transaction, size: number = 20): React.ReactNode {
  const iconStyle = { width: `${size}px`, height: `${size}px` };
  
  const description = (transaction.description || '').toLowerCase();
  const isCredit = transaction.amount > 0;
  const iconColor = isCredit ? '#16a34a' : '#dc2626'; // Green for credit, red for debit
  
  // 1. VOUCHER TRANSACTIONS (Ticket icons)
  if (description.includes('voucher')) {
    return <Ticket style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 2. AIRTIME TRANSACTIONS
  if (description.includes('airtime') || description.includes('vodacom') || description.includes('mtn') || description.includes('cell c')) {
    return <Phone style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 3. DATA TRANSACTIONS
  if (description.includes('data') || description.includes('internet') || description.includes('wifi')) {
    return <Wifi style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 4. ELECTRICITY TRANSACTIONS
  if (description.includes('electricity') || description.includes('eskom') || description.includes('power')) {
    return <Zap style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 5. BANKING TRANSACTIONS (External bank transfers via APIs)
  if (isBankingTransaction(transaction)) {
    if (isCredit) {
      // Credit (money received) - Green down arrow
      return <ArrowDownLeft style={{ ...iconStyle, color: '#16a34a' }} />;
    } else {
      // Debit (money sent) - Red up arrow
      return <ArrowUpRight style={{ ...iconStyle, color: '#dc2626' }} />;
    }
  }
  
  // 6. MYMOOLAH WALLET TRANSACTIONS (Internal transfers)
  if (isMyMoolahTransaction(transaction)) {
    return <Wallet style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 7. DEFAULT: Other transactions use arrows
  if (isCredit) {
    // Credit (money received) - Green down arrow
    return <ArrowDownLeft style={{ ...iconStyle, color: '#16a34a' }} />;
  } else {
    // Debit (money sent) - Red up arrow
    return <ArrowUpRight style={{ ...iconStyle, color: '#dc2626' }} />;
  }
}

// Helper function to identify banking transactions (external bank transfers via APIs)
function isBankingTransaction(transaction: Transaction): boolean {
  const description = (transaction.description || '').toLowerCase();
  const metadata = transaction.metadata || {};
  
  // Look for specific bank indicators
  const hasBankIndicators = (
    description.includes('external bank') ||
    description.includes('bank transfer') ||
    description.includes('paygate') ||
    description.includes('payfast') ||
    description.includes('paypal') ||
    description.includes('absa') ||
    description.includes('nedbank') ||
    description.includes('standard bank') ||
    description.includes('fnb') ||
    description.includes('capitec') ||
    description.includes('discovery bank') ||
    description.includes('investec') ||
    description.includes('african bank') ||
    description.includes('bidvest bank') ||
    description.includes('postbank') ||
    metadata.bankReference ||
    metadata.externalBank ||
    metadata.bankCode ||
    metadata.accountNumber
  );
  
  return hasBankIndicators;
}

// Helper function to identify MyMoolah wallet transactions (internal transfers)
function isMyMoolahTransaction(transaction: Transaction): boolean {
  const description = (transaction.description || '').toLowerCase();
  
  // Check if this looks like a wallet-to-wallet transfer
  const hasWalletIds = !!transaction.senderWalletId || !!transaction.receiverWalletId;
  
  // Look for patterns that indicate internal transfers
  const hasInternalTransferDescription = (
    description.includes('|') || 
    description.includes('ref:') ||
    description.includes('sent to') ||
    description.includes('payment to') ||
    description.includes('transfer to') ||
    description.includes('received from')
  );
  
  const isNotBankTransaction = !isBankingTransaction(transaction);
  
  return hasWalletIds && hasInternalTransferDescription && isNotBankTransaction;
}

// Export helper functions for testing
export {
  isBankingTransaction,
  isMyMoolahTransaction
};
