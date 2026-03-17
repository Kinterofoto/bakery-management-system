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

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Hoy", value: "today" },
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
  { label: "Trimestre", value: "quarter" },
  { label: "Año", value: "year" },
  { label: "Todo", value: "all" },
]

const GRANULARITIES: { label: string; value: Granularity }[] = [
  { label: "Día", value: "day" },
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
  { label: "Año", value: "year" },
]

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
    if (!filters.dateStart || !filters.dateEnd) return "Seleccionar"
    const start = new Date(filters.dateStart + "T12:00:00")
    const end = new Date(filters.dateEnd + "T12:00:00")
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    if (filters.dateStart === filters.dateEnd) return fmt(start)
    return `${fmt(start)} - ${fmt(end)}`
  }

  return (
    <div className={`${glassStyles.containers.filterPanel} !p-4`}>
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
        {/* Work Center */}
        <div className="w-full lg:w-48">
          <label className={`${glassStyles.typography.caption} block mb-1.5`}>Centro de Trabajo</label>
          <SearchableSelect
            options={wcOptions}
            value={filters.workCenter}
            onChange={(v) => setFilter("workCenter", v || "all")}
            placeholder="Todos los centros"
            icon={<Factory className="w-4 h-4" />}
          />
        </div>

        {/* Product */}
        <div className="w-full lg:w-48">
          <label className={`${glassStyles.typography.caption} block mb-1.5`}>Producto</label>
          <SearchableSelect
            options={productOptions}
            value={filters.product}
            onChange={(v) => setFilter("product", v || "all")}
            placeholder="Todos los productos"
            icon={<Package className="w-4 h-4" />}
          />
        </div>

        {/* Period presets */}
        <div className="flex-1">
          <label className={`${glassStyles.typography.caption} block mb-1.5`}>Período</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => (
              <Button
                key={p.value}
                variant={filters.preset === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("preset", p.value)}
                className="h-8 text-xs"
              >
                {p.label}
              </Button>
            ))}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={isCustomRange ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                >
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                  {isCustomRange ? formatDateLabel() : "Rango"}
                </Button>
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

        {/* Granularity */}
        <div>
          <label className={`${glassStyles.typography.caption} block mb-1.5`}>Granularidad</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200/50">
            {GRANULARITIES.map((g) => (
              <button
                key={g.value}
                onClick={() => setFilter("granularity", g.value)}
                className={`
                  px-3 py-1.5 text-xs font-medium transition-all
                  ${filters.granularity === g.value
                    ? "bg-blue-500 text-white"
                    : "bg-white/50 text-gray-600 hover:bg-white/80"
                  }
                `}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
