/**
 * Migration: Fix Zapper SFTP path to point at the inbox subdirectory
 *
 * Forward-only correction to `recon_supplier_configs.sftp_path` for the
 * ZAPPER supplier row. The original seed migration (20260413_01) set it
 * to `/home/zapper`, but the operational convention (matching SBSA,
 * MobileMart, Flash, EasyPay) is for files to land under `inbox/`.
 *
 * Note: `sftp_path` is metadata only. `SFTPWatcherService` derives the
 * GCS listing prefix from `supplier_code.toLowerCase() + '/'`, so file
 * ingestion is not affected by this value. The correction is documentary
 * — it keeps the DB consistent with the runbook and gateway home dir.
 *
 * @author MMTP Agent
 * @date 2026-04-21
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT id, sftp_path FROM recon_supplier_configs WHERE supplier_code = 'ZAPPER'`,
        { transaction }
      );

      if (rows.length === 0) {
        console.log('⚠️  No ZAPPER row found in recon_supplier_configs, skipping...');
        await transaction.commit();
        return;
      }

      if (rows[0].sftp_path === '/home/zapper/inbox') {
        console.log('⚠️  ZAPPER sftp_path already set to /home/zapper/inbox, skipping...');
        await transaction.commit();
        return;
      }

      await queryInterface.sequelize.query(
        `UPDATE recon_supplier_configs
            SET sftp_path = '/home/zapper/inbox',
                updated_at = NOW()
          WHERE supplier_code = 'ZAPPER'`,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ ZAPPER sftp_path updated to /home/zapper/inbox');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to update ZAPPER sftp_path:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `UPDATE recon_supplier_configs
            SET sftp_path = '/home/zapper',
                updated_at = NOW()
          WHERE supplier_code = 'ZAPPER'`,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ ZAPPER sftp_path reverted to /home/zapper');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to revert ZAPPER sftp_path:', error);
      throw error;
    }
  }
};
