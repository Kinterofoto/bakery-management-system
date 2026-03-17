"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const COLORS = ["#16a34a", "#2563eb", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"]

interface DistributionItem {
  productId: string
  productName: string
  goodUnits: number
  percentage: number
}

interface ProductionDistributionChartProps {
  data: DistributionItem[]
  height?: number
}

export function ProductionDistributionChart({ data, height = 300 }: ProductionDistributionChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
  }

  const chartConfig: ChartConfig = {}
  data.forEach((d, i) => {
    chartConfig[d.productName] = {
      label: d.productName,
      color: COLORS[i % COLORS.length],
    }
  })

  const chartData = data.map((d) => ({
    name: d.productName.length > 20 ? d.productName.substring(0, 17) + "..." : d.productName,
    value: d.goodUnits,
    percentage: d.percentage,
  }))

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0]
            return (
              <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">{Number(item.value).toLocaleString()} unidades ({(item.payload as any).percentage}%)</p>
              </div>
            )
          }}
        />
        <Legend />
      </PieChart>
    </ChartContainer>
  )
}
