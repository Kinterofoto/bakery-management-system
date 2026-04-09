"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TrendingUp, BarChart3 } from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface FormField {
  name: string
  label?: string
  type: string
  min?: number
  max?: number
}

interface TrendRecord {
  id: string
  scheduled_date: string
  values: Record<string, any>
}

interface ActivityTrendChartProps {
  records: TrendRecord[]
  formFields?: FormField[]
  accentColor?: string
  count?: number
}

const ACCENT_BG: Record<string, string> = {
  blue: "bg-blue-500", sky: "bg-sky-500", green: "bg-green-500",
  emerald: "bg-emerald-500", purple: "bg-purple-500", violet: "bg-violet-500",
  amber: "bg-amber-500", orange: "bg-orange-500", teal: "bg-teal-500",
}

const ACCENT_TEXT: Record<string, string> = {
  blue: "text-blue-500", sky: "text-sky-500", green: "text-green-500",
  emerald: "text-emerald-500", purple: "text-purple-500", violet: "text-violet-500",
  amber: "text-amber-500", orange: "text-orange-500", teal: "text-teal-500",
}

function formatFieldName(name: string): string {
  if (name === "pH") return "pH"
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())
}

function getBarColor(val: number, min?: number, max?: number, accent?: string) {
  if (min != null && max != null) {
    if (val >= min && val <= max) return "bg-green-500"
    if (val < min) return "bg-red-500"
    return "bg-orange-500"
  }
  return ACCENT_BG[accent || "blue"] || "bg-blue-500"
}

export function ActivityTrendChart({ records, formFields = [], accentColor = "blue", count = 7 }: ActivityTrendChartProps) {
  const numericFields = useMemo(() =>
    formFields.filter(f => f.type === "number" && (f.min != null || f.max != null)).slice(0, 2),
    [formFields]
  )

  // Flatten multi-entry records: each entry becomes a data point for charting
  const flatRecords = useMemo(() => {
    const result: TrendRecord[] = []
    records.forEach(r => {
      if (Array.isArray(r.values?.entries)) {
        r.values.entries.forEach((entry: Record<string, any>, idx: number) => {
          result.push({ id: `${r.id}-${idx}`, scheduled_date: r.scheduled_date, values: entry })
        })
      } else {
        result.push(r)
      }
    })
    return result
  }, [records])

  const monthlyCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = format(d, "yyyy-MM")
      counts[key] = 0
    }
    flatRecords.forEach(r => {
      const key = r.scheduled_date.slice(0, 7)
      if (key in counts) counts[key]++
    })
    return Object.entries(counts).map(([month, c]) => ({
      month,
      label: format(new Date(month + "-01"), "MMM", { locale: es }),
      count: c,
    }))
  }, [flatRecords])

  const accentBg = ACCENT_BG[accentColor] || "bg-blue-500"
  const accentTxt = ACCENT_TEXT[accentColor] || "text-blue-500"

  // No numeric fields with ranges → show completion count by month
  if (numericFields.length === 0) {
    const maxCount = Math.max(...monthlyCounts.map(m => m.count), 1)

    return (
      <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className={`w-5 h-5 ${accentTxt}`} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Registros por Mes
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-end gap-2 sm:gap-3 px-2">
            {monthlyCounts.map((m, i) => (
              <motion.div
                key={m.month}
                className="flex-1 flex flex-col items-center gap-1"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.05 }}
                style={{ originY: 1 }}
              >
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {m.count}
                </span>
                <div
                  className={`w-full max-w-[40px] rounded-t-lg ${accentBg} transition-all duration-300`}
                  style={{ height: `${(m.count / maxCount) * 100}%`, minHeight: m.count > 0 ? "8px" : "4px" }}
                />
                <span className="text-[9px] sm:text-[10px] text-gray-400 capitalize">
                  {m.label}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render bar charts for numeric fields with ranges
  return (
    <div className="space-y-4">
      {numericFields.map(field => {
        const trendData = flatRecords
          .filter(r => r.values?.[field.name] != null)
          .slice(0, count)
          .reverse()

        if (trendData.length === 0) return null

        const maxVal = field.max
          ? field.max * 1.2
          : Math.max(...trendData.map(r => parseFloat(r.values[field.name]) || 0)) * 1.2 || 1

        return (
          <Card key={field.name} className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-5 h-5 ${accentTxt}`} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tendencia {field.label || formatFieldName(field.name)}
                </h2>
                <span className="text-xs text-gray-400 ml-auto">
                  {"\u00DA"}ltimos {trendData.length} registros
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-32 sm:h-40 flex items-end gap-2 sm:gap-3 px-2">
                {/* Acceptable range background */}
                {field.min != null && field.max != null && (
                  <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none">
                    <div
                      className="absolute inset-x-0 bg-green-500/10 dark:bg-green-500/5 border-y border-green-500/20"
                      style={{
                        bottom: `${(field.min / maxVal) * 100}%`,
                        top: `${100 - (field.max / maxVal) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute right-2 text-[10px] text-green-600 dark:text-green-400 font-medium"
                      style={{ bottom: `${(field.min / maxVal) * 100}%`, transform: "translateY(50%)" }}
                    >
                      {field.min}
                    </div>
                    <div
                      className="absolute right-2 text-[10px] text-green-600 dark:text-green-400 font-medium"
                      style={{ bottom: `${(field.max / maxVal) * 100}%`, transform: "translateY(50%)" }}
                    >
                      {field.max}
                    </div>
                  </div>
                )}

                {trendData.map((r, i) => {
                  const val = parseFloat(r.values?.[field.name]) || 0
                  const height = Math.min((val / maxVal) * 100, 100)
                  return (
                    <motion.div
                      key={r.id}
                      className="flex-1 flex flex-col items-center gap-1 relative z-10"
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ originY: 1 }}
                    >
                      <span className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">
                        {val.toFixed(1)}
                      </span>
                      <div
                        className={`w-full max-w-[40px] rounded-t-lg ${getBarColor(val, field.min, field.max, accentColor)} transition-all duration-300`}
                        style={{ height: `${height}%`, minHeight: "4px" }}
                      />
                      <span className="text-[9px] sm:text-[10px] text-gray-400 truncate max-w-full">
                        {format(new Date(r.scheduled_date), "d MMM", { locale: es })}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
