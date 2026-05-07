jest.mock('../models', () => ({
  Wallet: {},
  Transaction: {},
  User: {},
}));

jest.mock('../services/notificationService', () => ({}));

const walletController = require('../controllers/walletController');

const {
  sanitizeOttPayoutDisplayRows,
  selectDashboardLineItemRows,
} = walletController._private;

describe('wallet dashboard transaction line-item display', () => {
  it('keeps ABSA payout face value and fee as separate safe dashboard rows', () => {
    const rows = sanitizeOttPayoutDisplayRows([
      {
        id: 1,
        transactionId: 'OTT-PAY-OTT-ABSA-1',
        type: 'withdraw',
        status: 'processing',
        amount: 50,
        description: 'Controlled staging ABSA CashSend',
        createdAt: '2026-05-07T09:35:35.294Z',
        metadata: { ottPayoutId: 'OTT-ABSA-1', providerCode: '112' },
      },
      {
        id: 2,
        transactionId: 'OTT-FEE-OTT-ABSA-1',
        type: 'fee',
        status: 'completed',
        amount: -13,
        description: 'Transaction fee',
        createdAt: '2026-05-07T09:35:35.392Z',
        metadata: { ottPayoutId: 'OTT-ABSA-1', providerFeeAmount: 11.45, mmtpFeeAmount: 1.55 },
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      transactionId: 'OTT-PAY-OTT-ABSA-1',
      type: 'withdraw',
      amount: 50,
      description: 'Withdraw Cash - ABSA CashSend',
    });
    expect(rows[1]).toMatchObject({
      transactionId: 'OTT-FEE-OTT-ABSA-1',
      type: 'fee',
      amount: -13,
      description: 'Transaction fee',
    });
  });

  it('keeps Nedbank reversed payout rows separate while hiding raw provider errors', () => {
    const rows = sanitizeOttPayoutDisplayRows([
      {
        id: 3,
        transactionId: 'OTT-REV-OTT-NEDBANK-1',
        type: 'refund',
        status: 'completed',
        amount: 63,
        description: 'OTT payout reversal: Transaction for payments using : .Provider is not authorised on this account :MyMoolah (Pty) Ltd',
        createdAt: '2026-05-07T09:35:47.067Z',
        metadata: {
          ottPayoutId: 'OTT-NEDBANK-1',
          reason: 'Transaction for payments using : .Provider is not authorised on this account :MyMoolah (Pty) Ltd',
        },
      },
      {
        id: 4,
        transactionId: 'OTT-FEE-OTT-NEDBANK-1',
        type: 'fee',
        status: 'reversed',
        amount: -13,
        description: 'Transaction fee',
        createdAt: '2026-05-07T09:35:45.949Z',
        metadata: { ottPayoutId: 'OTT-NEDBANK-1', providerFeeAmount: 11.45, mmtpFeeAmount: 1.55 },
      },
      {
        id: 5,
        transactionId: 'OTT-PAY-OTT-NEDBANK-1',
        type: 'withdraw',
        status: 'reversed',
        amount: 50,
        description: 'Controlled staging Nedbank Cardless Withdrawal',
        createdAt: '2026-05-07T09:35:45.888Z',
        metadata: { ottPayoutId: 'OTT-NEDBANK-1', providerCode: '10' },
      },
    ]);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      transactionId: 'OTT-REV-OTT-NEDBANK-1',
      type: 'refund',
      status: 'completed',
      amount: 63,
      description: 'Withdraw Cash refund - Nedbank Cardless Withdrawal',
    });
    expect(rows[0].description).not.toMatch(/Provider is not authorised/i);
    expect(rows[1]).toMatchObject({
      transactionId: 'OTT-FEE-OTT-NEDBANK-1',
      type: 'fee',
      status: 'reversed',
      amount: -13,
      description: 'Transaction fee',
    });
    expect(rows[2]).toMatchObject({
      transactionId: 'OTT-PAY-OTT-NEDBANK-1',
      type: 'withdraw',
      status: 'reversed',
      amount: 50,
      description: 'Withdraw Cash - Nedbank Cardless Withdrawal',
    });
  });

  it('returns 10 main dashboard rows plus related fee rows beyond the 10-row count', () => {
    const rows = [];
    for (let index = 1; index <= 10; index += 1) {
      rows.push({
        id: index,
        transactionId: `MAIN-${index}`,
        type: 'withdraw',
        amount: 100,
        description: `Main ${index}`,
        reference: `REF-${index}`,
        createdAt: `2026-05-07T09:${String(60 - index).padStart(2, '0')}:00.000Z`,
        metadata: {},
      });
      rows.push({
        id: index + 100,
        transactionId: `FEE-${index}`,
        type: 'fee',
        amount: -2,
        description: 'Transaction fee',
        reference: `REF-${index}`,
        createdAt: `2026-05-07T09:${String(60 - index).padStart(2, '0')}:01.000Z`,
        metadata: {},
      });
    }
    rows.push({
      id: 99,
      transactionId: 'MAIN-11',
      type: 'withdraw',
      amount: 100,
      description: 'Main 11',
      reference: 'REF-11',
      createdAt: '2026-05-07T08:00:00.000Z',
      metadata: {},
    });

    const selected = selectDashboardLineItemRows(rows, 10);
    expect(selected).toHaveLength(20);
    expect(selected.map((row) => row.transactionId)).toContain('FEE-10');
    expect(selected.map((row) => row.transactionId)).not.toContain('MAIN-11');
  });
});
