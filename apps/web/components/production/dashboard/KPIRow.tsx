"use client"

import { MetricCard } from "@/components/dashboard/MetricCard"
import type { PeriodComparison } from "@/lib/production-analytics-utils"
import { getGranularityLabel, type Granularity } from "@/lib/production-analytics-utils"

interface KPIRowProps {
  kpis: PeriodComparison
  granularity: Granularity
  loading?: boolean
}

export function KPIRow({ kpis, granularity, loading = false }: KPIRowProps) {
  const trendLabel = `vs ${getGranularityLabel(granularity)}`

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
      <MetricCard
        title="Turnos Completados"
        value={kpis.current.shifts}
        trend={kpis.growth.shifts}
        trendLabel={trendLabel}
        isLoading={loading}
        compact
      />
      <MetricCard
        title="Unidades Producidas"
        value={kpis.current.goodUnits}
        trend={kpis.growth.goodUnits}
        trendLabel={trendLabel}
        isLoading={loading}
        compact
      />
      <MetricCard
        title="Total Kilos"
        value={`${Math.round(kpis.current.totalKg).toLocaleString()} kg`}
        trend={kpis.growth.totalKg}
        trendLabel={trendLabel}
        isLoading={loading}
        compact
      />
      <MetricCard
        title="Calidad"
        value={kpis.current.qualityPct}
        valueFormat="percentage"
        trend={kpis.growth.qualityPct}
        trendLabel={trendLabel}
        isLoading={loading}
        compact
      />
      <MetricCard
        title="Tiempo Total"
        value={`${Math.round(kpis.current.totalMinutes / 60)}h`}
        trend={kpis.growth.totalMinutes}
        trendLabel={trendLabel}
        isLoading={loading}
        compact
      />
      <MetricCard
        title="Uds/Hora"
        value={kpis.current.unitsPerHour}
        trend={kpis.growth.unitsPerHour}
        trendLabel={trendLabel}
        isLoading={loading}
        compact
      />
    </div>
  )
}
