"use client"

import { useMemo, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useProducts } from "@/hooks/use-products"
import { useWorkCenters } from "@/hooks/use-work-centers"
import {
  type DashboardFilters,
  type Granularity,
  type DatePreset,
  filterShiftsAndProductions,
  groupByTimePeriod,
  aggregateByProduct,
  aggregateByWorkCenter,
  aggregateByShiftName,
  calculatePeriodComparison,
  getShiftScatterData,
  getDateRangeFromPreset,
} from "@/lib/production-analytics-utils"

export function useDashboardAnalytics() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const { shifts, loading: shiftsLoading } = useProductionShifts()
  const { productions, loading: productionsLoading } = useShiftProductions()
  const { products, loading: productsLoading } = useProducts()
  const { workCenters, loading: workCentersLoading } = useWorkCenters()

  // Read filters from URL
  const filters: DashboardFilters = useMemo(() => {
    const preset = (searchParams.get("preset") as DatePreset) || "month"
    const { dateStart: defaultStart, dateEnd: defaultEnd } = getDateRangeFromPreset(preset)
    return {
      tab: searchParams.get("tab") || "overview",
      workCenter: searchParams.get("workCenter") || "all",
      product: searchParams.get("product") || "all",
      dateStart: searchParams.get("dateStart") || defaultStart,
      dateEnd: searchParams.get("dateEnd") || defaultEnd,
      preset,
      granularity: (searchParams.get("granularity") as Granularity) || "day",
    }
  }, [searchParams])

  // Update filter in URL
  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)

      // When changing preset, auto-set dates
      if (key === "preset") {
        const { dateStart, dateEnd } = getDateRangeFromPreset(value as DatePreset)
        params.set("dateStart", dateStart)
        params.set("dateEnd", dateEnd)
      }

      // When changing custom dates, clear preset
      if (key === "dateStart" || key === "dateEnd") {
        params.delete("preset")
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  const setMultipleFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value)
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  // Filter data
  const { filteredShifts, filteredProductions } = useMemo(
    () => filterShiftsAndProductions(shifts, productions, filters),
    [shifts, productions, filters]
  )

  // Aggregations
  const timeSeriesData = useMemo(
    () => groupByTimePeriod(filteredShifts, filteredProductions, products, filters.granularity),
    [filteredShifts, filteredProductions, products, filters.granularity]
  )

  const productData = useMemo(
    () => aggregateByProduct(filteredShifts, filteredProductions, products),
    [filteredShifts, filteredProductions, products]
  )

  const workCenterData = useMemo(
    () => aggregateByWorkCenter(filteredShifts, filteredProductions, products, workCenters),
    [filteredShifts, filteredProductions, products, workCenters]
  )

  const shiftTypeData = useMemo(
    () => aggregateByShiftName(filteredShifts, filteredProductions, products),
    [filteredShifts, filteredProductions, products]
  )

  const kpis = useMemo(
    () => calculatePeriodComparison(shifts, productions, products, filters),
    [shifts, productions, products, filters]
  )

  const scatterData = useMemo(
    () => getShiftScatterData(filteredShifts, filteredProductions, products, workCenters),
    [filteredShifts, filteredProductions, products, workCenters]
  )

  const productDistribution = useMemo(() => {
    const total = productData.reduce((s, p) => s + p.goodUnits, 0)
    return productData.slice(0, 8).map((p) => ({
      ...p,
      percentage: total > 0 ? Math.round((p.goodUnits / total) * 1000) / 10 : 0,
    }))
  }, [productData])

  const loading = shiftsLoading || productionsLoading || productsLoading || workCentersLoading

  return {
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
  }
}
