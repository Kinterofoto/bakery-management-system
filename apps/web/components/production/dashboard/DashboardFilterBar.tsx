"use client"

import { Factory, Package } from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { glassStyles } from "@/components/dashboard/glass-styles"
import type { Database } from "@/lib/database.types"
import type { DashboardFilters, Granularity, DatePreset } from "@/lib/production-analytics-utils"

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
  const wcOptions = [
    { value: "all", label: "Todos los centros" },
    ...workCenters.map((wc) => ({ value: wc.id, label: wc.name })),
  ]

  const ptProducts = products.filter((p) => p.category === "PT" || p.category === "PP")
  const productOptions = [
    { value: "all", label: "Todos los productos" },
    ...ptProducts.map((p) => ({ value: p.id, label: p.name })),
  ]

  return (
    <div className={glassStyles.containers.filterPanel}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Work Center */}
        <div>
          <label className={`${glassStyles.typography.caption} block mb-2`}>Centro de Trabajo</label>
          <SearchableSelect
            options={wcOptions}
            value={filters.workCenter}
            onChange={(v) => setFilter("workCenter", v || "all")}
            placeholder="Todos los centros"
            icon={<Factory className="w-4 h-4" />}
          />
        </div>

        {/* Product */}
        <div>
          <label className={`${glassStyles.typography.caption} block mb-2`}>Producto</label>
          <SearchableSelect
            options={productOptions}
            value={filters.product}
            onChange={(v) => setFilter("product", v || "all")}
            placeholder="Todos los productos"
            icon={<Package className="w-4 h-4" />}
          />
        </div>

        {/* Date Range */}
        <div>
          <label className={`${glassStyles.typography.caption} block mb-2`}>Período</label>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setFilter("preset", p.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${filters.preset === p.value
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-white/50 text-gray-600 hover:bg-white/80 border border-gray-200/50"
                  }
                `}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              value={filters.dateStart}
              onChange={(e) => setMultipleFilters({ dateStart: e.target.value, preset: "" })}
              className="flex-1 px-2 py-1 text-xs rounded-lg border border-gray-200/50 bg-white/50"
            />
            <input
              type="date"
              value={filters.dateEnd}
              onChange={(e) => setMultipleFilters({ dateEnd: e.target.value, preset: "" })}
              className="flex-1 px-2 py-1 text-xs rounded-lg border border-gray-200/50 bg-white/50"
            />
          </div>
        </div>

        {/* Granularity */}
        <div>
          <label className={`${glassStyles.typography.caption} block mb-2`}>Granularidad</label>
          <div className="flex rounded-xl overflow-hidden border border-gray-200/50">
            {GRANULARITIES.map((g) => (
              <button
                key={g.value}
                onClick={() => setFilter("granularity", g.value)}
                className={`
                  flex-1 px-3 py-2 text-xs font-medium transition-all
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
