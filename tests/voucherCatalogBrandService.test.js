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
    ['Shoprite Voucher', 'Shoprite / Checkers', 'shoprite-checkers'],
    ['Checkers Gift Card', 'Shoprite / Checkers', 'shoprite-checkers'],
    ['OTT Mobile Gift Cards | Nandos', 'Nando\'s', 'nandos'],
    ['KFC Gift Card', 'KFC', 'kfc'],
    ['OTT Mobile Gift Cards | Hungry Lion', 'Hungry Lion', 'hungry-lion'],
    ['OTT Mobile Gift Cards | Fishaways', 'Fishaways', 'fishaways'],
    ['Steers Voucher', 'Steers', 'steers'],
    ['Wimpy Gift Card', 'Wimpy', 'wimpy'],
    ['OTT Mobile Gift Cards | Debonairs Pizza', 'Debonairs Pizza', 'debonairs-pizza'],
    ['Spur Gift Card', 'Spur', 'spur'],
    ['McDonalds Gift Card', 'McDonald\'s', 'mcdonalds'],
    ['Burger King Gift Card', 'Burger King', 'burger-king'],
    ['OTT Mobile Gift Cards | Rocomamas', 'RocoMamas', 'rocomamas'],
    ['OTT Mobile Gift Cards | Starbucks', 'Starbucks', 'starbucks'],
    ['OTT Mobile Gift Cards | Panarottis', 'Panarottis', 'panarottis'],
    ['OTT Mobile Gift Cards | Mugg & Bean', 'Mugg & Bean', 'mugg-and-bean'],
    ['OTT Mobile Gift Cards | John Dorys', 'John Dory\'s', 'john-dorys'],
    ['Dis-Chem Gift Card', 'Dis-Chem', 'dis-chem'],
    ['OTT Mobile Gift Cards | Boxer', 'Boxer', 'boxer'],
    ['OTT Mobile Gift Cards | Ackermans', 'Ackermans', 'ackermans'],
    ['TICKETMASTER VARIABLE R50 - R5000', 'Ticketmaster', 'ticketmaster'],
    ['NetcarePlus Virtual GP Voucher 1 Consultation', 'NetcarePlus', 'netcareplus'],
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

  test.each([
    'OTT Mobile Gift Cards | Nandos',
    'KFC Gift Card',
    'OTT Mobile Gift Cards | Rocomamas',
    'Dis-Chem Gift Card',
    'TICKETMASTER VARIABLE R50 - R5000',
    'NetcarePlus Virtual GP Voucher 1 Consultation',
  ])('marks %s as a gift card for wallet filtering', (rawName) => {
    const recognised = recogniseVoucherBrand(rawName);

    expect(recognised.isGiftCard).toBe(true);
  });
});
