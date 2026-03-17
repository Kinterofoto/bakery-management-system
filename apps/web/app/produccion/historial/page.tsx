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
  { id: "overview", label: "Vista General", icon: BarChart3 },
  { id: "products", label: "Por Producto", icon: Package },
  { id: "shifts", label: "Por Turno", icon: Clock },
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/produccion")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={`${glassStyles.typography.title1} text-gray-900`}>Dashboard de Producción</h1>
            <p className={glassStyles.typography.caption}>Análisis detallado de producción</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilterBar
        filters={filters}
        setFilter={setFilter}
        setMultipleFilters={setMultipleFilters}
        workCenters={workCenters}
        products={products}
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200/50 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilter("tab", tab.id)}
              className={`${getTabTriggerClass(isActive)} flex items-center gap-2 whitespace-nowrap`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
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
