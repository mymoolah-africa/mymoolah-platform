'use strict';

/**
 * Unit tests for services/standardbank/pain002Parser.
 *
 * Focus is on the 2026-04-23 additions made to support the SBSA H2H PROD
 * Penny test and post-UAT corrections:
 *
 *   - classifyResponseType() maps SBSA filenames (ACK/NACK/INTAUD/FINAUD/
 *     UNP_DATA/VET_DATA, TST|PRD) to the canonical responseType.
 *   - AddtlInf is captured into rejectionReasonDetail and preferred over
 *     the generic REJECTION_MESSAGES dictionary when disambiguating the
 *     dual-purpose code 0009 ("RUN EXCEEDS LIMIT" vs "INVALID ACCOUNT").
 *   - UNPAID responses: ACWC is NOT treated as accepted, and the Unpaid
 *     Reason Code is extracted from AddtlInf into unpaidReasonCode.
 *   - Group-level AddtlInf is surfaced on the parse result for RJCT files
 *     that have no per-tx blocks (RM5v2 RUN EXCEEDS LIMIT pattern).
 */

const { parsePain002, classifyResponseType } = require('../../services/standardbank/pain002Parser');

// ── classifyResponseType ────────────────────────────────────────────────────

describe('classifyResponseType', () => {
  it('maps SBSA TEST filenames correctly', () => {
    expect(classifyResponseType('MYMOOLAH_OWN11_ACK_TST_20260417131408295_51885347.xml')).toBe('ACK');
    expect(classifyResponseType('MYMOOLAH_OWN11_NACK_TST_20260417161529293_51886487.xml')).toBe('NACK');
    expect(classifyResponseType('MYMOOLAH_OWN11_INTAUD_TST_20260417131420670_51885352.xml')).toBe('INTAUD');
    expect(classifyResponseType('MYMOOLAH_OWN11_FINAUD_TST_20260417131852229_51885371.xml')).toBe('FINAUD');
    expect(classifyResponseType('MYMOOLAH_OWN11_UNP_DATA_TST_20260417173705685_51883570.xml')).toBe('UNPAID');
    expect(classifyResponseType('MYMOOLAH_OWN11_VET_DATA_TST_20260417173710755_51886896.xml')).toBe('VET');
  });

  it('maps SBSA PROD filenames correctly', () => {
    expect(classifyResponseType('MYMOOLAH_OWN11_ACK_PRD_20260424093015000_00000001.xml')).toBe('ACK');
    expect(classifyResponseType('MYMOOLAH_OWN11_FINAUD_PRD_20260424093532000_00000002.xml')).toBe('FINAUD');
    expect(classifyResponseType('MYMOOLAH_OWN11_UNP_DATA_PRD_20260424093905000_00000003.xml')).toBe('UNPAID');
  });

  it('returns null for unrelated or malformed filenames', () => {
    expect(classifyResponseType('')).toBeNull();
    expect(classifyResponseType(null)).toBeNull();
    expect(classifyResponseType('random.xml')).toBeNull();
    expect(classifyResponseType('MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417110153RM1.xml')).toBeNull();
  });
});

// ── parsePain002: group-level AddtlInf (RM5v2 RUN EXCEEDS LIMIT shape) ──────

describe('parsePain002 — group-level 0009 disambiguation', () => {
  const xmlRm5v2 = `
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.03">
  <CstmrPmtStsRpt>
    <GrpHdr><MsgId>M-INTAUD-RM5v2</MsgId></GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>MM-UATRM5v21776672704334-MO6X20CU</OrgnlMsgId>
      <GrpSts>RJCT</GrpSts>
      <StsRsnInf>
        <Rsn><Cd>0009</Cd></Rsn>
        <AddtlInf>RUN EXCEEDS LIMIT</AddtlInf>
      </StsRsnInf>
    </OrgnlGrpInfAndSts>
  </CstmrPmtStsRpt>
</Document>`;

  it('surfaces AddtlInf "RUN EXCEEDS LIMIT" at the group level even without per-tx blocks', () => {
    const result = parsePain002(xmlRm5v2, {
      filename: 'MYMOOLAH_OWN11_INTAUD_TST_20260420104730099_51999999.xml',
    });
    expect(result.responseType).toBe('INTAUD');
    expect(result.groupStatus).toBe('RJCT');
    expect(result.addtlInf).toBe('RUN EXCEEDS LIMIT');
    expect(result.originalMsgId).toBe('MM-UATRM5v21776672704334-MO6X20CU');
    expect(result.payments).toEqual([]);
  });
});

// ── parsePain002: per-tx 0009 disambiguation ────────────────────────────────

describe('parsePain002 — per-tx 0009 disambiguates via AddtlInf', () => {
  it('distinguishes INVALID ACCOUNT from RUN EXCEEDS LIMIT on otherwise-identical code', () => {
    const build = (addtlInf) => `
<Document>
  <CstmrPmtStsRpt>
    <OrgnlMsgId>MM-X</OrgnlMsgId>
    <GrpSts>PART</GrpSts>
    <TxInfAndSts>
      <OrgnlEndToEndId>E2E-001</OrgnlEndToEndId>
      <TxSts>RJCT</TxSts>
      <StsRsnInf>
        <Rsn><Cd>0009</Cd></Rsn>
        <AddtlInf>${addtlInf}</AddtlInf>
      </StsRsnInf>
    </TxInfAndSts>
  </CstmrPmtStsRpt>
</Document>`;

    const invalid = parsePain002(build('INVALID ACCOUNT'), {
      filename: 'MYMOOLAH_OWN11_INTAUD_TST_20260417163546032_51883474.xml',
    });
    const overlim = parsePain002(build('RUN EXCEEDS LIMIT'), {
      filename: 'MYMOOLAH_OWN11_INTAUD_TST_20260420104730099_51999999.xml',
    });

    expect(invalid.payments[0]).toMatchObject({
      endToEndId: 'E2E-001',
      status: 'rejected',
      rejectionCode: '0009',
      rejectionReasonDetail: 'INVALID ACCOUNT',
      rejectionReason: 'INVALID ACCOUNT',
    });
    expect(overlim.payments[0]).toMatchObject({
      endToEndId: 'E2E-001',
      status: 'rejected',
      rejectionCode: '0009',
      rejectionReasonDetail: 'RUN EXCEEDS LIMIT',
      rejectionReason: 'RUN EXCEEDS LIMIT',
    });
    // The two must be distinguishable by the detail even though the code matches.
    expect(invalid.payments[0].rejectionReasonDetail)
      .not.toBe(overlim.payments[0].rejectionReasonDetail);
  });
});

// ── parsePain002: UNPAID semantics ──────────────────────────────────────────

describe('parsePain002 — UNPAID responses', () => {
  const unpaidXml = `
<Document>
  <CstmrPmtStsRpt>
    <OrgnlMsgId>MM-RM12</OrgnlMsgId>
    <GrpSts>PART</GrpSts>
    <TxInfAndSts>
      <OrgnlEndToEndId>Tx-03</OrgnlEndToEndId>
      <TxSts>ACWC</TxSts>
      <StsRsnInf>
        <Rsn><Cd>14</Cd></Rsn>
        <AddtlInf>Unpaid Reason Code 14</AddtlInf>
      </StsRsnInf>
    </TxInfAndSts>
    <TxInfAndSts>
      <OrgnlEndToEndId>Tx-04</OrgnlEndToEndId>
      <TxSts>RJCT</TxSts>
      <StsRsnInf>
        <Rsn><Cd>03</Cd></Rsn>
        <AddtlInf>Unpaid Reason Code 03</AddtlInf>
      </StsRsnInf>
    </TxInfAndSts>
  </CstmrPmtStsRpt>
</Document>`;

  it('treats ACWC as rejected on UNPAID responses and extracts unpaidReasonCode', () => {
    const r = parsePain002(unpaidXml, {
      filename: 'MYMOOLAH_OWN11_UNP_DATA_TST_20260417173705685_51883570.xml',
    });

    expect(r.responseType).toBe('UNPAID');
    expect(r.payments).toHaveLength(2);

    const tx03 = r.payments.find(p => p.endToEndId === 'Tx-03');
    expect(tx03).toMatchObject({
      status: 'rejected',               // ACWC in UNPAID context = post-settlement amendment
      txStatus: 'ACWC',
      rejectionCode: '14',
      rejectionReasonDetail: 'Unpaid Reason Code 14',
      unpaidReasonCode: '14',
    });

    const tx04 = r.payments.find(p => p.endToEndId === 'Tx-04');
    expect(tx04).toMatchObject({
      status: 'rejected',
      txStatus: 'RJCT',
      rejectionCode: '03',
      unpaidReasonCode: '03',
    });
  });

  it('treats ACWC as accepted outside UNPAID context (backward compatible)', () => {
    const xml = `
<Document>
  <CstmrPmtStsRpt>
    <OrgnlMsgId>MM-X</OrgnlMsgId>
    <GrpSts>ACCP</GrpSts>
    <TxInfAndSts>
      <OrgnlEndToEndId>E2E-001</OrgnlEndToEndId>
      <TxSts>ACWC</TxSts>
    </TxInfAndSts>
  </CstmrPmtStsRpt>
</Document>`;

    const r = parsePain002(xml, {
      filename: 'MYMOOLAH_OWN11_FINAUD_TST_20260417131852229_51885371.xml',
    });
    expect(r.responseType).toBe('FINAUD');
    expect(r.payments[0].status).toBe('accepted');
    expect(r.payments[0].txStatus).toBe('ACWC');
  });
});

// ── parsePain002: backward compatibility ────────────────────────────────────

describe('parsePain002 — backward compatibility', () => {
  it('still returns accepted for ACSP without responseType hint', () => {
    const xml = `
<Document>
  <CstmrPmtStsRpt>
    <OrgnlMsgId>MM-LEGACY</OrgnlMsgId>
    <GrpSts>ACSP</GrpSts>
    <TxInfAndSts>
      <OrgnlEndToEndId>E2E-01</OrgnlEndToEndId>
      <TxSts>ACSP</TxSts>
    </TxInfAndSts>
  </CstmrPmtStsRpt>
</Document>`;

    const r = parsePain002(xml);
    expect(r.responseType).toBeNull();
    expect(r.payments[0].status).toBe('accepted');
    expect(r.payments[0].rejectionCode).toBeNull();
  });

  it('throws on invalid input', () => {
    expect(() => parsePain002(null)).toThrow(/required/);
    expect(() => parsePain002('')).toThrow(/required/);
    expect(() => parsePain002(123)).toThrow(/required/);
  });
});
