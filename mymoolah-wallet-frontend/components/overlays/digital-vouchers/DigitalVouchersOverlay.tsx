import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, Star } from 'lucide-react';
import { VoucherCard } from './VoucherCard';
import { VoucherSearch } from './VoucherSearch';
import { ProductDetailModal } from './ProductDetailModal';
import { apiService } from '../../../services/apiService';
import { useAuth } from '../../../contexts/AuthContext';
import { BrandSpinner } from '../../common/LoadingSpinner';

export interface Voucher {
  id: string;
  catalogKey?: string;
  purchaseProductId?: number;
  productId?: number;
  variantId?: number;
  name: string;
  brand: string;
  category: string;
  minAmount: number;
  maxAmount: number;
  isVariable: boolean;
  icon: string;
  description: string;
  supplierCode?: string;
  commission?: number;
  isGiftCard?: boolean;
  available: boolean;
  denominations: number[];
}

interface VoucherCatalogItem {
  catalogKey?: unknown;
  purchaseProductId?: unknown;
  productId?: unknown;
  variantId?: unknown;
  name?: unknown;
  brand?: unknown;
  category?: unknown;
  minAmount?: unknown;
  maxAmount?: unknown;
  isVariable?: unknown;
  icon?: unknown;
  description?: unknown;
  supplierCode?: unknown;
  commission?: unknown;
  isGiftCard?: unknown;
  available?: unknown;
  denominations?: unknown;
}

type VoucherOverlayMode = 'retail' | 'gift-cards';

function voucherBrandSlug(value: unknown): string {
  return String(value || 'voucher')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildRetailVoucherId(voucher: VoucherCatalogItem, index: number): string {
  const brandSlug = voucherBrandSlug(voucher.catalogKey || voucher.brand || voucher.name);
  return brandSlug ? `retail-voucher-${brandSlug}` : `retail-voucher-${index}`;
}

function isGiftCardVoucher(voucher: Voucher): boolean {
  return voucher.isGiftCard === true;
}

function isRetailVoucher(voucher: Voucher): boolean {
  return !isGiftCardVoucher(voucher);
}

interface DigitalVouchersOverlayProps {
  mode?: VoucherOverlayMode;
}

export function DigitalVouchersOverlay({ mode = 'retail' }: DigitalVouchersOverlayProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGiftCardsMode = mode === 'gift-cards';
  const screenTitle = isGiftCardsMode ? 'Gift Cards' : 'Buy Retail Vouchers';
  const listTitle = isGiftCardsMode ? 'All Gift Cards' : 'All Retail Vouchers';
  const emptyTitle = isGiftCardsMode ? 'No gift cards found' : 'No retail vouchers found';
  const loadingLabel = isGiftCardsMode ? 'Loading gift cards...' : 'Loading retail vouchers...';
  const favoritesKey = useMemo(
    () => {
      const prefix = isGiftCardsMode ? 'gift_card_favorites' : 'voucher_favorites';
      return user?.id ? `${prefix}_${user.id}` : `${prefix}_guest`;
    },
    [isGiftCardsMode, user?.id]
  );

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [filteredVouchers, setFilteredVouchers] = useState<Voucher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const emptyDescription = searchQuery
    ? 'Try a different search term'
    : isGiftCardsMode
      ? 'Gift cards will appear here once available'
      : 'Vouchers will appear here once available';

  useEffect(() => {
    loadVouchers();
  }, [favoritesKey]);

  const loadVouchers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getVouchers();
      const loaded: Voucher[] = (response.vouchers || []).map((v: VoucherCatalogItem, index: number) => ({
        id: buildRetailVoucherId(v, index),
        catalogKey: typeof v.catalogKey === 'string' ? v.catalogKey : undefined,
        purchaseProductId: typeof v.purchaseProductId === 'number' ? v.purchaseProductId : typeof v.productId === 'number' ? v.productId : undefined,
        productId: typeof v.productId === 'number' ? v.productId : undefined,
        variantId: typeof v.variantId === 'number' ? v.variantId : undefined,
        name: String(v.name || 'Voucher'),
        brand: String(v.brand || v.name || 'Voucher'),
        category: String(v.category || 'other'),
        minAmount: Number(v.minAmount || 0),
        maxAmount: Number(v.maxAmount || 0),
        isVariable: !!v.isVariable,
        icon: String(v.icon || '🎁'),
        description: String(v.description || ''),
        supplierCode: typeof v.supplierCode === 'string' ? v.supplierCode : undefined,
        commission: typeof v.commission === 'number' ? v.commission : undefined,
        isGiftCard: v.isGiftCard === true,
        available: v.available !== false,
        denominations: Array.isArray(v.denominations) ? v.denominations : []
      }));
      const visible = isGiftCardsMode ? loaded.filter(isGiftCardVoucher) : loaded.filter(isRetailVoucher);
      setVouchers(visible);
      setFilteredVouchers(visible);

      // Load favorites and prune stale IDs that no longer match any voucher
      const loadedIds = new Set(visible.map(v => v.id));
      const loadedByBrandSlug = new Map(visible.map(v => [voucherBrandSlug(v.catalogKey || v.brand || v.name), v.id]));
      const stored = typeof window !== 'undefined' ? localStorage.getItem(favoritesKey) : null;
      let favs: string[] = [];
      try { favs = stored ? JSON.parse(stored) : []; } catch { favs = []; }
      const pruned = Array.isArray(favs)
        ? Array.from(new Set(favs.map(id => {
          if (loadedIds.has(id)) return id;
          for (const [brandSlug, stableId] of loadedByBrandSlug.entries()) {
            if (String(id).toLowerCase().includes(brandSlug)) return stableId;
          }
          return null;
        }).filter((id): id is string => !!id && loadedIds.has(id))))
        : [];
      setFavorites(pruned);
      if (typeof window !== 'undefined') {
        localStorage.setItem(favoritesKey, JSON.stringify(pruned));
      }
    } catch {
      setError(
        isGiftCardsMode
          ? 'We could not load gift cards right now. Please check your connection and try again.'
          : 'We could not load retail vouchers right now. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteToggle = (voucherId: string, isFavorite: boolean) => {
    const favSet = new Set(favorites);
    if (isFavorite && !favSet.has(voucherId) && favSet.size >= 12) {
      setError('You can save up to 12 favorites');
      setTimeout(() => setError(null), 2500);
      return;
    }
    if (isFavorite) favSet.add(voucherId);
    else favSet.delete(voucherId);
    const updated = Array.from(favSet);
    setFavorites(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(favoritesKey, JSON.stringify(updated));
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredVouchers(vouchers);
      return;
    }
    const q = query.toLowerCase();
    setFilteredVouchers(
      vouchers.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      )
    );
  };

  const handleVoucherSelect = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowModal(true);
  };

  const isFav = (id: string) => favorites.includes(id);
  const favoriteVouchers = filteredVouchers.filter(v => isFav(v.id));
  const otherVouchers = filteredVouchers.filter(v => !isFav(v.id));

  return (
    <div style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Montserrat, sans-serif',
      padding: 'var(--mobile-padding)',
      paddingBottom: '110px'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/transact')}
          style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '500', color: '#374151', padding: '8px', borderRadius: '8px' }}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
          {screenTitle}
        </h1>
        <div style={{ width: '40px' }} />
      </div>

      <VoucherSearch
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onClear={() => { setSearchQuery(''); setFilteredVouchers(vouchers); }}
        placeholder={isGiftCardsMode ? 'Search gift cards...' : 'Search retail vouchers...'}
        ariaLabel={isGiftCardsMode ? 'Search gift cards by name or description' : 'Search retail vouchers by name or description'}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-center">
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {isLoading && (
        <BrandSpinner
          className="py-8"
          size={48}
          label={loadingLabel}
        />
      )}

      {/* Favorites */}
      {!isLoading && favoriteVouchers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-500 mr-2" />
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                Favorites
              </h2>
            </div>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280' }}>
              {favorites.length}/12
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {favoriteVouchers.map(v => (
              <VoucherCard
                key={v.id}
                voucher={v}
                isFavorite={true}
                onSelect={() => handleVoucherSelect(v)}
                onToggleFavorite={(fav) => handleFavoriteToggle(v.id, fav)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Retail Vouchers */}
      {!isLoading && otherVouchers.length > 0 && (
        <div className="mb-6">
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
            {searchQuery ? 'Search Results' : listTitle}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {otherVouchers.map(v => (
              <VoucherCard
                key={v.id}
                voucher={v}
                isFavorite={false}
                canFavorite={favorites.length < 12}
                onSelect={() => handleVoucherSelect(v)}
                onToggleFavorite={(fav) => handleFavoriteToggle(v.id, fav)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredVouchers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
            {emptyTitle}
          </h3>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280' }}>
            {emptyDescription}
          </p>
        </div>
      )}

      {showModal && selectedVoucher && (
        <ProductDetailModal
          voucher={selectedVoucher}
          isOpen={showModal}
          onClose={() => { setShowModal(false); setSelectedVoucher(null); }}
        />
      )}
    </div>
  );
}
