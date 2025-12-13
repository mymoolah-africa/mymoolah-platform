import React from 'react';
import { Star, Phone, Clock } from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  msisdn: string;
  network?: string;
  lastPurchase?: {
    amount: number;
    type: 'airtime' | 'data';
    date: string;
  };
  isFavorite?: boolean;
  avatar?: string;
}

interface RecentRecipientsProps {
  recipients: Recipient[];
  onSelect: (recipient: Recipient) => void;
  onRepeat?: (recipient: Recipient) => void;
  maxDisplay?: number;
}

const NETWORK_COLORS = {
  MTN: '#FFCB05',
  Vodacom: '#E60000',
  'Cell C': '#0066CC',
  Telkom: '#009FE3',
  default: '#86BE41'
};

export function RecentRecipients({ 
  recipients, 
  onSelect, 
  onRepeat,
  maxDisplay = 5 
}: RecentRecipientsProps) {
  const displayRecipients = recipients.slice(0, maxDisplay);

  if (displayRecipients.length === 0) {
    return null;
  }

  const getNetworkColor = (network?: string): string => {
    if (!network) return NETWORK_COLORS.default;
    return NETWORK_COLORS[network as keyof typeof NETWORK_COLORS] || NETWORK_COLORS.default;
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastPurchase = (recipient: Recipient): string => {
    if (!recipient.lastPurchase) return '';
    const { amount, type, date } = recipient.lastPurchase;
    const daysAgo = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return `R${(amount / 100).toFixed(0)} ${type} • ${daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}`;
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <h3 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '14px',
          fontWeight: '600',
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Recent Recipients
        </h3>
        {recipients.length > maxDisplay && (
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#9CA3AF'
          }}>
            +{recipients.length - maxDisplay} more
          </span>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'thin'
      }}>
        {displayRecipients.map((recipient) => (
          <div
            key={recipient.id}
            onClick={() => onSelect(recipient)}
            style={{
              minWidth: '140px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = getNetworkColor(recipient.network);
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            {/* Favorite Star */}
            {recipient.isFavorite && (
              <Star
                size={14}
                fill="#FFCB05"
                stroke="#FFCB05"
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px'
                }}
              />
            )}

            {/* Avatar */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: getNetworkColor(recipient.network),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '18px',
              fontWeight: '700',
              color: '#FFFFFF'
            }}>
              {getInitials(recipient.name)}
            </div>

            {/* Name */}
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1F2937',
              textAlign: 'center',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {recipient.name}
            </div>

            {/* Network */}
            {recipient.network && (
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                fontWeight: '500',
                color: '#9CA3AF',
                textAlign: 'center',
                marginBottom: '8px'
              }}>
                {recipient.network}
              </div>
            )}

            {/* Last Purchase */}
            {recipient.lastPurchase && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                marginTop: '8px'
              }}>
                <Clock size={10} color="#9CA3AF" />
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '10px',
                  color: '#9CA3AF'
                }}>
                  {formatLastPurchase(recipient)}
                </span>
              </div>
            )}

            {/* Repeat Button */}
            {recipient.lastPurchase && onRepeat && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRepeat(recipient);
                }}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '6px',
                  backgroundColor: '#F3F4F6',
                  border: 'none',
                  borderRadius: '6px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6B7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#86BE41';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.color = '#6B7280';
                }}
              >
                Repeat R{(recipient.lastPurchase.amount / 100).toFixed(0)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

