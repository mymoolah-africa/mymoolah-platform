const { Bill, Payment, sequelize } = require('../models');
const { validateEasyPayNumber, extractReceiverId } = require('../utils/easyPayUtils');

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
          expiryDate: null,
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
        return res.status(200).json({
          ResponseCode: '3', // ExpiredPayment
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
      if (!EasyPayNumber || !AccountNumber || !Amount || !Reference) {
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
          expiryDate: new Date().toISOString().split('T')[0],
          echoData: EchoData
        });
      }

      // Check if bill is already paid
      if (bill.status === 'paid') {
        return res.status(200).json({
          ResponseCode: '5',
          ResponseMessage: 'Already paid',
          Amount: bill.amount,
          expiryDate: bill.dueDate || new Date().toISOString().split('T')[0],
          echoData: EchoData
        });
      }

      // Check if bill is expired
      const isExpiredStatus = bill.status === 'expired' || bill.status === 'cancelled';
      const isExpiredDate = bill.dueDate && new Date(bill.dueDate) < new Date(new Date().toDateString());
      if (isExpiredStatus || isExpiredDate) {
        return res.status(200).json({
          ResponseCode: '3',
          ResponseMessage: 'Expired payment',
          Amount: bill.amount,
          expiryDate: bill.dueDate || new Date().toISOString().split('T')[0],
          echoData: EchoData
        });
      }

      // Validate amount (ensure integer for DB)
      const amount = parseInt(Amount, 10);
      if (isNaN(amount) || amount < 1) {
        return res.status(200).json({
          ResponseCode: '2',
          ResponseMessage: `Incorrect amount. Due amount is R${(bill.amount / 100).toFixed(2)}`,
          Amount: bill.amount,
          expiryDate: bill.dueDate || new Date().toISOString().split('T')[0],
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
          expiryDate: bill.dueDate || new Date().toISOString().split('T')[0],
          echoData: EchoData
        });
      }

      // Create payment record and update bill in a transaction (ACID)
      const t = await sequelize.transaction();
      try {
        await Payment.create({
          reference: Reference,
          easyPayNumber: EasyPayNumber,
          accountNumber: String(AccountNumber || '').slice(0, 13),
          amount,
          billId: bill.id,
          paymentType: 'bill_payment',
          paymentMethod: 'easypay',
          status: 'pending',
          echoData: EchoData != null ? String(EchoData) : null
        }, { transaction: t });

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
        expiryDate: bill.dueDate || new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString().split('T')[0],
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

      if (!EasyPayNumber || !EchoData) {
        return res.status(400).json({ error: 'Missing required fields: EasyPayNumber, EchoData' });
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

      const wallet = await Wallet.findOne({ where: { userId: bill.userId } });
      if (!wallet) {
        console.error(`[EasyPay] paymentNotification: no wallet for userId ${bill.userId}`);
        return res.status(200).json({ EchoData });
      }

      const grossAmountCents = Amount || bill.amount;
      const grossAmountRand = grossAmountCents / 100;

      const { totalFee, netAmount, feeExclVat, vat } = calculateEasyPayFee(grossAmountRand);

      const transactionRef = `EP-${bill.id}-${Date.now()}`;

      const t = await sequelize.transaction();
      try {
        await wallet.credit(grossAmountRand, 'credit', { transaction: t });
        await wallet.debit(totalFee, 'debit', { transaction: t });

        const depositTx = await Transaction.create({
          userId: bill.userId,
          walletId: wallet.id,
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
          walletId: wallet.id,
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
          const payment = await Payment.findOne({
            where: { reference: Reference },
            transaction: t
          });
          if (payment) {
            await payment.update({
              status: 'completed',
              paymentDate: PaymentDate ? new Date(PaymentDate) : new Date(),
              merchantId: MerchantId || null,
              terminalId: TerminalId || null
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
        const smsService = require('../services/smsService');
        const user = await User.findByPk(bill.userId);
        if (user && user.phoneNumber && smsService.isConfigured()) {
          const phone = user.phoneNumber.startsWith('+') ? user.phoneNumber : `+27${user.phoneNumber.replace(/^0/, '')}`;
          const walletBal = parseFloat(wallet.balance || 0);
          const msg = `MyMoolah: R${netAmount.toFixed(2)} deposited to your wallet. EasyPay top-up R${grossAmountRand.toFixed(2)} (fee R${totalFee.toFixed(2)}). Bal: R${walletBal.toFixed(2)}`;
          setImmediate(() => smsService.sendSms(phone, msg.substring(0, 160), { type: 'easypay', reference: `EP-SMS-${transactionRef}` }).catch(e => console.error('[EasyPay] Success SMS error:', e.message)));
        }
      } catch (smsErr) {
        console.error('[EasyPay] Success SMS setup error:', smsErr.message);
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