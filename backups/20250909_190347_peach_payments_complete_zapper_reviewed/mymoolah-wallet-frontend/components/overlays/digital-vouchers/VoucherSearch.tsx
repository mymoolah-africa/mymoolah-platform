import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../../ui/input';

interface VoucherSearchProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onClear: () => void;
}

export function VoucherSearch({ 
  searchQuery, 
  onSearch,
  onClear
}: VoucherSearchProps) {
  const [searchValue, setSearchValue] = useState(searchQuery);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchValue('');
    onClear();
  };

  return (
    <div className="mb-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        
        <Input
          type="text"
          placeholder="Search vouchers..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            paddingLeft: '40px',
            paddingRight: searchValue ? '40px' : '12px',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            fontWeight: '400',
            borderRadius: '12px',
            minHeight: '44px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff'
          }}
          aria-label="Search vouchers by name or description"
        />
        
        {searchValue && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-100 rounded-full p-1"
            style={{
              minWidth: '28px',
              minHeight: '28px'
            }}
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Quick Search Suggestions */}
      {!searchValue && (
        <div className="mt-3">
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            Popular searches:
          </p>
          
          <div className="flex flex-wrap gap-2">
            {['Netflix', 'Google Play', 'DStv', 'Betway', 'MMVoucher'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSearchChange(suggestion)}
                className="px-3 py-1 bg-gray-100 rounded-full hover:bg-[#2D8CCA]/10 hover:text-[#2D8CCA] transition-all duration-200"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6b7280'
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}