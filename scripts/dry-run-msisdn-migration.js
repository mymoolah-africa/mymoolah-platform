#!/usr/bin/env node
'use strict';

/**
 * Dry-run MSISDN migration to E.164.
 * Prints sample conversions without persisting changes.
 */

const { Beneficiary, BeneficiaryServiceAccount, sequelize } = require('../models');
const { normalizeToE164, toLocal } = require('../utils/msisdn');

async function main() {
  const limit = parseInt(process.env.SAMPLE_LIMIT || '20', 10);

  const benes = await Beneficiary.findAll({ limit, attributes: ['id', 'msisdn'] });
  const beneSamples = benes.map((b) => {
    try {
      const before = b.msisdn;
      const after = before ? normalizeToE164(String(before)) : null;
      return { id: b.id, before, after, local: after ? toLocal(after) : null };
    } catch (e) {
      return { id: b.id, before: b.msisdn, error: e.message };
    }
  });

  const accounts = await BeneficiaryServiceAccount.findAll({ limit, attributes: ['id', 'serviceType', 'serviceData'] });
  const accSamples = accounts.map((a) => {
    const sd = a.serviceData || {};
    try {
      const src = sd.msisdn || sd.walletMsisdn || sd.mobileNumber || null;
      const after = src ? normalizeToE164(String(src)) : null;
      return { id: a.id, serviceType: a.serviceType, src, after, local: after ? toLocal(after) : null };
    } catch (e) {
      return { id: a.id, serviceType: a.serviceType, src: a.serviceData?.msisdn, error: e.message };
    }
  });

  console.log('=== Beneficiaries (sample) ===');
  console.table(beneSamples);
  console.log('=== Service Accounts (sample) ===');
  console.table(accSamples);

  await sequelize.close();
}

main().catch((err) => {
  console.error('Dry-run error:', err);
  process.exit(1);
});

