"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ProductAggregate } from "@/lib/production-analytics-utils"

const chartConfig = {
  goodUnits: { label: "Unidades Buenas", color: "#16a34a" },
  badUnits: { label: "Unidades Malas", color: "#ef4444" },
} satisfies ChartConfig

interface ProductBarChartProps {
  data: ProductAggregate[]
  height?: number
  limit?: number
}

export function ProductBarChart({ data, height = 300, limit = 10 }: ProductBarChartProps) {
  const chartData = data.slice(0, limit).map((d) => ({
    ...d,
    name: d.productName.length > 25 ? d.productName.substring(0, 22) + "..." : d.productName,
  }))

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
  }

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} />
        <Tooltip content={<ChartTooltipContent />} />
        <Bar dataKey="goodUnits" stackId="a" fill="var(--color-goodUnits)" radius={[0, 0, 0, 0]} name="Unidades Buenas" />
        <Bar dataKey="badUnits" stackId="a" fill="var(--color-badUnits)" radius={[0, 4, 4, 0]} name="Unidades Malas" />
      </BarChart>
    </ChartContainer>
  )
}
