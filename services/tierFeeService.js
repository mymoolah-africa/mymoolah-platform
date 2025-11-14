'use strict';

/**
 * Tier Fee Service - MyMoolah Treasury Platform
 * 
 * Generic, supplier-agnostic tier-based fee calculator
 * Supports: Zapper, Flash, EasyPay, MobileMart, and all future suppliers
 * 
 * Banking-grade fee calculation with:
 * - Fixed fees (e.g., R3.00)
 * - Percentage fees (e.g., 0.4%)
 * - Hybrid fees (fixed + percentage)
 * - VAT breakdown for compliance
 * - Audit trail for all calculations
 */

const { User, sequelize } = require('../models');

const VAT_RATE = Number(process.env.VAT_RATE || 0.15);

/**
 * Calculate tier-based fees for any supplier/service combination
 * 
 * @param {number} userId - User ID
 * @param {string} supplierCode - Supplier identifier (ZAPPER, FLASH, EASYPAY, etc.)
 * @param {string} serviceType - Service type (qr_payment, eezi_voucher, etc.)
 * @param {number} transactionAmountCents - Base transaction amount in cents
 * @returns {Promise<object>} Complete fee breakdown
 */
async function calculateTierFees(userId, supplierCode, serviceType, transactionAmountCents) {
  try {
    // Validate inputs
    if (!userId || !supplierCode || !serviceType || transactionAmountCents < 0) {
      throw new Error('Invalid parameters for tier fee calculation');
    }

    // Get user's current tier
    // Handle case where tier_level column might not exist yet (graceful degradation)
    let tierLevel = 'bronze'; // Default fallback
    
    try {
      // Check if tier_level column exists in users table
      const [columnCheck] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'tier_level'
        LIMIT 1
      `, { type: sequelize.QueryTypes.SELECT });
      
      if (columnCheck && columnCheck.column_name === 'tier_level') {
        // Column exists, query user's tier
        const [user] = await sequelize.query(`
          SELECT tier_level 
          FROM users 
          WHERE id = :userId
          LIMIT 1
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        
        if (!user) {
          throw new Error(`User ${userId} not found`);
        }
        
        tierLevel = user.tier_level || 'bronze';
      } else {
        // Column doesn't exist yet, default to bronze
        console.warn(`⚠️  tier_level column not found in users table, defaulting to bronze tier for all users`);
        tierLevel = 'bronze';
      }
    } catch (error) {
      // If query fails for any reason, default to bronze and continue
      console.warn(`⚠️  Could not determine tier for user ${userId}, defaulting to bronze:`, error.message);
      tierLevel = 'bronze';
    }
    
    // Get fee configuration from database
    const [config] = await sequelize.query(`
      SELECT 
        supplier_fee_type,
        supplier_fixed_fee_cents,
        supplier_percentage_fee,
        mm_fee_type,
        mm_fixed_fee_cents,
        mm_percentage_fee
      FROM supplier_tier_fees
      WHERE supplier_code = :supplierCode
        AND service_type = :serviceType
        AND tier_level = :tierLevel
        AND is_active = true
        AND effective_from <= NOW()
        AND (effective_until IS NULL OR effective_until > NOW())
      ORDER BY effective_from DESC
      LIMIT 1
    `, {
      replacements: { supplierCode, serviceType, tierLevel },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!config) {
      throw new Error(
        `No active fee configuration found for ${supplierCode}/${serviceType}/${tierLevel}`
      );
    }
    
    // Calculate supplier's cost to MM
    let supplierCostCents = 0;
    
    switch (config.supplier_fee_type) {
      case 'fixed':
        supplierCostCents = parseInt(config.supplier_fixed_fee_cents) || 0;
        break;
        
      case 'percentage':
        supplierCostCents = Math.round(
          transactionAmountCents * parseFloat(config.supplier_percentage_fee)
        );
        break;
        
      case 'hybrid':
        supplierCostCents = (parseInt(config.supplier_fixed_fee_cents) || 0) + 
          Math.round(transactionAmountCents * parseFloat(config.supplier_percentage_fee));
        break;
        
      default:
        throw new Error(`Invalid supplier fee type: ${config.supplier_fee_type}`);
    }
    
    // Calculate MM's fee to user
    let mmFeeCents = 0;
    
    switch (config.mm_fee_type) {
      case 'fixed':
        mmFeeCents = parseInt(config.mm_fixed_fee_cents) || 0;
        break;
        
      case 'percentage':
        mmFeeCents = Math.round(
          transactionAmountCents * parseFloat(config.mm_percentage_fee)
        );
        break;
        
      case 'hybrid':
        mmFeeCents = (parseInt(config.mm_fixed_fee_cents) || 0) + 
          Math.round(transactionAmountCents * parseFloat(config.mm_percentage_fee));
        break;
        
      default:
        throw new Error(`Invalid MM fee type: ${config.mm_fee_type}`);
    }
    
    // Calculate totals
    const totalFeeCents = supplierCostCents + mmFeeCents;
    const totalUserPaysCents = transactionAmountCents + totalFeeCents;
    
    // Calculate VAT breakdown (on MM's fee only - supplier cost is pass-through)
    const mmFeeVatAmount = Math.round((mmFeeCents * VAT_RATE) / (1 + VAT_RATE));
    const mmFeeNetRevenue = mmFeeCents - mmFeeVatAmount;
    
    // Return complete breakdown
    return {
      // Identifiers
      supplierCode,
      serviceType,
      tierLevel,
      
      // Amounts (in cents)
      transactionAmountCents,
      supplierCostCents,
      mmFeeCents,
      mmFeeVatAmount,
      mmFeeNetRevenue,
      totalFeeCents,
      totalUserPaysCents,
      
      // Config used (for audit trail)
      feeConfig: {
        supplierFeeType: config.supplier_fee_type,
        supplierFixedFeeCents: config.supplier_fixed_fee_cents,
        supplierPercentageFee: config.supplier_percentage_fee,
        mmFeeType: config.mm_fee_type,
        mmFixedFeeCents: config.mm_fixed_fee_cents,
        mmPercentageFee: config.mm_percentage_fee
      },
      
      // Display values (in Rands for frontend)
      display: {
        transactionAmount: formatCentsToRands(transactionAmountCents),
        supplierCost: formatCentsToRands(supplierCostCents),
        mmFee: formatCentsToRands(mmFeeCents),
        totalFee: formatCentsToRands(totalFeeCents),
        totalUserPays: formatCentsToRands(totalUserPaysCents),
        netRevenue: formatCentsToRands(mmFeeNetRevenue),
        tierLevel: tierLevel.charAt(0).toUpperCase() + tierLevel.slice(1)
      }
    };
    
  } catch (error) {
    console.error('❌ Tier fee calculation error:', error.message);
    throw error;
  }
}

/**
 * Get tier-based fee preview for display (before transaction)
 * Returns user-friendly fee display based on their tier
 * 
 * @param {number} userId - User ID
 * @param {string} supplierCode - Supplier identifier
 * @param {string} serviceType - Service type
 * @returns {Promise<object>} Fee preview information
 */
async function getTierFeePreview(userId, supplierCode, serviceType) {
  try {
    // Handle missing tier_level column gracefully
    let tierLevel = 'bronze';
    try {
      const [columnCheck] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'tier_level'
        LIMIT 1
      `, { type: sequelize.QueryTypes.SELECT });
      
      if (columnCheck) {
        const [user] = await sequelize.query(`
          SELECT tier_level 
          FROM users 
          WHERE id = :userId
          LIMIT 1
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        tierLevel = user?.tier_level || 'bronze';
      }
    } catch (error) {
      // Default to bronze if column doesn't exist
      tierLevel = 'bronze';
    }
    
    const [config] = await sequelize.query(`
      SELECT 
        mm_fee_type, 
        mm_fixed_fee_cents, 
        mm_percentage_fee,
        supplier_fee_type,
        supplier_fixed_fee_cents,
        supplier_percentage_fee
      FROM supplier_tier_fees
      WHERE supplier_code = :supplierCode
        AND service_type = :serviceType
        AND tier_level = :tierLevel
        AND is_active = true
      LIMIT 1
    `, {
      replacements: { supplierCode, serviceType, tierLevel },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!config) {
      return null;
    }
    
    // Format MM fee display
    let mmFeeDisplay = '';
    if (config.mm_fee_type === 'fixed') {
      mmFeeDisplay = formatCentsToRands(config.mm_fixed_fee_cents);
    } else if (config.mm_fee_type === 'percentage') {
      mmFeeDisplay = `${(config.mm_percentage_fee * 100).toFixed(2)}%`;
    } else {
      mmFeeDisplay = `${formatCentsToRands(config.mm_fixed_fee_cents)} + ${(config.mm_percentage_fee * 100).toFixed(2)}%`;
    }
    
    // Format supplier cost display
    let supplierCostDisplay = '';
    if (config.supplier_fee_type === 'fixed') {
      supplierCostDisplay = formatCentsToRands(config.supplier_fixed_fee_cents);
    } else if (config.supplier_fee_type === 'percentage') {
      supplierCostDisplay = `${(config.supplier_percentage_fee * 100).toFixed(2)}%`;
    } else {
      supplierCostDisplay = `${formatCentsToRands(config.supplier_fixed_fee_cents)} + ${(config.supplier_percentage_fee * 100).toFixed(2)}%`;
    }
    
    return {
      tierLevel,
      supplierCode,
      serviceType,
      mmFeeDisplay,
      supplierCostDisplay,
      message: `As a ${tierLevel} member, your fee is ${mmFeeDisplay}`
    };
    
  } catch (error) {
    console.error('❌ Fee preview error:', error.message);
    return null;
  }
}

/**
 * Get all tier fees for a service (for comparison display)
 * Shows users what they could save by upgrading tiers
 * 
 * @param {string} supplierCode - Supplier identifier
 * @param {string} serviceType - Service type
 * @returns {Promise<Array>} Array of tier fee configurations
 */
async function getAllTierFees(supplierCode, serviceType) {
  try {
    const tiers = await sequelize.query(`
      SELECT 
        tier_level,
        mm_fee_type,
        mm_fixed_fee_cents,
        mm_percentage_fee,
        supplier_fee_type,
        supplier_fixed_fee_cents,
        supplier_percentage_fee
      FROM supplier_tier_fees
      WHERE supplier_code = :supplierCode
        AND service_type = :serviceType
        AND is_active = true
      ORDER BY 
        CASE tier_level
          WHEN 'bronze' THEN 1
          WHEN 'silver' THEN 2
          WHEN 'gold' THEN 3
          WHEN 'platinum' THEN 4
        END
    `, {
      replacements: { supplierCode, serviceType },
      type: sequelize.QueryTypes.SELECT
    });
    
    return tiers.map(tier => ({
      tierLevel: tier.tier_level,
      mmFee: tier.mm_fee_type === 'fixed' 
        ? formatCentsToRands(tier.mm_fixed_fee_cents)
        : `${(tier.mm_percentage_fee * 100).toFixed(2)}%`,
      supplierCost: tier.supplier_fee_type === 'fixed'
        ? formatCentsToRands(tier.supplier_fixed_fee_cents)
        : `${(tier.supplier_percentage_fee * 100).toFixed(2)}%`
    }));
    
  } catch (error) {
    console.error('❌ Get all tier fees error:', error.message);
    return [];
  }
}

/**
 * Format cents to Rand display (e.g., 300 -> "R3.00")
 */
function formatCentsToRands(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

/**
 * Validate fee configuration (used by admin portal)
 */
function validateFeeConfig(config) {
  const errors = [];
  
  if (!['bronze', 'silver', 'gold', 'platinum'].includes(config.tier_level)) {
    errors.push('Invalid tier level');
  }
  
  if (!['fixed', 'percentage', 'hybrid'].includes(config.supplier_fee_type)) {
    errors.push('Invalid supplier fee type');
  }
  
  if (!['fixed', 'percentage', 'hybrid'].includes(config.mm_fee_type)) {
    errors.push('Invalid MM fee type');
  }
  
  if (config.supplier_fixed_fee_cents < 0 || config.mm_fixed_fee_cents < 0) {
    errors.push('Fee amounts cannot be negative');
  }
  
  if (config.supplier_percentage_fee < 0 || config.supplier_percentage_fee > 1) {
    errors.push('Percentage fees must be between 0 and 1 (e.g., 0.004 for 0.4%)');
  }
  
  if (config.mm_percentage_fee < 0 || config.mm_percentage_fee > 1) {
    errors.push('Percentage fees must be between 0 and 1');
  }
  
  return { valid: errors.length === 0, errors };
}

module.exports = {
  calculateTierFees,
  getTierFeePreview,
  getAllTierFees,
  validateFeeConfig,
  formatCentsToRands
};

