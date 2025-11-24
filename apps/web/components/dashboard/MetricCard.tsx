/**
 * Metric Card Component
 * Displays key business metrics with trend indicators
 *
 * Features:
 * - Gradient glass background
 * - Animated number display
 * - Color-coded trend indicators (green/red/gray)
 * - Responsive layout
 *
 * Apple HIG: Depth - visual hierarchy through elevation and materials
 */

import React from 'react';
import { glassStyles } from './glass-styles';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: number | string;
  valueFormat?: 'number' | 'percentage' | 'currency';
  trend?: number | null;
  trendLabel?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  valueFormat = 'number',
  trend,
  trendLabel,
  trendType,
  icon,
  subtitle,
  onClick,
  className = '',
  isLoading = false,
}) => {
  // Determine trend type from trend value if not explicitly provided
  const determinedTrendType = trendType || (trend ? (trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral') : 'neutral');

  // Format value based on type
  const formatValue = () => {
    if (typeof value === 'string') return value;

    switch (valueFormat) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  // Get color classes based on trend type
  const getTrendColor = () => {
    switch (determinedTrendType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10';
      case 'negative':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10';
      case 'neutral':
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return <Minus className="w-4 h-4" />;
    return trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${glassStyles.containers.metricCard}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Header: Icon and Title */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className={`${glassStyles.typography.callout} text-gray-600 dark:text-gray-400 mb-1`}>
            {title}
          </p>
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-2 text-gray-400 dark:text-gray-600">
            {icon}
          </div>
        )}
      </div>

      {/* Main Value */}
      {isLoading ? (
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-3" />
      ) : (
        <div className="mb-3">
          <h3 className={`${glassStyles.typography.display} text-gray-900 dark:text-white leading-tight`}>
            {formatValue()}
          </h3>
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p className={`${glassStyles.typography.caption} text-gray-500 dark:text-gray-400 mb-3`}>
          {subtitle}
        </p>
      )}

      {/* Trend Indicator */}
      {trend !== null && trend !== undefined && (
        <div className={`
          flex items-center gap-2
          px-3 py-2
          rounded-lg
          ${getTrendColor()}
          font-medium text-sm
          w-fit
        `}>
          {getTrendIcon()}
          <span>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && (
            <span className="text-xs opacity-75">
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
