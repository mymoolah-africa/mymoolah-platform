import React from 'react';
import { Sparkles, TrendingUp, Calendar, Percent } from 'lucide-react';

export interface Suggestion {
  id: string;
  type: 'pattern' | 'savings' | 'recommendation' | 'trending';
  title: string;
  description: string;
  action?: {
    label: string;
    productId?: string;
    beneficiaryId?: string;
    amount?: number;
  };
  confidence?: number; // 0-100
  savingsAmount?: number; // in cents
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
  onActionClick?: (suggestion: Suggestion) => void;
  maxDisplay?: number;
}

export function SmartSuggestions({ 
  suggestions, 
  onActionClick,
  maxDisplay = 3 
}: SmartSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const displaySuggestions = suggestions.slice(0, maxDisplay);

  const getIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'pattern':
        return <Calendar size={16} color="#8B5CF6" />;
      case 'savings':
        return <Percent size={16} color="#10B981" />;
      case 'recommendation':
        return <Sparkles size={16} color="#F59E0B" />;
      case 'trending':
        return <TrendingUp size={16} color="#3B82F6" />;
      default:
        return <Sparkles size={16} color="#6B7280" />;
    }
  };

  const getBackgroundColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'pattern':
        return '#F5F3FF'; // Purple tint
      case 'savings':
        return '#ECFDF5'; // Green tint
      case 'recommendation':
        return '#FEF3C7'; // Yellow tint
      case 'trending':
        return '#EFF6FF'; // Blue tint
      default:
        return '#F9FAFB';
    }
  };

  const getBorderColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'pattern':
        return '#8B5CF6';
      case 'savings':
        return '#10B981';
      case 'recommendation':
        return '#F59E0B';
      case 'trending':
        return '#3B82F6';
      default:
        return '#E5E7EB';
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <Sparkles size={16} color="#86BE41" />
        <h3 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '14px',
          fontWeight: '600',
          color: '#1F2937',
          margin: 0
        }}>
          Smart Suggestions
        </h3>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {displaySuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            style={{
              backgroundColor: getBackgroundColor(suggestion.type),
              border: `1px solid ${getBorderColor(suggestion.type)}33`,
              borderRadius: '12px',
              padding: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              {/* Icon */}
              <div style={{
                marginTop: '2px',
                flexShrink: 0
              }}>
                {getIcon(suggestion.type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: '4px'
                }}>
                  {suggestion.title}
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  color: '#6B7280',
                  lineHeight: '1.5'
                }}>
                  {suggestion.description}
                </div>

                {/* Savings Badge */}
                {suggestion.savingsAmount && suggestion.savingsAmount > 0 && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '6px',
                    padding: '4px 8px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    Save R{(suggestion.savingsAmount / 100).toFixed(0)}
                  </div>
                )}

                {/* Action Button */}
                {suggestion.action && onActionClick && (
                  <button
                    onClick={() => onActionClick(suggestion)}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      backgroundColor: getBorderColor(suggestion.type),
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {suggestion.action.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Analyze purchase history and generate smart suggestions
 */
export function generateSuggestions(
  transactions: any[],
  beneficiaries: any[],
  currentProducts: any[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Analyze purchase patterns
  const purchasesByBeneficiary = new Map<string, any[]>();
  transactions.forEach(tx => {
    const beneficiaryId = tx.metadata?.beneficiaryId;
    if (beneficiaryId) {
      if (!purchasesByBeneficiary.has(beneficiaryId)) {
        purchasesByBeneficiary.set(beneficiaryId, []);
      }
      purchasesByBeneficiary.get(beneficiaryId)!.push(tx);
    }
  });

  // Pattern-based suggestions
  purchasesByBeneficiary.forEach((purchases, beneficiaryId) => {
    const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
    if (!beneficiary || purchases.length < 2) return;

    // Find common purchase pattern
    const amounts = purchases.map(p => p.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const mostCommon = amounts.sort((a,b) =>
      amounts.filter(v => v === a).length - amounts.filter(v => v === b).length
    ).pop();

    // Check if there's a regular pattern (e.g., every Friday)
    const dates = purchases.map(p => new Date(p.createdAt).getDay());
    const dayOfWeek = dates.sort((a,b) =>
      dates.filter(v => v === a).length - dates.filter(v => v === b).length
    ).pop();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (mostCommon && purchases.length >= 3) {
      suggestions.push({
        id: `pattern_${beneficiaryId}`,
        type: 'pattern',
        title: `Regular purchase detected`,
        description: `You usually send R${(mostCommon / 100).toFixed(0)} to ${beneficiary.name}${dayOfWeek !== undefined ? ` on ${dayNames[dayOfWeek]}s` : ''}`,
        action: {
          label: `Send R${(mostCommon / 100).toFixed(0)} now`,
          beneficiaryId,
          amount: mostCommon
        },
        confidence: Math.min(95, 60 + (purchases.length * 5))
      });
    }
  });

  // Savings opportunities
  if (currentProducts.length > 0) {
    // Find data bundles that are better value than multiple airtime purchases
    const dataBundles = currentProducts.filter(p => p.type === 'data');
    const bestDataDeal = dataBundles.find(p => p.isBestDeal);
    
    if (bestDataDeal) {
      suggestions.push({
        id: 'savings_data_bundle',
        type: 'savings',
        title: 'Better value available',
        description: `${bestDataDeal.size} ${bestDataDeal.provider} data bundle is better value than multiple airtime top-ups`,
        action: {
          label: 'View bundle',
          productId: bestDataDeal.id
        },
        savingsAmount: 500 // Estimated savings
      });
    }
  }

  // Trending/Popular products
  const popularProducts = currentProducts
    .filter(p => p.isPopular)
    .slice(0, 1);
  
  if (popularProducts.length > 0) {
    const product = popularProducts[0];
    suggestions.push({
      id: `trending_${product.id}`,
      type: 'trending',
      title: 'Most popular this week',
      description: `${product.size} ${product.provider} ${product.type} - Frequently purchased by MyMoolah users`,
      action: {
        label: 'View details',
        productId: product.id
      }
    });
  }

  // Sort by confidence/type priority
  return suggestions.sort((a, b) => {
    const typePriority = { pattern: 1, savings: 2, recommendation: 3, trending: 4 };
    return typePriority[a.type] - typePriority[b.type];
  });
}

