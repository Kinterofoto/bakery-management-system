"use client"

import { KPIRow } from "./KPIRow"
import { ExpandableChart } from "./ExpandableChart"
import { ProductionTimelineChart } from "./charts/ProductionTimelineChart"
import { ProductBarChart } from "./charts/ProductBarChart"
import { WorkCenterComparisonChart } from "./charts/WorkCenterComparisonChart"
import { ProductionDistributionChart } from "./charts/ProductionDistributionChart"
import type { PeriodComparison, TimeSeriesPoint, ProductAggregate, WorkCenterAggregate, Granularity } from "@/lib/production-analytics-utils"

interface OverviewTabProps {
  kpis: PeriodComparison
  timeSeriesData: TimeSeriesPoint[]
  productData: ProductAggregate[]
  workCenterData: WorkCenterAggregate[]
  productDistribution: (ProductAggregate & { percentage: number })[]
  granularity: Granularity
  loading: boolean
}

export function OverviewTab({ kpis, timeSeriesData, productData, workCenterData, productDistribution, granularity, loading }: OverviewTabProps) {
  return (
    <div className="space-y-3 md:space-y-4">
      <KPIRow kpis={kpis} granularity={granularity} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <ExpandableChart
          title="Producción en el Tiempo"
          description="Unidades y kilos por período"
          expandedContent={<ProductionTimelineChart data={timeSeriesData} height={500} />}
        >
          <ProductionTimelineChart data={timeSeriesData} height={260} />
        </ExpandableChart>

        <ExpandableChart
          title="Top Productos"
          description="Productos con mayor producción"
          expandedContent={<ProductBarChart data={productData} height={500} limit={20} />}
        >
          <ProductBarChart data={productData} height={260} />
        </ExpandableChart>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <ExpandableChart
          title="Centros de Trabajo"
          description="Unidades y calidad por centro"
          expandedContent={<WorkCenterComparisonChart data={workCenterData} height={500} />}
        >
          <WorkCenterComparisonChart data={workCenterData} height={260} />
        </ExpandableChart>

        <ExpandableChart
          title="Distribución"
          description="Proporción por producto"
          expandedContent={<ProductionDistributionChart data={productDistribution} height={500} />}
        >
          <ProductionDistributionChart data={productDistribution} height={260} />
        </ExpandableChart>
      </div>
    </div>
  )
}
