'use strict';

const OTT_TERMS = [
  {
    providerCode: '2',
    providerName: 'Standard Bank Instant Money',
    providerType: 'payout',
    serviceFamily: 'cash_send',
    commercialType: 'fixed_fee',
    fixedFeeExVat: 9.96,
    mmtpFeeExVat: 0.87,
    isCustomerFacing: true,
    metadata: { rail: 'bank_cash_send', source: 'uat_placeholder_standard_bank_instant_money' },
  },
  {
    providerCode: '112',
    providerName: 'ABSA CashSend',
    providerType: 'payout',
    serviceFamily: 'cash_send',
    commercialType: 'fixed_fee',
    fixedFeeExVat: 9.96,
    mmtpFeeExVat: 0.87,
    reversalFeeExVat: 10.00,
    isCustomerFacing: true,
    metadata: { rail: 'bank_cash_send', source: 'agreement_3_2' },
  },
  {
    providerCode: '127',
    providerName: 'PayShap Account',
    providerType: 'payout',
    serviceFamily: 'payshap',
    commercialType: 'fixed_fee',
    fixedFeeExVat: 2.50,
    mmtpFeeExVat: 0.87,
    isCustomerFacing: true,
    metadata: { rail: 'payshap', source: 'agreement_3_3' },
  },
  {
    providerCode: 'RTC',
    providerName: 'RTC',
    providerType: 'payout',
    serviceFamily: 'rtc',
    commercialType: 'fixed_fee',
    fixedFeeExVat: 4.50,
    mmtpFeeExVat: 0.87,
    isCustomerFacing: false,
    metadata: { rail: 'rtc', source: 'agreement_3_4', activeInUatProviderList: false },
  },
  {
    providerCode: '3',
    providerName: 'OTT VOUCHER',
    providerType: 'voucher',
    serviceFamily: 'voucher',
    commercialType: 'commission',
    grossCommissionPct: 3.00,
    serviceFeePct: 0.00,
    netCommissionPct: 3.00,
    isCustomerFacing: true,
    metadata: { source: 'confirmed_ott_voucher_commission_incl_vat' },
  },
  {
    providerCode: '60',
    providerName: 'AnyTime Voucher',
    providerType: 'voucher',
    serviceFamily: 'voucher',
    commercialType: 'commission',
    grossCommissionPct: 1.00,
    serviceFeePct: 0.30,
    netCommissionPct: 0.70,
    isCustomerFacing: true,
    metadata: { source: 'agreement_3_5_vas_product' },
  },
  {
    providerCode: '68',
    providerName: 'PicknPay Voucher',
    providerType: 'voucher',
    serviceFamily: 'voucher',
    commercialType: 'commission',
    grossCommissionPct: 1.00,
    serviceFeePct: 0.30,
    netCommissionPct: 0.70,
    isCustomerFacing: true,
    metadata: { source: 'agreement_3_5_vas_product' },
  },
  {
    providerCode: '69',
    providerName: 'Shoprite Voucher',
    providerType: 'voucher',
    serviceFamily: 'voucher',
    commercialType: 'commission',
    grossCommissionPct: 1.00,
    serviceFeePct: 0.30,
    netCommissionPct: 0.70,
    isCustomerFacing: true,
    metadata: { source: 'agreement_3_5_vas_product' },
  },
  {
    providerCode: '140',
    providerName: 'Electricity Token',
    providerType: 'electricity',
    serviceFamily: 'electricity',
    commercialType: 'commission',
    grossCommissionPct: 1.00,
    serviceFeePct: 0.30,
    netCommissionPct: 0.70,
    isCustomerFacing: true,
    metadata: { source: 'agreement_3_5_vas_product', requiresMeterNumberConfirmation: true },
  },
  {
    providerCode: '141',
    providerName: 'AMAZON Gift Card',
    providerType: 'gift_card',
    serviceFamily: 'voucher',
    commercialType: 'commission',
    grossCommissionPct: 1.00,
    serviceFeePct: 0.30,
    netCommissionPct: 0.70,
    isCustomerFacing: true,
    metadata: { source: 'agreement_3_5_vas_product' },
  },
  {
    providerCode: '146',
    providerName: 'TAKEALOT VARIABLE',
    providerType: 'gift_card',
    serviceFamily: 'voucher',
    commercialType: 'commission',
    grossCommissionPct: 1.00,
    serviceFeePct: 0.30,
    netCommissionPct: 0.70,
    isCustomerFacing: true,
    metadata: { source: 'agreement_3_5_vas_product' },
  },
  {
    providerCode: '156',
    providerName: 'OTT Mobile Gift Cards | Nandos',
    providerType: 'gift_card',
    serviceFamily: 'voucher',
    commercialType: 'commission',
    grossCommissionPct: 1.00,
    serviceFeePct: 0.30,
    netCommissionPct: 0.70,
    isCustomerFacing: true,
    metadata: { source: 'agreement_3_5_vas_product' },
  },
  {
    providerCode: '157',
    providerName: 'OTT Mobile Gift Cards | Dis-Chem',
    providerType: 'gift_card',
    serviceFamily: 'voucher',
    commercialType: 'commission',
    grossCommissionPct: 1.00,
    serviceFeePct: 0.30,
    netCommissionPct: 0.70,
    isCustomerFacing: true,
    metadata: { source: 'agreement_3_5_vas_product' },
  },
  {
    providerCode: '71',
    providerName: 'Mock - Digital (Non Void)',
    providerType: 'mock',
    serviceFamily: 'mock',
    commercialType: 'none',
    isCustomerFacing: false,
    isMock: true,
    metadata: { source: 'ott_test_provider' },
  },
  {
    providerCode: '73',
    providerName: 'Mock - Digital (Out Of Stock)',
    providerType: 'mock',
    serviceFamily: 'mock',
    commercialType: 'none',
    isCustomerFacing: false,
    isMock: true,
    metadata: { source: 'ott_test_provider' },
  },
  {
    providerCode: '76',
    providerName: 'Mock - Digital (Success)',
    providerType: 'mock',
    serviceFamily: 'mock',
    commercialType: 'none',
    isCustomerFacing: false,
    isMock: true,
    metadata: { source: 'ott_test_provider' },
  },
  {
    providerCode: '78',
    providerName: 'Mock - Digital (Timeout)',
    providerType: 'mock',
    serviceFamily: 'mock',
    commercialType: 'none',
    isCustomerFacing: false,
    isMock: true,
    metadata: { source: 'ott_test_provider' },
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      INSERT INTO suppliers (name, code, "isActive", "createdAt", "updatedAt")
      VALUES ('OTT Mobile', 'OTT', true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        "isActive" = true,
        "updatedAt" = NOW();
    `);

    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => (typeof table === 'string' ? table : table.tableName));
    if (!tableNames.includes('supplier_commercial_terms')) {
      await queryInterface.createTable('supplier_commercial_terms', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'suppliers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        supplier_code: { type: Sequelize.STRING(50), allowNull: false },
        provider_code: { type: Sequelize.STRING(64), allowNull: false },
        provider_name: { type: Sequelize.STRING(255), allowNull: false },
        provider_type: { type: Sequelize.STRING(50), allowNull: false },
        service_family: { type: Sequelize.STRING(50), allowNull: false },
        commercial_type: { type: Sequelize.STRING(50), allowNull: false },
        fixed_fee_ex_vat: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        fixed_fee_vat_rate: { type: Sequelize.DECIMAL(6, 4), allowNull: false, defaultValue: 0.15 },
        fixed_fee_is_vat_exclusive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        mmtp_fee_ex_vat: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        reversal_fee_ex_vat: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        gross_commission_pct: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
        service_fee_pct: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
        net_commission_pct: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
        monthly_switching_fee_pct: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
        is_customer_facing: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_mock: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        effective_from: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
        effective_to: { type: Sequelize.DATEONLY, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_commercial_terms_active
      ON supplier_commercial_terms (supplier_code, provider_code, service_family, commercial_type, effective_from)
      WHERE is_active = true;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_commercial_terms_lookup
      ON supplier_commercial_terms (supplier_code, provider_code, is_active, effective_from, effective_to);
    `);

    for (const term of OTT_TERMS) {
      await queryInterface.sequelize.query(`
        INSERT INTO supplier_commercial_terms (
          supplier_id, supplier_code, provider_code, provider_name, provider_type, service_family,
          commercial_type, fixed_fee_ex_vat, fixed_fee_vat_rate, fixed_fee_is_vat_exclusive,
          mmtp_fee_ex_vat, reversal_fee_ex_vat, gross_commission_pct, service_fee_pct,
          net_commission_pct, monthly_switching_fee_pct, is_customer_facing, is_mock,
          is_active, effective_from, metadata, "createdAt", "updatedAt"
        )
        SELECT
          s.id, 'OTT', :providerCode, :providerName, :providerType, :serviceFamily,
          :commercialType, :fixedFeeExVat, 0.15, true,
          :mmtpFeeExVat, :reversalFeeExVat, :grossCommissionPct, :serviceFeePct,
          :netCommissionPct, :monthlySwitchingFeePct, :isCustomerFacing, :isMock,
          true, CURRENT_DATE, CAST(:metadata AS JSONB), NOW(), NOW()
        FROM suppliers s
        WHERE s.code = 'OTT'
        ON CONFLICT (supplier_code, provider_code, service_family, commercial_type, effective_from)
        WHERE is_active = true
        DO UPDATE SET
          provider_name = EXCLUDED.provider_name,
          provider_type = EXCLUDED.provider_type,
          fixed_fee_ex_vat = EXCLUDED.fixed_fee_ex_vat,
          mmtp_fee_ex_vat = EXCLUDED.mmtp_fee_ex_vat,
          reversal_fee_ex_vat = EXCLUDED.reversal_fee_ex_vat,
          gross_commission_pct = EXCLUDED.gross_commission_pct,
          service_fee_pct = EXCLUDED.service_fee_pct,
          net_commission_pct = EXCLUDED.net_commission_pct,
          monthly_switching_fee_pct = EXCLUDED.monthly_switching_fee_pct,
          is_customer_facing = EXCLUDED.is_customer_facing,
          is_mock = EXCLUDED.is_mock,
          metadata = EXCLUDED.metadata,
          "updatedAt" = NOW();
      `, {
        replacements: {
          ...term,
          fixedFeeExVat: term.fixedFeeExVat ?? null,
          mmtpFeeExVat: term.mmtpFeeExVat ?? null,
          reversalFeeExVat: term.reversalFeeExVat ?? null,
          grossCommissionPct: term.grossCommissionPct ?? null,
          serviceFeePct: term.serviceFeePct ?? null,
          netCommissionPct: term.netCommissionPct ?? null,
          monthlySwitchingFeePct: term.monthlySwitchingFeePct ?? 0.30,
          isMock: term.isMock || false,
          metadata: JSON.stringify(term.metadata || {}),
        },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM supplier_commercial_terms
      WHERE supplier_code = 'OTT';
    `);
    await queryInterface.sequelize.query(`
      DELETE FROM suppliers s
      WHERE s.code = 'OTT'
        AND NOT EXISTS (SELECT 1 FROM products p WHERE p."supplierId" = s.id)
        AND NOT EXISTS (SELECT 1 FROM supplier_transactions st WHERE st."supplierId" = s.id)
        AND NOT EXISTS (SELECT 1 FROM supplier_floats sf WHERE sf."supplierId"::text = s.id::text);
    `);
    await queryInterface.dropTable('supplier_commercial_terms');
  },
};
