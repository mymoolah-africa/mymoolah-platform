const { Bill, Payment, sequelize } = require('../models');
const { validateEasyPayNumber, extractReceiverId } = require('../utils/easyPayUtils');

function buildEasyPayPaymentReference(easyPayNumber, reference) {
  const safeReference = reference != null && String(reference).trim()
    ? String(reference).trim()
    : 'NOREF';
  return `EPV5-${easyPayNumber}-${safeReference}`.slice(0, 255);
}

function todayDateString() {
  return new Date().toISOString().split('T')[0];
}

function parseCents(value) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

/**
 * EasyPay Bill Payment Receiver API Controller
 * Implements the complete EasyPay integration for MyMoolah
 */

class EasyPayController {
  constructor() {
    // No need to instantiate - Sequelize models are static
  }
  
  /**
   * Health check endpoint
   * GET /billpayment/v1/ping
   */
  async ping(req, res) {
    try {
    
      res.status(200).json({
        Ping: 'OK'
      });
    } catch (error) {
      console.error('❌ EasyPay ping error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Bill information request
   * POST /billpayment/v1/infoRequest
   */
  async infoRequest(req, res) {
    try {
    
      
      const { EasyPayNumber, AccountNumber, EchoData } = req.body;
      
      // Validate required fields
      if (!EasyPayNumber || !AccountNumber || !EchoData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate EasyPay number format
      if (!validateEasyPayNumber(EasyPayNumber)) {
        return res.status(400).json({ error: 'Invalid EasyPay number format' });
      }

      // Extract receiver ID from EasyPay number
      const receiverId = extractReceiverId(EasyPayNumber);
      
      // Find bill information in database
      const bill = await Bill.findOne({ where: { easyPayNumber: EasyPayNumber } });
      
      if (!bill) {
        return res.status(200).json({
          ResponseCode: '1', // InvalidAccount
          correctAmount: 0,
          minAmount: 0,
          maxAmount: 0,
          expiryDate: todayDateString(),
          echoData: EchoData
        });
      }

      // Check if bill is already paid
      if (bill.status === 'paid') {
        return res.status(200).json({
          ResponseCode: '5', // AlreadyPaid
          correctAmount: bill.amount,
          minAmount: bill.minAmount || bill.amount,
          maxAmount: bill.maxAmount || bill.amount,
          expiryDate: bill.dueDate,
          fields: {
            customerName: bill.customerName,
            accountNumber: bill.accountNumber,
            billType: bill.billType,
            description: bill.description
          },
          echoData: EchoData
        });
      }

      // Check if bill is expired (status OR dueDate in the past)
      const isExpiredStatus = bill.status === 'expired' || bill.status === 'cancelled';
      const isExpiredDate = bill.dueDate && new Date(bill.dueDate) < new Date(new Date().toDateString());
      if (isExpiredStatus || isExpiredDate) {
        const expiryDays = parseInt(process.env.EASYPAY_PIN_EXPIRY_DAYS || '30', 10);
        const expiredOn = bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : 'unknown';
        return res.status(200).json({
          ResponseCode: '3', // ExpiredPayment
          ResponseMessage: `Payment expired. This PIN expired on ${expiredOn}. PINs are valid for ${expiryDays} days from generation. The customer can generate a new PIN in the MyMoolah app.`,
          correctAmount: bill.amount,
          minAmount: bill.minAmount || bill.amount,
          maxAmount: bill.maxAmount || bill.amount,
          expiryDate: bill.dueDate,
          fields: {
            customerName: bill.customerName,
            accountNumber: bill.accountNumber,
            billType: bill.billType,
            description: bill.description
          },
          echoData: EchoData
        });
      }

      // Return bill information — allow payment
      res.status(200).json({
        ResponseCode: '0', // AllowPayment
        correctAmount: bill.amount,
        minAmount: bill.minAmount || bill.amount,
        maxAmount: bill.maxAmount || bill.amount,
        expiryDate: bill.dueDate,
        fields: {
          customerName: bill.customerName,
          accountNumber: bill.accountNumber,
          billType: bill.billType,
          description: bill.description
        },
        echoData: EchoData
      });
    } catch (error) {
      console.error('❌ EasyPay info request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Payment authorization request
   * POST /billpayment/v1/authorisationRequest
   */
  async authorisationRequest(req, res) {
    try {
    
      
      const { 
        EasyPayNumber, 
        AccountNumber, 
        Amount, 
        Reference, 
        EchoData 
      } = req.body;
      
      // Validate required fields
      if (!EasyPayNumber || !AccountNumber || Amount == null || !Reference || !EchoData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate EasyPay number format
      if (!validateEasyPayNumber(EasyPayNumber)) {
        return res.status(400).json({ error: 'Invalid EasyPay number format' });
      }

      // Find bill in database
      const bill = await Bill.findOne({ where: { easyPayNumber: EasyPayNumber } });
      
      if (!bill) {
        return res.status(200).json({
          ResponseCode: '1',
          ResponseMessage: 'Invalid account',
          Amount: 0,
          expiryDate: todayDateString(),
          echoData: EchoData
        });
      }

      // Check if bill is already paid
      if (bill.status === 'paid') {
        return res.status(200).json({
          ResponseCode: '5',
          ResponseMessage: 'Already paid',
          Amount: bill.amount,
          expiryDate: bill.dueDate || todayDateString(),
          echoData: EchoData
        });
      }

      // Check if bill is expired
      const isExpiredStatus = bill.status === 'expired' || bill.status === 'cancelled';
      const isExpiredDate = bill.dueDate && new Date(bill.dueDate) < new Date(new Date().toDateString());
      if (isExpiredStatus || isExpiredDate) {
        const expiryDays = parseInt(process.env.EASYPAY_PIN_EXPIRY_DAYS || '30', 10);
        const expiredOn = bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : 'unknown';
        return res.status(200).json({
          ResponseCode: '3',
          ResponseMessage: `Payment expired. This PIN expired on ${expiredOn}. PINs are valid for ${expiryDays} days from generation. The customer can generate a new PIN in the MyMoolah app.`,
          Amount: bill.amount,
          expiryDate: bill.dueDate || todayDateString(),
          echoData: EchoData
        });
      }

      // Validate amount (ensure integer for DB)
      const amount = parseCents(Amount);
      if (amount == null) {
        return res.status(200).json({
          ResponseCode: '2',
          ResponseMessage: `Incorrect amount. Due amount is R${(bill.amount / 100).toFixed(2)}`,
          Amount: bill.amount,
          expiryDate: bill.dueDate || todayDateString(),
          echoData: EchoData
        });
      }
      const minAmount = bill.minAmount ?? bill.amount;
      const maxAmount = bill.maxAmount ?? bill.amount;

      if (amount < minAmount || amount > maxAmount) {
        return res.status(200).json({
          ResponseCode: '2',
          ResponseMessage: `Incorrect amount. Due amount is R${(bill.amount / 100).toFixed(2)}`,
          Amount: bill.amount,
          expiryDate: bill.dueDate || todayDateString(),
          echoData: EchoData
        });
      }

      // Create payment record and update bill in a transaction (ACID)
      const paymentReference = buildEasyPayPaymentReference(EasyPayNumber, Reference);
      const t = await sequelize.transaction();
      try {
        const existingPayment = await Payment.findOne({
          where: { reference: paymentReference },
          transaction: t
        });

        if (!existingPayment) {
          await Payment.create({
            reference: paymentReference,
            easyPayNumber: EasyPayNumber,
            accountNumber: String(AccountNumber || '').slice(0, 13),
            amount,
            billId: bill.id,
            paymentType: 'bill_payment',
            paymentMethod: 'easypay',
            status: 'pending',
            echoData: EchoData != null ? String(EchoData) : null,
            transactionId: Reference != null ? String(Reference) : null,
            metadata: {
              source: 'easypay_v5',
              posReference: Reference != null ? String(Reference) : null,
              merchantId: req.body.MerchantId || null,
              terminalId: req.body.TerminalId || null
            }
          }, { transaction: t });
        }

        await bill.update({ status: 'processing' }, { transaction: t });
        await t.commit();
      } catch (txError) {
        await t.rollback();
        throw txError;
      }

      res.status(200).json({
        ResponseCode: '0',
        ResponseMessage: 'Allow payment',
        Amount: amount,
        expiryDate: bill.dueDate || new Date(Date.now() + parseInt(process.env.EASYPAY_PIN_EXPIRY_DAYS || '30', 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        echoData: EchoData
      });
    } catch (error) {
      console.error('❌ EasyPay authorization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Payment notification — final callback confirming payment was taken at POS.
   * Per V5 spec: "The receiver cannot decline a valid PaymentNotification."
   * Credits the user's wallet (gross), debits fee, creates Transaction records,
   * then posts journal entries outside the DB transaction (reconcilable on failure).
   *
   * POST /billpayment/v1/paymentNotification
   */
  async paymentNotification(req, res) {
    try {
      const {
        MerchantId,
        TerminalId,
        PaymentDate,
        Reference,
        EasyPayNumber,
        AccountNumber,
        Amount,
        EchoData
      } = req.body;

      if (!EasyPayNumber || !AccountNumber || !EchoData || Amount == null) {
        return res.status(400).json({ error: 'Missing required fields: EasyPayNumber, AccountNumber, Amount, EchoData' });
      }

      const grossAmountCents = parseCents(Amount);
      if (grossAmountCents == null) {
        return res.status(400).json({ error: 'Invalid Amount. Amount must be integer cents.' });
      }

      const { Wallet, Transaction, User } = require('../models');
      const { postEasyPayDeposit, calculateEasyPayFee } = require('../services/easyPayDepositService');

      const bill = await Bill.findOne({ where: { easyPayNumber: EasyPayNumber } });
      if (!bill) {
        console.error(`[EasyPay] paymentNotification: no Bill found for ${EasyPayNumber}`);
        return res.status(200).json({ EchoData });
      }

      if (bill.status === 'paid') {
        console.warn(`[EasyPay] paymentNotification: duplicate — Bill ${bill.id} already paid`);
        return res.status(200).json({ EchoData });
      }

      if (!bill.userId) {
        console.error(`[EasyPay] paymentNotification: Bill ${bill.id} has no userId — cannot credit wallet`);
        return res.status(200).json({ EchoData });
      }

      const minAmount = bill.minAmount ?? bill.amount;
      const maxAmount = bill.maxAmount ?? bill.amount;
      if (grossAmountCents < minAmount || grossAmountCents > maxAmount) {
        console.error(`[EasyPay] paymentNotification: amount ${grossAmountCents} outside allowed range ${minAmount}-${maxAmount} for Bill ${bill.id}`);
        return res.status(200).json({ EchoData });
      }

      const existingWallet = await Wallet.findOne({ where: { userId: bill.userId } });
      if (!existingWallet) {
        console.error(`[EasyPay] paymentNotification: no wallet for userId ${bill.userId}`);
        return res.status(200).json({ EchoData });
      }

      const grossAmountRand = grossAmountCents / 100;

      const { totalFee, netAmount, feeExclVat, vat } = calculateEasyPayFee(grossAmountRand);

      const transactionRef = `EP-${bill.id}-${Date.now()}`;

      let wallet = existingWallet;
      const t = await sequelize.transaction();
      try {
        await bill.reload({ transaction: t, lock: t.LOCK.UPDATE });
        if (bill.status === 'paid') {
          await t.commit();
          console.warn(`[EasyPay] paymentNotification: duplicate after lock — Bill ${bill.id} already paid`);
          return res.status(200).json({ EchoData });
        }

        wallet = await Wallet.findOne({
          where: { userId: bill.userId },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (!wallet) {
          await t.commit();
          console.error(`[EasyPay] paymentNotification: no locked wallet for userId ${bill.userId}`);
          return res.status(200).json({ EchoData });
        }

        if (wallet.status !== 'active') {
          await t.commit();
          console.error(`[EasyPay] paymentNotification: wallet ${wallet.walletId} is not active; payment acknowledged but not credited`);
          return res.status(200).json({ EchoData });
        }

        await wallet.credit(grossAmountRand, 'credit', { transaction: t });
        await wallet.debit(totalFee, 'debit', {
          transaction: t,
          bypassDailyMonthlyLimits: true
        });

        const depositTx = await Transaction.create({
          userId: bill.userId,
          walletId: wallet.walletId,
          type: 'deposit',
          amount: grossAmountRand,
          fee: 0,
          description: `Top-up @ EasyPay: ${EasyPayNumber}`,
          status: 'completed',
          reference: `${transactionRef}-DEP`,
          metadata: {
            source: 'easypay_v5',
            easyPayNumber: EasyPayNumber,
            merchantId: MerchantId || null,
            terminalId: TerminalId || null,
            posReference: Reference || null,
            paymentDate: PaymentDate || null,
            grossAmount: grossAmountRand,
            netAmount: netAmount,
            isEasyPayDeposit: true,
            isEasyPayDepositAmount: true,
            vasTransactionId: transactionRef
          }
        }, { transaction: t });

        await Transaction.create({
          userId: bill.userId,
          walletId: wallet.walletId,
          type: 'fee',
          amount: -totalFee,
          fee: totalFee,
          description: `EasyPay Fee (R${feeExclVat.toFixed(2)} + R${vat.toFixed(2)} VAT)`,
          status: 'completed',
          reference: `${transactionRef}-FEE`,
          metadata: {
            source: 'easypay_v5',
            easyPayNumber: EasyPayNumber,
            feeExclVat: feeExclVat,
            vat: vat,
            totalFee: totalFee,
            parentTransactionRef: `${transactionRef}-DEP`,
            isEasyPayDeposit: true,
            isEasyPayDepositFee: true,
            vasTransactionId: transactionRef
          }
        }, { transaction: t });

        if (Reference) {
          const paymentReference = buildEasyPayPaymentReference(EasyPayNumber, Reference);
          const payment = await Payment.findOne({
            where: { reference: paymentReference },
            transaction: t
          });
          if (payment) {
            await payment.update({
              status: 'completed',
              paymentDate: PaymentDate ? new Date(PaymentDate) : new Date(),
              merchantId: MerchantId || null,
              terminalId: TerminalId || null,
              userId: bill.userId,
              walletId: wallet.walletId
            }, { transaction: t });
          }
        }

        await bill.update({
          status: 'paid',
          paidAmount: grossAmountCents,
          paidAt: new Date(),
          transactionId: depositTx.id ? String(depositTx.id) : transactionRef
        }, { transaction: t });

        await t.commit();
      } catch (txError) {
        await t.rollback();
        throw txError;
      }

      try {
        await postEasyPayDeposit({
          reference: transactionRef,
          grossAmountRand,
          totalFeeRand: totalFee,
          description: `EasyPay cash-in R${grossAmountRand.toFixed(2)} at ${MerchantId || 'POS'}`
        });
      } catch (jeError) {
        console.error(`[EasyPay] JE posting failed for ${transactionRef}:`, jeError.message);
      }

      console.log(`[EasyPay] paymentNotification: credited wallet ${wallet.id} with R${netAmount.toFixed(2)} net (gross R${grossAmountRand.toFixed(2)}, fee R${totalFee.toFixed(2)})`);

      try {
        const notificationService = require('../services/notificationService');
        await notificationService.createNotification(
          bill.userId,
          'txn_wallet_credit',
          'EasyPay Deposit Received',
          `R${netAmount.toFixed(2)} deposited to your wallet (R${grossAmountRand.toFixed(2)} paid, R${totalFee.toFixed(2)} fee)`,
          {
            payload: {
              subtype: 'easypay_deposit',
              grossAmount: grossAmountRand,
              netAmount,
              fee: totalFee,
              easyPayNumber: EasyPayNumber,
              reference: transactionRef,
              action: 'view_receipt'
            },
            severity: 'info',
            category: 'transaction',
            source: 'easypay'
          }
        );
      } catch (notifErr) {
        console.error('[EasyPay] Notification error:', notifErr.message);
      }

      res.status(200).json({ EchoData });
    } catch (error) {
      console.error('[EasyPay] paymentNotification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all bills (admin endpoint)
   * GET /api/easypay/bills
   */
  async getAllBills(req, res) {
    try {
      const bills = await Bill.findAll({
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: bills
      });
    } catch (error) {
      console.error('❌ Get all bills error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all payments (admin endpoint)
   * GET /api/easypay/payments
   */
  async getAllPayments(req, res) {
    try {
      const payments = await Payment.findAll({
        where: { paymentType: 'bill_payment' },
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      console.error('❌ Get all payments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get bill payment status
   * GET /api/easypay/bill-status/:billId
   */
  async getBillStatus(req, res) {
    try {
      const { billId } = req.params;
      
      const bill = await Bill.findByPk(billId);
      if (!bill) {
        return res.status(404).json({
          success: false,
          message: 'Bill not found'
        });
      }

      res.json({
        success: true,
        data: {
          billId: bill.id,
          status: bill.status,
          paidAmount: bill.paidAmount,
          paidAt: bill.paidAt,
          transactionId: bill.transactionId
        }
      });
    } catch (error) {
      console.error('❌ Get bill status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bill status'
      });
    }
  }
}

// Create instance and export methods
const easyPayController = new EasyPayController();

module.exports = {
  ping: easyPayController.ping.bind(easyPayController),
  infoRequest: easyPayController.infoRequest.bind(easyPayController),
  authorisationRequest: easyPayController.authorisationRequest.bind(easyPayController),
  paymentNotification: easyPayController.paymentNotification.bind(easyPayController),
  getAllBills: easyPayController.getAllBills.bind(easyPayController),
  getAllPayments: easyPayController.getAllPayments.bind(easyPayController),
  getBillStatus: easyPayController.getBillStatus.bind(easyPayController)
};