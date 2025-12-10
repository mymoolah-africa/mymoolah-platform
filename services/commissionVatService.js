const { v4: uuidv4 } = require('uuid');
const supplierPricingService = require('./supplierPricingService');
const ledgerService = require('./ledgerService');
const { TaxTransaction } = require('../models');

const VAT_RATE = Number(process.env.VAT_RATE || 0.15);
const LEDGER_ACCOUNT_MM_COMMISSION_CLEARING = process.env.LEDGER_ACCOUNT_MM_COMMISSION_CLEARING || null;
const LEDGER_ACCOUNT_COMMISSION_REVENUE = process.env.LEDGER_ACCOUNT_COMMISSION_REVENUE || null;
const LEDGER_ACCOUNT_VAT_CONTROL = process.env.LEDGER_ACCOUNT_VAT_CONTROL || null;

/**
 * Calculate commission in cents for a supplier/serviceType given an amount.
 * Returns null if no rate or rate is zero/invalid.
 */
async function calculateCommissionCents({ supplierCode, serviceType, amountInCents }) {
  const normalizedSupplierCode = (supplierCode || '').toUpperCase();
  if (!normalizedSupplierCode || !amountInCents) return null;

  const commissionRatePct = await supplierPricingService.getCommissionRatePct(
    normalizedSupplierCode,
    serviceType
  );

  if (!commissionRatePct || Number(commissionRatePct) <= 0) {
    return null;
  }

  const commissionCents = supplierPricingService.computeCommission(amountInCents, commissionRatePct);
  if (!commissionCents) {
    return null;
  }

  return {
    commissionCents,
    commissionRatePct: Number(commissionRatePct)
  };
}

/**
 * Post VAT and ledger entries for commission.
 * Assumes commissionCents is already calculated and > 0.
 */
async function postCommissionVatAndLedger({
  commissionCents,
  supplierCode,
  serviceType,
  walletTransactionId,
  sourceTransactionId,
  idempotencyKey,
  purchaserUserId
}) {
  if (!commissionCents || commissionCents <= 0) return null;

  const normalizedSupplierCode = (supplierCode || '').toUpperCase();
  const vatCents = Math.round(commissionCents * VAT_RATE / (1 + VAT_RATE));
  const netCommissionCents = commissionCents - vatCents;

  const taxTransactionId = `TAX-${uuidv4()}`;
  const now = new Date();
  const taxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    await TaxTransaction.create({
      taxTransactionId,
      originalTransactionId: walletTransactionId || sourceTransactionId,
      taxCode: 'VAT_15',
      taxName: 'VAT 15%',
      taxType: 'vat',
      baseAmount: Number((netCommissionCents / 100).toFixed(2)),
      taxAmount: Number((vatCents / 100).toFixed(2)),
      totalAmount: Number((commissionCents / 100).toFixed(2)),
      taxRate: VAT_RATE,
      calculationMethod: 'inclusive',
      businessContext: 'wallet_user',
      transactionType: serviceType,
      entityId: normalizedSupplierCode,
      entityType: 'supplier',
      taxPeriod,
      taxYear: now.getFullYear(),
      status: 'calculated',
      vat_direction: 'output',
      metadata: {
        idempotencyKey,
        purchaserUserId,
        vatRate: VAT_RATE
      }
    });
  } catch (taxErr) {
    console.error('⚠️ Failed to persist tax transaction for commission:', taxErr.message);
  }

  if (
    LEDGER_ACCOUNT_MM_COMMISSION_CLEARING &&
    LEDGER_ACCOUNT_COMMISSION_REVENUE &&
    LEDGER_ACCOUNT_VAT_CONTROL
  ) {
    const commissionAmountRand = Number((commissionCents / 100).toFixed(2));
    const vatAmountRand = Number((vatCents / 100).toFixed(2));
    const netAmountRand = Number((netCommissionCents / 100).toFixed(2));

    try {
      await ledgerService.postJournalEntry({
        reference: `COMMISSION-${walletTransactionId || sourceTransactionId}`,
        description: `Commission allocation (${(serviceType || 'UNKNOWN').toUpperCase()} - ${normalizedSupplierCode})`,
        lines: [
          {
            accountCode: LEDGER_ACCOUNT_MM_COMMISSION_CLEARING,
            dc: 'debit',
            amount: commissionAmountRand,
            memo: 'Commission clearing'
          },
          {
            accountCode: LEDGER_ACCOUNT_VAT_CONTROL,
            dc: 'credit',
            amount: vatAmountRand,
            memo: 'VAT payable on commission'
          },
          {
            accountCode: LEDGER_ACCOUNT_COMMISSION_REVENUE,
            dc: 'credit',
            amount: netAmountRand,
            memo: 'Commission revenue (net of VAT)'
          }
        ]
      });
    } catch (ledgerErr) {
      console.error('⚠️ Failed to post commission journal:', ledgerErr.message);
    }
  } else {
    console.warn(
      '⚠️ Commission ledger posting skipped: missing LEDGER_ACCOUNT_MM_COMMISSION_CLEARING, LEDGER_ACCOUNT_COMMISSION_REVENUE, or LEDGER_ACCOUNT_VAT_CONTROL env vars'
    );
  }

  return {
    commissionCents,
    vatCents,
    netCommissionCents,
    vatRate: VAT_RATE
  };
}

module.exports = {
  calculateCommissionCents,
  postCommissionVatAndLedger,
};

