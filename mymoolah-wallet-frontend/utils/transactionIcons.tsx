import React from 'react';
import { 
  Ticket, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Phone, 
  Zap,
  Wifi,
  QrCode
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

// Centralized transaction icon function with CSS class support
export function getTransactionIcon(transaction: Transaction, size: number = 20): React.ReactNode {
  const iconStyle = { width: `${size}px`, height: `${size}px` };
  
  const description = (transaction.description || '').toLowerCase();
  const isCredit = transaction.amount > 0;
  const iconColor = isCredit ? '#16a34a' : '#dc2626'; // Green for credit, red for debit
  const metadata = transaction.metadata || {};
  
  // 1. ZAPPER QR PAYMENT TRANSACTIONS (QR Code icons)
  // Enhanced detection for Zapper transactions
  const isZapperTransaction = (
    description.includes('qr payment') ||
    description.includes('zapper') ||
    description.includes('qr code') ||
    description.includes('zapper float') ||
    description.includes('zapper transaction') ||
    description.includes('zapper payment') ||
    metadata.processingSource === 'zapper' ||
    metadata.zapperTransactionId ||
    metadata.qrType === 'zapper' ||
    metadata.processingSource === 'local' && description.includes('qr')
  );
  
  if (isZapperTransaction) {
    // Red QR icon for debits (money out), Green QR icon for credits (money in)
    return (
      <QrCode 
        className={`transaction-icon transaction-icon-zapper ${isCredit ? 'transaction-icon-credit' : 'transaction-icon-debit'}`}
        style={{ ...iconStyle, color: iconColor }} 
      />
    );
  }
  
  // 2. VOUCHER TRANSACTIONS (Ticket icons)
  if (description.includes('voucher')) {
    return (
      <Ticket 
        className={`transaction-icon transaction-icon-voucher ${isCredit ? 'transaction-icon-credit' : 'transaction-icon-debit'}`}
        style={{ ...iconStyle, color: iconColor }} 
      />
    );
  }
  
  // 3. AIRTIME TRANSACTIONS
  if (description.includes('airtime') || description.includes('vodacom') || description.includes('mtn') || description.includes('cell c')) {
    return (
      <Phone 
        className={`transaction-icon transaction-icon-airtime ${isCredit ? 'transaction-icon-credit' : 'transaction-icon-debit'}`}
        style={{ ...iconStyle, color: iconColor }} 
      />
    );
  }
  
  // 4. DATA TRANSACTIONS
  if (description.includes('data') || description.includes('internet') || description.includes('wifi')) {
    return (
      <Wifi 
        className={`transaction-icon transaction-icon-data ${isCredit ? 'transaction-icon-credit' : 'transaction-icon-debit'}`}
        style={{ ...iconStyle, color: iconColor }} 
      />
    );
  }
  
  // 5. ELECTRICITY TRANSACTIONS
  if (description.includes('electricity') || description.includes('eskom') || description.includes('power')) {
    return (
      <Zap 
        className={`transaction-icon transaction-icon-electricity ${isCredit ? 'transaction-icon-credit' : 'transaction-icon-debit'}`}
        style={{ ...iconStyle, color: iconColor }} 
      />
    );
  }
  
  // 6. BANKING TRANSACTIONS (External bank transfers via APIs)
  if (isBankingTransaction(transaction)) {
    if (isCredit) {
      // Credit (money received) - Green down arrow
      return (
        <ArrowDownLeft 
          className="transaction-icon transaction-icon-banking transaction-icon-credit"
          style={{ ...iconStyle, color: '#16a34a' }} 
        />
      );
    } else {
      // Debit (money sent) - Red up arrow
      return (
        <ArrowUpRight 
          className="transaction-icon transaction-icon-banking transaction-icon-debit"
          style={{ ...iconStyle, color: '#dc2626' }} 
        />
      );
    }
  }
  
  // 7. MYMOOLAH WALLET TRANSACTIONS (Internal transfers)
  if (isMyMoolahTransaction(transaction)) {
    return (
      <Wallet 
        className={`transaction-icon transaction-icon-wallet ${isCredit ? 'transaction-icon-credit' : 'transaction-icon-debit'}`}
        style={{ ...iconStyle, color: iconColor }} 
      />
    );
  }
  
  // 8. DEFAULT: Other transactions use arrows
  if (isCredit) {
    // Credit (money received) - Green down arrow
    return (
      <ArrowDownLeft 
        className="transaction-icon transaction-icon-default transaction-icon-credit"
        style={{ ...iconStyle, color: '#16a34a' }} 
      />
    );
  } else {
    // Debit (money sent) - Red up arrow
    return (
      <ArrowUpRight 
        className="transaction-icon transaction-icon-default transaction-icon-debit"
        style={{ ...iconStyle, color: '#dc2626' }} 
      />
    );
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
