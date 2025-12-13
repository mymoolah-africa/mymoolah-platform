import React from 'react';

export type NetworkType = 'All' | 'MTN' | 'Vodacom' | 'Cell C' | 'Telkom';

interface NetworkFilterProps {
  selectedNetwork: NetworkType;
  onNetworkChange: (network: NetworkType) => void;
  productCounts?: {
    all: number;
    mtn: number;
    vodacom: number;
    cellc: number;
    telkom: number;
  };
}

const NETWORKS: { value: NetworkType; label: string; color: string; logo?: string }[] = [
  { value: 'All', label: 'All Networks', color: '#86BE41' },
  { value: 'MTN', label: 'MTN', color: '#FFCB05' },
  { value: 'Vodacom', label: 'Vodacom', color: '#E60000' },
  { value: 'Cell C', label: 'Cell C', color: '#0066CC' },
  { value: 'Telkom', label: 'Telkom', color: '#009FE3' }
];

export function NetworkFilter({ selectedNetwork, onNetworkChange, productCounts }: NetworkFilterProps) {
  const getCount = (network: NetworkType): number | undefined => {
    if (!productCounts) return undefined;
    const key = network.toLowerCase().replace(' ', '') as keyof typeof productCounts;
    return productCounts[key];
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'thin'
      }}>
        {NETWORKS.map((network) => {
          const isSelected = selectedNetwork === network.value;
          const count = getCount(network.value);

          return (
            <button
              key={network.value}
              onClick={() => onNetworkChange(network.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: isSelected ? network.color : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#4B5563',
                border: `2px solid ${isSelected ? network.color : '#E5E7EB'}`,
                borderRadius: '24px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                outline: 'none'
              }}
              onMouseOver={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = network.color;
                  e.currentTarget.style.backgroundColor = `${network.color}15`;
                }
              }}
              onMouseOut={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              {/* Network Indicator Dot */}
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isSelected ? '#FFFFFF' : network.color
              }} />
              
              {/* Label */}
              <span>{network.label}</span>
              
              {/* Count Badge */}
              {count !== undefined && (
                <span style={{
                  padding: '2px 6px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : '#F3F4F6',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

