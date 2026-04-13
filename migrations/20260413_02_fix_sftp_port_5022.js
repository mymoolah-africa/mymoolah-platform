'use strict';

/**
 * Migration: Fix SFTP port from 22 to 5022 for all recon supplier configs
 *
 * Background: The SFTP Gateway VM (sftp-1-vm) was reconfigured from port 22
 * to port 5022 on 2026-03-17 per SBSA's requirement. The Zapper migration
 * (20260413_01) already uses 5022, but MobileMart, Flash, and EasyPay were
 * seeded with port 22 in their original migrations.
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE recon_supplier_configs
      SET sftp_port = 5022,
          updated_at = NOW()
      WHERE sftp_port = 22
        AND sftp_host = '34.35.137.166'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE recon_supplier_configs
      SET sftp_port = 22,
          updated_at = NOW()
      WHERE sftp_port = 5022
        AND sftp_host = '34.35.137.166'
        AND supplier_code IN ('MMART', 'FLASH', 'EASYPAY')
    `);
  }
};
