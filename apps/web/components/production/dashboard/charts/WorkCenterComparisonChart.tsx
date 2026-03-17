"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { WorkCenterAggregate } from "@/lib/production-analytics-utils"

const chartConfig = {
  goodUnits: { label: "Unidades Buenas", color: "#16a34a" },
  qualityPct: { label: "Calidad %", color: "#a855f7" },
} satisfies ChartConfig

interface WorkCenterComparisonChartProps {
  data: WorkCenterAggregate[]
  height?: number
}

export function WorkCenterComparisonChart({ data, height = 300 }: WorkCenterComparisonChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
  }

  const chartData = data.map((d) => ({
    name: d.workCenterName.length > 20 ? d.workCenterName.substring(0, 17) + "..." : d.workCenterName,
    goodUnits: d.goodUnits,
    qualityPct: d.qualityPct,
  }))

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip content={<ChartTooltipContent />} />
        <Legend />
        <Bar yAxisId="left" dataKey="goodUnits" fill="var(--color-goodUnits)" radius={[4, 4, 0, 0]} name="Unidades Buenas" />
        <Bar yAxisId="right" dataKey="qualityPct" fill="var(--color-qualityPct)" radius={[4, 4, 0, 0]} name="Calidad %" />
      </BarChart>
    </ChartContainer>
  )
}
