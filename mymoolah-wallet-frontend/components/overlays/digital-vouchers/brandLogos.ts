import tenBetLogo from '../../../assets/10bet_logo.png';
import oneVoucherLogo from '../../../assets/1voucher_logo.png';
import allStarsBetLogo from '../../../assets/allstarsbet_logo.png';
import betfredLogo from '../../../assets/betfred_logo.png';
import betJetsLogo from '../../../assets/betjets_logo.png';
import betSheziLogo from '../../../assets/betshezi_logo.png';
import bettaBetsLogo from '../../../assets/bettabets_logo.png';
import betwayLogo from '../../../assets/betway_logo.png';
import betXchangeLogo from '../../../assets/betxchange_logo.png';
import bluLogo from '../../../assets/blu_logo.png';
import boxerLogo from '../../../assets/boxer_logo.png';
import boyleSportsLogo from '../../../assets/boylesports_logo.png';
import discoveryLogo from '../../../assets/discovery_logo.png';
import econoFoodsLogo from '../../../assets/econofoods_logo.png';
import fafabetLogo from '../../../assets/fafabet_logo.png';
import firstBetLogo from '../../../assets/firstbet_logo.png';
import flashLogo from '../../../assets/flash_logo.png';
import flybetLogo from '../../../assets/flybet_logo.png';
import fnbLogo from '../../../assets/fnb_logo.png';
import gbetsLogo from '../../../assets/Gbets_logo.png';
import goldRushLogo from '../../../assets/goldrush_logo.png';
import gvbetLogo from '../../../assets/gvbet_logo.png';
import healthNowClinicLogo from '../../../assets/healthnowclinic_logo.png';
import hollywoodLogo from '../../../assets/hollywoodbets_logo.png';
import interbetLogo from '../../../assets/interbet_logo.png';
import jackpotCityLogo from '../../../assets/jackpotcity_logo.png';
import jabulabetsLogo from '../../../assets/jabulabets_logo.png';
import kenaHealthLogo from '../../../assets/kenahealth_logo.png';
import kingBetsLogo from '../../../assets/kingbets_logo.png';
import lottoStarLogo from '../../../assets/lottostar_logo.png';
import lulaBetLogo from '../../../assets/lulabet_logo.png';
import marshallsLogo from '../../../assets/marshalls_logo.png';
import mrdLogo from '../../../assets/mrd_logo.png';
import mzansiBetLogo from '../../../assets/mzansibet_logo.png';
import ottLogo from '../../../assets/ott_logo.png';
import palaceBetLogo from '../../../assets/palacebet_logo.png';
import pantherBetLogo from '../../../assets/pantherbet_logo.png';
import pickNPayLogo from '../../../assets/pnp_logo.png';
import playabetsLogo from '../../../assets/playabets_logo.png';
import playbetLogo from '../../../assets/playbet_logo.png';
import playTsogoLogo from '../../../assets/playtsogo_logo.png';
import pureBetLogo from '../../../assets/purebet_logo.png';
import sbSkyBettingLogo from '../../../assets/sbskybettingt_logo.png';
import scoreBetLogo from '../../../assets/scorebet_logo.png';
import shayaBetsLogo from '../../../assets/shayabets_logo.png';
import shop2ShopLogo from '../../../assets/shop2shop_logo.png';
import shopriteLogo from '../../../assets/shoprite_logo.png';
import soccerShopLogo from '../../../assets/soccershop_logo.png';
import spinAbetLogo from '../../../assets/spinabet_logo.png';
import sportyBetLogo from '../../../assets/sportybet_logo.png';
import sunbetLogo from '../../../assets/sunbet_logo.png';
import supabetsLogo from '../../../assets/supabets_logo.png';
import supersportBetLogo from '../../../assets/supersportbet_logo.png';
import ticketproLogo from '../../../assets/ticketpro_logo.png';
import tictacLogo from '../../../assets/tictac_logo.png';
import topBetLogo from '../../../assets/topbet_logo.png';
import vegasBetsLogo from '../../../assets/vegasbets_logo.png';
import vodacomLogo from '../../../assets/vodacom_logo.png';
import worldSportsBettingLogo from '../../../assets/worldsportsbetting_logo.png';
import yesplayLogo from '../../../assets/yesplay_logo.png';

type LogoEntry = {
  logo: string;
  aliases: string[];
};

const LOGO_ENTRIES: LogoEntry[] = [
  { logo: tenBetLogo, aliases: ['10bet', '10 bet'] },
  { logo: oneVoucherLogo, aliases: ['1voucher', '1 voucher'] },
  { logo: allStarsBetLogo, aliases: ['allstarsbet', 'all stars bet', 'allstars bet'] },
  { logo: betfredLogo, aliases: ['betfred'] },
  { logo: betJetsLogo, aliases: ['betjets', 'bet jets'] },
  { logo: betSheziLogo, aliases: ['betshezi', 'bet shezi'] },
  { logo: bettaBetsLogo, aliases: ['bettabets', 'betta bets', 'betta'] },
  { logo: betwayLogo, aliases: ['betway'] },
  { logo: betXchangeLogo, aliases: ['betxchange', 'bet xchange', 'bet exchange'] },
  { logo: bluLogo, aliases: ['blu', 'blue voucher', 'blu voucher'] },
  { logo: boxerLogo, aliases: ['boxer'] },
  { logo: boyleSportsLogo, aliases: ['boylesports', 'boyle sports', 'boyles sports'] },
  { logo: discoveryLogo, aliases: ['discovery'] },
  { logo: econoFoodsLogo, aliases: ['econofoods', 'econo foods'] },
  { logo: fafabetLogo, aliases: ['fafabet', 'fafa bet'] },
  { logo: firstBetLogo, aliases: ['firstbet', 'first bet'] },
  { logo: flashLogo, aliases: ['flash', 'flash token'] },
  { logo: flybetLogo, aliases: ['flybet', 'fly bet'] },
  { logo: fnbLogo, aliases: ['fnb', 'first national bank', 'fnb voucher'] },
  { logo: gbetsLogo, aliases: ['gbets', 'g bets', 'gbet'] },
  { logo: goldRushLogo, aliases: ['goldrush', 'gold rush'] },
  { logo: gvbetLogo, aliases: ['gvbet', 'gv bet'] },
  { logo: healthNowClinicLogo, aliases: ['healthnowclinic', 'health now clinic'] },
  { logo: hollywoodLogo, aliases: ['hollywoodbets', 'hollywood bets'] },
  { logo: interbetLogo, aliases: ['interbet', 'inter bet'] },
  { logo: jackpotCityLogo, aliases: ['jackpotcity', 'jackpot city'] },
  { logo: jabulabetsLogo, aliases: ['jabulabets', 'jabula bets'] },
  { logo: kenaHealthLogo, aliases: ['kenahealth', 'kena health'] },
  { logo: kingBetsLogo, aliases: ['kingbets', 'king bets'] },
  { logo: lottoStarLogo, aliases: ['lottostar', 'lotto star'] },
  { logo: lulaBetLogo, aliases: ['lulabet', 'lula bet'] },
  { logo: marshallsLogo, aliases: ['marshalls', 'marshall'] },
  { logo: mrdLogo, aliases: ['mrd', 'mr d', 'mrd food', 'mr d food'] },
  { logo: mzansiBetLogo, aliases: ['mzansibet', 'mzansi bet'] },
  { logo: ottLogo, aliases: ['ott', 'ott voucher', 'ott variable voucher'] },
  { logo: palaceBetLogo, aliases: ['palacebet', 'palace bet'] },
  { logo: pantherBetLogo, aliases: ['pantherbet', 'panther bet'] },
  { logo: pickNPayLogo, aliases: ['pnp', 'pick n pay', 'pick and pay', 'picknpay'] },
  { logo: playabetsLogo, aliases: ['playabets', 'playa bets'] },
  { logo: playbetLogo, aliases: ['playbet', 'play bet'] },
  { logo: playTsogoLogo, aliases: ['playtsogo', 'play tsogo', 'tsogo'] },
  { logo: pureBetLogo, aliases: ['purebet', 'pure bet'] },
  { logo: sbSkyBettingLogo, aliases: ['sbskybetting', 'sb sky betting', 'sky betting'] },
  { logo: scoreBetLogo, aliases: ['scorebet', 'score bet'] },
  { logo: shayaBetsLogo, aliases: ['shayabets', 'shaya bets'] },
  { logo: shop2ShopLogo, aliases: ['shop2shop', 'shop 2 shop', 'shop to shop'] },
  { logo: shopriteLogo, aliases: ['shoprite', 'checkers', 'shoprite checkers', 'shoprite / checkers'] },
  { logo: soccerShopLogo, aliases: ['soccershop', 'soccer shop'] },
  { logo: spinAbetLogo, aliases: ['spinabet', 'spin a bet'] },
  { logo: sportyBetLogo, aliases: ['sportybet', 'sporty bet'] },
  { logo: sunbetLogo, aliases: ['sunbet', 'sun bet'] },
  { logo: supabetsLogo, aliases: ['supabets', 'supa bets', 'supa'] },
  { logo: supersportBetLogo, aliases: ['supersportbet', 'super sport bet', 'supersport bet'] },
  { logo: ticketproLogo, aliases: ['ticketpro', 'ticket pro'] },
  { logo: tictacLogo, aliases: ['tictac', 'tic tac'] },
  { logo: topBetLogo, aliases: ['topbet', 'top bet'] },
  { logo: vegasBetsLogo, aliases: ['vegasbets', 'vegas bets'] },
  { logo: vodacomLogo, aliases: ['vodacom'] },
  { logo: worldSportsBettingLogo, aliases: ['worldsportsbetting', 'world sports betting', 'wsb'] },
  { logo: yesplayLogo, aliases: ['yesplay', 'yes play'] },
];

function normalizeBrandKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

const BRAND_LOGO_MAP = LOGO_ENTRIES.reduce<Record<string, string>>((acc, entry) => {
  for (const alias of entry.aliases) {
    acc[normalizeBrandKey(alias)] = entry.logo;
  }
  return acc;
}, {});

const MATCH_KEYS = Object.keys(BRAND_LOGO_MAP).sort((a, b) => b.length - a.length);

export function getBrandLogo(...brandNames: Array<string | undefined | null>): string | null {
  for (const brandName of brandNames) {
    const key = normalizeBrandKey(String(brandName || '').trim());
    if (!key) continue;
    if (BRAND_LOGO_MAP[key]) return BRAND_LOGO_MAP[key];

    const matchedKey = MATCH_KEYS.find(candidate => key.includes(candidate) || candidate.includes(key));
    if (matchedKey) return BRAND_LOGO_MAP[matchedKey];
  }

  return null;
}
