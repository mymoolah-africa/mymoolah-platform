import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, X, Star } from 'lucide-react';
import { VoucherCard } from './VoucherCard';
import { VoucherSearch } from './VoucherSearch';
import { ProductDetailModal } from './ProductDetailModal';
import { apiService } from '../../../services/apiService';
import { useAuth } from '../../../contexts/AuthContext';

interface Voucher {
  id: string;
  name: string;
  brand: string;
  category: 'Gaming' | 'Entertainment' | 'Transport' | 'Shopping' | 'MyMoolah';
  minAmount: number;
  maxAmount: number;
  icon: string;
  description: string;
  available: boolean;
  featured: boolean;
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

  // Load vouchers on component mount
  useEffect(() => {
    const init = async () => {
      const favs = loadFavorites();
      await loadVouchers(favs);
    };
    init();
  }, [favoritesKey]);

  const applyFavorites = (voucherList: Voucher[], favs: string[]) => {
    const favSet = new Set(favs || []);
    return voucherList.map(v => ({ ...v, featured: favSet.has(v.id) }));
  };

  // Load vouchers from backend
  const loadVouchers = async (currentFavorites: string[] = favorites) => {
    try {
      console.log('🔍 Starting to load vouchers...');
      setIsLoading(true);
      setError(null);
      
      // Fetch vouchers from backend
      console.log('📡 Calling apiService.getVouchers()...');
      const response = await apiService.getVouchers();
      console.log('📦 API Response received:', response);
      
      // Transform backend vouchers
      const transformedVouchers: Voucher[] = response.vouchers.map((voucher: any) => ({
        id: voucher.id.toString(),
        name: voucher.name,
        brand: voucher.brand,
        category: voucher.category,
        minAmount: voucher.minAmount,
        maxAmount: voucher.maxAmount,
        icon: voucher.icon || '🎁',
        description: voucher.description,
        available: true, // Make all vouchers available
        featured: false, // Will be set based on favorites
        denominations: voucher.denominations || []
      }));
      
      console.log('🔄 Transformed vouchers:', transformedVouchers.length);
      
      const withFavorites = applyFavorites(transformedVouchers, currentFavorites);
      setVouchers(withFavorites);
      setFilteredVouchers(withFavorites);
      console.log('✅ Vouchers loaded successfully');
    } catch (err) {
      console.error('❌ Error loading vouchers:', err);
      setError('Failed to load vouchers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load user favorites (local, per-user)
  const loadFavorites = () => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(favoritesKey) : null;
      const favs = stored ? JSON.parse(stored) : [];
      setFavorites(Array.isArray(favs) ? favs : []);
      return Array.isArray(favs) ? favs : [];
    } catch (e) {
      console.warn('Could not load favorites, resetting.');
      setFavorites([]);
      return [];
    }
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async (voucherId: string, isFavorite: boolean) => {
    const favSet = new Set(favorites);

    if (isFavorite && !favSet.has(voucherId) && favSet.size >= 12) {
      // Max 12 favorites for clean UX
      setError('You can save up to 12 favorites');
      setTimeout(() => setError(null), 2500);
      return;
    }

    if (isFavorite) {
      favSet.add(voucherId);
    } else {
      favSet.delete(voucherId);
    }

    const updated = Array.from(favSet);
    setFavorites(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(favoritesKey, JSON.stringify(updated));
    }

    const updatedVouchers = applyFavorites(vouchers, updated);
    setVouchers(updatedVouchers);
    setFilteredVouchers(applyFavorites(filteredVouchers, updated));
  };

  // Get count of favorite vouchers
  const getFavoriteCount = (voucherList: Voucher[]) => {
    return favorites.length;
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredVouchers(vouchers);
      return;
    }
    
    const filtered = vouchers.filter(voucher =>
      voucher.name.toLowerCase().includes(query.toLowerCase()) ||
      voucher.brand.toLowerCase().includes(query.toLowerCase()) ||
      voucher.category.toLowerCase().includes(query.toLowerCase()) ||
      voucher.description.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredVouchers(filtered);
  };

  // Handle voucher selection
  const handleVoucherSelect = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedVoucher(null);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setFilteredVouchers(vouchers);
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/transact');
  };

  // Get favorite vouchers (max 12)
  const favoriteVouchers = vouchers.filter(v => v.featured).slice(0, 12);
  
  // Get other vouchers (non-favorites)
  const otherVouchers = filteredVouchers.filter(v => !v.featured);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Montserrat, sans-serif',
      padding: 'var(--mobile-padding)',
      paddingBottom: '110px' // keep clear of bottom nav
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '500',
            color: '#374151',
            padding: '8px',
            borderRadius: '8px'
          }}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        
        <h1 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Digital Vouchers
        </h1>
        
        <div style={{ width: '40px' }} /> {/* Spacer for centering */}
      </div>

      {/* Search Bar */}
      <VoucherSearch
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onClear={clearSearch}
      />

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Error Loading Vouchers
          </h3>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            {error}
          </p>
          <Button
            onClick={loadVouchers}
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '12px',
              minHeight: '44px',
              backgroundColor: '#86BE41'
            }}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Loading vouchers...
          </p>
        </div>
      )}

      {/* Favorite Vouchers Section */}
      {!isLoading && !error && favorites.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-500 mr-2" />
              <h2 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Favorite Vouchers
              </h2>
            </div>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {favorites.length}/12
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
                                    {favoriteVouchers.map((voucher) => (
                          <VoucherCard
                            key={voucher.id}
                            voucher={voucher}
                            onSelect={() => handleVoucherSelect(voucher)}
                            showFavoriteStar={true}
                            onToggleFavorite={(isFavorite) => handleFavoriteToggle(voucher.id, isFavorite)}
                          />
                        ))}
          </div>
        </div>
      )}

      {/* All Vouchers Section */}
      {!isLoading && !error && otherVouchers.length > 0 && (
        <div className="mb-6">
          <h2 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            All Vouchers
          </h2>
          <div className="grid grid-cols-3 gap-4">
                                    {otherVouchers.map((voucher) => (
                          <VoucherCard
                            key={voucher.id}
                            voucher={voucher}
                            onSelect={() => handleVoucherSelect(voucher)}
                            showFavoriteStar={true}
                            disabled={favorites.length >= 12 && !voucher.featured}
                            onToggleFavorite={(isFavorite) => handleFavoriteToggle(voucher.id, isFavorite)}
                          />
                        ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && filteredVouchers.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-8 h-8 text-gray-400" />
          </div>
          <h3 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            No vouchers found
          </h3>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Try adjusting your search
          </p>
        </div>
      )}

      {/* Product Detail Modal */}
      {showModal && selectedVoucher && (
        <ProductDetailModal
          voucher={selectedVoucher}
          isOpen={showModal}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
