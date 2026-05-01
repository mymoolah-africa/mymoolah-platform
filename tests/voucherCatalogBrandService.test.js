const {
  buildCatalogKey,
  recogniseVoucherBrand,
} = require('../services/voucherCatalogBrandService');

describe('voucherCatalogBrandService', () => {
  test.each([
    ['PicknPay Voucher', 'Pick n Pay', 'pick-n-pay'],
    ['Pick n Pay Voucher', 'Pick n Pay', 'pick-n-pay'],
    ['Pick and Pay Gift Card', 'Pick n Pay', 'pick-n-pay'],
    ['PnP Voucher', 'Pick n Pay', 'pick-n-pay'],
    ['HollywoodBets Top Up', 'Hollywood Bets', 'hollywood-bets'],
    ['Hollywood Bets Voucher', 'Hollywood Bets', 'hollywood-bets'],
    ['Blu Voucher R100', 'Blu Voucher', 'blu-voucher'],
    ['First National Bank Voucher', 'FNB', 'fnb'],
    ['Apple $10 Credit', 'Apple Credit', 'apple-credit'],
    ['Apple Music 1 Month', 'Apple Music', 'apple-music'],
    ['Shoprite Voucher', 'Shoprite', 'shoprite'],
    ['Checkers Gift Card', 'Shoprite', 'shoprite'],
  ])('maps %s to canonical brand and stable key', (rawName, brand, catalogKey) => {
    const recognised = recogniseVoucherBrand(rawName);

    expect(recognised.recognition).toBe('mapped');
    expect(recognised.brand).toBe(brand);
    expect(recognised.catalogKey).toBe(catalogKey);
  });

  test('fallback recognition still creates a deterministic catalog key but remains hidden by wallet allowlist', () => {
    const recognised = recogniseVoucherBrand('Unknown Supplier Voucher R50');

    expect(recognised.recognition).toBe('fallback');
    expect(recognised.catalogKey).toBe(buildCatalogKey(recognised.brand));
  });
});
