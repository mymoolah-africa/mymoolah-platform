import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: LucideIcon;
  color?: 'green' | 'blue' | 'red' | 'orange' | 'purple' | 'gray';
  format?: 'currency' | 'number' | 'percentage' | 'text';
  subtitle?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = 'blue',
  format = 'text',
  subtitle,
  loading = false
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          icon: 'text-green-600',
          border: 'border-green-200',
          change: {
            increase: 'text-green-600',
            decrease: 'text-red-600',
            neutral: 'text-gray-600'
          }
        };
      case 'blue':
        return {
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
          border: 'border-blue-200',
          change: {
            increase: 'text-green-600',
            decrease: 'text-red-600',
            neutral: 'text-gray-600'
          }
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          icon: 'text-red-600',
          border: 'border-red-200',
          change: {
            increase: 'text-green-600',
            decrease: 'text-red-600',
            neutral: 'text-gray-600'
          }
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          icon: 'text-orange-600',
          border: 'border-orange-200',
          change: {
            increase: 'text-green-600',
            decrease: 'text-red-600',
            neutral: 'text-gray-600'
          }
        };
      case 'purple':
        return {
          bg: 'bg-purple-50',
          icon: 'text-purple-600',
          border: 'border-purple-200',
          change: {
            increase: 'text-green-600',
            decrease: 'text-red-600',
            neutral: 'text-gray-600'
          }
        };
      case 'gray':
        return {
          bg: 'bg-gray-50',
          icon: 'text-gray-600',
          border: 'border-gray-200',
          change: {
            increase: 'text-green-600',
            decrease: 'text-red-600',
            neutral: 'text-gray-600'
          }
        };
      default:
        return {
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
          border: 'border-blue-200',
          change: {
            increase: 'text-green-600',
            decrease: 'text-red-600',
            neutral: 'text-gray-600'
          }
        };
    }
  };

  const formatValue = (val: string | number) => {
    if (loading) return '...';
    
    switch (format) {
      case 'currency':
        if (typeof val === 'number') {
          return val.toLocaleString('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
        return val;
      case 'number':
        if (typeof val === 'number') {
          return val.toLocaleString('en-ZA');
        }
        return val;
      case 'percentage':
        if (typeof val === 'number') {
          return `${val.toFixed(1)}%`;
        }
        return val;
      default:
        return val;
    }
  };

  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return '↗';
      case 'decrease':
        return '↘';
      case 'neutral':
        return '→';
      default:
        return null;
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`portal-card p-6 ${colors.bg} ${colors.border} border`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </p>
            {change && (
              <div className={`flex items-center gap-1 text-sm ${colors.change[change.type]}`}>
                <span>{getChangeIcon()}</span>
                <span>{Math.abs(change.value)}%</span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors.bg} ${colors.icon}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
