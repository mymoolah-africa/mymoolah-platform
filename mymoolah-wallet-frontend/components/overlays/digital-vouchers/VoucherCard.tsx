import React from 'react';
import { Star } from 'lucide-react';

import oneVoucherLogo from '../../../assets/1voucher-logo.png';
import betwayLogo from '../../../assets/betway-logo.png';
import bluLogo from '../../../assets/blu_logo.png';
import fnbLogo from '../../../assets/fnb_logo.png';
import hollywoodLogo from '../../../assets/hollywood-logo.png';
import ottLogo from '../../../assets/ott-logo.png';
import pnpLogo from '../../../assets/pnp_logo.png';
import shopriteLogo from '../../../assets/shoprite_logo.png';
import supabetsLogo from '../../../assets/supabets_logo.png';
import yesplayLogo from '../../../assets/yesplay_logo.png';

const _viteMode: string = (import.meta as any).env?.MODE ?? 'production';
const _viteNodeEnv: string = (import.meta as any).env?.VITE_NODE_ENV ?? '';
const isUatOrStaging = _viteMode !== 'production' || _viteNodeEnv === 'staging';

const SUPPLIER_BORDER: Record<string, string> = {
  FLASH: '2px solid #22c55e',
  MOBILEMART: '2px solid #3b82f6',
};

const BRAND_LOGO_MAP: Record<string, string> = {
  '1voucher': oneVoucherLogo,
  'betway': betwayLogo,
  'blu': bluLogo,
  'blue': bluLogo,
  'blu voucher': bluLogo,
  'blue voucher': bluLogo,
  'fnb': fnbLogo,
  'first national bank': fnbLogo,
  'fnb voucher': fnbLogo,
  'hollywood bets': hollywoodLogo,
  'ott voucher': ottLogo,
  'pick n pay': pnpLogo,
  'pick n pay voucher': pnpLogo,
  'pick and pay': pnpLogo,
  'picknpay': pnpLogo,
  'pnp': pnpLogo,
  'shoprite': shopriteLogo,
  'shoprite voucher': shopriteLogo,
  'checkers': shopriteLogo,
  'checkers voucher': shopriteLogo,
  'supabets': supabetsLogo,
  'supa bets': supabetsLogo,
  'supabets voucher': supabetsLogo,
  'yesplay': yesplayLogo,
  'yes play': yesplayLogo,
  'yesplay voucher': yesplayLogo,
};

function getBrandLogo(...brandNames: Array<string | undefined | null>): string | null {
  for (const brandName of brandNames) {
    const key = String(brandName || '').toLowerCase().trim();
    if (!key) continue;
    if (BRAND_LOGO_MAP[key]) return BRAND_LOGO_MAP[key];
    const matchedKey = Object.keys(BRAND_LOGO_MAP).find(candidate => key.includes(candidate));
    if (matchedKey) return BRAND_LOGO_MAP[matchedKey];
  }
  return null;
}

interface Voucher {
  id: string;
  name: string;
  brand: string;
  category: string;
  minAmount: number;
  maxAmount: number;
  isVariable: boolean;
  icon: string;
  description: string;
  supplierCode?: string;
  available: boolean;
  denominations: number[];
}

interface VoucherCardProps {
  voucher: Voucher;
  isFavorite: boolean;
  canFavorite?: boolean;
  onSelect: () => void;
  onToggleFavorite?: (isFavorite: boolean) => void;
}

function formatRands(cents: number): string {
  return `R${(cents / 100).toFixed(0)}`;
}

export function VoucherCard({ voucher, isFavorite, canFavorite = true, onSelect, onToggleFavorite }: VoucherCardProps) {
  const supplierKey = (voucher.supplierCode || '').toUpperCase();
  const supplierBorder = isUatOrStaging ? (SUPPLIER_BORDER[supplierKey] ?? undefined) : undefined;
  const brandLogo = getBrandLogo(voucher.brand, voucher.name);

  const priceLabel = voucher.isVariable
    ? `${formatRands(voucher.minAmount)} – ${formatRands(voucher.maxAmount)}`
    : voucher.denominations.length > 1
      ? `${voucher.denominations.length} options`
      : voucher.denominations.length === 1
        ? formatRands(voucher.denominations[0])
        : '';

  return (
    <div
      className="relative bg-white rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      style={{
        border: supplierBorder ?? '1px solid #e5e7eb',
        padding: '12px 8px 10px',
      }}
      onClick={onSelect}
    >
      {onToggleFavorite && (
        <div
          className="absolute top-1.5 right-1.5 z-10 p-1 rounded-full transition-all cursor-pointer hover:scale-110"
          onClick={(e) => {
            e.stopPropagation();
            if (isFavorite || canFavorite) onToggleFavorite(!isFavorite);
          }}
          title={!canFavorite && !isFavorite ? 'Max 12 favorites' : isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Star
            className={`w-3.5 h-3.5 ${
              isFavorite
                ? 'text-yellow-500 fill-current'
                : !canFavorite
                  ? 'text-gray-300'
                  : 'text-gray-300 hover:text-yellow-400'
            }`}
          />
        </div>
      )}

      <div className="flex items-center justify-center mb-2" style={{ height: '40px' }}>
        {brandLogo ? (
          <img
            src={brandLogo}
            alt={voucher.name}
            style={{
              maxHeight: '36px',
              maxWidth: '72px',
              objectFit: 'contain',
              borderRadius: '6px',
            }}
          />
        ) : (
          <span className="text-2xl leading-none">{voucher.icon}</span>
        )}
      </div>

      <h3
        className="text-xs font-semibold text-gray-800 text-center mb-1 line-clamp-2"
        style={{ fontFamily: 'Montserrat, sans-serif', minHeight: '2rem' }}
      >
        {voucher.name}
      </h3>

      {priceLabel && (
        <p
          className="text-center mb-2"
          style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '10px', color: '#6b7280' }}
        >
          {priceLabel}
        </p>
      )}

      <div
        className="w-full py-1.5 rounded-lg text-center text-xs font-medium transition-colors"
        style={{
          background: voucher.available ? 'linear-gradient(135deg, #86BE41, #6da832)' : '#d1d5db',
          color: voucher.available ? '#fff' : '#6b7280',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        {voucher.available ? 'Buy' : 'Unavailable'}
      </div>
    </div>
  );
}
