"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/production-analytics-utils"

const chartConfig = {
  qualityPct: { label: "Calidad %", color: "#a855f7" },
} satisfies ChartConfig

interface QualityTrendChartProps {
  data: TimeSeriesPoint[]
  height?: number
}

export function QualityTrendChart({ data, height = 300 }: QualityTrendChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
  }

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip content={<ChartTooltipContent />} />
        <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Meta 95%", position: "right", fontSize: 11, fill: "#ef4444" }} />
        <Line type="monotone" dataKey="qualityPct" stroke="var(--color-qualityPct)" strokeWidth={2} dot={{ r: 3 }} name="Calidad %" />
      </LineChart>
    </ChartContainer>
  )
}
