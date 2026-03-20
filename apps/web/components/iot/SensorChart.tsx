"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface SensorChartProps {
  data: Array<{ time: string; value: number }>
  dataKey: string
  color: string
  label: string
  unit: string
  loading?: boolean
  height?: number
}

function CustomTooltip({ active, payload, label, unit, sensorLabel }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e]/95 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-neutral-500 font-mono">{label}</p>
      <p className="text-sm font-semibold text-white font-mono">
        {payload[0].value.toFixed(1)}{unit}
      </p>
    </div>
  )
}

export function SensorChart({ data, color, label, unit, loading, height = 200 }: SensorChartProps) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center text-neutral-600 text-xs font-mono"
        style={{ height }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-neutral-600 animate-pulse" />
          <span>Cargando datos...</span>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-neutral-600 text-xs font-mono"
        style={{ height }}
      >
        Sin datos en este rango
      </div>
    )
  }

  // Calculate average for reference line
  const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "#525252", fontFamily: "monospace" }}
          axisLine={{ stroke: "#262626" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#525252", fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
        />
        <Tooltip
          content={<CustomTooltip unit={unit} sensorLabel={label} />}
          cursor={{ stroke: "#404040", strokeWidth: 1, strokeDasharray: "4 4" }}
        />
        <ReferenceLine
          y={avg}
          stroke="#404040"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#gradient-${label})`}
          dot={false}
          activeDot={{
            r: 3,
            fill: color,
            stroke: "#0a0a0f",
            strokeWidth: 2,
          }}
          name={label}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
