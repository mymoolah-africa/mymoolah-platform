'use strict';

/**
 * USSD channel — unit and integration-style tests (Jest).
 * Mocks DB (sequelize), auth helpers, and Redis-backed session service where needed.
 */

const { XMLParser } = require('fast-xml-parser');

jest.mock('../models', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([[], {}]),
  },
}));

jest.mock('../services/ussdAuthService', () => ({
  findUserByMsisdn: jest.fn(),
  verifyUssdPin: jest.fn(),
  validateIdNumber: jest.fn(),
  isValidUssdPin: jest.fn(),
  setUssdPin: jest.fn().mockResolvedValue(undefined),
  registerUssdUser: jest.fn(),
}));

jest.mock('../services/ussdSessionService', () => ({
  createSession: jest.fn(),
  getSession: jest.fn(),
  destroySession: jest.fn().mockResolvedValue(undefined),
  updateSession: jest.fn().mockResolvedValue(undefined),
}));

const { sequelize } = require('../models');
const ussdAuthService = require('../services/ussdAuthService');
const ussdSessionService = require('../services/ussdSessionService');
const ussdMenuServiceModule = require('../services/ussdMenuService');
const { processInput } = ussdMenuServiceModule;
const { handleUssdRequest } = require('../controllers/ussdController');
const ussdIpWhitelist = require('../middleware/ussdIpWhitelist');

const xmlParser = new XMLParser({ ignoreAttributes: false });

function sessionBase(overrides = {}) {
  return {
    sessionId: 'sess-test-1',
    msisdn: '27821234567',
    menuState: 'WELCOME',
    data: {},
    ...overrides,
  };
}

describe('ussdMenuService — processInput state machine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockResolvedValue([[], {}]);
  });

  it('WELCOME: existing active user with USSD PIN goes to PIN_ENTRY', async () => {
    ussdAuthService.findUserByMsisdn.mockResolvedValue({
      id: 42,
      status: 'active',
      ussd_pin: '$2a$hashed',
    });
    const session = sessionBase({ menuState: 'WELCOME', data: {} });
    const out = await processInput(session, null);
    expect(out.type).toBe('continue');
    expect(out.sessionUpdates.menuState).toBe('PIN_ENTRY');
    expect(out.sessionUpdates.data.userId).toBe(42);
    expect(out.response).toContain('PIN');
  });

  it('WELCOME: new user (no MSISDN match) shows register/help/exit', async () => {
    ussdAuthService.findUserByMsisdn.mockResolvedValue(null);
    const out = await processInput(sessionBase({ menuState: 'WELCOME' }), null);
    expect(out.type).toBe('continue');
    expect(out.sessionUpdates.menuState).toBe('REGISTER');
    expect(out.response).toMatch(/Register/i);
    expect(out.response).toMatch(/Help/i);
  });

  it('REGISTER: input 1 goes to REGISTER_ID', async () => {
    const out = await processInput(sessionBase({ menuState: 'REGISTER' }), '1');
    expect(out.type).toBe('continue');
    expect(out.sessionUpdates.menuState).toBe('REGISTER_ID');
    expect(out.response).toMatch(/SA ID|passport/i);
  });

  it('REGISTER_ID: valid SA ID (mocked) transitions to REGISTER_PIN', async () => {
    ussdAuthService.validateIdNumber.mockReturnValue({
      valid: true,
      type: 'south_african_id',
      normalized: '8801015009080',
    });
    const out = await processInput(sessionBase({ menuState: 'REGISTER_ID' }), '8801015009080');
    expect(out.sessionUpdates.menuState).toBe('REGISTER_PIN');
    expect(out.sessionUpdates.data.idNumber).toBe('8801015009080');
    expect(out.sessionUpdates.data.idType).toBe('south_african_id');
  });

  it('REGISTER_ID: invalid ID stays on REGISTER_ID', async () => {
    ussdAuthService.validateIdNumber.mockReturnValue({
      valid: false,
      type: null,
      normalized: null,
    });
    const out = await processInput(sessionBase({ menuState: 'REGISTER_ID' }), '000');
    expect(out.type).toBe('continue');
    expect(out.sessionUpdates.menuState).toBe('REGISTER_ID');
    expect(out.response).toMatch(/Invalid/i);
  });

  it('REGISTER_PIN: valid 5-digit PIN goes to REGISTER_PIN_CONFIRM', async () => {
    ussdAuthService.isValidUssdPin.mockReturnValue(true);
    const out = await processInput(sessionBase({ menuState: 'REGISTER_PIN', data: {} }), '12345');
    expect(out.sessionUpdates.menuState).toBe('REGISTER_PIN_CONFIRM');
    expect(out.sessionUpdates.data.newPin).toBe('12345');
  });

  it('REGISTER_PIN: invalid PIN stays on REGISTER_PIN', async () => {
    ussdAuthService.isValidUssdPin.mockReturnValue(false);
    const out = await processInput(sessionBase({ menuState: 'REGISTER_PIN' }), '12');
    expect(out.sessionUpdates.menuState).toBe('REGISTER_PIN');
    expect(out.response).toMatch(/5 digits/i);
  });

  it('PIN_ENTRY: correct PIN opens MAIN_MENU', async () => {
    ussdAuthService.verifyUssdPin.mockResolvedValue({ success: true });
    const session = sessionBase({
      menuState: 'PIN_ENTRY',
      data: { userId: 99 },
    });
    const out = await processInput(session, '12345');
    expect(out.type).toBe('continue');
    expect(out.sessionUpdates.menuState).toBe('MAIN_MENU');
    expect(out.sessionUpdates.data.pinVerified).toBe(true);
    expect(out.response).toMatch(/Balance/i);
  });

  it('PIN_ENTRY: wrong PIN stays on PIN_ENTRY with attempts message', async () => {
    ussdAuthService.verifyUssdPin.mockResolvedValue({
      success: false,
      reason: 'wrong_pin',
      attemptsLeft: 2,
    });
    const session = sessionBase({
      menuState: 'PIN_ENTRY',
      data: { userId: 99 },
    });
    const out = await processInput(session, '00000');
    expect(out.type).toBe('continue');
    expect(out.sessionUpdates.menuState).toBe('PIN_ENTRY');
    expect(out.response).toMatch(/Wrong PIN/i);
    expect(out.response).toMatch(/2/);
  });

  it('MAIN_MENU: 1 returns balance and ends session', async () => {
    sequelize.query.mockResolvedValueOnce([[{ balance: '150.25' }], {}]);
    const session = sessionBase({
      menuState: 'MAIN_MENU',
      data: { userId: 7, pinVerified: true },
    });
    const out = await processInput(session, '1');
    expect(out.type).toBe('end');
    expect(out.response).toMatch(/Balance/i);
    expect(out.response).toMatch(/150\.25/);
  });

  it('MAIN_MENU: 2 goes to BUY_AIRTIME', async () => {
    const session = sessionBase({
      menuState: 'MAIN_MENU',
      data: { userId: 7 },
    });
    const out = await processInput(session, '2');
    expect(out.type).toBe('continue');
    expect(out.sessionUpdates.menuState).toBe('BUY_AIRTIME');
    expect(out.response).toMatch(/Airtime/i);
  });

  it('MAIN_MENU: 3 goes to BUY_DATA', async () => {
    const session = sessionBase({
      menuState: 'MAIN_MENU',
      data: { userId: 7 },
    });
    const out = await processInput(session, '3');
    expect(out.sessionUpdates.menuState).toBe('BUY_DATA');
  });

  it('MAIN_MENU: 4 goes to CASH_OUT', async () => {
    const session = sessionBase({
      menuState: 'MAIN_MENU',
      data: { userId: 7 },
    });
    const out = await processInput(session, '4');
    expect(out.sessionUpdates.menuState).toBe('CASH_OUT');
    expect(out.response).toMatch(/Cash Out|eeziCash/i);
  });

  it('MAIN_MENU: 5 goes to MORE_MENU', async () => {
    const session = sessionBase({
      menuState: 'MAIN_MENU',
      data: { userId: 7 },
    });
    const out = await processInput(session, '5');
    expect(out.sessionUpdates.menuState).toBe('MORE_MENU');
  });

  it('MAIN_MENU: 0 ends session', async () => {
    const session = sessionBase({
      menuState: 'MAIN_MENU',
      data: { userId: 7 },
    });
    const out = await processInput(session, '0');
    expect(out.type).toBe('end');
    expect(out.response).toMatch(/Thank you|Goodbye/i);
  });

  it('BUY_AIRTIME: valid selection goes to BUY_AIRTIME_CONFIRM', async () => {
    const session = sessionBase({
      menuState: 'BUY_AIRTIME',
      data: { userId: 7 },
    });
    const out = await processInput(session, '1');
    expect(out.sessionUpdates.menuState).toBe('BUY_AIRTIME_CONFIRM');
    expect(out.sessionUpdates.data.airtimeAmount).toBe(5);
    expect(out.response).toMatch(/\?/);
  });

  it('BUY_AIRTIME: 0 returns to MAIN_MENU', async () => {
    const session = sessionBase({
      menuState: 'BUY_AIRTIME',
      data: { userId: 7 },
    });
    const out = await processInput(session, '0');
    expect(out.sessionUpdates.menuState).toBe('MAIN_MENU');
  });

  it('MORE_MENU: 2 goes to CHANGE_PIN', async () => {
    const session = sessionBase({
      menuState: 'MORE_MENU',
      data: { userId: 7 },
    });
    const out = await processInput(session, '2');
    expect(out.sessionUpdates.menuState).toBe('CHANGE_PIN');
    expect(out.response).toMatch(/current PIN/i);
  });

  it('MORE_MENU: 0 returns to MAIN_MENU', async () => {
    const session = sessionBase({
      menuState: 'MORE_MENU',
      data: { userId: 7 },
    });
    const out = await processInput(session, '0');
    expect(out.sessionUpdates.menuState).toBe('MAIN_MENU');
  });
});

describe('ussdController — handleUssdRequest XML responses', () => {
  const msisdn = '27821234567';
  const sessionid = 'cellfind-sess-99';

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockResolvedValue([[], {}]);
  });

  function mockRes() {
    return {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  }

  it('new session (type=1) returns parseable XML with response type="2" (continue)', async () => {
    ussdAuthService.findUserByMsisdn.mockResolvedValue(null);
    ussdSessionService.createSession.mockResolvedValue({
      sessionId: sessionid,
      msisdn,
      menuState: 'WELCOME',
      data: {},
    });

    const req = {
      query: { msisdn, sessionid, type: '1', networkid: '1' },
    };
    const res = mockRes();

    await handleUssdRequest(req, res);

    expect(ussdSessionService.createSession).toHaveBeenCalledWith(sessionid, msisdn, '1');
    const xml = res.send.mock.calls[0][0];
    const doc = xmlParser.parse(xml);
    expect(doc.msg.sessionid).toBe(sessionid);
    expect(doc.msg.response['@_type']).toBe('2');
    expect(doc.msg.response['#text']).toBeTruthy();
  });

  it('user input (type=2) returns valid XML', async () => {
    ussdSessionService.getSession.mockResolvedValue({
      sessionId: sessionid,
      msisdn,
      menuState: 'MAIN_MENU',
      data: { userId: 3, pinVerified: true },
    });

    const req = {
      query: { msisdn, sessionid, type: '2', request: '2' },
    };
    const res = mockRes();

    await handleUssdRequest(req, res);

    const xml = res.send.mock.calls[0][0];
    const doc = xmlParser.parse(xml);
    expect(doc.msg.response['@_type']).toBe('2');
    expect(ussdSessionService.updateSession).toHaveBeenCalled();
    expect(ussdSessionService.destroySession).not.toHaveBeenCalled();
  });

  it('release (type=3) destroys session and returns end XML', async () => {
    const req = { query: { msisdn, sessionid, type: '3' } };
    const res = mockRes();

    await handleUssdRequest(req, res);

    expect(ussdSessionService.destroySession).toHaveBeenCalledWith(sessionid);
    const xml = res.send.mock.calls[0][0];
    const doc = xmlParser.parse(xml);
    expect(doc.msg.response['@_type']).toBe('3');
  });

  it('timeout (type=4) destroys session', async () => {
    const req = { query: { msisdn, sessionid, type: '4' } };
    const res = mockRes();

    await handleUssdRequest(req, res);

    expect(ussdSessionService.destroySession).toHaveBeenCalledWith(sessionid);
  });

  it('missing msisdn or sessionid returns 400 and error XML', async () => {
    const req = { query: { sessionid, type: '1' } };
    const res = mockRes();

    await handleUssdRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const xml = res.send.mock.calls[0][0];
    expect(xml).toMatch(/System error/);
    const doc = xmlParser.parse(xml);
    expect(doc.msg.response['@_type']).toBe('3');
  });

  it('escapes &, <, >, and " in menu text in XML', async () => {
    ussdSessionService.getSession.mockResolvedValue({
      sessionId: sessionid,
      msisdn,
      menuState: 'MAIN_MENU',
      data: { userId: 1 },
    });

    const spy = jest.spyOn(ussdMenuServiceModule, 'processInput').mockResolvedValueOnce({
      response: 'Test & Co <tag> "quotes"',
      type: 'continue',
      sessionUpdates: { menuState: 'MAIN_MENU', data: {} },
    });

    const req = {
      query: { msisdn, sessionid, type: '2', request: 'x' },
    };
    const res = mockRes();

    try {
      await handleUssdRequest(req, res);

      const xml = res.send.mock.calls[0][0];
      expect(xml).not.toContain('Test & Co <tag>');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).toContain('&quot;');

      const doc = xmlParser.parse(xml);
      const text = doc.msg.response['#text'] ?? doc.msg.response;
      expect(text).toBe('Test & Co <tag> "quotes"');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('ussdAuthService — validation helpers (jest.requireActual)', () => {
  const auth = jest.requireActual('../services/ussdAuthService');

  describe('isValidSouthAfricanId', () => {
    it('accepts valid ID 8801015009080 (Luhn per ussdAuthService)', () => {
      expect(auth.isValidSouthAfricanId('8801015009080')).toBe(true);
    });

    it('rejects wrong checksum (e.g. 8801015009087)', () => {
      expect(auth.isValidSouthAfricanId('8801015009087')).toBe(false);
    });

    it('rejects wrong length', () => {
      expect(auth.isValidSouthAfricanId('880101500908')).toBe(false);
      expect(auth.isValidSouthAfricanId('880101500908712')).toBe(false);
    });
  });

  describe('isValidPassport', () => {
    it('accepts A12345678', () => {
      expect(auth.isValidPassport('A12345678')).toBe(true);
    });

    it('rejects all-numeric (no letter)', () => {
      expect(auth.isValidPassport('12345678')).toBe(false);
    });

    it('rejects too short', () => {
      expect(auth.isValidPassport('A12')).toBe(false);
    });
  });

  describe('validateIdNumber', () => {
    it('classifies SA ID vs passport', () => {
      const sa = auth.validateIdNumber('8801015009080');
      expect(sa.valid).toBe(true);
      expect(sa.type).toBe('south_african_id');

      const pp = auth.validateIdNumber('A12345678');
      expect(pp.valid).toBe(true);
      expect(pp.type).toBe('international_passport');
    });
  });

  describe('isValidUssdPin', () => {
    it('accepts 12345', () => {
      expect(auth.isValidUssdPin('12345')).toBe(true);
    });

    it('rejects 1234, 123456, and non-numeric', () => {
      expect(auth.isValidUssdPin('1234')).toBe(false);
      expect(auth.isValidUssdPin('123456')).toBe(false);
      expect(auth.isValidUssdPin('abcde')).toBe(false);
    });
  });
});

describe('ussdIpWhitelist middleware', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.CELLFIND_ALLOWED_IPS = originalEnv.CELLFIND_ALLOWED_IPS;
    if (originalEnv.CELLFIND_ALLOWED_IPS === undefined) {
      delete process.env.CELLFIND_ALLOWED_IPS;
    }
  });

  function makeReq(ip, forwarded) {
    return {
      headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
      connection: { remoteAddress: ip },
      ip: undefined,
    };
  }

  it('allows request when client IP is in whitelist', () => {
    process.env.CELLFIND_ALLOWED_IPS = '203.0.113.10, 198.51.100.2';
    process.env.NODE_ENV = 'production';

    const req = makeReq('198.51.100.2');
    const res = { status: jest.fn().mockReturnThis(), type: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    ussdIpWhitelist(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks request when IP is not in whitelist', () => {
    process.env.CELLFIND_ALLOWED_IPS = '203.0.113.10';
    process.env.NODE_ENV = 'production';

    const req = makeReq('198.51.100.99');
    const res = { status: jest.fn().mockReturnThis(), type: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    ussdIpWhitelist(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send.mock.calls[0][0]).toMatch(/Access denied/);
  });

  it('allows all in non-production when CELLFIND_ALLOWED_IPS is empty', () => {
    delete process.env.CELLFIND_ALLOWED_IPS;
    process.env.NODE_ENV = 'test';

    const req = makeReq('10.0.0.1');
    const res = { status: jest.fn().mockReturnThis(), type: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    ussdIpWhitelist(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('blocks all in production when CELLFIND_ALLOWED_IPS is empty', () => {
    delete process.env.CELLFIND_ALLOWED_IPS;
    process.env.NODE_ENV = 'production';

    const req = makeReq('203.0.113.1');
    const res = { status: jest.fn().mockReturnThis(), type: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    ussdIpWhitelist(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send.mock.calls[0][0]).toMatch(/Service unavailable/);
  });

  it('uses first x-forwarded-for hop when present', () => {
    process.env.CELLFIND_ALLOWED_IPS = '192.0.2.50';
    process.env.NODE_ENV = 'production';

    const req = makeReq('10.0.0.1', '192.0.2.50, 10.0.0.1');
    const res = { status: jest.fn().mockReturnThis(), type: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    ussdIpWhitelist(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
