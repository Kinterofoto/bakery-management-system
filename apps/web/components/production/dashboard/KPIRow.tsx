"use client"

import { MetricCard } from "@/components/dashboard/MetricCard"
import { CheckCircle2, Package, Weight, Gauge, Clock, Zap } from "lucide-react"
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <MetricCard
        title="Turnos Completados"
        value={kpis.current.shifts}
        trend={kpis.growth.shifts}
        trendLabel={trendLabel}
        icon={<CheckCircle2 className="w-5 h-5" />}
        isLoading={loading}
      />
      <MetricCard
        title="Unidades Producidas"
        value={kpis.current.goodUnits}
        trend={kpis.growth.goodUnits}
        trendLabel={trendLabel}
        icon={<Package className="w-5 h-5" />}
        isLoading={loading}
      />
      <MetricCard
        title="Total Kilos"
        value={`${kpis.current.totalKg.toLocaleString()} kg`}
        trend={kpis.growth.totalKg}
        trendLabel={trendLabel}
        icon={<Weight className="w-5 h-5" />}
        isLoading={loading}
      />
      <MetricCard
        title="Calidad"
        value={kpis.current.qualityPct}
        valueFormat="percentage"
        trend={kpis.growth.qualityPct}
        trendLabel={trendLabel}
        icon={<Gauge className="w-5 h-5" />}
        isLoading={loading}
      />
      <MetricCard
        title="Tiempo Total"
        value={`${Math.round(kpis.current.totalMinutes / 60)}h`}
        trend={kpis.growth.totalMinutes}
        trendLabel={trendLabel}
        icon={<Clock className="w-5 h-5" />}
        isLoading={loading}
      />
      <MetricCard
        title="Unidades/Hora"
        value={kpis.current.unitsPerHour}
        trend={kpis.growth.unitsPerHour}
        trendLabel={trendLabel}
        icon={<Zap className="w-5 h-5" />}
        isLoading={loading}
      />
    </div>
  )
}
