const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const { validateEasyPayNumber, extractReceiverId } = require('../utils/easyPayUtils');

/**
 * EasyPay Bill Payment Receiver API Controller
 * Implements the complete EasyPay integration for MyMoolah
 */

class EasyPayController {
  constructor() {
    this.billModel = new Bill();
    this.paymentModel = new Payment();
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
      const bill = await this.billModel.findByEasyPayNumber(EasyPayNumber);
      
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
   * Authorization request
   * POST /billpayment/v1/authorisationRequest
   */
  async authorisationRequest(req, res) {
    try {
      console.log('🔐 EasyPay authorization request received:', req.body);
      
      const { EasyPayNumber, AccountNumber, Amount, EchoData } = req.body;
      
      // Validate required fields
      if (!EasyPayNumber || !AccountNumber || !EchoData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate EasyPay number format
      if (!validateEasyPayNumber(EasyPayNumber)) {
        return res.status(400).json({ error: 'Invalid EasyPay number format' });
      }

      // Find bill information
      const bill = await this.billModel.findByEasyPayNumber(EasyPayNumber);
      
      if (!bill) {
        return res.status(200).json({
          ResponseCode: '1', // InvalidAccount
          ResponseMessage: 'Invalid account number',
          Amount: 0,
          expiryDate: null,
          echoData: EchoData
        });
      }

      // Check if bill is already paid
      if (bill.status === 'paid') {
        return res.status(200).json({
          ResponseCode: '3', // Expired payment
          ResponseMessage: 'Bill already paid',
          Amount: bill.amount,
          expiryDate: bill.dueDate,
          echoData: EchoData
        });
      }

      // Check if payment amount is valid
      if (Amount < bill.minAmount || Amount > bill.maxAmount) {
        return res.status(200).json({
          ResponseCode: '2', // Invalid amount
          ResponseMessage: `Incorrect amount. Due amount is R${(bill.amount / 100).toFixed(2)}`,
          Amount: bill.amount,
          expiryDate: bill.dueDate,
          echoData: EchoData
        });
      }

      // Check if bill is expired
      const today = new Date();
      const dueDate = new Date(bill.dueDate);
      if (today > dueDate) {
        return res.status(200).json({
          ResponseCode: '3', // Expired payment
          ResponseMessage: 'Bill payment expired',
          Amount: bill.amount,
          expiryDate: bill.dueDate,
          echoData: EchoData
        });
      }

      // Authorization successful
      res.status(200).json({
        ResponseCode: '0', // Allow payment
        ResponseMessage: 'Allow payment',
        Amount: bill.amount,
        expiryDate: bill.dueDate,
        echoData: EchoData
      });

    } catch (error) {
      console.error('❌ EasyPay authorization request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Payment notification
   * POST /billpayment/v1/paymentNotification
   */
  async paymentNotification(req, res) {
    try {
      console.log('💰 EasyPay payment notification received:', req.body);
      
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
      
      // Validate required fields
      if (!MerchantId || !TerminalId || !PaymentDate || !Reference || !EasyPayNumber || !AccountNumber || !Amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Find bill information
      const bill = await this.billModel.findByEasyPayNumber(EasyPayNumber);
      
      if (!bill) {
        return res.status(200).json({
          ResponseCode: '1', // InvalidAccount
          ResponseMessage: 'Invalid account number',
          echoData: EchoData
        });
      }

      // Create payment record
      const payment = await this.paymentModel.create({
        merchantId: MerchantId,
        terminalId: TerminalId,
        paymentDate: PaymentDate,
        reference: Reference,
        easyPayNumber: EasyPayNumber,
        accountNumber: AccountNumber,
        amount: Amount,
        echoData: EchoData,
        billId: bill.id,
        status: 'completed'
      });

      // Update bill status to paid
      await this.billModel.updateStatus(bill.id, 'paid');

      console.log('✅ Payment processed successfully:', payment.id);

      // Return success response
      res.status(200).json({
        ResponseCode: '0', // Success
        ResponseMessage: 'Payment processed successfully',
        echoData: EchoData
      });

    } catch (error) {
      console.error('❌ EasyPay payment notification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all bills (for testing/admin)
   * GET /billpayment/v1/bills
   */
  async getAllBills(req, res) {
    try {
      const bills = await this.billModel.findAll();
      
      res.json({
        success: true,
        message: 'Bills retrieved successfully',
        data: { bills }
      });
    } catch (error) {
      console.error('❌ Error getting bills:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all payments (for testing/admin)
   * GET /billpayment/v1/payments
   */
  async getAllPayments(req, res) {
    try {
      const payments = await this.paymentModel.findAll();
      
      res.json({
        success: true,
        message: 'Payments retrieved successfully',
        data: { payments }
      });
    } catch (error) {
      console.error('❌ Error getting payments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create test bills (for development)
   * POST /billpayment/v1/create-test-bills
   */
  async createTestBills(req, res) {
    try {
      await this.billModel.createTestBills();
      
      res.json({
        success: true,
        message: 'Test bills created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating test bills:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = EasyPayController; 