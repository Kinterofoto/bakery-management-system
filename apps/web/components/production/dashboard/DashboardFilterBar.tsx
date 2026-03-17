"use client"

import { useState } from "react"
import { Factory, Package, CalendarDays } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { glassStyles } from "@/components/dashboard/glass-styles"
import type { Database } from "@/lib/database.types"
import { type DashboardFilters, type Granularity, type DatePreset, productNameWithWeight } from "@/lib/production-analytics-utils"

type WorkCenter = Database["produccion"]["Tables"]["work_centers"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]

interface DashboardFilterBarProps {
  filters: DashboardFilters
  setFilter: (key: string, value: string) => void
  setMultipleFilters: (updates: Record<string, string>) => void
  workCenters: WorkCenter[]
  products: Product[]
}

const PRESETS: { label: string; shortLabel: string; value: DatePreset }[] = [
  { label: "Hoy", shortLabel: "Hoy", value: "today" },
  { label: "Semana", shortLabel: "7D", value: "week" },
  { label: "Mes", shortLabel: "30D", value: "month" },
  { label: "Trimestre", shortLabel: "90D", value: "quarter" },
  { label: "Año", shortLabel: "1A", value: "year" },
  { label: "Todo", shortLabel: "Todo", value: "all" },
]

const GRANULARITIES: { label: string; shortLabel: string; value: Granularity }[] = [
  { label: "Día", shortLabel: "D", value: "day" },
  { label: "Semana", shortLabel: "S", value: "week" },
  { label: "Mes", shortLabel: "M", value: "month" },
  { label: "Año", shortLabel: "A", value: "year" },
]

// Consistent height for all controls: h-9 (36px)
const CONTROL_HEIGHT = "h-9"
const LABEL_CLASS = "text-[11px] font-medium tracking-wide text-gray-500 uppercase block mb-1.5"

export function DashboardFilterBar({ filters, setFilter, setMultipleFilters, workCenters, products }: DashboardFilterBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedRange, setSelectedRange] = useState<{ from?: Date; to?: Date }>(() => {
    const from = filters.dateStart ? new Date(filters.dateStart + "T12:00:00") : undefined
    const to = filters.dateEnd ? new Date(filters.dateEnd + "T12:00:00") : undefined
    return { from, to }
  })

  const wcOptions = [
    { value: "all", label: "Todos los centros" },
    ...workCenters.map((wc) => ({ value: wc.id, label: wc.name })),
  ]

  const ptProducts = products.filter((p) => p.category === "PT" || p.category === "PP")
  const productOptions = [
    { value: "all", label: "Todos los productos" },
    ...ptProducts.map((p) => ({ value: p.id, label: productNameWithWeight(p) })),
  ]

  const isCustomRange = !PRESETS.some((p) => p.value === filters.preset)

  const formatDateLabel = () => {
    if (!filters.dateStart || !filters.dateEnd) return "Rango"
    const start = new Date(filters.dateStart + "T12:00:00")
    const end = new Date(filters.dateEnd + "T12:00:00")
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
    if (filters.dateStart === filters.dateEnd) return fmt(start)
    return `${fmt(start)} - ${fmt(end)}`
  }

  return (
    <div className={`${glassStyles.containers.filterPanel} !p-3 md:!p-4`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {/* Dropdowns row */}
        <div className="grid grid-cols-2 gap-2 lg:contents">
          <div className="lg:w-48">
            <label className={LABEL_CLASS}>Centro</label>
            <SearchableSelect
              options={wcOptions}
              value={filters.workCenter}
              onChange={(v) => setFilter("workCenter", v || "all")}
              placeholder="Todos"
              icon={<Factory className="w-4 h-4" />}
            />
          </div>

          <div className="lg:w-48">
            <label className={LABEL_CLASS}>Producto</label>
            <SearchableSelect
              options={productOptions}
              value={filters.product}
              onChange={(v) => setFilter("product", v || "all")}
              placeholder="Todos"
              icon={<Package className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Presets + Granularity row */}
        <div className="flex flex-col sm:flex-row gap-3 lg:contents">
          <div className="flex-1">
            <label className={LABEL_CLASS}>Período</label>
            <div className="flex flex-wrap items-center gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setFilter("preset", p.value)}
                  className={`
                    ${CONTROL_HEIGHT} px-3 rounded-lg text-xs font-medium transition-all
                    border
                    ${filters.preset === p.value
                      ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    }
                  `}
                >
                  <span className="sm:hidden">{p.shortLabel}</span>
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              ))}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`
                      ${CONTROL_HEIGHT} px-3 rounded-lg text-xs font-medium transition-all
                      border flex items-center gap-1.5
                      ${isCustomRange
                        ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      }
                    `}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {isCustomRange ? formatDateLabel() : "Rango"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <DayPicker
                    mode="range"
                    selected={selectedRange}
                    onSelect={(range) => {
                      setSelectedRange(range || {})
                      if (range?.from) {
                        const fromStr = range.from.toISOString().split("T")[0]
                        const toStr = range.to ? range.to.toISOString().split("T")[0] : fromStr
                        setMultipleFilters({ dateStart: fromStr, dateEnd: toStr, preset: "" })
                      }
                    }}
                    locale={es}
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex-shrink-0">
            <label className={LABEL_CLASS}>Granularidad</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {GRANULARITIES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setFilter("granularity", g.value)}
                  className={`
                    ${CONTROL_HEIGHT} px-3 text-xs font-medium transition-all
                    ${filters.granularity === g.value
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                    }
                  `}
                >
                  <span className="sm:hidden">{g.shortLabel}</span>
                  <span className="hidden sm:inline">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
