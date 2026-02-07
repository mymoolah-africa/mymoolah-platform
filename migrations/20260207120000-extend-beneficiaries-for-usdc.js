'use strict';

/**
 * Migration: Extend beneficiaries table for USDC crypto services
 * 
 * Adds crypto_services JSONB column to store USDC wallet addresses and metadata
 * following the unified beneficiary pattern used by VAS services.
 * 
 * Structure: { usdc: [{ walletAddress, network, country, relationship, ... }] }
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding crypto_services column to beneficiaries table...');
    
    // Add crypto_services JSONB column
    await queryInterface.addColumn('beneficiaries', 'crypto_services', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Crypto wallet services: { usdc: [{ walletAddress, network, isActive, country, relationship, purpose, totalSends, totalUsdcSent }] }'
    });

    console.log('Creating GIN index for crypto_services...');
    
    // Add GIN index for JSONB queries
    await queryInterface.addIndex('beneficiaries', ['crypto_services'], {
      name: 'idx_beneficiaries_crypto_services',
      using: 'GIN'
    });

    console.log('✅ Beneficiaries table extended for USDC support');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Removing crypto_services index...');
    await queryInterface.removeIndex('beneficiaries', 'idx_beneficiaries_crypto_services');
    
    console.log('Removing crypto_services column...');
    await queryInterface.removeColumn('beneficiaries', 'crypto_services');
    
    console.log('✅ Beneficiaries table crypto extension rolled back');
  }
};
