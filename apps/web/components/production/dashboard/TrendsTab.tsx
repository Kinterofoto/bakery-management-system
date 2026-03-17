"use client"

import { useMemo } from "react"
import { ExpandableChart } from "./ExpandableChart"
import { QualityTrendChart } from "./charts/QualityTrendChart"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { TrendingUp } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/production-analytics-utils"
import {
  type DashboardFilters,
  calculatePeriodComparison,
  getDateRangeFromPreset,
} from "@/lib/production-analytics-utils"
import type { Database } from "@/lib/database.types"

type ProductionShift = Database["produccion"]["Tables"]["production_shifts"]["Row"]
type ShiftProduction = Database["produccion"]["Tables"]["shift_productions"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]

const efficiencyConfig = {
  unitsPerHour: { label: "Uds/Hora", color: "#f59e0b" },
} satisfies ChartConfig

const cumulativeConfig = {
  cumulative: { label: "Acumulado", color: "#16a34a" },
} satisfies ChartConfig

interface TrendsTabProps {
  timeSeriesData: TimeSeriesPoint[]
  shifts: ProductionShift[]
  productions: ShiftProduction[]
  products: Product[]
  filters: DashboardFilters
  loading: boolean
}

export function TrendsTab({ timeSeriesData, shifts, productions, products, filters, loading }: TrendsTabProps) {
  const growthCards = useMemo(() => {
    const periods: { label: string; preset: "today" | "week" | "month" | "year" }[] = [
      { label: "Día a Día", preset: "today" },
      { label: "Semana a Semana", preset: "week" },
      { label: "Mes a Mes", preset: "month" },
      { label: "Año a Año", preset: "year" },
    ]

    return periods.map((p) => {
      const { dateStart, dateEnd } = getDateRangeFromPreset(p.preset)
      const comparison = calculatePeriodComparison(shifts, productions, products, {
        ...filters,
        dateStart,
        dateEnd,
        preset: p.preset,
      })
      return {
        label: p.label,
        growth: comparison.growth.goodUnits,
        current: comparison.current.goodUnits,
      }
    })
  }, [shifts, productions, products, filters])

  const efficiencyData = useMemo(
    () =>
      timeSeriesData.map((d) => ({
        label: d.label,
        unitsPerHour: d.totalMinutes > 0 ? Math.round((d.goodUnits / (d.totalMinutes / 60)) * 10) / 10 : 0,
      })),
    [timeSeriesData]
  )

  const cumulativeData = useMemo(() => {
    let cum = 0
    return timeSeriesData.map((d) => {
      cum += d.goodUnits
      return { label: d.label, cumulative: cum }
    })
  }, [timeSeriesData])

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Growth cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {growthCards.map((card) => (
          <MetricCard
            key={card.label}
            title={card.label}
            value={card.current.toLocaleString()}
            subtitle="unidades"
            trend={card.growth}
            icon={<TrendingUp className="w-4 h-4" />}
            compact
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <ExpandableChart
          title="Tendencia de Calidad"
          description="Meta del 95%"
          expandedContent={<QualityTrendChart data={timeSeriesData} height={500} />}
        >
          <QualityTrendChart data={timeSeriesData} height={260} />
        </ExpandableChart>

        <ExpandableChart
          title="Eficiencia (Uds/Hora)"
          description="Rendimiento en el tiempo"
        >
          {efficiencyData.length > 0 ? (
            <ChartContainer config={efficiencyConfig} className="w-full" style={{ height: 260 }}>
              <LineChart data={efficiencyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="unitsPerHour" stroke="var(--color-unitsPerHour)" strokeWidth={2} dot={{ r: 3 }} name="Uds/Hora" />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
          )}
        </ExpandableChart>
      </div>

      <ExpandableChart
        title="Producción Acumulada"
        description="Total acumulado de unidades buenas"
      >
        {cumulativeData.length > 0 ? (
          <ChartContainer config={cumulativeConfig} className="w-full" style={{ height: 260 }}>
            <AreaChart data={cumulativeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="cumulative" stroke="var(--color-cumulative)" fill="var(--color-cumulative)" fillOpacity={0.2} strokeWidth={2} name="Acumulado" />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
        )}
      </ExpandableChart>
    </div>
  )
}
