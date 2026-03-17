"use client"

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ZAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import type { ScatterPoint } from "@/lib/production-analytics-utils"

const COLORS = ["#16a34a", "#2563eb", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4"]

interface ShiftScatterChartProps {
  data: ScatterPoint[]
  height?: number
}

export function ShiftScatterChart({ data, height = 300 }: ShiftScatterChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
  }

  // Group by work center
  const byWorkCenter = new Map<string, ScatterPoint[]>()
  for (const point of data) {
    const arr = byWorkCenter.get(point.workCenterName) || []
    arr.push(point)
    byWorkCenter.set(point.workCenterName, arr)
  }

  const chartConfig: ChartConfig = {}
  const entries = Array.from(byWorkCenter.entries())
  entries.forEach(([name], i) => {
    chartConfig[name] = { label: name, color: COLORS[i % COLORS.length] }
  })

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" dataKey="durationMinutes" name="Duración (min)" tick={{ fontSize: 11 }} label={{ value: "Duración (min)", position: "bottom", offset: -5, fontSize: 11 }} />
        <YAxis type="number" dataKey="goodUnits" name="Unidades" tick={{ fontSize: 11 }} label={{ value: "Unidades", angle: -90, position: "insideLeft", fontSize: 11 }} />
        <ZAxis range={[40, 400]} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const point = payload[0].payload as ScatterPoint
            return (
              <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                <p className="font-medium">{point.shiftName}</p>
                <p className="text-muted-foreground">{point.workCenterName}</p>
                <p>{point.durationMinutes} min | {point.goodUnits} uds | {point.totalKg} kg</p>
              </div>
            )
          }}
        />
        <Legend />
        {entries.map(([name, points], i) => (
          <Scatter key={name} name={name} data={points} fill={COLORS[i % COLORS.length]} />
        ))}
      </ScatterChart>
    </ChartContainer>
  )
}
