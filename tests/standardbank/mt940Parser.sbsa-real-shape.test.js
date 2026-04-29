const {
  parseMT940File,
  getCredits,
  getDebits,
} = require('../../services/standardbank/mt940Parser');

describe('mt940Parser — SBSA production statement shapes', () => {
  it('parses MT940 FINSTMT files wrapped in SWIFT headers without creating a bogus header block', () => {
    const file = `{1:F01SBZAZAJJXCIGXXXXXXXXXX}{2:O9400615260425MYMOOLAHXXX00000000002604250615}{4:
:20:2420469571
:25:272406481
:28C:005/1
:60F:C260414ZAR336,00
:61:2604230414CR10,00NDEP0821234567//NONREF
0821234567
:86:/PREF/ZA000379IB PAYMENT FROM
:61:2604230414DR120,00NTRFPMTMMRPP17769374//NONREF
PMTMMRPP1776937416871fup4i5
:86:/PREF/ZA002002RPP PAYSHAP FROM
:62F:C260414ZAR226,00
-}`;

    const parsed = parseMT940File(file, 'MYMOOLAH_OWN11_FINSTMT_20260425061519710_242046957.txt');
    const statement = parsed.statements[0];

    expect(parsed.statementCount).toBe(1);
    expect(statement.statementType).toBe('MT940');
    expect(statement.accountNumber).toBe('272406481');
    expect(statement.reconciliation.valid).toBe(true);
    expect(getCredits(statement)).toHaveLength(1);
    expect(getCredits(statement)[0]).toMatchObject({
      direction: 'credit',
      amount: 10,
      swiftTypeCode: 'DEP',
      clientReference: '0821234567',
      bankReference: 'NONREF',
      statementOccurrence: 1,
    });
    expect(getDebits(statement)).toHaveLength(1);
  });

  it('parses SBSA MT942 PROVSTMT files that use :34F: and no :60M:/:62M: balances', () => {
    const file = `{1:F01SBZAZAJJXCIGXXXXXXXXXX}{2:O9420935260423MYMOOLAHXXX00000000002604230935}{4:
:20:2417481041
:25:272406481
:28C:0/0
:34F:ZARC2526,58
:13D:2604230935+0000
:61:2604210416DR1000,00NTRFZapper Zapper fl//NONREF
Zapper Zapper float
:86:/PREF/ZA000377IB PAYMENT TO
:61:2604230416CR10,00NDEP0821234567//NONREF
0821234567
:86:/PREF/ZA000379IB PAYMENT FROM
:90D:1ZAR1000,00
:90C:1ZAR10,00
-}`;

    const parsed = parseMT940File(file, 'MYMOOLAH_OWN11_PROVSTMT_20260423093511557_241748104.txt');
    const statement = parsed.statements[0];

    expect(statement.statementType).toBe('MT942');
    expect(statement.availableBalance).toMatchObject({
      direction: 'credit',
      date: '2026-04-23',
      currency: 'ZAR',
      amountCents: 252658,
    });
    expect(statement.reconciliation.valid).toBeNull();
    expect(statement.reconciliation.reason).toBe('intraday_statement_without_opening_closing_balance');
    expect(getCredits(statement)[0]).toMatchObject({
      amount: 10,
      swiftTypeCode: 'DEP',
      clientReference: '0821234567',
    });
  });

  it('assigns stable occurrence numbers to repeated identical deposit lines', () => {
    const file = `{1:F01SBZAZAJJXCIGXXXXXXXXXX}{2:O9421150260423MYMOOLAHXXX00000000002604231150}{4:
:20:2417730241
:25:272406481
:28C:0/0
:34F:ZARC2526,58
:13D:2604231150+0000
:61:2604230416CR10,00NDEP0821234567//NONREF
0821234567
:86:/PREF/ZA000379IB PAYMENT FROM
:61:2604230416CR10,00NDEP0821234567//NONREF
0821234567
:86:/PREF/ZA000379IB PAYMENT FROM
:90C:2ZAR20,00
-}`;

    const credits = getCredits(parseMT940File(file, 'duplicate-provisional.txt').statements[0]);

    expect(credits.map((txn) => txn.statementOccurrence)).toEqual([1, 2]);
  });
});
