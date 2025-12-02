/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/**
 * Normalize MSISDN in:
 * - beneficiary_service_accounts.serviceData.msisdn
 * - beneficiaries.vasServices (airtime/data entries: ensure { msisdn: +27..., mobileNumber: 0... })
 *
 * Uses application-side iteration for JSONB transformation (safe for medium data volumes).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { normalizeToE164, toLocal } = require('../utils/msisdn');
    const sequelize = queryInterface.sequelize;

    // 1) beneficiary_service_accounts
    // Check if table exists first
    const tableExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'beneficiary_service_accounts'
      ) as exists;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (!tableExists[0].exists) {
      console.log('   ⚠️  beneficiary_service_accounts table does not exist, skipping...');
    } else {
      // Check actual column names (may be camelCase or snake_case depending on Sequelize settings)
      const columns = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'beneficiary_service_accounts' 
          AND column_name IN ('serviceType', 'servicetype', 'service_type', 'serviceData', 'servicedata', 'service_data')
      `, { type: Sequelize.QueryTypes.SELECT });
      
      const columnMap = {};
      columns.forEach(col => {
        const lower = col.column_name.toLowerCase();
        if (lower.includes('servicetype') || lower.includes('service_type')) {
          columnMap.serviceType = col.column_name;
        }
        if (lower.includes('servicedata') || lower.includes('service_data')) {
          columnMap.serviceData = col.column_name;
        }
      });
      
      const serviceTypeColumn = columnMap.serviceType || 'serviceType';
      const serviceDataColumn = columnMap.serviceData || 'serviceData';
      
      // Query using actual column names (quote them to handle case sensitivity)
      const serviceAccounts = await sequelize.query(
        `SELECT id, "${serviceTypeColumn}" as "serviceType", "${serviceDataColumn}" as "serviceData" 
         FROM beneficiary_service_accounts 
         WHERE "${serviceDataColumn}" IS NOT NULL`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      for (const row of serviceAccounts) {
        try {
          const data = row.servicedata || row.serviceData || {};
          if (data && typeof data === 'object') {
            // Normalize msisdn if present
            if (data.msisdn && typeof data.msisdn === 'string') {
              const e164 = normalizeToE164(String(data.msisdn));
              const local = toLocal(e164);
              data.msisdn = e164;
              // Keep alias for UI compatibility if applicable
              if (!data.mobileNumber) data.mobileNumber = local;
            }
            // Normalize walletMsisdn for mymoolah method if present
            if (data.walletMsisdn && typeof data.walletMsisdn === 'string') {
              const e164 = normalizeToE164(String(data.walletMsisdn));
              const local = toLocal(e164);
              data.walletMsisdn = e164;
              if (!data.mobileNumber) data.mobileNumber = local;
            }

            await sequelize.query(
              `UPDATE beneficiary_service_accounts SET "${serviceDataColumn}" = :json WHERE id = :id`,
              { replacements: { json: JSON.stringify(data), id: row.id } }
            );
          }
        } catch (e) {
          // Continue; do not block migration on malformed rows
          // eslint-disable-next-line no-console
          console.warn('Service account MSISDN normalize skipped id=', row.id, 'error=', e.message);
        }
      }
    }

    // 2) beneficiaries.vasServices JSONB (airtime/data arrays)
    const beneficiaries = await sequelize.query(
      `SELECT id, "vasServices" FROM beneficiaries WHERE "vasServices" IS NOT NULL`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const row of beneficiaries) {
      try {
        const vs = row.vasServices || row.vasservices;
        if (vs && typeof vs === 'object') {
          const updateVasArray = (arr) => {
            if (!Array.isArray(arr)) return arr;
            return arr.map((entry) => {
              if (!entry || typeof entry !== 'object') return entry;
              const copy = { ...entry };
              const src = copy.msisdn || copy.mobileNumber;
              if (typeof src === 'string') {
                try {
                  const e164 = normalizeToE164(src);
                  copy.msisdn = e164;
                  if (!copy.mobileNumber) copy.mobileNumber = toLocal(e164);
                } catch (e) {
                  // leave as-is
                }
              }
              return copy;
            });
          };

          const updated = { ...vs };
          if (updated.airtime) updated.airtime = updateVasArray(updated.airtime);
          if (updated.data) updated.data = updateVasArray(updated.data);

          await sequelize.query(
            `UPDATE beneficiaries SET "vasServices" = :json WHERE id = :id`,
            { replacements: { json: JSON.stringify(updated), id: row.id } }
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Beneficiary vasServices normalize skipped id=', row.id, 'error=', e.message);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const { toLocal } = require('../utils/msisdn');
    const sequelize = queryInterface.sequelize;

    // Reverse for service accounts: E.164 -> local in msisdn fields
    const serviceAccounts = await sequelize.query(
      `SELECT id, serviceData FROM beneficiary_service_accounts WHERE serviceData IS NOT NULL`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (const row of serviceAccounts) {
      try {
        const data = row.servicedata || row.serviceData || {};
        if (data && typeof data === 'object') {
          if (data.msisdn && typeof data.msisdn === 'string' && data.msisdn.startsWith('+27')) {
            data.msisdn = toLocal(data.msisdn);
          }
          if (data.walletMsisdn && typeof data.walletMsisdn === 'string' && data.walletMsisdn.startsWith('+27')) {
            data.walletMsisdn = toLocal(data.walletMsisdn);
          }
          await sequelize.query(
            `UPDATE beneficiary_service_accounts SET "${serviceDataColumn}" = :json WHERE id = :id`,
            { replacements: { json: JSON.stringify(data), id: row.id } }
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Service account down-migration skip id=', row.id, 'error=', e.message);
      }
    }

    // Reverse in beneficiaries.vasServices
    const beneficiaries = await sequelize.query(
      `SELECT id, "vasServices" FROM beneficiaries WHERE "vasServices" IS NOT NULL`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (const row of beneficiaries) {
      try {
        const vs = row.vasServices || row.vasservices;
        if (vs && typeof vs === 'object') {
          const revertVasArray = (arr) => {
            if (!Array.isArray(arr)) return arr;
            return arr.map((entry) => {
              if (!entry || typeof entry !== 'object') return entry;
              const copy = { ...entry };
              if (typeof copy.msisdn === 'string' && copy.msisdn.startsWith('+27')) {
                copy.mobileNumber = toLocal(copy.msisdn);
              }
              return copy;
            });
          };

          const updated = { ...vs };
          if (updated.airtime) updated.airtime = revertVasArray(updated.airtime);
          if (updated.data) updated.data = revertVasArray(updated.data);

          await sequelize.query(
            `UPDATE beneficiaries SET "vasServices" = :json WHERE id = :id`,
            { replacements: { json: JSON.stringify(updated), id: row.id } }
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Beneficiary vasServices down-migration skip id=', row.id, 'error=', e.message);
      }
    }
  }
};
