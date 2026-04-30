interface TransactionDisplayInput {
  description?: string;
  type?: string;
  metadata?: Record<string, any>;
}

export function cleanTransactionDescription(transaction: TransactionDisplayInput): string {
  const description = (transaction.description || '').replace(/\s+/g, ' ').trim();
  if (!description) return 'Transaction';

  const metadata = transaction.metadata || {};
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
