const { Bill, Payment } = require('../models');
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
          ResponseCode: '1', // InvalidAccount
          echoData: EchoData
        });
      }

      // Check if bill is already paid
      if (bill.status === 'paid') {
        return res.status(200).json({
          ResponseCode: '5', // AlreadyPaid
          echoData: EchoData
        });
      }

      // Check if bill is expired
      const isExpiredStatus = bill.status === 'expired' || bill.status === 'cancelled';
      const isExpiredDate = bill.dueDate && new Date(bill.dueDate) < new Date(new Date().toDateString());
      if (isExpiredStatus || isExpiredDate) {
        return res.status(200).json({
          ResponseCode: '3', // ExpiredPayment
          echoData: EchoData
        });
      }

      // Validate amount
      const amount = Number(Amount);
      const minAmount = bill.minAmount || bill.amount;
      const maxAmount = bill.maxAmount || bill.amount;
      
      if (amount < minAmount || amount > maxAmount) {
        return res.status(200).json({
          ResponseCode: '2', // InvalidAmount
          echoData: EchoData
        });
      }

      // Create payment record
      const payment = await Payment.create({
        reference: Reference,
        easyPayNumber: EasyPayNumber,
        accountNumber: AccountNumber,
        amount: amount,
        paymentType: 'bill_payment',
        paymentMethod: 'easypay',
        status: 'pending',
        echoData: EchoData
      });

      // Update bill status
      await bill.update({ status: 'processing' });

      

      res.status(200).json({
        ResponseCode: '0', // Authorized
        echoData: EchoData
      });
    } catch (error) {
      console.error('❌ EasyPay authorization error:', error);
      const isStaging = process.env.STAGING === 'true' || process.env.STAGING === '1';
      const body = { error: 'Internal server error' };
      if (isStaging) body.debug = error.message;
      res.status(500).json(body);
    }
  }

  /**
   * Payment notification
   * POST /billpayment/v1/paymentNotification
   */
  async paymentNotification(req, res) {
    try {
    
      
      const { 
        EasyPayNumber, 
        AccountNumber, 
        Amount, 
        Reference, 
        EchoData,
        TransactionId 
      } = req.body;
      
      // Find payment record
      const payment = await Payment.findOne({ 
        where: { reference: Reference } 
      });
      
      if (!payment) {
        return res.status(400).json({ error: 'Payment not found' });
      }

      // Update payment status
      await payment.update({
        status: 'completed',
        paymentDate: new Date()
      });

      // Find and update bill
      const bill = await Bill.findOne({ 
        where: { easyPayNumber: EasyPayNumber } 
      });
      
      if (bill) {
        await bill.update({ status: 'paid' });
      }

      

      res.status(200).json({
        ResponseCode: '0', // Success
        echoData: EchoData
      });
    } catch (error) {
      console.error('❌ EasyPay payment notification error:', error);
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