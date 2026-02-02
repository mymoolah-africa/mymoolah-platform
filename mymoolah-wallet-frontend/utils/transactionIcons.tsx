import React from 'react';
import { 
  Ticket, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Phone, 
  Zap,
  Wifi,
  QrCode,
  Film
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
  const iconColor = isCredit ? '#16a34a' : '#dc2626'; // Green for credit, red for debit (always)

  // 0. TRANSACTION FEE (normal arrows only – not Voucher icon)
  const isTransactionFee =
    description === 'transaction fee' ||
    transaction.metadata?.isFlashCashoutFee === true ||
    transaction.metadata?.isCashoutFee === true ||
    transaction.metadata?.isEasyPayVoucherFee === true ||
    transaction.metadata?.isTopUpFee === true ||
    transaction.type === 'fee';
  if (isTransactionFee) {
    if (isCredit) {
      return <ArrowDownLeft style={{ ...iconStyle, color: '#16a34a' }} />;
    }
    return <ArrowUpRight style={{ ...iconStyle, color: '#dc2626' }} />;
  }

  // 1. VOUCHER / EEZICASH / CASH-OUT (Ticket icon – green for credit, red for debit)
  const isEeziCashOrCashOut =
    description.includes('eezi cash') ||
    description.includes('flash eezi') ||
    description.includes('cash-out') ||
    transaction.metadata?.vasType === 'cash_out' ||
    transaction.metadata?.isFlashCashoutAmount === true ||
    transaction.metadata?.isCashoutVoucherAmount === true;
  const isVoucher =
    isEeziCashOrCashOut ||
    description.includes('voucher') ||
    transaction.metadata?.productType === 'voucher' ||
    transaction.metadata?.voucher;
  if (isVoucher) {
    return <Ticket style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 2. WATCH TO EARN / AD REWARD TRANSACTIONS (Film/Movie icons) - Check BEFORE data/airtime
  // Always green as it's a credit - Must check early to avoid false matches
  const metadata = transaction.metadata || {};
  const isWatchToEarn = (
    description.includes('watch to earn') ||
    description.includes('ad reward') ||
    metadata.isWatchToEarn === true ||
    metadata.adType ||
    metadata.campaignId
  );
  
  if (isWatchToEarn) {
    return <Film style={{ ...iconStyle, color: '#16a34a' }} />; // Always green for earnings
  }
  
  // 3. DATA TRANSACTIONS (Check BEFORE airtime to avoid false matches)
  // Check metadata first (most reliable), then description
  const isData = 
    transaction.metadata?.productType === 'data' ||
    transaction.metadata?.type === 'data' ||
    transaction.metadata?.vasType === 'data' ||
    description.includes('data purchase') ||
    description.includes('data bundle') ||
    description.includes('internet') ||
    description.includes('wifi');
  if (isData) {
    return <Wifi style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 4. AIRTIME TRANSACTIONS (Check metadata first, then description)
  // Only match "airtime" keyword, NOT network names (to avoid false matches with data)
  const isAirtime = 
    transaction.metadata?.productType === 'airtime' ||
    transaction.metadata?.type === 'airtime' ||
    transaction.metadata?.vasType === 'airtime' ||
    description.includes('airtime purchase') ||
    description.includes('airtime for') ||
    description.includes('airtime');
  if (isAirtime) {
    return <Phone style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 5. ELECTRICITY TRANSACTIONS
  if (description.includes('electricity') || description.includes('eskom') || description.includes('power')) {
    return <Zap style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 6. QR/ZAPPER PAYMENT TRANSACTIONS (QR Code icons) - CHECK BEFORE OTHER TRANSACTIONS
  const isQRTransaction = (
    description.includes('qr payment') ||
    description.includes('zapper') ||
    description.includes('qr code') ||
    metadata.processingSource === 'zapper' ||
    metadata.zapperTransactionId ||
    metadata.qrType === 'zapper'
  );
  
  if (isQRTransaction) {
    return <QrCode style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 7. BANKING TRANSACTIONS (External bank transfers via APIs)
  if (isBankingTransaction(transaction)) {
    if (isCredit) {
      // Credit (money received) - Green down arrow
      return <ArrowDownLeft style={{ ...iconStyle, color: '#16a34a' }} />;
    } else {
      // Debit (money sent) - Red up arrow
      return <ArrowUpRight style={{ ...iconStyle, color: '#dc2626' }} />;
    }
  }
  
  // 8. MYMOOLAH WALLET TRANSACTIONS (Internal transfers)
  if (isMyMoolahTransaction(transaction)) {
    return <Wallet style={{ ...iconStyle, color: iconColor }} />;
  }
  
  // 9. DEFAULT: Other transactions use arrows
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
