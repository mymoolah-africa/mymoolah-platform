#!/usr/bin/env node
'use strict';

/**
 * Audit MSISDN formats across key tables.
 * Reports counts of E.164 (+27...), local (0...), NON_MSI_*, and others.
 */

const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  const { Beneficiary, BeneficiaryServiceAccount, User, sequelize } = require('../models');

  function classify(value) {
    if (!value) return 'null';
    if (typeof value !== 'string') return 'other';
    if (value.startsWith('NON_MSI_')) return 'non_msi';
    if (/^\+27[6-8][0-9]{8}$/.test(value)) return 'e164';
    if (/^0[6-8][0-9]{8}$/.test(value)) return 'local';
    if (/^27[6-8][0-9]{8}$/.test(value)) return 'country_no_plus';
    return 'other';
  }

  const result = {
    beneficiaries_msisdn: { e164: 0, local: 0, country_no_plus: 0, non_msi: 0, null: 0, other: 0 },
    bsa_service_msisdn: { e164: 0, local: 0, country_no_plus: 0, non_msi: 0, null: 0, other: 0 },
    users_phoneNumber: { e164: 0, local: 0, country_no_plus: 0, non_msi: 0, null: 0, other: 0 },
  };

  // Beneficiaries.msisdn
  const beneficiaries = await Beneficiary.findAll({ attributes: ['msisdn'] });
  beneficiaries.forEach((b) => {
    result.beneficiaries_msisdn[classify(b.msisdn)]++;
  });

  // Service accounts JSONB
  const accounts = await BeneficiaryServiceAccount.findAll({ attributes: ['serviceData'] });
  accounts.forEach((row) => {
    const sd = row.serviceData || {};
    const c1 = classify(sd.msisdn);
    result.bsa_service_msisdn[c1]++;
  });

  // Users.phoneNumber
  const users = await User.findAll({ attributes: ['phoneNumber'] });
  users.forEach((u) => {
    result.users_phoneNumber[classify(u.phoneNumber)]++;
  });

  console.log(JSON.stringify(result, null, 2));
  await sequelize.close();
}

main().catch((err) => {
  console.error('Audit error:', err);
  process.exit(1);
});

