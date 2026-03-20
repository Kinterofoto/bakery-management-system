"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface SensorChartProps {
  data: Array<{ time: string; value: number }>
  dataKey: string
  color: string
  label: string
  unit: string
  loading?: boolean
  height?: number
}

export function SensorChart({ data, color, label, unit, loading, height = 250 }: SensorChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Cargando...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Sin datos en este rango
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}${unit}`, label]}
          labelFormatter={(label) => `Hora: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          name={label}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
