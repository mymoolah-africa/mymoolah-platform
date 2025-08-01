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
      console.log('🏥 EasyPay ping request received');
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
      console.log('📋 EasyPay info request received:', req.body);
      
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

      // Return bill information
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
      console.log('💳 EasyPay authorization request received:', req.body);
      
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

      console.log('✅ Payment authorized:', payment.id);

      res.status(200).json({
        ResponseCode: '0', // Authorized
        echoData: EchoData
      });
    } catch (error) {
      console.error('❌ EasyPay authorization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Payment notification
   * POST /billpayment/v1/paymentNotification
   */
  async paymentNotification(req, res) {
    try {
      console.log('📢 EasyPay payment notification received:', req.body);
      
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

      console.log('✅ Payment completed:', payment.id);

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
   * Create test bills (admin endpoint)
   * POST /api/easypay/test-bills
   */
  async createTestBills(req, res) {
    try {
      const testBills = [
        {
          easyPayNumber: '90001234123412',
          accountNumber: 'TEST001',
          receiverId: '2021',
          customerName: 'Test Customer 1',
          billType: 'electricity',
          description: 'Test electricity bill',
          amount: 500,
          dueDate: '2025-12-31',
          status: 'pending'
        },
        {
          easyPayNumber: '90001234123413',
          accountNumber: 'TEST002',
          receiverId: '2022',
          customerName: 'Test Customer 2',
          billType: 'water',
          description: 'Test water bill',
          amount: 300,
          dueDate: '2025-12-31',
          status: 'pending'
        }
      ];

      const createdBills = await Bill.bulkCreate(testBills);
      
      res.json({
        success: true,
        message: 'Test bills created successfully',
        data: createdBills
      });
    } catch (error) {
      console.error('❌ Create test bills error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
  createTestBills: easyPayController.createTestBills.bind(easyPayController)
};