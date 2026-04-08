'use strict';

const { sequelize, Wallet, Transaction, User } = require('../models');
const ussdAuthService = require('./ussdAuthService');
const { getLimitsForTier } = require('../config/kycTierLimits');
const { encrypt, blindIndex } = require('../utils/fieldEncryption');
const smsService = require('./smsService');

const AIRTIME_AMOUNTS = [5, 10, 29, 55, 110];
const DATA_AMOUNTS = [10, 29, 55, 110, 250];
const CASHOUT_AMOUNTS = [50, 100, 200, 500];
const EEZI_AIRTIME_AMOUNTS = [5, 10, 29, 55, 110];
const EEZI_POWER_AMOUNTS = [20, 50, 100, 200, 500];
const VOUCHER_AMOUNTS = [10, 25, 50, 100, 200, 500];
const BETTING_VOUCHER_AMOUNTS = [50, 100, 200, 500, 1000];

const SMS_FEE_AMOUNT = parseFloat(process.env.SMS_FEE_AMOUNT || '0.40');
const SMS_FEE_EX_VAT = parseFloat((SMS_FEE_AMOUNT / 1.15).toFixed(2));
const SMS_FEE_VAT = parseFloat((SMS_FEE_AMOUNT - SMS_FEE_EX_VAT).toFixed(2));
const LEDGER_ACCOUNT_SMS_FEE = process.env.LEDGER_ACCOUNT_SMS_FEE_REVENUE || '4000-20-03';
const LEDGER_ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
const LEDGER_ACCOUNT_VAT_CONTROL = process.env.LEDGER_ACCOUNT_VAT_CONTROL || '2300-10-01';
const LEDGER_ACCOUNT_FLASH_FLOAT = process.env.LEDGER_ACCOUNT_FLASH_FLOAT || '1200-10-04';

const VOUCHER_BRANDS = [
  { key: '1voucher',  name: '1Voucher',       amounts: VOUCHER_AMOUNTS },
  { key: 'ott',       name: 'OTT Voucher',    amounts: VOUCHER_AMOUNTS },
  { key: 'blu',       name: 'Blu Voucher',     amounts: VOUCHER_AMOUNTS },
  { key: 'betway',    name: 'Betway',          amounts: BETTING_VOUCHER_AMOUNTS },
  { key: 'hollywood', name: 'Hollywood Bets',  amounts: BETTING_VOUCHER_AMOUNTS },
  { key: 'supabets',  name: 'SupaBets',        amounts: BETTING_VOUCHER_AMOUNTS },
];

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
    console.error(`[USSD-MENU] Error in state ${state}:`, err.message, err.stack?.split('\n').slice(0, 5).join(' | '));
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
  REGISTER_FIRST_NAME: handleRegisterFirstName,
  REGISTER_LAST_NAME: handleRegisterLastName,
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
  SEND_MONEY_PHONE: handleSendMoneyPhone,
  SEND_MONEY_AMOUNT: handleSendMoneyAmount,
  SEND_MONEY_CONFIRM: handleSendMoneyConfirm,
  AIRTIME_OTHERS_PHONE: handleAirtimeOthersPhone,
  AIRTIME_OTHERS_AMOUNT: handleAirtimeOthersAmount,
  AIRTIME_OTHERS_CONFIRM: handleAirtimeOthersConfirm,
  ELECTRICITY_AMOUNT: handleElectricityAmount,
  ELECTRICITY_CONFIRM: handleElectricityConfirm,
  VOUCHER_BRAND: handleVoucherBrand,
  VOUCHER_AMOUNT: handleVoucherAmount,
  VOUCHER_CONFIRM: handleVoucherConfirm,
};

// ─── WELCOME ────────────────────────────────────────────────────────────────

async function handleWelcome(session) {
  const user = await ussdAuthService.findUserByMsisdn(session.msisdn);
  if (user) {
    if (user.status !== 'active') {
      return endSession('Your account is suspended. Call 0800 MyMoolah for help.');
    }
    if (!user.ussd_pin) {
      const hasId = user.idNumber && user.idType;
      if (!hasId) {
        return continueSession(
          'Welcome to MyMoolah!\nWe need some details first.\nEnter your first name:',
          'REGISTER_FIRST_NAME',
          { userId: user.id, isExistingUser: true, needsId: true }
        );
      }
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
    return continueSession('Enter your first name:', 'REGISTER_FIRST_NAME');
  }
  if (input === '2') {
    return endSession('MyMoolah Help\nCall: 0800 696 652\nWeb: mymoolah.africa\nDial again to register.');
  }
  if (input === '0') return endSession('Thank you. Goodbye!');
  return continueSession('Invalid choice.\n1 Register\n2 Help\n0 Exit', 'REGISTER');
}

async function handleRegisterFirstName(session, input) {
  if (!ussdAuthService.isValidName(input)) {
    return continueSession(
      'Invalid name. Letters only.\nEnter your first name:',
      'REGISTER_FIRST_NAME'
    );
  }
  const firstName = ussdAuthService.sanitizeName(input);
  return continueSession('Enter your surname:', 'REGISTER_LAST_NAME', { firstName });
}

async function handleRegisterLastName(session, input) {
  if (!ussdAuthService.isValidName(input)) {
    return continueSession(
      'Invalid surname. Letters only.\nEnter your surname:',
      'REGISTER_LAST_NAME'
    );
  }
  const lastName = ussdAuthService.sanitizeName(input);
  return continueSession(
    'Enter your SA ID number\nor passport number:',
    'REGISTER_ID',
    { lastName }
  );
}

async function handleRegisterId(session, input) {
  const result = ussdAuthService.validateIdNumber(input);
  if (!result.valid) {
    return continueSession(
      'Invalid ID/passport.\nEnter 13-digit SA ID or\npassport number:',
      'REGISTER_ID'
    );
  }

  if (session.data.isExistingUser && session.data.needsId) {
    const userId = session.data.userId;
    const firstName = session.data.firstName;
    const lastName = session.data.lastName;
    const encryptedId = encrypt(result.normalized);
    const idHash = blindIndex(result.normalized);
    await sequelize.query(
      'UPDATE users SET "idNumber" = $1, "idNumberHash" = $2, "idType" = $3, "firstName" = $4, "lastName" = $5, "idVerified" = true, kyc_tier = 0, "updatedAt" = NOW() WHERE id = $6',
      { bind: [encryptedId, idHash, result.type, firstName, lastName, userId] }
    );
    await sequelize.query(
      'UPDATE wallets SET "kycVerified" = true, "kycVerifiedAt" = NOW(), "updatedAt" = NOW() WHERE "userId" = $1',
      { bind: [userId] }
    );
    return continueSession(
      'Set a 5-digit USSD PIN:',
      'REGISTER_PIN',
      { userId, isExistingUser: true }
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

  const reg = await ussdAuthService.registerUssdUser(
    session.msisdn, session.data.firstName, session.data.lastName,
    session.data.idNumber, input
  );
  if (!reg.success) {
    const msgs = {
      already_registered: 'Number already registered.\nDial again and enter your PIN.',
      duplicate: 'This ID is already linked\nto an account. Call 0800 696 652.',
      invalid_id: 'Invalid ID number.\nPlease try again.',
    };
    return endSession(msgs[reg.reason] || 'Registration failed. Try again later.');
  }

  return endSession(
    `Welcome ${session.data.firstName}!\nWallet created. Bal: R0.00\nDial again to start transacting.`
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
  return 'MyMoolah\n1 Balance\n2 Send Money\n3 Buy Airtime\n4 Buy Data\n5 Cash Out\n6 More\n0 Exit';
}

async function handleMainMenu(session, input) {
  switch (input) {
    case '1': return handleBalance(session, input);
    case '2': return continueSession('Send Money\nEnter recipient phone number:', 'SEND_MONEY_PHONE');
    case '3': return continueSession(airtimeMenuText(), 'BUY_AIRTIME');
    case '4': return continueSession(dataMenuText(), 'BUY_DATA');
    case '5': return continueSession(cashOutMenuText(), 'CASH_OUT');
    case '6': return continueSession(moreMenuText(), 'MORE_MENU');
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

// ─── SEND MONEY (P2P) ──────────────────────────────────────────────────────

async function handleSendMoneyPhone(session, input) {
  if (input === '0') return continueSession(mainMenuText(), 'MAIN_MENU');
  const phone = normalizePhoneNumber(input);
  if (!phone) {
    return continueSession('Invalid number. Enter SA\nphone number (e.g. 0821234567):', 'SEND_MONEY_PHONE');
  }
  if (phone === session.msisdn) {
    return continueSession('Cannot send to yourself.\nEnter recipient phone number:', 'SEND_MONEY_PHONE');
  }

  const [rows] = await sequelize.query(
    `SELECT id, "firstName", "lastName" FROM users WHERE "phoneNumber" = $1 LIMIT 1`,
    { bind: [phone] }
  );
  if (!rows.length) {
    return endSession('This number is not registered\non MyMoolah. Only existing\nMyMoolah users can receive.');
  }
  const receiver = rows[0];
  const receiverName = `${receiver.firstName || ''} ${receiver.lastName || ''}`.trim();
  return continueSession(
    `Send to ${receiverName}\nEnter amount (R1+):`,
    'SEND_MONEY_AMOUNT',
    { receiverId: receiver.id, receiverName, receiverPhone: phone }
  );
}

async function handleSendMoneyAmount(session, input) {
  if (input === '0') return continueSession(mainMenuText(), 'MAIN_MENU');
  const amount = parseFloat(input);
  if (isNaN(amount) || amount < 1) {
    return continueSession('Invalid amount. Min R1.\nEnter amount:', 'SEND_MONEY_AMOUNT');
  }
  const rounded = parseFloat(amount.toFixed(2));
  return continueSession(
    `Send R${rounded} to ${session.data.receiverName}?\n1 Yes\n2 No`,
    'SEND_MONEY_CONFIRM',
    { sendAmount: rounded }
  );
}

async function handleSendMoneyConfirm(session, input) {
  if (input === '2' || input === '0') return continueSession(mainMenuText(), 'MAIN_MENU');
  if (input !== '1') return continueSession('1 Yes\n2 No', 'SEND_MONEY_CONFIRM');

  const amount = session.data.sendAmount;
  const userId = session.data.userId;
  const receiverId = session.data.receiverId;

  const balCheck = await checkBalanceAndLimits(userId, amount);
  if (!balCheck.ok) return endSession(balCheck.message);

  try {
    const result = await sendMoneyToUser(userId, receiverId, amount, session.sessionId, session.msisdn, session.data.receiverPhone, session.data.receiverName);
    if (result.success) {
      const newBal = await getWalletBalance(userId);
      return endSession(`R${amount} sent to ${session.data.receiverName}.\nBal: R${newBal}`);
    }
    return endSession(result.error || 'Transfer failed. Try again.');
  } catch (err) {
    console.error('[USSD] Send money error:', err.message);
    return endSession('Service error. Try again later.');
  }
}

// ─── BUY AIRTIME (self — pinless) ──────────────────────────────────────────

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

// ─── BUY DATA (self — pinless) ──────────────────────────────────────────────

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
  const total = parseFloat((amount + SMS_FEE_AMOUNT).toFixed(2));
  return continueSession(
    `Cash out R${amount} (eeziCash)\n+R${SMS_FEE_AMOUNT.toFixed(2)} SMS fee\nTotal: R${total.toFixed(2)}\n1 Yes 2 No`,
    'CASH_OUT_CONFIRM',
    { cashOutAmount: amount }
  );
}

async function handleCashOutConfirm(session, input) {
  if (input === '2' || input === '0') return continueSession(cashOutMenuText(), 'CASH_OUT');
  if (input !== '1') return continueSession('1 Yes\n2 No', 'CASH_OUT_CONFIRM');

  const amount = session.data.cashOutAmount;
  const total = parseFloat((amount + SMS_FEE_AMOUNT).toFixed(2));
  const userId = session.data.userId;

  const balCheck = await checkBalanceAndLimits(userId, total, { isCashOut: true });
  if (!balCheck.ok) return endSession(balCheck.message);

  try {
    const result = await purchaseEeziVoucher(userId, amount, session.sessionId);
    if (result.success) {
      await debitSmsFee(userId, session.sessionId, 'USSD-CASH');
      sendPinSmsAsync(session.msisdn, result.pin, amount, null, 'eeziCash');
      const newBal = await getWalletBalance(userId);
      return endSession(`eeziCash R${amount} purchased!\nPIN sent via SMS.\nBal: R${newBal}`);
    }
    return endSession(result.error || 'Cash out failed. Try again.');
  } catch (err) {
    console.error('[USSD] eeziCash error:', err.message);
    return endSession('Service error. Try again later.');
  }
}

// ─── MORE MENU ──────────────────────────────────────────────────────────────

function moreMenuText() {
  return 'More\n1 Airtime for Others\n2 Buy Electricity\n3 Buy Voucher\n4 Mini Statement\n5 Change PIN\n6 Referral Code\n7 Help\n0 Back';
}

async function handleMoreMenu(session, input) {
  switch (input) {
    case '1': return continueSession('Airtime for Others\nEnter recipient phone number:', 'AIRTIME_OTHERS_PHONE');
    case '2': return continueSession(electricityMenuText(), 'ELECTRICITY_AMOUNT');
    case '3': return continueSession(voucherBrandMenuText(), 'VOUCHER_BRAND');
    case '4': return handleMiniStatement(session, input);
    case '5': return continueSession('Enter current PIN:', 'CHANGE_PIN');
    case '6': return handleReferralCode(session, input);
    case '7': return handleHelp(session, input);
    case '0': return continueSession(mainMenuText(), 'MAIN_MENU');
    default: return continueSession('Invalid choice.\n' + moreMenuText(), 'MORE_MENU');
  }
}

// ─── AIRTIME FOR OTHERS (eeziAirtime PIN) ──────────────────────────────────

function eeziAirtimeMenuText() {
  return 'Airtime for Others\n' + EEZI_AIRTIME_AMOUNTS.map((a, i) => `${i + 1} R${a}`).join('\n') + '\n0 Back';
}

async function handleAirtimeOthersPhone(session, input) {
  if (input === '0') return continueSession(moreMenuText(), 'MORE_MENU');
  const phone = normalizePhoneNumber(input);
  if (!phone) {
    return continueSession('Invalid number.\nEnter SA phone number\n(e.g. 0821234567):', 'AIRTIME_OTHERS_PHONE');
  }
  return continueSession(
    eeziAirtimeMenuText(),
    'AIRTIME_OTHERS_AMOUNT',
    { recipientPhone: formatPhone(phone) }
  );
}

async function handleAirtimeOthersAmount(session, input) {
  if (input === '0') return continueSession(moreMenuText(), 'MORE_MENU');
  const idx = parseInt(input, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= EEZI_AIRTIME_AMOUNTS.length) {
    return continueSession('Invalid choice.\n' + eeziAirtimeMenuText(), 'AIRTIME_OTHERS_AMOUNT');
  }
  const amount = EEZI_AIRTIME_AMOUNTS[idx];
  const total = parseFloat((amount + SMS_FEE_AMOUNT).toFixed(2));
  return continueSession(
    `R${amount} Airtime to ${session.data.recipientPhone}\n+R${SMS_FEE_AMOUNT.toFixed(2)} SMS fee\nTotal: R${total.toFixed(2)}\n1 Yes 2 No`,
    'AIRTIME_OTHERS_CONFIRM',
    { eeziAirtimeAmount: amount }
  );
}

async function handleAirtimeOthersConfirm(session, input) {
  if (input === '2' || input === '0') return continueSession(moreMenuText(), 'MORE_MENU');
  if (input !== '1') return continueSession('1 Yes\n2 No', 'AIRTIME_OTHERS_CONFIRM');

  const amount = session.data.eeziAirtimeAmount;
  const total = parseFloat((amount + SMS_FEE_AMOUNT).toFixed(2));
  const userId = session.data.userId;

  const balCheck = await checkBalanceAndLimits(userId, total);
  if (!balCheck.ok) return endSession(balCheck.message);

  try {
    const result = await purchaseEeziProduct(userId, amount, session.sessionId, false);
    if (result.success) {
      await debitSmsFee(userId, session.sessionId, 'USSD-EA');
      sendPinSmsAsync(session.msisdn, result.pin, amount, session.data.recipientPhone, 'eeziAirtime');
      const newBal = await getWalletBalance(userId);
      return endSession(`Airtime purchased!\nPIN sent via SMS.\nBal: R${newBal}`);
    }
    return endSession(result.error || 'Purchase failed. Try again.');
  } catch (err) {
    console.error('[USSD] eeziAirtime error:', err.message);
    return endSession('Service error. Try again later.');
  }
}

// ─── BUY ELECTRICITY (eeziPower PIN) ───────────────────────────────────────

function electricityMenuText() {
  return 'Buy Electricity\n' + EEZI_POWER_AMOUNTS.map((a, i) => `${i + 1} R${a}`).join('\n') + '\n0 Back';
}

async function handleElectricityAmount(session, input) {
  if (input === '0') return continueSession(moreMenuText(), 'MORE_MENU');
  const idx = parseInt(input, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= EEZI_POWER_AMOUNTS.length) {
    return continueSession('Invalid choice.\n' + electricityMenuText(), 'ELECTRICITY_AMOUNT');
  }
  const amount = EEZI_POWER_AMOUNTS[idx];
  const total = parseFloat((amount + SMS_FEE_AMOUNT).toFixed(2));
  return continueSession(
    `R${amount} Electricity\n+R${SMS_FEE_AMOUNT.toFixed(2)} SMS fee\nTotal: R${total.toFixed(2)}\n1 Yes 2 No`,
    'ELECTRICITY_CONFIRM',
    { eeziPowerAmount: amount }
  );
}

async function handleElectricityConfirm(session, input) {
  if (input === '2' || input === '0') return continueSession(moreMenuText(), 'MORE_MENU');
  if (input !== '1') return continueSession('1 Yes\n2 No', 'ELECTRICITY_CONFIRM');

  const amount = session.data.eeziPowerAmount;
  const total = parseFloat((amount + SMS_FEE_AMOUNT).toFixed(2));
  const userId = session.data.userId;

  const balCheck = await checkBalanceAndLimits(userId, total);
  if (!balCheck.ok) return endSession(balCheck.message);

  try {
    const result = await purchaseEeziProduct(userId, amount, session.sessionId, true);
    if (result.success) {
      await debitSmsFee(userId, session.sessionId, 'USSD-EP');
      sendPinSmsAsync(session.msisdn, result.pin, amount, null, 'eeziPower');
      const newBal = await getWalletBalance(userId);
      return endSession(`Electricity purchased!\nPIN sent via SMS.\nBal: R${newBal}`);
    }
    return endSession(result.error || 'Purchase failed. Try again.');
  } catch (err) {
    console.error('[USSD] eeziPower error:', err.message);
    return endSession('Service error. Try again later.');
  }
}

// ─── BUY VOUCHER (6 brands) ────────────────────────────────────────────────

function voucherBrandMenuText() {
  return 'Buy Voucher\n' + VOUCHER_BRANDS.map((b, i) => `${i + 1} ${b.name}`).join('\n') + '\n0 Back';
}

async function handleVoucherBrand(session, input) {
  if (input === '0') return continueSession(moreMenuText(), 'MORE_MENU');
  const idx = parseInt(input, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= VOUCHER_BRANDS.length) {
    return continueSession('Invalid choice.\n' + voucherBrandMenuText(), 'VOUCHER_BRAND');
  }
  const brand = VOUCHER_BRANDS[idx];
  const amountMenu = brand.name + '\n' + brand.amounts.map((a, i) => `${i + 1} R${a}`).join('\n') + '\n0 Back';
  return continueSession(amountMenu, 'VOUCHER_AMOUNT', { voucherBrandIdx: idx });
}

async function handleVoucherAmount(session, input) {
  if (input === '0') return continueSession(voucherBrandMenuText(), 'VOUCHER_BRAND');
  const brand = VOUCHER_BRANDS[session.data.voucherBrandIdx];
  const idx = parseInt(input, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= brand.amounts.length) {
    const amountMenu = brand.name + '\n' + brand.amounts.map((a, i) => `${i + 1} R${a}`).join('\n') + '\n0 Back';
    return continueSession('Invalid choice.\n' + amountMenu, 'VOUCHER_AMOUNT');
  }
  const amount = brand.amounts[idx];
  const total = parseFloat((amount + SMS_FEE_AMOUNT).toFixed(2));
  return continueSession(
    `R${amount} ${brand.name}\n+R${SMS_FEE_AMOUNT.toFixed(2)} SMS fee\nTotal: R${total.toFixed(2)}\n1 Yes 2 No`,
    'VOUCHER_CONFIRM',
    { voucherAmount: amount }
  );
}

async function handleVoucherConfirm(session, input) {
  if (input === '2' || input === '0') return continueSession(voucherBrandMenuText(), 'VOUCHER_BRAND');
  if (input !== '1') return continueSession('1 Yes\n2 No', 'VOUCHER_CONFIRM');

  const brand = VOUCHER_BRANDS[session.data.voucherBrandIdx];
  const amount = session.data.voucherAmount;
  const total = parseFloat((amount + SMS_FEE_AMOUNT).toFixed(2));
  const userId = session.data.userId;

  const balCheck = await checkBalanceAndLimits(userId, total);
  if (!balCheck.ok) return endSession(balCheck.message);

  try {
    const result = await purchaseVoucherByBrand(userId, brand, amount, session.sessionId);
    if (result.success) {
      await debitSmsFee(userId, session.sessionId, 'USSD-VCH');
      sendPinSmsAsync(session.msisdn, result.pin, amount, null, 'voucher', brand.name);
      const newBal = await getWalletBalance(userId);
      return endSession(`${brand.name} purchased!\nPIN sent via SMS.\nBal: R${newBal}`);
    }
    return endSession(result.error || 'Purchase failed. Try again.');
  } catch (err) {
    console.error('[USSD] Voucher purchase error:', err.message);
    return endSession('Service error. Try again later.');
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
      `SELECT referral_code FROM users WHERE id = $1 LIMIT 1`,
      { bind: [session.data.userId] }
    );
    if (rows.length && rows[0].referral_code) {
      return endSession(`Your referral code:\n${rows[0].referral_code}\nShare it to earn rewards!`);
    }
    return endSession('No referral code yet.\nOpen the app to get one.');
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

async function checkBalanceAndLimits(userId, amountRand, options = {}) {
  const [walletRows] = await sequelize.query(
    'SELECT balance, restricted_balance FROM wallets WHERE "userId" = $1 LIMIT 1',
    { bind: [userId] }
  );
  if (!walletRows.length) return { ok: false, message: 'Wallet not found.' };
  const balance = parseFloat(walletRows[0].balance);
  if (balance < amountRand) {
    return { ok: false, message: `Insufficient balance. Bal: R${balance.toFixed(2)}` };
  }

  if (options.isCashOut) {
    const restricted = parseFloat(walletRows[0].restricted_balance || 0);
    const unrestricted = balance - restricted;
    if (unrestricted < amountRand) {
      return { ok: false, message: `Voucher deposit funds cannot be cashed out. Available: R${Math.max(0, unrestricted).toFixed(2)}` };
    }
  }

  const [userRows] = await sequelize.query(
    `SELECT "kycStatus", kyc_tier FROM users WHERE id = $1 LIMIT 1`,
    { bind: [userId] }
  );
  const kycTier = userRows[0]?.kyc_tier !== null && userRows[0]?.kyc_tier !== undefined
    ? Number(userRows[0].kyc_tier)
    : 0;
  const tierLimits = getLimitsForTier(kycTier);

  if (amountRand > tierLimits.singleTransactionLimit) {
    return { ok: false, message: `Max R${tierLimits.singleTransactionLimit.toLocaleString()} per transaction.\nUpgrade KYC via the app.` };
  }

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
  if (dailyTotal > tierLimits.dailyLimit) {
    return { ok: false, message: `Daily limit R${tierLimits.dailyLimit.toLocaleString()} reached.\nUpgrade KYC via the app.` };
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
  if (monthlyTotal > tierLimits.monthlyLimit) {
    return { ok: false, message: `Monthly limit R${tierLimits.monthlyLimit.toLocaleString()} reached.\nUpgrade KYC via the app.` };
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
  const t = await sequelize.transaction();
  try {
    const wallet = await Wallet.findOne({
      where: { userId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!wallet) {
      await t.rollback();
      return { success: false, error: 'Wallet not found.' };
    }

    const cashOutCheck = wallet.canCashOut(amountRand);
    if (!cashOutCheck.allowed) {
      await t.rollback();
      return { success: false, error: cashOutCheck.reason === 'Insufficient balance' ? 'Insufficient balance.' : cashOutCheck.reason };
    }

    const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
    if (!accountNumber) {
      await t.rollback();
      return { success: false, error: 'Cash out not configured.' };
    }

    const amountCents = amountRand * 100;
    const reference = `USSD-EEZI-${sessionId}-${Date.now()}`.replace(/_/g, '-');
    const storeId = process.env.FLASH_STORE_ID || accountNumber.replace(/-/g, '').slice(0, 12);
    const terminalId = process.env.FLASH_TERMINAL_ID || accountNumber.replace(/-/g, '').slice(0, 12);

    const FlashAuthService = require('./flashAuthService');
    const flashAuth = FlashAuthService.getInstance
      ? FlashAuthService.getInstance()
      : new FlashAuthService();

    const response = await flashAuth.makeAuthenticatedRequest('POST', '/eezi-voucher/purchase', {
      reference,
      accountNumber,
      amount: amountCents,
      storeId,
      terminalId,
    });

    const eeziPin = extractPinFromResponse(response);
    if (!eeziPin) {
      await t.rollback();
      return { success: false, error: 'Voucher error. Try again.' };
    }

    await wallet.debit(amountRand, 'withdraw', { transaction: t });

    const txnId = `TXN-USSD-${Date.now()}-CASHOUT`;
    await Transaction.create({
      transactionId: txnId,
      userId,
      walletId: wallet.walletId,
      amount: amountRand,
      type: 'withdraw',
      status: 'completed',
      description: `eeziCash R${amountRand}`,
      metadata: { channel: 'ussd', reference, eeziPin: '***' },
      currency: 'ZAR',
    }, { transaction: t });

    await t.commit();
    return { success: true, pin: eeziPin };
  } catch (err) {
    await t.rollback();
    console.error('[USSD] eeziCash purchase error:', err.message);
    return { success: false, error: 'Cash out failed. Try again.' };
  }
}

async function purchaseEeziProduct(userId, amountRand, sessionId, isEeziPower) {
  const t = await sequelize.transaction();
  try {
    const wallet = await Wallet.findOne({
      where: { userId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!wallet) { await t.rollback(); return { success: false, error: 'Wallet not found.' }; }

    const canDebit = wallet.canDebit(amountRand);
    if (!canDebit.allowed) { await t.rollback(); return { success: false, error: 'Insufficient balance.' }; }

    const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
    if (!accountNumber) { await t.rollback(); return { success: false, error: 'Service not configured.' }; }

    const amountCents = amountRand * 100;
    const prefix = isEeziPower ? 'USSD-EP' : 'USSD-EA';
    const reference = `${prefix}-${sessionId}-${Date.now()}`.replace(/_/g, '-');
    const storeId = process.env.FLASH_STORE_ID || accountNumber.replace(/-/g, '').slice(0, 12);
    const terminalId = process.env.FLASH_TERMINAL_ID || accountNumber.replace(/-/g, '').slice(0, 12);

    let productCode;
    try {
      const FlashController = require('../controllers/flashController');
      const fc = new FlashController();
      productCode = isEeziPower
        ? await fc._resolveEeziPowerProductCode()
        : await fc._resolveEeziVoucherProductCode();
    } catch (pcErr) {
      console.warn(`[USSD] Could not resolve eezi product code, proceeding without:`, pcErr.message);
    }

    const FlashAuthService = require('./flashAuthService');
    const flashAuth = FlashAuthService.getInstance ? FlashAuthService.getInstance() : new FlashAuthService();

    const payload = { reference, accountNumber, amount: amountCents, storeId, terminalId };
    if (productCode) payload.productCode = productCode;

    const response = await flashAuth.makeAuthenticatedRequest('POST', '/eezi-voucher/purchase', payload);

    const eeziPin = extractPinFromResponse(response);
    if (!eeziPin) { await t.rollback(); return { success: false, error: 'PIN not received. Try again.' }; }

    const productLabel = isEeziPower ? 'eeziPower' : 'eeziAirtime';
    const vasType = isEeziPower ? 'electricity' : 'airtime';
    const txnId = `TXN-USSD-${Date.now()}-${productLabel.toUpperCase()}`;

    await wallet.debit(amountRand, 'withdraw', { transaction: t });

    try {
      const { releaseRestrictedFunds } = require('./restrictedFundsService');
      await releaseRestrictedFunds(wallet, amountRand, txnId, { transaction: t });
    } catch (releaseErr) {
      console.error('[restrictedFunds] Release failed:', releaseErr.message);
    }

    await Transaction.create({
      transactionId: txnId,
      userId,
      walletId: wallet.walletId,
      amount: amountRand,
      type: 'withdraw',
      status: 'completed',
      description: `${productLabel} R${amountRand}`,
      metadata: { channel: 'ussd', reference, vasType, productLabel, eeziPin: '***' },
      currency: 'ZAR',
    }, { transaction: t });

    await t.commit();

    postVasLedgerEntry(amountRand, LEDGER_ACCOUNT_FLASH_FLOAT, txnId);

    return { success: true, pin: eeziPin };
  } catch (err) {
    try { await t.rollback(); } catch {}
    console.error(`[USSD] eezi${isEeziPower ? 'Power' : 'Airtime'} purchase error:`, err.message);
    return { success: false, error: 'Purchase failed. Try again.' };
  }
}

async function purchaseVoucherByBrand(userId, brand, amountRand, sessionId) {
  const t = await sequelize.transaction();
  try {
    const wallet = await Wallet.findOne({ where: { userId }, lock: t.LOCK.UPDATE, transaction: t });
    if (!wallet) { await t.rollback(); return { success: false, error: 'Wallet not found.' }; }

    const canDebit = wallet.canDebit(amountRand);
    if (!canDebit.allowed) { await t.rollback(); return { success: false, error: 'Insufficient balance.' }; }

    const [variants] = await sequelize.query(`
      SELECT pv.id, pv."supplierProductId", pv."supplierId", s.code AS "supplierCode"
      FROM product_variants pv
      JOIN products p ON p.id = pv."productId"
      JOIN suppliers s ON s.id = pv."supplierId"
      WHERE p.type = 'voucher' AND pv.status = 'active'
        AND (LOWER(p.name) LIKE $1 OR LOWER(pv.provider) LIKE $1)
        AND pv."minAmount" <= $2 AND (pv."maxAmount" >= $2 OR pv."maxAmount" IS NULL)
      ORDER BY s.code = 'FLASH' DESC, pv."commissionPercentage" DESC NULLS LAST
      LIMIT 1
    `, { bind: [`%${brand.key}%`, amountRand * 100] });

    if (!variants.length) { await t.rollback(); return { success: false, error: `${brand.name} not available for R${amountRand}.` }; }

    const variant = variants[0];
    const amountCents = amountRand * 100;
    const reference = `USSD-VCH-${sessionId}-${Date.now()}`.replace(/_/g, '-');

    let pin = null;

    if (variant.supplierCode === 'FLASH') {
      const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
      const storeId = process.env.FLASH_STORE_ID || accountNumber?.replace(/-/g, '').slice(0, 12);
      const terminalId = process.env.FLASH_TERMINAL_ID || accountNumber?.replace(/-/g, '').slice(0, 12);
      const productCode = parseInt(String(variant.supplierProductId).trim(), 10);

      if (!accountNumber || isNaN(productCode)) {
        await t.rollback();
        return { success: false, error: 'Voucher service not configured.' };
      }

      const FlashAuthService = require('./flashAuthService');
      const flashAuth = FlashAuthService.getInstance ? FlashAuthService.getInstance() : new FlashAuthService();
      const response = await flashAuth.makeAuthenticatedRequest('POST', '/gift-voucher/purchase', {
        reference, accountNumber, amount: amountCents, productCode, storeId, terminalId,
      });
      pin = extractPinFromResponse(response);
    } else {
      const MobileMartAuthService = require('./mobilemartAuthService');
      const mmAuth = new MobileMartAuthService();
      const response = await mmAuth.makeAuthenticatedRequest('POST', '/voucher/purchase', {
        requestId: reference,
        merchantProductId: variant.supplierProductId,
        tenderType: 'CreditCard',
        amount: amountRand,
      });
      pin = response?.additionalDetails?.pin || response?.additionalDetails?.serialNumber ||
            response?.pin || response?.voucherPin || null;
    }

    if (!pin) { await t.rollback(); return { success: false, error: 'Voucher PIN not received.' }; }

    const txnId = `TXN-USSD-${Date.now()}-VOUCHER`;

    await wallet.debit(amountRand, 'payment', { transaction: t });

    try {
      const { releaseRestrictedFunds } = require('./restrictedFundsService');
      await releaseRestrictedFunds(wallet, amountRand, txnId, { transaction: t });
    } catch (releaseErr) {
      console.error('[restrictedFunds] Release failed:', releaseErr.message);
    }

    await Transaction.create({
      transactionId: txnId,
      userId,
      walletId: wallet.walletId,
      amount: amountRand,
      type: 'payment',
      status: 'completed',
      description: `${brand.name} R${amountRand}`,
      metadata: { channel: 'ussd', reference, voucherBrand: brand.name, supplier: variant.supplierCode, voucherPin: '***' },
      currency: 'ZAR',
    }, { transaction: t });

    await t.commit();

    const floatAccount = variant.supplierCode === 'FLASH' ? LEDGER_ACCOUNT_FLASH_FLOAT : (process.env.LEDGER_ACCOUNT_MOBILEMART_FLOAT || '1200-10-05');
    postVasLedgerEntry(amountRand, floatAccount, txnId);

    return { success: true, pin };
  } catch (err) {
    try { await t.rollback(); } catch {}
    console.error('[USSD] Voucher purchase error:', err.message);
    return { success: false, error: 'Purchase failed. Try again.' };
  }
}

async function sendMoneyToUser(senderId, receiverId, amountRand, sessionId, senderMsisdn, receiverPhone, receiverName) {
  const t = await sequelize.transaction();
  try {
    const senderWallet = await Wallet.findOne({ where: { userId: senderId }, lock: t.LOCK.UPDATE, transaction: t });
    if (!senderWallet) { await t.rollback(); return { success: false, error: 'Wallet not found.' }; }

    const canDebit = senderWallet.canDebit(amountRand);
    if (!canDebit.allowed) { await t.rollback(); return { success: false, error: 'Insufficient balance.' }; }

    const receiverWallet = await Wallet.findOne({ where: { userId: receiverId }, lock: t.LOCK.UPDATE, transaction: t });
    if (!receiverWallet) { await t.rollback(); return { success: false, error: 'Receiver wallet not found.' }; }

    const senderTxnId = `TXN-USSD-${Date.now()}-SEND`;

    await senderWallet.debit(amountRand, 'send', { transaction: t });

    try {
      const { releaseRestrictedFunds } = require('./restrictedFundsService');
      await releaseRestrictedFunds(senderWallet, amountRand, senderTxnId, { transaction: t });
    } catch (releaseErr) {
      console.error('[restrictedFunds] Release failed:', releaseErr.message);
    }

    const newReceiverBal = parseFloat(receiverWallet.balance) + amountRand;
    await receiverWallet.update({ balance: newReceiverBal }, { transaction: t });

    const receiverTxnId = `TXN-USSD-${Date.now()}-RECV`;

    await Transaction.create({
      transactionId: senderTxnId, userId: senderId, walletId: senderWallet.walletId,
      amount: amountRand, type: 'send', status: 'completed',
      description: `Sent R${amountRand} to ${receiverName}`,
      metadata: { channel: 'ussd', receiverUserId: receiverId }, currency: 'ZAR',
    }, { transaction: t });

    const [senderRows] = await sequelize.query(`SELECT "firstName" FROM users WHERE id = $1`, { bind: [senderId] });
    const senderName = senderRows[0]?.firstName || 'MyMoolah User';

    await Transaction.create({
      transactionId: receiverTxnId, userId: receiverId, walletId: receiverWallet.walletId,
      amount: amountRand, type: 'receive', status: 'completed',
      description: `Received R${amountRand} from ${senderName}`,
      metadata: { channel: 'ussd', senderUserId: senderId }, currency: 'ZAR',
    }, { transaction: t });

    await t.commit();

    postP2pLedgerEntry(amountRand, senderTxnId);

    setImmediate(async () => {
      try {
        const e164Sender = senderMsisdn.startsWith('+') ? senderMsisdn : `+${senderMsisdn}`;
        const e164Receiver = receiverPhone.startsWith('+') ? receiverPhone : `+${receiverPhone}`;
        if (smsService.isConfigured()) {
          await smsService.sendUssdSendMoneySms(e164Sender, amountRand, receiverName);
          await smsService.sendUssdReceiveMoneySms(e164Receiver, amountRand, senderName);
        }
      } catch (smsErr) {
        console.error('[USSD] Send money SMS error (non-blocking):', smsErr.message);
      }
    });

    return { success: true };
  } catch (err) {
    try { await t.rollback(); } catch {}
    console.error('[USSD] Send money error:', err.message);
    return { success: false, error: 'Transfer failed. Try again.' };
  }
}

// ─── SMS Fee & Ledger Helpers ───────────────────────────────────────────────

async function debitSmsFee(userId, sessionId, prefix) {
  const t = await sequelize.transaction();
  try {
    const wallet = await Wallet.findOne({ where: { userId }, lock: t.LOCK.UPDATE, transaction: t });
    if (!wallet || !wallet.canDebit(SMS_FEE_AMOUNT).allowed) {
      await t.rollback();
      return;
    }

    await wallet.debit(SMS_FEE_AMOUNT, 'fee', { transaction: t });

    const txnId = `TXN-USSD-${Date.now()}-SMSFEE`;
    await Transaction.create({
      transactionId: txnId, userId, walletId: wallet.walletId,
      amount: SMS_FEE_AMOUNT, type: 'fee', status: 'completed',
      description: `SMS fee R${SMS_FEE_AMOUNT.toFixed(2)}`,
      metadata: { channel: 'ussd', feeType: 'sms_pin_delivery', prefix },
      currency: 'ZAR',
    }, { transaction: t });

    await t.commit();

    setImmediate(async () => {
      try {
        const ledgerService = require('./ledgerService');
        await ledgerService.postJournalEntry({
          reference: `SMS-FEE-${txnId}`,
          description: `USSD SMS fee - ${prefix}`,
          lines: [
            { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: SMS_FEE_AMOUNT, memo: 'SMS fee wallet debit' },
            { accountCode: LEDGER_ACCOUNT_SMS_FEE, dc: 'credit', amount: SMS_FEE_EX_VAT, memo: 'SMS fee revenue ex-VAT' },
            { accountCode: LEDGER_ACCOUNT_VAT_CONTROL, dc: 'credit', amount: SMS_FEE_VAT, memo: 'VAT on SMS fee' },
          ],
        });
      } catch (jeErr) {
        console.error('[USSD] SMS fee JE error (non-blocking):', jeErr.message);
      }
    });
  } catch (err) {
    try { await t.rollback(); } catch {}
    console.error('[USSD] SMS fee debit error (non-blocking):', err.message);
  }
}

function sendPinSmsAsync(msisdn, pin, amount, recipient, productType, brandName) {
  if (!smsService.isConfigured()) return;
  const e164 = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
  setImmediate(async () => {
    try {
      if (productType === 'eeziCash') {
        await smsService.sendUssdCashOutSms(e164, amount, pin);
      } else if (productType === 'eeziAirtime') {
        await smsService.sendUssdEeziAirtimeSms(e164, pin, amount, recipient || 'recipient');
      } else if (productType === 'eeziPower') {
        await smsService.sendUssdEeziPowerSms(e164, pin, amount);
      } else if (productType === 'voucher') {
        await smsService.sendUssdVoucherSms(e164, pin, amount, brandName || 'Voucher');
      }
    } catch (smsErr) {
      console.error(`[USSD] PIN SMS error (non-blocking):`, smsErr.message);
    }
  });
}

function postVasLedgerEntry(amountRand, supplierFloatAccount, txnId) {
  setImmediate(async () => {
    try {
      const ledgerService = require('./ledgerService');
      await ledgerService.postJournalEntry({
        reference: `VAS-${txnId}`,
        description: `USSD VAS purchase`,
        lines: [
          { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: amountRand, memo: 'Wallet debit for VAS' },
          { accountCode: supplierFloatAccount, dc: 'credit', amount: amountRand, memo: 'Supplier float' },
        ],
      });
    } catch (jeErr) {
      console.error('[USSD] VAS ledger JE error (non-blocking):', jeErr.message);
    }
  });
}

function postP2pLedgerEntry(amountRand, senderTxnId) {
  setImmediate(async () => {
    try {
      const ledgerService = require('./ledgerService');
      await ledgerService.postJournalEntry({
        reference: `P2P-${senderTxnId}`,
        description: `USSD P2P transfer`,
        lines: [
          { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: amountRand, memo: 'Sender wallet debit' },
          { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'credit', amount: amountRand, memo: 'Receiver wallet credit' },
        ],
      });
    } catch (jeErr) {
      console.error('[USSD] P2P ledger JE error (non-blocking):', jeErr.message);
    }
  });
}

function extractPinFromResponse(response) {
  if (!response) return null;
  const voucher = response.voucher;
  const tx = response.transaction || response.data || response.result || response;
  const vd = (typeof tx === 'object' && tx?.voucherDetails) || response.voucherDetails;

  const tryExtract = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    return obj.pin || obj.pinNumber || obj.voucherPin || obj.code || obj.token ||
           obj.voucherCode || obj.voucher_pin || obj.eeziPin || null;
  };

  return tryExtract(voucher) || tryExtract(tx) || tryExtract(response) || tryExtract(vd) ||
         response?.voucherPin || response?.pin || response?.data?.pin || response?.token || null;
}

// ─── Phone number helpers ───────────────────────────────────────────────────

function formatPhone(msisdn) {
  const e164 = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
  if (e164.startsWith('+27') && e164.length === 12) {
    return '0' + e164.slice(3);
  }
  return e164;
}

function normalizePhoneNumber(input) {
  const cleaned = input.replace(/[\s\-()]/g, '');
  if (/^0[6-8]\d{8}$/.test(cleaned)) {
    return '+27' + cleaned.slice(1);
  }
  if (/^27[6-8]\d{8}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  if (/^\+27[6-8]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

module.exports = { processInput };
