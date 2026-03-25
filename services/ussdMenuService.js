'use strict';

const { sequelize } = require('../models');
const ussdAuthService = require('./ussdAuthService');
const crypto = require('crypto');

const TIER0_DAILY_LIMIT = parseInt(process.env.USSD_TIER0_DAILY_LIMIT || '500', 10);
const TIER0_MONTHLY_LIMIT = parseInt(process.env.USSD_TIER0_MONTHLY_LIMIT || '3000', 10);

const AIRTIME_AMOUNTS = [5, 10, 29, 55, 110];
const DATA_AMOUNTS = [10, 29, 55, 110, 250];
const CASHOUT_AMOUNTS = [50, 100, 200, 500];

// ─── State machine ──────────────────────────────────────────────────────────

async function processInput(session, input) {
  const state = session.menuState || 'WELCOME';
  const handler = STATE_HANDLERS[state];
  if (!handler) {
    return endSession('System error. Please try again.');
  }
  try {
    return await handler(session, (input || '').trim());
  } catch (err) {
    console.error(`[USSD-MENU] Error in state ${state}:`, err.message);
    return endSession('Service unavailable. Please try again later.');
  }
}

function continueSession(response, menuState, data) {
  return {
    response: response.substring(0, 182),
    type: 'continue',
    sessionUpdates: {
      menuState,
      ...(data ? { data } : {}),
    },
  };
}

function endSession(response) {
  return {
    response: response.substring(0, 182),
    type: 'end',
    sessionUpdates: {},
  };
}

// ─── State handlers ─────────────────────────────────────────────────────────

const STATE_HANDLERS = {
  WELCOME: handleWelcome,
  REGISTER: handleRegister,
  REGISTER_ID: handleRegisterId,
  REGISTER_PIN: handleRegisterPin,
  REGISTER_PIN_CONFIRM: handleRegisterPinConfirm,
  PIN_ENTRY: handlePinEntry,
  MAIN_MENU: handleMainMenu,
  BALANCE: handleBalance,
  BUY_AIRTIME: handleBuyAirtime,
  BUY_AIRTIME_CONFIRM: handleBuyAirtimeConfirm,
  BUY_DATA: handleBuyData,
  BUY_DATA_CONFIRM: handleBuyDataConfirm,
  CASH_OUT: handleCashOut,
  CASH_OUT_CONFIRM: handleCashOutConfirm,
  MORE_MENU: handleMoreMenu,
  MINI_STATEMENT: handleMiniStatement,
  CHANGE_PIN: handleChangePin,
  CHANGE_PIN_NEW: handleChangePinNew,
  CHANGE_PIN_CONFIRM: handleChangePinConfirm,
  REFERRAL_CODE: handleReferralCode,
  HELP: handleHelp,
};

// ─── WELCOME ────────────────────────────────────────────────────────────────

async function handleWelcome(session) {
  const user = await ussdAuthService.findUserByMsisdn(session.msisdn);
  if (user) {
    if (user.status !== 'active') {
      return endSession('Your account is suspended. Call 0800 MyMoolah for help.');
    }
    if (!user.ussd_pin) {
      return continueSession(
        'Welcome to MyMoolah!\nSet a 5-digit USSD PIN:',
        'REGISTER_PIN',
        { userId: user.id, isExistingUser: true }
      );
    }
    return continueSession('MyMoolah\nEnter your 5-digit PIN:', 'PIN_ENTRY', { userId: user.id });
  }
  return continueSession(
    'Welcome to MyMoolah!\n1 Register new wallet\n2 Help\n0 Exit',
    'REGISTER'
  );
}

// ─── REGISTRATION ───────────────────────────────────────────────────────────

async function handleRegister(session, input) {
  if (input === '1') {
    return continueSession('Enter your SA ID number\nor passport number:', 'REGISTER_ID');
  }
  if (input === '2') {
    return endSession('MyMoolah Help\nCall: 0800 696 652\nWeb: mymoolah.africa\nDial again to register.');
  }
  if (input === '0') return endSession('Thank you. Goodbye!');
  return continueSession('Invalid choice.\n1 Register\n2 Help\n0 Exit', 'REGISTER');
}

async function handleRegisterId(session, input) {
  const result = ussdAuthService.validateIdNumber(input);
  if (!result.valid) {
    return continueSession(
      'Invalid ID/passport.\nEnter 13-digit SA ID or\npassport number:',
      'REGISTER_ID'
    );
  }
  return continueSession(
    'Create a 5-digit PIN\n(numbers only):',
    'REGISTER_PIN',
    { idNumber: result.normalized, idType: result.type }
  );
}

async function handleRegisterPin(session, input) {
  if (!ussdAuthService.isValidUssdPin(input)) {
    return continueSession('PIN must be exactly 5 digits.\nEnter your PIN:', 'REGISTER_PIN');
  }
  return continueSession('Confirm your PIN:', 'REGISTER_PIN_CONFIRM', { newPin: input });
}

async function handleRegisterPinConfirm(session, input) {
  if (input !== session.data.newPin) {
    return continueSession(
      'PINs do not match.\nCreate a 5-digit PIN:',
      'REGISTER_PIN',
      { ...session.data, newPin: undefined }
    );
  }

  if (session.data.isExistingUser) {
    await ussdAuthService.setUssdPin(session.data.userId, input);
    return continueSession(
      'PIN set! You can now use USSD.\nEnter your PIN:',
      'PIN_ENTRY',
      { userId: session.data.userId }
    );
  }

  const reg = await ussdAuthService.registerUssdUser(session.msisdn, session.data.idNumber, input);
  if (!reg.success) {
    const msgs = {
      already_registered: 'Number already registered.\nDial again and enter your PIN.',
      duplicate: 'This ID is already linked\nto an account. Call 0800 696 652.',
      invalid_id: 'Invalid ID number.\nPlease try again.',
    };
    return endSession(msgs[reg.reason] || 'Registration failed. Try again later.');
  }

  return endSession(
    'Welcome to MyMoolah!\nWallet created. Bal: R0.00\nDial again to start transacting.'
  );
}

// ─── PIN ENTRY ──────────────────────────────────────────────────────────────

async function handlePinEntry(session, input) {
  const userId = session.data.userId;
  const result = await ussdAuthService.verifyUssdPin(userId, input);

  if (result.success) {
    return continueSession(mainMenuText(), 'MAIN_MENU', { pinVerified: true });
  }
  if (result.reason === 'locked') {
    return endSession(`Account locked for ${result.minutesRemaining}min.\nCall 0800 696 652 for help.`);
  }
  if (result.reason === 'no_pin') {
    return continueSession('Set a 5-digit USSD PIN:', 'REGISTER_PIN', { userId, isExistingUser: true });
  }
  const left = result.attemptsLeft || 0;
  return continueSession(`Wrong PIN. ${left} attempt${left !== 1 ? 's' : ''} left.\nEnter PIN:`, 'PIN_ENTRY');
}

// ─── MAIN MENU ──────────────────────────────────────────────────────────────

function mainMenuText() {
  return 'MyMoolah\n1 Balance\n2 Buy airtime\n3 Buy data\n4 Cash out\n5 More\n0 Exit';
}

async function handleMainMenu(session, input) {
  switch (input) {
    case '1': return handleBalance(session, input);
    case '2': return continueSession(airtimeMenuText(), 'BUY_AIRTIME');
    case '3': return continueSession(dataMenuText(), 'BUY_DATA');
    case '4': return continueSession(cashOutMenuText(), 'CASH_OUT');
    case '5': return continueSession(moreMenuText(), 'MORE_MENU');
    case '0': return endSession('Thank you for using MyMoolah!');
    default: return continueSession('Invalid choice.\n' + mainMenuText(), 'MAIN_MENU');
  }
}

// ─── BALANCE ────────────────────────────────────────────────────────────────

async function handleBalance(session) {
  const bal = await getWalletBalance(session.data.userId);
  if (bal === null) return endSession('Wallet not found. Call 0800 696 652.');
  return endSession(`Balance: R${bal}\nAvailable: R${bal}`);
}

// ─── BUY AIRTIME ────────────────────────────────────────────────────────────

function airtimeMenuText() {
  return 'Buy Airtime\n' + AIRTIME_AMOUNTS.map((a, i) => `${i + 1} R${a}`).join('\n') + '\n0 Back';
}

async function handleBuyAirtime(session, input) {
  if (input === '0') return continueSession(mainMenuText(), 'MAIN_MENU');
  const idx = parseInt(input, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= AIRTIME_AMOUNTS.length) {
    return continueSession('Invalid choice.\n' + airtimeMenuText(), 'BUY_AIRTIME');
  }
  const amount = AIRTIME_AMOUNTS[idx];
  const phone = formatPhone(session.msisdn);
  return continueSession(
    `Buy R${amount} airtime for ${phone}?\n1 Yes\n2 No`,
    'BUY_AIRTIME_CONFIRM',
    { airtimeAmount: amount }
  );
}

async function handleBuyAirtimeConfirm(session, input) {
  if (input === '2' || input === '0') return continueSession(airtimeMenuText(), 'BUY_AIRTIME');
  if (input !== '1') return continueSession(`1 Yes\n2 No`, 'BUY_AIRTIME_CONFIRM');

  const amount = session.data.airtimeAmount;
  const userId = session.data.userId;

  const balCheck = await checkBalanceAndLimits(userId, amount);
  if (!balCheck.ok) return endSession(balCheck.message);

  try {
    const result = await purchaseVAS(userId, session.msisdn, 'airtime', amount, session.sessionId);
    if (result.success) {
      const newBal = await getWalletBalance(userId);
      return endSession(`Airtime R${amount} sent to ${formatPhone(session.msisdn)}.\nBal: R${newBal}`);
    }
    return endSession(result.error || 'Airtime purchase failed. Try again.');
  } catch (err) {
    console.error('[USSD] Airtime purchase error:', err.message);
    return endSession('Service error. Try again later.');
  }
}

// ─── BUY DATA ───────────────────────────────────────────────────────────────

function dataMenuText() {
  return 'Buy Data\n' + DATA_AMOUNTS.map((a, i) => `${i + 1} R${a}`).join('\n') + '\n0 Back';
}

async function handleBuyData(session, input) {
  if (input === '0') return continueSession(mainMenuText(), 'MAIN_MENU');
  const idx = parseInt(input, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= DATA_AMOUNTS.length) {
    return continueSession('Invalid choice.\n' + dataMenuText(), 'BUY_DATA');
  }
  const amount = DATA_AMOUNTS[idx];
  const phone = formatPhone(session.msisdn);
  return continueSession(
    `Buy R${amount} data for ${phone}?\n1 Yes\n2 No`,
    'BUY_DATA_CONFIRM',
    { dataAmount: amount }
  );
}

async function handleBuyDataConfirm(session, input) {
  if (input === '2' || input === '0') return continueSession(dataMenuText(), 'BUY_DATA');
  if (input !== '1') return continueSession('1 Yes\n2 No', 'BUY_DATA_CONFIRM');

  const amount = session.data.dataAmount;
  const userId = session.data.userId;

  const balCheck = await checkBalanceAndLimits(userId, amount);
  if (!balCheck.ok) return endSession(balCheck.message);

  try {
    const result = await purchaseVAS(userId, session.msisdn, 'data', amount, session.sessionId);
    if (result.success) {
      const newBal = await getWalletBalance(userId);
      return endSession(`Data R${amount} sent to ${formatPhone(session.msisdn)}.\nBal: R${newBal}`);
    }
    return endSession(result.error || 'Data purchase failed. Try again.');
  } catch (err) {
    console.error('[USSD] Data purchase error:', err.message);
    return endSession('Service error. Try again later.');
  }
}

// ─── CASH OUT (eeziCash) ────────────────────────────────────────────────────

function cashOutMenuText() {
  return 'Cash Out (eeziCash)\n' + CASHOUT_AMOUNTS.map((a, i) => `${i + 1} R${a}`).join('\n') + '\n0 Back';
}

async function handleCashOut(session, input) {
  if (input === '0') return continueSession(mainMenuText(), 'MAIN_MENU');
  const idx = parseInt(input, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= CASHOUT_AMOUNTS.length) {
    return continueSession('Invalid choice.\n' + cashOutMenuText(), 'CASH_OUT');
  }
  const amount = CASHOUT_AMOUNTS[idx];
  return continueSession(
    `Cash out R${amount} via eeziCash?\n1 Yes\n2 No`,
    'CASH_OUT_CONFIRM',
    { cashOutAmount: amount }
  );
}

async function handleCashOutConfirm(session, input) {
  if (input === '2' || input === '0') return continueSession(cashOutMenuText(), 'CASH_OUT');
  if (input !== '1') return continueSession('1 Yes\n2 No', 'CASH_OUT_CONFIRM');

  const amount = session.data.cashOutAmount;
  const userId = session.data.userId;

  const balCheck = await checkBalanceAndLimits(userId, amount);
  if (!balCheck.ok) return endSession(balCheck.message);

  try {
    const result = await purchaseEeziVoucher(userId, amount, session.sessionId);
    if (result.success) {
      const newBal = await getWalletBalance(userId);
      return endSession(
        `eeziCash PIN: ${result.pin}\nPresent at any eeziPay retailer.\nBal: R${newBal}`
      );
    }
    return endSession(result.error || 'Cash out failed. Try again.');
  } catch (err) {
    console.error('[USSD] eeziCash error:', err.message);
    return endSession('Service error. Try again later.');
  }
}

// ─── MORE MENU ──────────────────────────────────────────────────────────────

function moreMenuText() {
  return 'More\n1 Mini statement\n2 Change PIN\n3 My referral code\n4 Help\n0 Back';
}

async function handleMoreMenu(session, input) {
  switch (input) {
    case '1': return handleMiniStatement(session, input);
    case '2': return continueSession('Enter current PIN:', 'CHANGE_PIN');
    case '3': return handleReferralCode(session, input);
    case '4': return handleHelp(session, input);
    case '0': return continueSession(mainMenuText(), 'MAIN_MENU');
    default: return continueSession('Invalid choice.\n' + moreMenuText(), 'MORE_MENU');
  }
}

// ─── MINI STATEMENT ─────────────────────────────────────────────────────────

async function handleMiniStatement(session) {
  const userId = session.data.userId;
  try {
    const [rows] = await sequelize.query(
      `SELECT type, amount, description, "createdAt"
       FROM transactions
       WHERE "userId" = $1 AND status = 'completed'
       ORDER BY "createdAt" DESC LIMIT 5`,
      { bind: [userId] }
    );
    if (!rows.length) return endSession('No transactions yet.');

    const lines = rows.map((r) => {
      const sign = ['send', 'withdraw', 'payment', 'fee'].includes(r.type) ? '-' : '+';
      const d = new Date(r.createdAt);
      const date = `${d.getDate()}/${d.getMonth() + 1}`;
      const desc = (r.description || r.type).substring(0, 12);
      return `${date} ${sign}R${parseFloat(r.amount).toFixed(0)} ${desc}`;
    });
    const bal = await getWalletBalance(userId);
    return endSession(`Last 5 txns:\n${lines.join('\n')}\nBal: R${bal}`);
  } catch (err) {
    console.error('[USSD] Mini statement error:', err.message);
    return endSession('Could not load statement. Try again.');
  }
}

// ─── CHANGE PIN ─────────────────────────────────────────────────────────────

async function handleChangePin(session, input) {
  const result = await ussdAuthService.verifyUssdPin(session.data.userId, input);
  if (!result.success) {
    if (result.reason === 'locked') {
      return endSession(`Account locked for ${result.minutesRemaining}min.`);
    }
    return continueSession('Wrong PIN. Enter current PIN:', 'CHANGE_PIN');
  }
  return continueSession('Enter new 5-digit PIN:', 'CHANGE_PIN_NEW');
}

async function handleChangePinNew(session, input) {
  if (!ussdAuthService.isValidUssdPin(input)) {
    return continueSession('PIN must be 5 digits.\nEnter new PIN:', 'CHANGE_PIN_NEW');
  }
  return continueSession('Confirm new PIN:', 'CHANGE_PIN_CONFIRM', { newPin: input });
}

async function handleChangePinConfirm(session, input) {
  if (input !== session.data.newPin) {
    return continueSession('PINs do not match.\nEnter new PIN:', 'CHANGE_PIN_NEW', { newPin: undefined });
  }
  await ussdAuthService.setUssdPin(session.data.userId, input);
  return endSession('PIN changed successfully!');
}

// ─── REFERRAL CODE ──────────────────────────────────────────────────────────

async function handleReferralCode(session) {
  try {
    const [rows] = await sequelize.query(
      `SELECT code FROM referral_codes WHERE "userId" = $1 AND active = true LIMIT 1`,
      { bind: [session.data.userId] }
    );
    if (rows.length) {
      return endSession(`Your referral code:\n${rows[0].code}\nShare it to earn rewards!`);
    }
    return endSession('No referral code found.\nUse the app to get one.');
  } catch {
    return endSession('Referral service unavailable.');
  }
}

// ─── HELP ───────────────────────────────────────────────────────────────────

async function handleHelp() {
  return endSession('MyMoolah Help\nCall: 0800 696 652\nWhatsApp: 060 070 0800\nWeb: mymoolah.africa');
}

// ─── Operations ─────────────────────────────────────────────────────────────

async function getWalletBalance(userId) {
  const [rows] = await sequelize.query(
    'SELECT balance FROM wallets WHERE "userId" = $1 LIMIT 1',
    { bind: [userId] }
  );
  if (!rows.length) return null;
  return parseFloat(rows[0].balance).toFixed(2);
}

async function checkBalanceAndLimits(userId, amountRand) {
  const [walletRows] = await sequelize.query(
    'SELECT balance FROM wallets WHERE "userId" = $1 LIMIT 1',
    { bind: [userId] }
  );
  if (!walletRows.length) return { ok: false, message: 'Wallet not found.' };
  const balance = parseFloat(walletRows[0].balance);
  if (balance < amountRand) {
    return { ok: false, message: `Insufficient balance. Bal: R${balance.toFixed(2)}` };
  }

  const [userRows] = await sequelize.query(
    `SELECT "kycStatus" FROM users WHERE id = $1 LIMIT 1`,
    { bind: [userId] }
  );
  if (userRows[0]?.kycStatus === 'ussd_basic') {
    const today = new Date().toISOString().split('T')[0];
    const [dailyRows] = await sequelize.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS total
       FROM transactions
       WHERE "userId" = $1 AND status = 'completed'
         AND type IN ('send','withdraw','payment')
         AND DATE("createdAt") = $2`,
      { bind: [userId, today] }
    );
    const dailyTotal = parseFloat(dailyRows[0].total) + amountRand;
    if (dailyTotal > TIER0_DAILY_LIMIT) {
      return { ok: false, message: `Daily limit R${TIER0_DAILY_LIMIT} reached.\nUpgrade via the app.` };
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [monthRows] = await sequelize.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS total
       FROM transactions
       WHERE "userId" = $1 AND status = 'completed'
         AND type IN ('send','withdraw','payment')
         AND "createdAt" >= $2`,
      { bind: [userId, monthStart.toISOString()] }
    );
    const monthlyTotal = parseFloat(monthRows[0].total) + amountRand;
    if (monthlyTotal > TIER0_MONTHLY_LIMIT) {
      return { ok: false, message: `Monthly limit R${TIER0_MONTHLY_LIMIT} reached.\nUpgrade via the app.` };
    }
  }

  return { ok: true };
}

async function purchaseVAS(userId, msisdn, productType, amountRand, sessionId) {
  try {
    const ProductPurchaseService = require('./productPurchaseService');
    const service = new ProductPurchaseService();

    const e164 = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
    const localNum = '0' + e164.slice(3);

    const idempotencyKey = `ussd-${productType}-${sessionId}-${amountRand}`;
    const amountCents = amountRand * 100;

    const result = await service.purchaseProduct(
      {
        denomination: amountCents,
        recipient: { phoneNumber: localNum },
        idempotencyKey,
        productType,
      },
      userId
    );
    return { success: result.success, voucherCode: result.voucherCode, error: result.message };
  } catch (err) {
    console.error(`[USSD] VAS ${productType} error:`, err.message);
    return { success: false, error: 'Purchase failed. Try again.' };
  }
}

async function purchaseEeziVoucher(userId, amountRand, sessionId) {
  try {
    const FlashAuthService = require('./flashAuthService');
    const flashAuth = FlashAuthService.getInstance
      ? FlashAuthService.getInstance()
      : new FlashAuthService();

    const [walletRows] = await sequelize.query(
      'SELECT id, balance, "walletId" FROM wallets WHERE "userId" = $1 LIMIT 1',
      { bind: [userId] }
    );
    if (!walletRows.length) return { success: false, error: 'Wallet not found.' };

    const wallet = walletRows[0];
    const balance = parseFloat(wallet.balance);
    if (balance < amountRand) return { success: false, error: 'Insufficient balance.' };

    const amountCents = amountRand * 100;
    const reference = `USSD-EEZI-${sessionId}-${Date.now()}`.replace(/_/g, '-');
    const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
    if (!accountNumber) return { success: false, error: 'Cash out not configured.' };

    const storeId = process.env.FLASH_STORE_ID || accountNumber.replace(/-/g, '').slice(0, 12);
    const terminalId = process.env.FLASH_TERMINAL_ID || accountNumber.replace(/-/g, '').slice(0, 12);

    const response = await flashAuth.makeAuthenticatedRequest('POST', '/eezi-voucher/purchase', {
      reference,
      accountNumber,
      amount: amountCents,
      storeId,
      terminalId,
    });

    const eeziPin = response?.voucherPin || response?.pin || response?.data?.pin || response?.token || null;
    if (!eeziPin) {
      return { success: false, error: 'Voucher error. Try again.' };
    }

    const newBalance = balance - amountRand;
    await sequelize.query('UPDATE wallets SET balance = $1, "updatedAt" = NOW() WHERE "userId" = $2', {
      bind: [newBalance, userId],
    });

    const txnId = `TXN-USSD-${Date.now()}-CASHOUT`;
    await sequelize.query(
      `INSERT INTO transactions ("transactionId", "userId", "walletId", amount, type, status, description, metadata, currency, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'withdraw', 'completed', $5, $6, 'ZAR', NOW(), NOW())`,
      {
        bind: [
          txnId, userId, wallet.walletId, amountRand,
          `eeziCash R${amountRand}`,
          JSON.stringify({ channel: 'ussd', reference, eeziPin: '***' }),
        ],
      }
    );

    return { success: true, pin: eeziPin };
  } catch (err) {
    console.error('[USSD] eeziCash purchase error:', err.message);
    return { success: false, error: 'Cash out failed. Try again.' };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPhone(msisdn) {
  const e164 = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
  if (e164.startsWith('+27') && e164.length === 12) {
    return '0' + e164.slice(3);
  }
  return e164;
}

module.exports = { processInput };
