"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useSensorReadings } from "@/hooks/use-sensor-readings"
import { SensorChart } from "@/components/iot/SensorChart"

export default function IoTPage() {
  const [hours, setHours] = useState(4)
  const { readings, loading, refetch } = useSensorReadings({ hours, pollInterval: 30000 })

  const { tempData, humData, heatData, latest, previousReading } = useMemo(() => {
    const last = readings.length > 0 ? readings[readings.length - 1] : null
    const prev = readings.length > 1 ? readings[readings.length - 2] : null
    return {
      tempData: readings
        .filter(r => r.temperatura != null)
        .map(r => ({
          time: new Date(r.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          value: r.temperatura!,
        })),
      humData: readings
        .filter(r => r.humedad != null)
        .map(r => ({
          time: new Date(r.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          value: r.humedad!,
        })),
      heatData: readings
        .filter(r => r.indice_calor != null)
        .map(r => ({
          time: new Date(r.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          value: r.indice_calor!,
        })),
      latest: last,
      previousReading: prev,
    }
  }, [readings])

  const isOnline = latest &&
    (Date.now() - new Date(latest.created_at).getTime()) < 300000

  // Calculate deltas for trend indicators
  function getDelta(current: number | null | undefined, previous: number | null | undefined) {
    if (current == null || previous == null) return null
    return current - previous
  }

  const tempDelta = getDelta(latest?.temperatura, previousReading?.temperatura)
  const humDelta = getDelta(latest?.humedad, previousReading?.humedad)
  const heatDelta = getDelta(latest?.indice_calor, previousReading?.indice_calor)

  const lastUpdated = latest
    ? new Date(latest.created_at).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-5">

        {/* Header - compact single row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-colors duration-150">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold tracking-tight">Sensores IoT</h1>
              <span className="text-[11px] text-neutral-600 font-mono hidden sm:inline">
                ESP32 / Cuarto de congelacion #1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-red-500"}`} />
              <span className={`text-[11px] font-mono ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
                {isOnline ? "EN LINEA" : "OFFLINE"}
              </span>
            </div>

            {lastUpdated && (
              <span className="text-[10px] text-neutral-600 font-mono hidden md:inline">
                {lastUpdated}
              </span>
            )}

            <button
              onClick={refetch}
              className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-colors duration-150"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Metric Cards - large numeric display */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard
            label="TEMP"
            value={latest?.temperatura}
            unit="°C"
            delta={tempDelta}
            color="#22c55e"
            accentClass="text-emerald-400"
          />
          <MetricCard
            label="HUM"
            value={latest?.humedad}
            unit="%"
            delta={humDelta}
            color="#3b82f6"
            accentClass="text-blue-400"
          />
          <MetricCard
            label="CALOR"
            value={latest?.indice_calor}
            unit="°C"
            delta={heatDelta}
            color="#f59e0b"
            accentClass="text-amber-400"
          />
        </div>

        {/* Time Range Filter - minimal pill style */}
        <div className="flex items-center gap-1 mb-4">
          <span className="text-[10px] text-neutral-600 font-mono mr-2 uppercase tracking-wider">Rango</span>
          {[1, 4, 12, 24].map(h => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`
                px-3 py-1 rounded-md text-xs font-mono transition-all duration-150
                ${hours === h
                  ? "bg-white/10 text-white"
                  : "text-neutral-600 hover:text-neutral-400 hover:bg-white/5"
                }
              `}
            >
              {h}H
            </button>
          ))}
          <span className="text-[10px] text-neutral-700 font-mono ml-2">
            {readings.length} lecturas
          </span>
        </div>

        {/* Charts - stacked for maximum width */}
        <div className="space-y-3">
          <ChartPanel
            label="Temperatura"
            unit="°C"
            color="#22c55e"
            data={tempData}
            loading={loading}
          />
          <ChartPanel
            label="Humedad"
            unit="%"
            color="#3b82f6"
            data={humData}
            loading={loading}
          />
          <ChartPanel
            label="Indice de Calor"
            unit="°C"
            color="#f59e0b"
            data={heatData}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

// --- Sub-components (inline, no new files) ---

function MetricCard({
  label,
  value,
  unit,
  delta,
  color,
  accentClass,
}: {
  label: string
  value: number | null | undefined
  unit: string
  delta: number | null
  color: string
  accentClass: string
}) {
  const isUp = delta != null && delta > 0
  const isDown = delta != null && delta < 0

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
          {label}
        </span>
        {delta != null && (
          <div className={`flex items-center gap-0.5 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="text-[10px] font-mono">
              {isUp ? "+" : ""}{delta.toFixed(1)}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl md:text-4xl font-bold tabular-nums tracking-tight ${accentClass}`}>
          {value != null ? value.toFixed(1) : "--"}
        </span>
        <span className="text-sm text-neutral-600 font-mono">{unit}</span>
      </div>
    </div>
  )
}

function ChartPanel({
  label,
  unit,
  color,
  data,
  loading,
}: {
  label: string
  unit: string
  color: string
  data: Array<{ time: string; value: number }>
  loading: boolean
}) {
  // Compute min/max/avg for the header stats
  const stats = useMemo(() => {
    if (data.length === 0) return null
    const values = data.map(d => d.value)
    return {
      min: Math.min(...values).toFixed(1),
      max: Math.max(...values).toFixed(1),
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
    }
  }, [data])

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Chart header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-mono text-neutral-400">{label}</span>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-600">
            <span>L <span className="text-neutral-400">{stats.min}{unit}</span></span>
            <span>H <span className="text-neutral-400">{stats.max}{unit}</span></span>
            <span>X&#772; <span className="text-neutral-400">{stats.avg}{unit}</span></span>
          </div>
        )}
      </div>
      {/* Chart */}
      <div className="px-2 pb-2">
        <SensorChart
          data={data}
          dataKey="value"
          color={color}
          label={label}
          unit={unit}
          loading={loading}
          height={180}
        />
      </div>
    </div>
  )
}
