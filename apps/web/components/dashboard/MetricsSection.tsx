/**
 * Metrics Section Component
 * Displays grid of metric cards with business KPIs
 *
 * Features:
 * - Responsive grid layout (1-5 cards)
 * - Growth comparison metrics
 * - Color-coded indicators
 * - Accessible and mobile-optimized
 *
 * Apple HIG: Clarity - content hierarchy with appropriate sizing
 */

import React from 'react';
import { MetricCard, MetricCardProps } from './MetricCard';
import { Package, TrendingUp, Calendar, Users } from 'lucide-react';

export interface MetricsSectionProps {
  data?: {
    totalOrders?: number;
    growthVsPreviousDay?: number;
    growthVsPreviousWeek?: number;
    growthVsPreviousMonth?: number;
    growthVsPreviousYear?: number;
  };
  isLoading?: boolean;
  className?: string;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({
  data = {
    totalOrders: 1234,
    growthVsPreviousDay: 12.5,
    growthVsPreviousWeek: 8.2,
    growthVsPreviousMonth: -2.1,
    growthVsPreviousYear: 24.5,
  },
  isLoading = false,
  className = '',
}) => {
  const metrics: MetricCardProps[] = [
    {
      title: 'Pedidos Totales',
      value: data.totalOrders || 0,
      valueFormat: 'number',
      subtitle: 'En el período seleccionado',
      icon: <Package className="w-5 h-5" />,
    },
    {
      title: 'Crecimiento vs Día Anterior',
      value: data.growthVsPreviousDay ?? 0,
      valueFormat: 'percentage',
      trend: data.growthVsPreviousDay ?? 0,
      trendLabel: 'cambio',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      title: 'Crecimiento vs Semana Anterior',
      value: data.growthVsPreviousWeek ?? 0,
      valueFormat: 'percentage',
      trend: data.growthVsPreviousWeek ?? 0,
      trendLabel: 'cambio',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      title: 'Crecimiento vs Mes Anterior',
      value: data.growthVsPreviousMonth ?? 0,
      valueFormat: 'percentage',
      trend: data.growthVsPreviousMonth ?? 0,
      trendLabel: 'cambio',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      title: 'Crecimiento vs Año Anterior',
      value: data.growthVsPreviousYear ?? 0,
      valueFormat: 'percentage',
      trend: data.growthVsPreviousYear ?? 0,
      trendLabel: 'cambio',
      icon: <Users className="w-5 h-5" />,
    },
  ];

  return (
    <div className={`
      mb-8 sm:mb-10 lg:mb-12
      ${className}
    `}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            {...metric}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
};

export default MetricsSection;
