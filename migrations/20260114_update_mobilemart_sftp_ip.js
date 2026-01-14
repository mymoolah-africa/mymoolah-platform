/**
 * Migration: Update MobileMart SFTP Host to Static IP
 * 
 * Updates MobileMart reconciliation configuration to use the new static IP
 * address (34.35.137.166) instead of the ephemeral IP (34.35.168.101)
 * 
 * @author MMTP Agent
 * @date 2026-01-14
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Update MobileMart SFTP host to static IP
      await queryInterface.sequelize.query(`
        UPDATE recon_supplier_configs
        SET sftp_host = '34.35.137.166',
            updated_at = NOW()
        WHERE supplier_code = 'MMART'
          AND sftp_host = '34.35.168.101'
      `, { transaction });
      
      // Verify update
      const [results] = await queryInterface.sequelize.query(
        `SELECT supplier_name, supplier_code, sftp_host 
         FROM recon_supplier_configs 
         WHERE supplier_code = 'MMART'`,
        { transaction }
      );
      
      if (results.length > 0 && results[0].sftp_host === '34.35.137.166') {
        console.log('✅ MobileMart SFTP host updated to static IP: 34.35.137.166');
      } else {
        console.log('⚠️  MobileMart SFTP host may already be updated or config not found');
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to update MobileMart SFTP host:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Revert to old IP (if needed for rollback)
      await queryInterface.sequelize.query(`
        UPDATE recon_supplier_configs
        SET sftp_host = '34.35.168.101',
            updated_at = NOW()
        WHERE supplier_code = 'MMART'
          AND sftp_host = '34.35.137.166'
      `, { transaction });
      
      await transaction.commit();
      console.log('✅ MobileMart SFTP host reverted to old IP');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to revert MobileMart SFTP host:', error);
      throw error;
    }
  }
};
