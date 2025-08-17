const { VoucherType } = require('../models');

// Get all voucher types
exports.getAllVoucherTypes = async (req, res) => {
  try {
    const voucherTypes = await VoucherType.findAll({
      where: { isActive: true },
      order: [['typeName', 'ASC']]
    });
    
    res.json({
      success: true,
      data: voucherTypes
    });
  } catch (err) {
    console.error('❌ Get voucher types error:', err);
    res.status(500).json({ error: 'Failed to get voucher types' });
  }
};

// Get voucher type by name
exports.getVoucherType = async (req, res) => {
  try {
    const { typeName } = req.params;
    const voucherType = await VoucherType.findOne({ 
      where: { typeName: typeName }
    });
    
    if (!voucherType) {
      return res.status(404).json({ error: 'Voucher type not found' });
    }
    
    res.json({
      success: true,
      data: voucherType
    });
  } catch (err) {
    console.error('❌ Get voucher type error:', err);
    res.status(500).json({ error: 'Failed to get voucher type' });
  }
};

// Create new voucher type
exports.createVoucherType = async (req, res) => {
  try {
    const typeData = req.body;
    
    // Validate required fields
    if (!typeData.type_name || !typeData.display_name) {
      return res.status(400).json({ error: 'Type name and display name are required' });
    }

    // Validate pricing model
    const validPricingModels = ['fixed_rate', 'bundle_rate', 'percentage_rate', 'tiered_rate'];
    if (typeData.pricing_model && !validPricingModels.includes(typeData.pricing_model)) {
      return res.status(400).json({ error: 'Invalid pricing model' });
    }

    // Check if type name already exists
    const existingType = await VoucherType.findOne({ 
      where: { typeName: typeData.type_name } 
    });
    
    if (existingType) {
      return res.status(409).json({ error: 'Voucher type with this name already exists' });
    }

    const voucherType = await VoucherType.create({
      typeName: typeData.type_name,
      displayName: typeData.display_name,
      description: typeData.description,
      pricingModel: typeData.pricing_model || 'fixed_rate',
      baseRate: typeData.base_rate || 1.0,
      minAmount: typeData.min_amount || 5.0,
      maxAmount: typeData.max_amount || 4000.0,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Voucher type created successfully',
      data: voucherType
    });
  } catch (err) {
    console.error('❌ Create voucher type error:', err);
    res.status(500).json({ error: err.message || 'Failed to create voucher type' });
  }
};

// Update voucher type
exports.updateVoucherType = async (req, res) => {
  try {
    const { typeName } = req.params;
    const updateData = req.body;

    const voucherType = await VoucherType.findOne({ 
      where: { typeName: typeName } 
    });
    
    if (!voucherType) {
      return res.status(404).json({ error: 'Voucher type not found' });
    }
    
    await voucherType.update({
      displayName: updateData.display_name || voucherType.displayName,
      description: updateData.description || voucherType.description,
      pricingModel: updateData.pricing_model || voucherType.pricingModel,
      baseRate: updateData.base_rate || voucherType.baseRate,
      minAmount: updateData.min_amount || voucherType.minAmount,
      maxAmount: updateData.max_amount || voucherType.maxAmount,
      isActive: updateData.is_active !== undefined ? updateData.is_active : voucherType.isActive
    });
    
    res.json({ 
      success: true, 
      message: 'Voucher type updated successfully',
      data: voucherType
    });
  } catch (err) {
    console.error('❌ Update voucher type error:', err);
    res.status(500).json({ error: err.message || 'Failed to update voucher type' });
  }
};

// Delete voucher type (soft delete)
exports.deleteVoucherType = async (req, res) => {
  try {
    const { typeName } = req.params;
    
    const voucherType = await VoucherType.findOne({ 
      where: { typeName: typeName } 
    });
    
    if (!voucherType) {
      return res.status(404).json({ error: 'Voucher type not found' });
    }
    
    await voucherType.update({ isActive: false });
    
    res.json({ 
      success: true, 
      message: 'Voucher type deleted successfully' 
    });
  } catch (err) {
    console.error('❌ Delete voucher type error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete voucher type' });
  }
};

// Validate voucher data against type rules
exports.validateVoucherData = async (req, res) => {
  try {
    const voucherData = req.body;
    const typeName = voucherData.voucher_type || 'standard';
    
    const voucherType = await VoucherType.findOne({ 
      where: { typeName: typeName, isActive: true } 
    });
    
    if (!voucherType) {
      return res.status(400).json({ 
        error: 'Invalid voucher type',
        valid: false 
      });
    }
    
    const amount = Number(voucherData.amount);
    const isValid = amount >= voucherType.minAmount && amount <= voucherType.maxAmount;
    
    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'Voucher data is valid' : 'Voucher amount is outside allowed range',
      type: voucherType.typeName,
      minAmount: voucherType.minAmount,
      maxAmount: voucherType.maxAmount
    });
  } catch (err) {
    console.error('❌ Validate voucher data error:', err);
    res.status(400).json({ error: err.message || 'Validation failed' });
  }
}; 