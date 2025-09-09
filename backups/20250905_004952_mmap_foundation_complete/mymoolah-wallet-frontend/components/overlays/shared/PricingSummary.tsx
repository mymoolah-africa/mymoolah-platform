import React from 'react';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { Star, Info } from 'lucide-react';

interface PricingRow {
  label: string;
  value: string;
  highlight?: boolean;
  type?: 'positive' | 'negative' | 'neutral';
}

interface ClientClass {
  class: string;
  badge: string;
  discount?: number;
  isPercentage?: boolean;
}

interface PricingSummaryProps {
  title?: string;
  rows: PricingRow[];
  totalLabel?: string;
  totalValue: string;
  clientClass?: ClientClass;
  footnote?: string;
  className?: string;
}

export function PricingSummary({
  title = "Pricing Summary",
  rows,
  totalLabel = "Total payable",
  totalValue,
  clientClass,
  footnote,
  className = ""
}: PricingSummaryProps) {

  const getRowValueColor = (type?: string) => {
    switch (type) {
      case 'positive':
        return '#16a34a'; // Green for discounts/savings
      case 'negative':
        return '#dc2626'; // Red for fees/charges
      default:
        return '#1f2937'; // Default text color
    }
  };

  return (
    <div 
      className={className}
      style={{
        padding: '1rem',
        backgroundColor: '#f8fafe',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}
    >
      {/* Header with Client Class Badge */}
      <div className="flex items-center justify-between mb-3">
        <h3 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '14px',
          fontWeight: '700',
          color: '#1f2937',
          margin: 0
        }}>
          {title}
        </h3>

        {clientClass && (
          <Badge style={{
            backgroundColor: '#f59e0b',
            color: '#ffffff',
            fontSize: '10px',
            padding: '4px 8px'
          }}>
            <Star style={{ width: '10px', height: '10px', marginRight: '2px' }} />
            {clientClass.class}
          </Badge>
        )}
      </div>

      {/* Pricing Rows */}
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex justify-between items-center">
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: row.highlight ? '500' : '400',
              color: row.highlight ? '#1f2937' : '#6b7280'
            }}>
              {row.label}
            </span>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: row.highlight ? '700' : '500',
              color: getRowValueColor(row.type)
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Separator before total */}
      <div style={{ margin: '12px 0' }}>
        <Separator />
      </div>

      {/* Total */}
      <div className="flex justify-between items-center">
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '16px',
          fontWeight: '700',
          color: '#1f2937'
        }}>
          {totalLabel}
        </span>
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '16px',
          fontWeight: '700',
          color: '#1f2937'
        }}>
          {totalValue}
        </span>
      </div>

      {/* Client Class Discount Info */}
      {clientClass && clientClass.discount && (
        <div style={{
          backgroundColor: '#dcfce7',
          border: '1px solid #16a34a',
          borderRadius: '8px',
          padding: '8px',
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Info style={{ width: '14px', height: '14px', color: '#16a34a' }} />
          <span style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '11px',
            color: '#166534'
          }}>
            {clientClass.class} member discount applied: 
            {clientClass.isPercentage ? ` ${clientClass.discount}%` : ` R${clientClass.discount}`}
          </span>
        </div>
      )}

      {/* Footnote */}
      {footnote && (
        <p style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '11px',
          color: '#6b7280',
          marginTop: '12px',
          fontStyle: 'italic',
          margin: '12px 0 0 0'
        }}>
          {footnote}
        </p>
      )}
    </div>
  );
}