"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { glassStyles } from "@/components/dashboard/glass-styles"
import type { Database } from "@/lib/database.types"
import { type DashboardFilters, type Granularity, type DatePreset, productNameWithWeight, getDateRangeFromPreset } from "@/lib/production-analytics-utils"

type WorkCenter = Database["produccion"]["Tables"]["work_centers"]["Row"]
type Operation = Database["produccion"]["Tables"]["operations"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]

interface DashboardFilterBarProps {
  filters: DashboardFilters
  setFilter: (key: string, value: string) => void
  setMultipleFilters: (updates: Record<string, string>) => void
  workCenters: WorkCenter[]
  operations: Operation[]
  products: Product[]
}

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Última semana" },
  { value: "month", label: "Último mes" },
  { value: "quarter", label: "Último trimestre" },
  { value: "year", label: "Último año" },
  { value: "all", label: "Todo el historial" },
  { value: "custom", label: "Rango personalizado" },
]

const GRANULARITIES: { label: string; shortLabel: string; value: Granularity }[] = [
  { label: "Día", shortLabel: "D", value: "day" },
  { label: "Semana", shortLabel: "S", value: "week" },
  { label: "Mes", shortLabel: "M", value: "month" },
  { label: "Año", shortLabel: "A", value: "year" },
]

const LABEL_CLASS = "text-[11px] font-medium tracking-wide text-gray-500 uppercase block mb-1.5"

export function DashboardFilterBar({ filters, setFilter, setMultipleFilters, workCenters, operations, products }: DashboardFilterBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedRange, setSelectedRange] = useState<{ from?: Date; to?: Date }>(() => {
    const from = filters.dateStart ? new Date(filters.dateStart + "T12:00:00") : undefined
    const to = filters.dateEnd ? new Date(filters.dateEnd + "T12:00:00") : undefined
    return { from, to }
  })

  const operationOptions = [
    { value: "all", label: "Todas las operaciones" },
    ...operations.filter((o) => o.is_active).map((o) => ({ value: o.id, label: o.name })),
  ]

  const filteredWcs = filters.operation === "all"
    ? workCenters
    : workCenters.filter((wc) => wc.operation_id === filters.operation)

  const wcOptions = [
    { value: "all", label: "Todos los centros" },
    ...filteredWcs.map((wc) => ({ value: wc.id, label: wc.name })),
  ]

  const ptProducts = products.filter((p) => p.category === "PT" || p.category === "PP")
  const productOptions = [
    { value: "all", label: "Todos los productos" },
    ...ptProducts.map((p) => ({ value: p.id, label: productNameWithWeight(p) })),
  ]

  const isCustomRange = !PERIOD_OPTIONS.slice(0, -1).some((p) => p.value === filters.preset)

  const periodValue = isCustomRange ? "custom" : (filters.preset || "month")

  const periodOptions = PERIOD_OPTIONS.map((p) => {
    if (p.value === "custom" && isCustomRange) {
      const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      const from = filters.dateStart ? new Date(filters.dateStart + "T12:00:00") : null
      const to = filters.dateEnd ? new Date(filters.dateEnd + "T12:00:00") : null
      const label = from && to ? `${fmt(from)} - ${fmt(to)}` : "Rango personalizado"
      return { value: "custom", label }
    }
    return p
  })

  const handlePeriodChange = (value: string) => {
    if (value === "custom") {
      setCalendarOpen(true)
      return
    }
    setFilter("preset", value as DatePreset)
  }

  return (
    <div className={`${glassStyles.containers.filterPanel} !p-3 md:!p-4`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
        <div>
          <label className={LABEL_CLASS}>Operación</label>
          <SearchableSelect
            options={operationOptions}
            value={filters.operation}
            onChange={(v) => setFilter("operation", v || "all")}
            placeholder="Todas"
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Centro</label>
          <SearchableSelect
            options={wcOptions}
            value={filters.workCenter}
            onChange={(v) => setFilter("workCenter", v || "all")}
            placeholder="Todos"
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Producto</label>
          <SearchableSelect
            options={productOptions}
            value={filters.product}
            onChange={(v) => setFilter("product", v || "all")}
            placeholder="Todos"
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Período</label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <div>
              <SearchableSelect
                options={periodOptions}
                value={periodValue}
                onChange={handlePeriodChange}
                placeholder="Seleccionar"
              />
            </div>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="range"
                selected={selectedRange}
                onSelect={(range) => {
                  setSelectedRange(range || {})
                  if (range?.from) {
                    const fromStr = range.from.toISOString().split("T")[0]
                    const toStr = range.to ? range.to.toISOString().split("T")[0] : fromStr
                    setMultipleFilters({ dateStart: fromStr, dateEnd: toStr, preset: "" })
                    if (range.to) setCalendarOpen(false)
                  }
                }}
                locale={es}
                className="p-3"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="col-span-2 lg:col-span-2">
          <label className={LABEL_CLASS}>Granularidad</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {GRANULARITIES.map((g) => (
              <button
                key={g.value}
                onClick={() => setFilter("granularity", g.value)}
                className={`
                  flex-1 h-[38px] px-2 text-xs font-medium transition-all
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
  )
}
