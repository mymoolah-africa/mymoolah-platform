import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, Star } from 'lucide-react';
import { VoucherCard } from './VoucherCard';
import { VoucherSearch } from './VoucherSearch';
import { ProductDetailModal } from './ProductDetailModal';
import { apiService } from '../../../services/apiService';
import { useAuth } from '../../../contexts/AuthContext';

export interface Voucher {
  id: string;
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
  available: boolean;
  denominations: number[];
}

export function DigitalVouchersOverlay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const favoritesKey = useMemo(
    () => (user?.id ? `voucher_favorites_${user.id}` : 'voucher_favorites_guest'),
    [user?.id]
  );

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [filteredVouchers, setFilteredVouchers] = useState<Voucher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(favoritesKey) : null;
    const favs = stored ? (JSON.parse(stored) as string[]) : [];
    setFavorites(Array.isArray(favs) ? favs : []);
    loadVouchers();
  }, [favoritesKey]);

  const loadVouchers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getVouchers();
      const loaded: Voucher[] = (response.vouchers || []).map((v: any) => ({
        id: (v.id || '').toString(),
        productId: v.productId,
        variantId: v.variantId,
        name: v.name || 'Voucher',
        brand: v.brand || v.name || 'Voucher',
        category: v.category || 'other',
        minAmount: v.minAmount || 0,
        maxAmount: v.maxAmount || 0,
        isVariable: !!v.isVariable,
        icon: v.icon || '🎁',
        description: v.description || '',
        supplierCode: v.supplierCode,
        commission: v.commission,
        available: v.available !== false,
        denominations: Array.isArray(v.denominations) ? v.denominations : []
      }));
      setVouchers(loaded);
      setFilteredVouchers(loaded);
    } catch {
      setError('Failed to load vouchers. Please try again.');
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

  const popularBrands = useMemo(() => {
    return vouchers.slice(0, 5).map(v => v.name);
  }, [vouchers]);

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
          Digital Vouchers
        </h1>
        <div style={{ width: '40px' }} />
      </div>

      <VoucherSearch
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onClear={() => { setSearchQuery(''); setFilteredVouchers(vouchers); }}
        suggestions={popularBrands}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-center">
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-[#86BE41] rounded-full animate-spin" />
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280' }}>
            Loading vouchers...
          </p>
        </div>
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

      {/* All Vouchers */}
      {!isLoading && otherVouchers.length > 0 && (
        <div className="mb-6">
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
            {searchQuery ? 'Search Results' : 'All Vouchers'}
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
            No vouchers found
          </h3>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280' }}>
            {searchQuery ? 'Try a different search term' : 'Vouchers will appear here once available'}
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
