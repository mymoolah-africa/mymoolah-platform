interface TransactionDisplayInput {
  description?: string;
  type?: string;
  metadata?: Record<string, any>;
}

export function cleanTransactionDescription(transaction: TransactionDisplayInput): string {
  const description = (transaction.description || '').replace(/\s+/g, ' ').trim();
  if (!description) return 'Transaction';

  const metadata = transaction.metadata || {};
  const providerCode = String(metadata.providerCode || '');
  const providerLabel =
    providerCode === '112' ? 'ABSA CashSend' :
    providerCode === '10' ? 'Nedbank Cardless Withdrawal' :
    description.toLowerCase().includes('absa') ? 'ABSA CashSend' :
    description.toLowerCase().includes('nedbank') ? 'Nedbank Cardless Withdrawal' :
    'Cash payout';

  if (metadata.combinedOttPayoutRefund || /^ott payout reversal:/i.test(description)) {
    return `Withdraw Cash refund - ${providerLabel}`;
  }

  if (metadata.combinedOttPayout || metadata.ottPayoutId) {
    if (description.toLowerCase() === 'transaction fee') return 'Transaction fee';
    return `Withdraw Cash - ${providerLabel}`;
  }

  const isBankOriginDeposit =
    transaction.type === 'deposit' ||
    transaction.type === 'money_in' ||
    metadata.source === 'SBSA_DEPOSIT_NOTIFICATION' ||
    metadata.sbsaTransactionId ||
    metadata.inboundCreditSource === 'h2h_statement_trf' ||
    metadata.inboundCreditSource === 'payshap_inbound';

  const hasRawBankNarrative =
    /\/PREF\//i.test(description) ||
    /ZA\d{6,}PAYSHAP/i.test(description) ||
    /PAYSHAP PAYMENT FROM/i.test(description);

  if (isBankOriginDeposit && hasRawBankNarrative) {
    return 'Deposit';
  }

  return description;
}
