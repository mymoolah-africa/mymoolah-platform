'use strict';

/**
 * Canonical retail voucher recognition.
 *
 * The wallet must not depend on supplier/product/variant IDs for display identity,
 * because supplier catalog refreshes can change those details while the customer-facing
 * brand remains the same. `catalogKey` is the stable wallet identity.
 */

const VOUCHER_BRAND_TABLE = [
  { match: /netflix/i, brand: 'Netflix', catalogKey: 'netflix', icon: '🎭', category: 'entertainment', desc: 'Netflix streaming — top up your Netflix account' },
  { match: /dstv/i, brand: 'DStv', catalogKey: 'dstv', icon: '📺', category: 'entertainment', desc: 'DStv subscription payment' },
  { match: /showmax/i, brand: 'Showmax', catalogKey: 'showmax', icon: '🎬', category: 'entertainment', desc: 'Showmax streaming voucher' },
  { match: /spotify/i, brand: 'Spotify', catalogKey: 'spotify', icon: '🎵', category: 'entertainment', desc: 'Spotify music voucher' },
  { match: /apple\s*music/i, brand: 'Apple Music', catalogKey: 'apple-music', icon: '🎵', category: 'entertainment', desc: 'Apple Music retail voucher' },
  { match: /itunes/i, brand: 'iTunes', catalogKey: 'itunes', icon: '🍎', category: 'entertainment', desc: 'iTunes / Apple retail voucher' },
  { match: /^ott\s+(?:voucher\b|variable\s+voucher\b|r\s*\d+\b)|\bott\s+voucher\b/i, brand: 'OTT Voucher', catalogKey: 'ott-voucher', icon: '🎬', category: 'entertainment', desc: 'OTT voucher' },
  { match: /talk\s*360/i, brand: 'Talk360', catalogKey: 'talk360', icon: '📞', category: 'entertainment', desc: 'Talk360 international calling credit' },

  { match: /free\s*fire|diamond/i, brand: 'Free Fire', catalogKey: 'free-fire', icon: '💎', category: 'gaming', desc: 'Free Fire Diamonds — in-game currency' },
  { match: /pubg|battleground|\buc\b/i, brand: 'PUBG Mobile', catalogKey: 'pubg-mobile', icon: '🎮', category: 'gaming', desc: 'PUBG Mobile UC — in-game currency' },
  { match: /roblox/i, brand: 'Roblox', catalogKey: 'roblox', icon: '🟥', category: 'gaming', desc: 'Roblox retail voucher — buy Robux' },
  { match: /steam/i, brand: 'Steam', catalogKey: 'steam', icon: '🎮', category: 'gaming', desc: 'Steam Wallet voucher' },
  { match: /playstation|psn/i, brand: 'PlayStation', catalogKey: 'playstation', icon: '🎮', category: 'gaming', desc: 'PlayStation Store voucher' },
  { match: /xbox/i, brand: 'Xbox', catalogKey: 'xbox', icon: '🎮', category: 'gaming', desc: 'Xbox retail voucher' },
  { match: /nintendo/i, brand: 'Nintendo', catalogKey: 'nintendo', icon: '🎮', category: 'gaming', desc: 'Nintendo eShop voucher' },
  { match: /razer\s*gold/i, brand: 'Razer Gold', catalogKey: 'razer-gold', icon: '🎮', category: 'gaming', desc: 'Razer Gold gaming credits' },
  { match: /fifa|ea\s*sport/i, brand: 'EA Sports FC', catalogKey: 'ea-sports-fc', icon: '⚽', category: 'gaming', desc: 'EA Sports FC retail voucher' },
  { match: /google\s*play/i, brand: 'Google Play', catalogKey: 'google-play', icon: '📱', category: 'gaming', desc: 'Google Play voucher' },

  { match: /\$\d+\s*credit|apple.*credit|\bapple\b/i, brand: 'Apple Credit', catalogKey: 'apple-credit', icon: '🍎', category: 'entertainment', desc: 'Apple App Store / iTunes credit' },

  { match: /hollywoodbets|hollywood\s*bets/i, brand: 'Hollywood Bets', catalogKey: 'hollywood-bets', icon: '🎰', category: 'betting', desc: 'Hollywood Bets voucher' },
  { match: /betway/i, brand: 'Betway', catalogKey: 'betway', icon: '🎯', category: 'betting', desc: 'Betway betting voucher' },
  { match: /supabets/i, brand: 'Supabets', catalogKey: 'supabets', icon: '🎲', category: 'betting', desc: 'Supabets betting voucher' },
  { match: /yesplay/i, brand: 'YesPlay', catalogKey: 'yesplay', icon: '🎲', category: 'betting', desc: 'YesPlay betting voucher' },
  { match: /easybet/i, brand: 'EasyBet', catalogKey: 'easybet', icon: '🎲', category: 'betting', desc: 'EasyBet betting voucher' },
  { match: /\bgbets?\b/i, brand: 'GBets', catalogKey: 'gbets', icon: '🎲', category: 'betting', desc: 'GBets betting voucher' },
  { match: /gold\s*rush|goldrush/i, brand: 'Gold Rush', catalogKey: 'gold-rush', icon: '🎲', category: 'betting', desc: 'Gold Rush betting voucher' },
  { match: /lottostar/i, brand: 'LottoStar', catalogKey: 'lottostar', icon: '🎲', category: 'betting', desc: 'LottoStar betting voucher' },
  { match: /lottoland/i, brand: 'Lottoland', catalogKey: 'lottoland', icon: '🎲', category: 'betting', desc: 'Lottoland betting voucher' },
  { match: /flybet/i, brand: 'Flybet', catalogKey: 'flybet', icon: '🎲', category: 'betting', desc: 'Flybet betting voucher' },

  { match: /intercape/i, brand: 'Intercape', catalogKey: 'intercape', icon: '🚌', category: 'transport', desc: 'Intercape bus ticket voucher' },
  { match: /uber/i, brand: 'Uber', catalogKey: 'uber', icon: '🚗', category: 'transport', desc: 'Uber retail voucher' },
  { match: /bolt/i, brand: 'Bolt', catalogKey: 'bolt', icon: '⚡', category: 'transport', desc: 'Bolt retail voucher' },

  { match: /nando'?s/i, brand: 'Nando\'s', catalogKey: 'nandos', icon: '🍗', category: 'food', desc: 'Nando\'s gift card', isGiftCard: true },
  { match: /\bkfc\b|kentucky/i, brand: 'KFC', catalogKey: 'kfc', icon: '🍗', category: 'food', desc: 'KFC gift card', isGiftCard: true },
  { match: /hungry\s*lion/i, brand: 'Hungry Lion', catalogKey: 'hungry-lion', icon: '🍗', category: 'food', desc: 'Hungry Lion gift card', isGiftCard: true },
  { match: /fishaways/i, brand: 'Fishaways', catalogKey: 'fishaways', icon: '🐟', category: 'food', desc: 'Fishaways gift card', isGiftCard: true },
  { match: /steers/i, brand: 'Steers', catalogKey: 'steers', icon: '🍔', category: 'food', desc: 'Steers gift card', isGiftCard: true },
  { match: /wimpy/i, brand: 'Wimpy', catalogKey: 'wimpy', icon: '🍔', category: 'food', desc: 'Wimpy gift card', isGiftCard: true },
  { match: /debonairs/i, brand: 'Debonairs Pizza', catalogKey: 'debonairs-pizza', icon: '🍕', category: 'food', desc: 'Debonairs Pizza gift card', isGiftCard: true },
  { match: /spur/i, brand: 'Spur', catalogKey: 'spur', icon: '🥩', category: 'food', desc: 'Spur gift card', isGiftCard: true },
  { match: /mcdonald'?s/i, brand: 'McDonald\'s', catalogKey: 'mcdonalds', icon: '🍔', category: 'food', desc: 'McDonald\'s gift card', isGiftCard: true },
  { match: /burger\s*king/i, brand: 'Burger King', catalogKey: 'burger-king', icon: '🍔', category: 'food', desc: 'Burger King gift card', isGiftCard: true },
  { match: /rocc?omamas/i, brand: 'RocoMamas', catalogKey: 'rocomamas', icon: '🍔', category: 'food', desc: 'RocoMamas gift card', isGiftCard: true },
  { match: /starbucks/i, brand: 'Starbucks', catalogKey: 'starbucks', icon: '☕', category: 'food', desc: 'Starbucks gift card', isGiftCard: true },
  { match: /panarottis/i, brand: 'Panarottis', catalogKey: 'panarottis', icon: '🍕', category: 'food', desc: 'Panarottis gift card', isGiftCard: true },
  { match: /mugg\s*&?\s*bean|mugg\s+and\s+bean/i, brand: 'Mugg & Bean', catalogKey: 'mugg-and-bean', icon: '☕', category: 'food', desc: 'Mugg & Bean gift card', isGiftCard: true },
  { match: /john\s*dory'?s/i, brand: 'John Dory\'s', catalogKey: 'john-dorys', icon: '🐟', category: 'food', desc: 'John Dory\'s gift card', isGiftCard: true },

  { match: /amazon/i, brand: 'Amazon', catalogKey: 'amazon', icon: '🛍️', category: 'shopping', desc: 'Amazon retail voucher' },
  { match: /takealot/i, brand: 'Takealot', catalogKey: 'takealot', icon: '🛍️', category: 'shopping', desc: 'Takealot retail voucher' },
  { match: /net\s*florist|netflorist/i, brand: 'NetFlorist', catalogKey: 'netflorist', icon: '🛍️', category: 'shopping', desc: 'NetFlorist voucher' },
  { match: /dis[\s-]?chem/i, brand: 'Dis-Chem', catalogKey: 'dis-chem', icon: '💊', category: 'shopping', desc: 'Dis-Chem gift card', isGiftCard: true },
  { match: /boxer/i, brand: 'Boxer', catalogKey: 'boxer', icon: '🛒', category: 'shopping', desc: 'Boxer gift card', isGiftCard: true },
  { match: /ackermans/i, brand: 'Ackermans', catalogKey: 'ackermans', icon: '👕', category: 'shopping', desc: 'Ackermans gift card', isGiftCard: true },
  { match: /\bfnb\b|first\s*national\s*bank/i, brand: 'FNB', catalogKey: 'fnb', icon: '🏦', category: 'shopping', desc: 'FNB retail voucher' },
  { match: /1voucher/i, brand: '1Voucher', catalogKey: '1voucher', icon: '🛒', category: 'shopping', desc: '1Voucher — accepted at thousands of online stores' },
  { match: /blu\s*voucher/i, brand: 'Blu Voucher', catalogKey: 'blu-voucher', icon: '💳', category: 'shopping', desc: 'Blu Voucher' },
  { match: /ringas/i, brand: 'Ringas', catalogKey: 'ringas', icon: '💳', category: 'shopping', desc: 'Ringas voucher' },
  { match: /makro/i, brand: 'Makro', catalogKey: 'makro', icon: '🏪', category: 'shopping', desc: 'Makro retail voucher' },
  { match: /pick\s*(?:n|and)?\s*pay|picknpay|\bpnp\b/i, brand: 'Pick n Pay', catalogKey: 'pick-n-pay', icon: '🏪', category: 'shopping', desc: 'Pick n Pay retail voucher' },
  { match: /shoprite|checkers/i, brand: 'Shoprite / Checkers', catalogKey: 'shoprite-checkers', icon: '🛒', category: 'shopping', desc: 'Shoprite and Checkers retail voucher' },
  { match: /bok\s*squad/i, brand: 'Bok Squad', catalogKey: 'bok-squad', icon: '🏉', category: 'shopping', desc: 'Bok Squad retail voucher' },
  { match: /pro\s*shop/i, brand: 'Pro Shop', catalogKey: 'pro-shop', icon: '🏉', category: 'shopping', desc: 'Pro Shop retail voucher' },
  { match: /cycle\s*lab/i, brand: 'Cycle Lab', catalogKey: 'cycle-lab', icon: '🚲', category: 'shopping', desc: 'Cycle Lab retail voucher' },
  { match: /tenacity/i, brand: 'Tenacity', catalogKey: 'tenacity', icon: '🏪', category: 'shopping', desc: 'Tenacity retail voucher' },

  { match: /sorbet/i, brand: 'Sorbet', catalogKey: 'sorbet', icon: '💆', category: 'lifestyle', desc: 'Sorbet beauty voucher' },
  { match: /ticketmaster/i, brand: 'Ticketmaster', catalogKey: 'ticketmaster', icon: '🎫', category: 'lifestyle', desc: 'Ticketmaster event tickets', isGiftCard: true },
  { match: /netcare\s*plus|netcareplus/i, brand: 'NetcarePlus', catalogKey: 'netcareplus', icon: '🩺', category: 'health', desc: 'NetcarePlus virtual consultation voucher', isGiftCard: true },

  { match: /mmvoucher|mm\s*voucher|mymoolah/i, brand: 'MyMoolah Voucher', catalogKey: 'mymoolah-voucher', icon: '💰', category: 'other', desc: 'MyMoolah digital voucher' },
  { match: /flash\s*token/i, brand: 'Flash Token', catalogKey: 'flash-token', icon: '💰', category: 'other', desc: 'Flash Token cash voucher' },
];

function toTitleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function buildCatalogKey(value) {
  return String(value || 'retail-voucher')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'retail-voucher';
}

function sanitizeRetailVoucherName(rawName) {
  const cleaned = String(rawName || '')
    .replace(/ott\s+mobile\s+gift\s+cards?\s*\|?/ig, '')
    .replace(/mobile\s+gift\s+cards?\s*\|?/ig, '')
    .replace(/\bgift\s*card(s)?\b/ig, ' ')
    .replace(/\bvoucher(s)?\b/ig, ' ')
    .replace(/\bvariable\b/ig, ' ')
    .replace(/\bnon\s+void\b/ig, ' ')
    .replace(/\bout\s+of\s+stock\b/ig, ' ')
    .replace(/\bsuccess\b/ig, ' ')
    .replace(/\btimeout\b/ig, ' ')
    .replace(/\bR\s*\d+(\.\d{1,2})?\b/ig, ' ')
    .replace(/\$\s*\d+(\.\d{1,2})?\b/ig, ' ')
    .replace(/[|_/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned ? toTitleCase(cleaned) : 'Retail Voucher';
}

function inferRetailVoucherCategory(rawName) {
  const normalized = String(rawName || '').toLowerCase();
  if (/bet|lotto|hollywood|supabets|yesplay|flybet/.test(normalized)) return 'betting';
  if (/game|gaming|steam|xbox|playstation|nintendo|roblox|pubg|free\s*fire|diamond|uc\b/.test(normalized)) return 'gaming';
  if (/netflix|showmax|spotify|dstv|itunes|apple\s*music|talk\s*360/.test(normalized)) return 'entertainment';
  if (/uber|bolt|intercape|transport|bus/.test(normalized)) return 'transport';
  if (/nando|kfc|hungry\s*lion|fishaways|steers|wimpy|debonairs|spur|mcdonald|burger\s*king|rocomamas|starbucks|panarottis|mugg|john\s*dory|restaurant|food/.test(normalized)) return 'food';
  if (/netcare|consultation|doctor|medical|health/.test(normalized)) return 'health';
  if (/sorbet|ticketmaster|beauty|event/.test(normalized)) return 'lifestyle';
  return 'shopping';
}

function recogniseVoucherBrand(rawName) {
  if (!rawName) {
    return {
      brand: 'Retail Voucher',
      catalogKey: 'retail-voucher',
      icon: '🛒',
      category: 'shopping',
      desc: 'Retail voucher',
      recognition: 'fallback',
    };
  }

  for (const entry of VOUCHER_BRAND_TABLE) {
    if (entry.match.test(rawName)) {
      return { ...entry, recognition: 'mapped' };
    }
  }

  const brand = sanitizeRetailVoucherName(rawName);
  return {
    brand,
    catalogKey: buildCatalogKey(brand),
    icon: '🛒',
    category: inferRetailVoucherCategory(rawName),
    desc: `${brand} retail voucher`,
    recognition: 'fallback',
  };
}

module.exports = {
  VOUCHER_BRAND_TABLE,
  buildCatalogKey,
  recogniseVoucherBrand,
};
