"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, Package, Clock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { glassStyles, getTabTriggerClass } from "@/components/dashboard/glass-styles"
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics"
import { DashboardFilterBar } from "@/components/production/dashboard/DashboardFilterBar"
import { OverviewTab } from "@/components/production/dashboard/OverviewTab"
import { ProductTab } from "@/components/production/dashboard/ProductTab"
import { ShiftTab } from "@/components/production/dashboard/ShiftTab"
import { TrendsTab } from "@/components/production/dashboard/TrendsTab"

const TABS = [
  { id: "overview", label: "General", icon: BarChart3 },
  { id: "products", label: "Producto", icon: Package },
  { id: "shifts", label: "Turno", icon: Clock },
  { id: "trends", label: "Tendencias", icon: TrendingUp },
]

function HistorialDashboard() {
  const router = useRouter()
  const {
    filters,
    setFilter,
    setMultipleFilters,
    kpis,
    timeSeriesData,
    productData,
    workCenterData,
    shiftTypeData,
    scatterData,
    productDistribution,
    filteredShifts,
    filteredProductions,
    products,
    workCenters,
    loading,
  } = useDashboardAnalytics()

  const activeTab = filters.tab

  return (
    <div className="container mx-auto px-3 py-3 md:px-6 md:py-6 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0" onClick={() => router.push("/produccion")}>
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-semibold text-gray-900 truncate">Dashboard de Producción</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Análisis detallado de producción</p>
        </div>
      </div>

      {/* Filters */}
      <div className="relative z-20">
        <DashboardFilterBar
          filters={filters}
          setFilter={setFilter}
          setMultipleFilters={setMultipleFilters}
          workCenters={workCenters}
          products={products}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200/50 overflow-x-auto relative z-10 -mx-3 px-3 md:mx-0 md:px-0">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilter("tab", tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-3
                text-xs md:text-sm font-semibold whitespace-nowrap
                border-b-2 transition-all duration-200
                ${isActive
                  ? "text-gray-900 border-blue-500"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          kpis={kpis}
          timeSeriesData={timeSeriesData}
          productData={productData}
          workCenterData={workCenterData}
          productDistribution={productDistribution}
          granularity={filters.granularity}
          loading={loading}
        />
      )}
      {activeTab === "products" && (
        <ProductTab productData={productData} loading={loading} />
      )}
      {activeTab === "shifts" && (
        <ShiftTab shiftTypeData={shiftTypeData} scatterData={scatterData} loading={loading} />
      )}
      {activeTab === "trends" && (
        <TrendsTab
          timeSeriesData={timeSeriesData}
          shifts={filteredShifts}
          productions={filteredProductions}
          products={products}
          filters={filters}
          loading={loading}
        />
      )}
    </div>
  )
}

export default function HistorialGeneralPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    }>
      <HistorialDashboard />
    </Suspense>
  )
}
