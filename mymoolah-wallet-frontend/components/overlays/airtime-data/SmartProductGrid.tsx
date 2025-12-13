import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, Award, Zap, Wifi, Smartphone } from 'lucide-react';

export interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  provider: string;
  type: 'airtime' | 'data';
  validity?: string;
  isBestDeal?: boolean;
  isPopular?: boolean;
  discount?: number;
  description?: string;
  commission?: number;
}

interface SmartProductGridProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  selectedNetwork?: string;
  showSearch?: boolean;
  maxInitialDisplay?: number;
}

const NETWORK_COLORS = {
  MTN: '#FFCB05',
  Vodacom: '#E60000',
  'Cell C': '#0066CC',
  Telkom: '#009FE3',
  default: '#86BE41'
};

export function SmartProductGrid({ 
  products, 
  onProductSelect, 
  selectedNetwork,
  showSearch = true,
  maxInitialDisplay = 10
}: SmartProductGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by network if selected
    if (selectedNetwork && selectedNetwork !== 'All') {
      filtered = filtered.filter(p => 
        p.provider?.toLowerCase() === selectedNetwork.toLowerCase()
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.size.toLowerCase().includes(query) ||
        p.provider?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, selectedNetwork, searchQuery]);

  // Separate airtime and data for section display
  const airtimeProducts = filteredProducts.filter(p => p.type === 'airtime');
  const dataProducts = filteredProducts.filter(p => p.type === 'data');

  const displayedAirtime = showAll ? airtimeProducts : airtimeProducts.slice(0, maxInitialDisplay);
  const displayedData = showAll ? dataProducts : dataProducts.slice(0, maxInitialDisplay);

  const hasMore = (airtimeProducts.length + dataProducts.length) > (displayedAirtime.length + displayedData.length);

  const getNetworkColor = (provider: string): string => {
    return NETWORK_COLORS[provider as keyof typeof NETWORK_COLORS] || NETWORK_COLORS.default;
  };

  const renderProductCard = (product: Product) => {
    const networkColor = getNetworkColor(product.provider);

    return (
      <div
        key={product.id}
        onClick={() => onProductSelect(product)}
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.borderColor = networkColor;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = '#E5E7EB';
        }}
      >
        {/* Top badges */}
        <div style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '12px',
          minHeight: '20px'
        }}>
          {product.isBestDeal && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '600',
              fontFamily: 'Inter, sans-serif'
            }}>
              <Award size={12} />
              Best Value
            </span>
          )}
          {product.isPopular && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '600',
              fontFamily: 'Inter, sans-serif'
            }}>
              <TrendingUp size={12} />
              Popular
            </span>
          )}
          {product.discount && product.discount > 0 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '600',
              fontFamily: 'Inter, sans-serif'
            }}>
              <Zap size={12} />
              Save {product.discount}%
            </span>
          )}
        </div>

        {/* Product info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Left: Icon + Details */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
            {/* Network Icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: `${networkColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {product.type === 'airtime' ? (
                <Smartphone size={24} color={networkColor} />
              ) : (
                <Wifi size={24} color={networkColor} />
              )}
            </div>

            {/* Product Details */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: '4px',
                lineHeight: '1.3'
              }}>
                {product.size}
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                color: '#6B7280',
                marginBottom: '2px'
              }}>
                {product.provider}
              </div>
              {product.validity && (
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: '#9CA3AF'
                }}>
                  Valid: {product.validity}
                </div>
              )}
            </div>
          </div>

          {/* Right: Price */}
          <div style={{
            textAlign: 'right',
            marginLeft: '12px'
          }}>
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '18px',
              fontWeight: '700',
              color: '#10B981'
            }}>
              R {(product.price / 100).toFixed(2)}
            </div>
            {product.discount && product.discount > 0 && (
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                color: '#9CA3AF',
                textDecoration: 'line-through'
              }}>
                R {((product.price / (1 - product.discount / 100)) / 100).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Network color accent bar at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: networkColor,
          opacity: 0.3
        }} />
      </div>
    );
  };

  return (
    <div>
      {/* Search Bar */}
      {showSearch && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              color="#9CA3AF"
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 42px',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                color: '#1F2937',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#86BE41';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(134, 190, 65, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Results Count */}
      {searchQuery && (
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px'
        }}>
          Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Airtime Section */}
      {displayedAirtime.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            color: '#1F2937',
            marginBottom: '12px'
          }}>
            Airtime Products
          </h3>
          <div style={{
            display: 'grid',
            gap: '12px'
          }}>
            {displayedAirtime.map(renderProductCard)}
          </div>
        </div>
      )}

      {/* Data Section */}
      {displayedData.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            color: '#1F2937',
            marginBottom: '12px'
          }}>
            Data Products
          </h3>
          <div style={{
            display: 'grid',
            gap: '12px'
          }}>
            {displayedData.map(renderProductCard)}
          </div>
        </div>
      )}

      {/* Show More Button */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#F9FAFB',
            border: '1px dashed #D1D5DB',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            color: '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
            e.currentTarget.style.borderColor = '#86BE41';
            e.currentTarget.style.color = '#86BE41';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          {showAll ? 'Show Less' : `Show All ${filteredProducts.length} Products`}
        </button>
      )}

      {/* No Results */}
      {filteredProducts.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#9CA3AF'
        }}>
          <Search size={48} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            color: '#6B7280',
            marginBottom: '8px'
          }}>
            No products found
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            color: '#9CA3AF'
          }}>
            Try adjusting your search or filter
          </div>
        </div>
      )}
    </div>
  );
}

