"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { format, isSameDay } from "date-fns"
import { Loader2, Package, AlertTriangle, TrendingUp } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { WeeklyGridHeader } from "./WeeklyGridHeader"
import { WeeklyGridRow } from "./WeeklyGridRow"
import { WeekSelector } from "./WeekSelector"
import { DayDemandBreakdownModal } from "./DayDemandBreakdownModal"
import { AddProductionModal } from "./AddProductionModal"

import { useWeeklyPlan } from "@/hooks/use-weekly-plan"
import { useWeeklyForecast } from "@/hooks/use-weekly-forecast"
import { useWeeklyBalance } from "@/hooks/use-weekly-balance"
import { useShiftSchedules, ShiftSchedule } from "@/hooks/use-shift-schedules"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProducts } from "@/hooks/use-products"
import { useProductWorkCenterMapping } from "@/hooks/use-product-work-center-mapping"
import { useOperations } from "@/hooks/use-operations"

const CELL_WIDTH = 90

export function WeeklyPlanGrid() {
  // Plan navigation
  const {
    currentWeekStart,
    weekInfo,
    nextWeek,
    previousWeek,
    goToCurrentWeek,
    goToWeek,
    getWeeksList
  } = useWeeklyPlan()

  // Data hooks
  const { forecasts, loading: forecastLoading, getDemandBreakdown } = useWeeklyForecast(currentWeekStart)
  const { balances, loading: balanceLoading, summary: balanceSummary } = useWeeklyBalance(currentWeekStart)
  const {
    schedules,
    loading: schedulesLoading,
    createSchedule,
    updateSchedule,
    updateQuantity,
    deleteSchedule
  } = useShiftSchedules(currentWeekStart)
  const { workCenters, loading: workCentersLoading } = useWorkCenters()
  const { products, loading: productsLoading } = useProducts()
  const { mappings, loading: mappingsLoading } = useProductWorkCenterMapping()
  const { operations, loading: operationsLoading } = useOperations()

  // Get the ID of "Armado" operation
  const armadoOperationId = useMemo(() => {
    const armadoOp = operations.find(op => op.name.toLowerCase() === "armado")
    return armadoOp?.id || null
  }, [operations])

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addModalContext, setAddModalContext] = useState<{
    resourceId: string
    dayIndex: number
    shiftNumber: 1 | 2 | 3
  } | null>(null)

  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [breakdownContext, setBreakdownContext] = useState<{
    productId: string
    productName: string
    dayIndex: number
    date: Date
  } | null>(null)

  const [editingSchedule, setEditingSchedule] = useState<ShiftSchedule | null>(null)

  const loading = forecastLoading || balanceLoading || schedulesLoading ||
    workCentersLoading || productsLoading || mappingsLoading || operationsLoading

  // Build resource data with assigned products (filtered by Armado operation)
  const resourcesWithProducts = useMemo(() => {
    if (!workCenters || !products || !mappings || !armadoOperationId) return []

    // Filter work centers that belong to "Armado" operation
    const armadoWorkCenters = workCenters.filter(wc =>
      wc.operation_id === armadoOperationId &&
      wc.is_active
    )

    return armadoWorkCenters
      .map(wc => {
        // Get products assigned to this work center for Armado operation
        const assignedProductIds = mappings
          .filter(m =>
            m.work_center_id === wc.id &&
            m.operation_id === armadoOperationId
          )
          .map(m => m.product_id)

        const assignedProducts = products
          .filter(p => assignedProductIds.includes(p.id) && p.category === 'PT' && p.is_active)
          .map(p => ({
            id: p.id,
            name: p.name,
            weight: (p as any).weight || null, // Include weight if available
            currentStock: balances.find(b => b.productId === p.id)?.initialInventory || 0
          }))

        return {
          id: wc.id,
          name: wc.name || wc.code,
          products: assignedProducts
        }
      })
      .filter(r => r.products.length > 0) // Only show resources with assigned products
  }, [workCenters, products, mappings, balances, armadoOperationId])

  // Build forecast map by product
  const forecastsByProduct = useMemo(() => {
    const map = new Map<string, any[]>()
    forecasts.forEach(f => {
      map.set(f.productId, f.dailyForecasts)
    })
    return map
  }, [forecasts])

  // Build balance map by product
  const balancesByProduct = useMemo(() => {
    const map = new Map<string, any[]>()
    balances.forEach(b => {
      map.set(b.productId, b.dailyBalances)
    })
    return map
  }, [balances])

  // Weeks list for selector
  const weeksList = useMemo(() => getWeeksList(4, 8), [getWeeksList])

  // Check if day is today
  const isToday = useCallback((dayIndex: number) => {
    const today = new Date()
    const dayDate = new Date(currentWeekStart)
    dayDate.setDate(dayDate.getDate() + dayIndex)
    return isSameDay(today, dayDate)
  }, [currentWeekStart])

  // Handlers
  const handleAddProduction = useCallback((resourceId: string, dayIndex: number, shiftNumber: 1 | 2 | 3) => {
    setAddModalContext({ resourceId, dayIndex, shiftNumber })
    setAddModalOpen(true)
  }, [])

  const handleEditSchedule = useCallback((schedule: ShiftSchedule) => {
    setEditingSchedule(schedule)
    setAddModalContext({
      resourceId: schedule.resourceId,
      dayIndex: schedule.dayIndex,
      shiftNumber: schedule.shiftNumber
    })
    setAddModalOpen(true)
  }, [])

  const handleDeleteSchedule = useCallback(async (id: string) => {
    const success = await deleteSchedule(id)
    if (success) {
      toast.success("Producción eliminada")
    }
  }, [deleteSchedule])

  const handleUpdateQuantity = useCallback(async (id: string, quantity: number) => {
    const success = await updateQuantity(id, quantity)
    if (!success) {
      toast.error("Error al actualizar cantidad")
    }
  }, [updateQuantity])

  const handleViewDemandBreakdown = useCallback((productId: string, dayIndex: number) => {
    const product = products.find(p => p.id === productId)
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + dayIndex)

    setBreakdownContext({
      productId,
      productName: product?.name || 'Producto',
      dayIndex,
      date
    })
    setBreakdownModalOpen(true)
  }, [products, currentWeekStart])

  const handleCreateSchedule = useCallback(async (data: {
    productId: string
    quantity: number
    durationHours?: number
  }) => {
    if (!addModalContext) return

    const result = await createSchedule({
      resourceId: addModalContext.resourceId,
      productId: data.productId,
      quantity: data.quantity,
      dayIndex: addModalContext.dayIndex,
      shiftNumber: addModalContext.shiftNumber,
      durationHours: data.durationHours
    })

    if (result) {
      setAddModalOpen(false)
      setAddModalContext(null)
      setEditingSchedule(null)
    }
  }, [addModalContext, createSchedule])

  const handleUpdateSchedule = useCallback(async (data: {
    productId: string
    quantity: number
    durationHours?: number
  }) => {
    if (!editingSchedule) return

    const result = await updateSchedule(editingSchedule.id, {
      productId: data.productId,
      quantity: data.quantity,
      durationHours: data.durationHours
    })

    if (result) {
      setAddModalOpen(false)
      setAddModalContext(null)
      setEditingSchedule(null)
    }
  }, [editingSchedule, updateSchedule])

  const handleModalClose = useCallback(() => {
    setAddModalOpen(false)
    setAddModalContext(null)
    setEditingSchedule(null)
  }, [])

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    const forecastTotal = forecasts.reduce((sum, f) => sum + f.weeklyTotal, 0)
    const productionTotal = schedules.reduce((sum, s) => sum + s.quantity, 0)
    return { forecast: forecastTotal, production: productionTotal }
  }, [forecasts, schedules])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A84FF]" />
          <span className="text-[#8E8E93]">Cargando plan semanal...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Top bar with week selector and summary */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1C1C1E] border-b border-[#2C2C2E]">
        <WeekSelector
          weekInfo={weekInfo}
          onPreviousWeek={previousWeek}
          onNextWeek={nextWeek}
          onGoToCurrentWeek={goToCurrentWeek}
          onSelectWeek={goToWeek}
          weeksList={weeksList}
        />

        {/* Summary cards */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2C2C2E] rounded-lg">
            <Package className="h-4 w-4 text-[#FF9500]" />
            <div className="text-xs">
              <span className="text-[#8E8E93]">Forecast: </span>
              <span className="text-white font-semibold">{grandTotals.forecast.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2C2C2E] rounded-lg">
            <TrendingUp className="h-4 w-4 text-[#0A84FF]" />
            <div className="text-xs">
              <span className="text-[#8E8E93]">Producción: </span>
              <span className="text-white font-semibold">{grandTotals.production.toLocaleString()}</span>
            </div>
          </div>

          {balanceSummary.productsWithDeficit > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FF453A]/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-[#FF453A]" />
              <div className="text-xs">
                <span className="text-[#FF453A] font-semibold">
                  {balanceSummary.productsWithDeficit} producto{balanceSummary.productsWithDeficit > 1 ? 's' : ''} con déficit
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid container */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: 280 + (CELL_WIDTH * 21) + 80 }}>
          {/* Header */}
          <WeeklyGridHeader weekStartDate={currentWeekStart} cellWidth={CELL_WIDTH} />

          {/* Rows */}
          <div>
            {resourcesWithProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-[#8E8E93]">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay centros de trabajo con productos asignados</p>
                  <p className="text-xs mt-1">Asigna productos a los centros de trabajo para comenzar a planificar</p>
                </div>
              </div>
            ) : (
              resourcesWithProducts.map(resource => (
                <WeeklyGridRow
                  key={resource.id}
                  resourceId={resource.id}
                  resourceName={resource.name}
                  products={resource.products}
                  schedules={schedules.filter(s => s.resourceId === resource.id)}
                  dailyForecasts={forecastsByProduct}
                  dailyBalances={balancesByProduct}
                  onAddProduction={handleAddProduction}
                  onEditSchedule={handleEditSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                  onUpdateQuantity={handleUpdateQuantity}
                  onViewDemandBreakdown={handleViewDemandBreakdown}
                  cellWidth={CELL_WIDTH}
                  isToday={isToday}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Production Modal */}
      {addModalOpen && addModalContext && (
        <AddProductionModal
          isOpen={addModalOpen}
          onClose={handleModalClose}
          onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
          resourceId={addModalContext.resourceId}
          dayIndex={addModalContext.dayIndex}
          shiftNumber={addModalContext.shiftNumber}
          weekStartDate={currentWeekStart}
          products={resourcesWithProducts.find(r => r.id === addModalContext.resourceId)?.products || []}
          editingSchedule={editingSchedule}
        />
      )}

      {/* Demand Breakdown Modal */}
      {breakdownModalOpen && breakdownContext && (
        <DayDemandBreakdownModal
          isOpen={breakdownModalOpen}
          onClose={() => {
            setBreakdownModalOpen(false)
            setBreakdownContext(null)
          }}
          productId={breakdownContext.productId}
          productName={breakdownContext.productName}
          date={breakdownContext.date}
          getDemandBreakdown={getDemandBreakdown}
        />
      )}
    </div>
  )
}
