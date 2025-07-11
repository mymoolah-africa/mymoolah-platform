const VoucherTypeModel = require('../models/voucherTypeModel');

// Create a single instance of VoucherTypeModel
const voucherTypeModel = new VoucherTypeModel();

// Get all voucher types
exports.getAllVoucherTypes = async (req, res) => {
  try {
    const voucherTypes = await voucherTypeModel.getAllVoucherTypes();
    res.json(voucherTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get voucher types' });
  }
};

// Get voucher type by name
exports.getVoucherType = async (req, res) => {
  try {
    const { typeName } = req.params;
    const voucherType = await voucherTypeModel.getVoucherType(typeName);
    if (!voucherType) {
      return res.status(404).json({ error: 'Voucher type not found' });
    }
    res.json(voucherType);
  } catch (err) {
    console.error(err);
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
    const validPricingModels = ['fixed_rate', 'bundle_rate', 'percentage_rate'];
    if (typeData.pricing_model && !validPricingModels.includes(typeData.pricing_model)) {
      return res.status(400).json({ error: 'Invalid pricing model' });
    }

    const result = await voucherTypeModel.createVoucherType(typeData);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create voucher type' });
  }
};

// Update voucher type
exports.updateVoucherType = async (req, res) => {
  try {
    const { typeName } = req.params;
    const updateData = req.body;

    const result = await voucherTypeModel.updateVoucherType(typeName, updateData);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Voucher type not found' });
    }
    res.json({ success: true, message: 'Voucher type updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update voucher type' });
  }
};

// Delete voucher type (soft delete)
exports.deleteVoucherType = async (req, res) => {
  try {
    const { typeName } = req.params;
    const result = await voucherTypeModel.deleteVoucherType(typeName);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Voucher type not found' });
    }
    res.json({ success: true, message: 'Voucher type deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to delete voucher type' });
  }
};

// Validate voucher data against type rules
exports.validateVoucherData = async (req, res) => {
  try {
    const voucherData = req.body;
    const validation = await voucherTypeModel.validateVoucherAgainstType(voucherData, voucherData.voucher_type || 'standard');
    res.json(validation);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Validation failed' });
  }
}; 