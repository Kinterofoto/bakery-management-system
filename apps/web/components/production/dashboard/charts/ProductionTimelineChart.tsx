"use client"

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/production-analytics-utils"

const chartConfig = {
  goodUnits: { label: "Unidades Buenas", color: "#16a34a" },
  badUnits: { label: "Unidades Malas", color: "#ef4444" },
  totalKg: { label: "Kilos", color: "#2563eb" },
} satisfies ChartConfig

interface ProductionTimelineChartProps {
  data: TimeSeriesPoint[]
  height?: number
}

export function ProductionTimelineChart({ data, height = 300 }: ProductionTimelineChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos para el período seleccionado</div>
  }

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip content={<ChartTooltipContent />} />
        <Legend />
        <Bar yAxisId="left" dataKey="goodUnits" fill="var(--color-goodUnits)" radius={[4, 4, 0, 0]} name="Unidades Buenas" />
        <Bar yAxisId="left" dataKey="badUnits" fill="var(--color-badUnits)" radius={[4, 4, 0, 0]} name="Unidades Malas" />
        <Line yAxisId="right" type="monotone" dataKey="totalKg" stroke="var(--color-totalKg)" strokeWidth={2} dot={false} name="Kilos" />
      </ComposedChart>
    </ChartContainer>
  )
}
