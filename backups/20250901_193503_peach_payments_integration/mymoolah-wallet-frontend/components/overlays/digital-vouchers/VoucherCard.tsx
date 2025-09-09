import React from 'react';
import { Star } from 'lucide-react';

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

interface VoucherCardProps {
  voucher: Voucher;
  onSelect: () => void;
  showFavoriteStar?: boolean;
  disabled?: boolean;
  onToggleFavorite?: (isFavorite: boolean) => void;
}

export function VoucherCard({ voucher, onSelect, showFavoriteStar = false, disabled = false, onToggleFavorite }: VoucherCardProps) {

  return (
    <div 
      className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onSelect}
    >
                        {/* Favorite Star - Top Right Corner */}
                  {showFavoriteStar && (
                    <div 
                      className={`absolute top-2 right-2 z-10 p-1 rounded-full transition-all cursor-pointer hover:scale-110 ${
                        disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled && onToggleFavorite) {
                          onToggleFavorite(!voucher.featured);
                        }
                      }}
                      title={disabled ? 'Maximum 12 favorites reached' : voucher.featured ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          voucher.featured
                            ? 'text-yellow-500 fill-current'
                            : disabled
                              ? 'text-gray-400'
                              : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </div>
                  )}

      {/* Voucher Icon */}
      <div className="text-center mb-3">
        <span className="text-3xl">{voucher.icon}</span>
      </div>

      {/* Voucher Name */}
      <h3 className="text-sm font-semibold text-gray-800 text-center mb-2 line-clamp-2">
        {voucher.name}
      </h3>

      {/* Buy Now Button */}
      <button
        className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
          voucher.available
            ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        disabled={!voucher.available}
        onClick={(e) => {
          e.stopPropagation();
          if (voucher.available) {
            onSelect();
          }
        }}
      >
        {voucher.available ? 'Buy Now' : 'Unavailable'}
      </button>
    </div>
  );
}