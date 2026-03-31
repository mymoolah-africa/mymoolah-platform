import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../../ui/input';

interface VoucherSearchProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onClear: () => void;
  suggestions?: string[];
}

export function VoucherSearch({ searchQuery, onSearch, onClear, suggestions = [] }: VoucherSearchProps) {
  return (
    <div className="mb-6">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search vouchers..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          style={{
            paddingLeft: '40px',
            paddingRight: searchQuery ? '40px' : '12px',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            borderRadius: '12px',
            minHeight: '44px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff'
          }}
          aria-label="Search vouchers by name or description"
        />
        {searchQuery && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-100 rounded-full p-1"
            style={{ minWidth: '28px', minHeight: '28px' }}
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {!searchQuery && suggestions.length > 0 && (
        <div className="mt-3">
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
            Popular:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSearch(s)}
                className="px-3 py-1 bg-gray-100 rounded-full hover:bg-green-50 hover:text-green-700 transition-all duration-200"
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', fontWeight: '500', color: '#6b7280' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
