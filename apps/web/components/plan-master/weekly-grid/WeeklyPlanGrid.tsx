"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { format, isSameDay } from "date-fns"
import { Loader2, Package, AlertTriangle, TrendingUp } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { WeeklyGridHeader } from "./WeeklyGridHeader"
import { WeeklyGridRow } from "./WeeklyGridRow"
import { WeekSelector } from "./WeekSelector"
import { DayDemandBreakdownModal } from "./DayDemandBreakdownModal"
import { ForecastBreakdownModal } from "../ForecastBreakdownModal"
import { AddProductionModal } from "./AddProductionModal"
import { CascadePreviewModal } from "./CascadePreviewModal"

import { useWeeklyPlan } from "@/hooks/use-weekly-plan"
import { useWeeklyForecast } from "@/hooks/use-weekly-forecast"
import { useWeeklyBalance } from "@/hooks/use-weekly-balance"
import { useShiftSchedules, ShiftSchedule } from "@/hooks/use-shift-schedules"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProducts } from "@/hooks/use-products"
import { useProductWorkCenterMapping } from "@/hooks/use-product-work-center-mapping"
import { useOperations } from "@/hooks/use-operations"
import { useProductivity } from "@/hooks/use-productivity"
import { useWorkCenterStaffing } from "@/hooks/use-work-center-staffing"
import { useProductionRoutes } from "@/hooks/use-production-routes"
import { useShiftBlocking } from "@/hooks/use-shift-blocking"
import { createCascadeV2 } from "@/app/planmaster/actions"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const CELL_WIDTH = 90

// Format date as local ISO string (without timezone conversion)
function toLocalISOString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

const SHIFT_CONFIG = [
  { startHour: 22 }, // T1: 22:00 (día anterior) - 06:00 (día actual)
  { startHour: 6 },  // T2: 06:00 - 14:00
  { startHour: 14 }  // T3: 14:00 - 22:00
]

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
    deleteSchedule,
    moveSchedule,
    refetch: refetchSchedules
  } = useShiftSchedules(currentWeekStart)
  const { workCenters, loading: workCentersLoading } = useWorkCenters()
  const { products, loading: productsLoading } = useProducts()
  const { mappings, loading: mappingsLoading } = useProductWorkCenterMapping()
  const { operations, loading: operationsLoading } = useOperations()
  const { getProductivityByProductAndOperation } = useProductivity()
  const { getStaffing, fetchStaffing: refetchStaffing } = useWorkCenterStaffing(currentWeekStart)
  const { fetchRoutesByProduct } = useProductionRoutes()
  const { isShiftBlocked, toggleBlock } = useShiftBlocking(currentWeekStart)

  const [isProductionView, setIsProductionView] = useState(false)

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addModalContext, setAddModalContext] = useState<{
    resourceId: string
    operationId: string
    dayIndex: number
    shiftNumber: 1 | 2 | 3
    productId?: string
    startHour?: number
    durationHours?: number
  } | null>(null)

  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [breakdownContext, setBreakdownContext] = useState<{
    productId: string
    productName: string
    dayIndex: number
    date: Date
  } | null>(null)

  // Forecast breakdown modal state (Análisis de Demanda Proyectada)
  const [forecastModalOpen, setForecastModalOpen] = useState(false)
  const [forecastContext, setForecastContext] = useState<{
    productId: string
    productName: string
    emaForecast: number
  } | null>(null)

  // Cascade modal state
  const [cascadeModalOpen, setCascadeModalOpen] = useState(false)
  const [cascadeContext, setCascadeContext] = useState<{
    workCenterId: string
    workCenterName: string
    productId: string
    productName: string
    startDatetime: string
    durationHours: number
    staffCount: number
  } | null>(null)

  const [latestCreatedScheduleId, setLatestCreatedScheduleId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [creatingMessage, setCreatingMessage] = useState<string>("")

  const [editingSchedule, setEditingSchedule] = useState<ShiftSchedule | null>(null)

  const loading = forecastLoading || balanceLoading || schedulesLoading ||
    workCentersLoading || productsLoading || mappingsLoading || operationsLoading

  // Build resource data with assigned products (ALL active work centers)
  const resourcesWithProducts = useMemo(() => {
    if (!workCenters || !products || !mappings) return []

    // Get ALL active work centers (not just Armado)
    const activeWorkCenters = workCenters.filter(wc =>
      (wc as any).is_active
    )

    return activeWorkCenters
      .map(wc => {
        const wcOperationId = (wc as any).operation_id

        // Get products assigned to this work center for its operation
        const assignedProductIds = mappings
          .filter(m =>
            m.work_center_id === wc.id &&
            m.operation_id === wcOperationId
          )
          .map(m => m.product_id)

        const assignedProducts = products
          .filter(p => assignedProductIds.includes(p.id) && ['PT', 'PP'].includes(p.category) && (p as any).is_active)
          .map(p => ({
            id: p.id,
            name: p.name,
            weight: (p as any).weight || null,
            currentStock: balances.find(b => b.productId === p.id)?.initialInventory || 0
          }))

        // Get operation name for display
        const operation = operations.find(op => op.id === wcOperationId)

        return {
          id: wc.id,
          name: wc.name || wc.code,
          operationId: wcOperationId,
          operationName: operation?.name || '',
          products: assignedProducts
        }
      })
      .filter(r => r.products.length > 0) // Only show resources with assigned products
  }, [workCenters, products, mappings, balances, operations])

  // Helper function to get operation ID from resource ID
  const getOperationIdByResourceId = useCallback((resourceId: string): string | null => {
    const resource = resourcesWithProducts.find(r => r.id === resourceId)
    return resource?.operationId || null
  }, [resourcesWithProducts])

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
  const weeksList = useMemo(() => getWeeksList(12, 12), [getWeeksList])

  // Check if day is today
  const isToday = useCallback((dayIndex: number) => {
    const today = new Date()
    const dayDate = new Date(currentWeekStart)
    dayDate.setDate(dayDate.getDate() + dayIndex)
    return isSameDay(today, dayDate)
  }, [currentWeekStart])

  // Handlers
  const handleDirectCreate = useCallback(async (
    resourceId: string,
    dayIndex: number,
    shiftNumber: 1 | 2 | 3,
    productId: string,
    startHour: number,
    durationHours: number
  ) => {
    if (isCreating) return null
    setIsCreating(true)
    setCreatingMessage("Verificando ruta de producción...")
    try {
      // Calculate start datetime for cascade
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + dayIndex)

      // Get shift start hour
      const shiftStartHours = [22, 6, 14] // T1=22, T2=6, T3=14
      const actualStartHour = shiftStartHours[shiftNumber - 1] + startHour
      date.setHours(actualStartHour, 0, 0, 0)

      // For T1 (22:00), we need to go back one day since T1 starts the night before
      if (shiftNumber === 1) {
        date.setDate(date.getDate() - 1)
      }

      // Get staff count for this shift
      const staffDate = new Date(currentWeekStart)
      staffDate.setDate(staffDate.getDate() + dayIndex)
      const staffCount = getStaffing(resourceId, staffDate, shiftNumber)

      // Check if product has multiple operations and productivity
      // Only attempt cascade if: 1) Multiple operations, 2) Has productivity
      const productRoutes = await fetchRoutesByProduct(productId)
      const hasMultipleOperations = productRoutes.length > 1

      // Check if first operation has productivity
      const operationId = getOperationIdByResourceId(resourceId)
      let hasProductivity = false
      if (operationId) {
        try {
          const prodData = await getProductivityByProductAndOperation(productId, operationId)
          hasProductivity = !!prodData && prodData.is_active
        } catch (error) {
          console.warn('Could not check productivity:', error)
        }
      }

      // Only attempt cascade if product has multiple operations AND has productivity
      const shouldAttemptCascade = hasMultipleOperations && hasProductivity

      if (!shouldAttemptCascade) {
        // Skip cascade - go directly to simple schedule creation
        if (!hasMultipleOperations) {
          console.log('Skipping cascade: Product has only one operation')
        }
        if (!hasProductivity) {
          console.log('Skipping cascade: No productivity configured')
        }
        // Fall through to single schedule creation below
      } else {
        // Try to create cascade first
        setCreatingMessage("Generando cascada de producción...")
      try {
        const localDatetime = toLocalISOString(date)
        console.log('Cascade params:', {
          currentWeekStart: toLocalISOString(currentWeekStart),
          dayIndex,
          shiftNumber,
          startHour,
          calculatedDate: localDatetime,
        })

        // V2: Server Action → PL/pgSQL RPC (~500ms)
        let cascadeData: any = null
        let cascadeError: string | null = null
        try {
          cascadeData = await createCascadeV2({
            product_id: productId,
            start_datetime: localDatetime,
            duration_hours: durationHours,
            staff_count: staffCount || 1,
          })
        } catch (v2Error) {
          console.warn('Cascade V2 failed, falling back to V1:', v2Error)
          // V1 fallback: fetch → FastAPI
          try {
            const cascadeResponse = await fetch(`${API_URL}/api/production/cascade/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                work_center_id: resourceId,
                product_id: productId,
                start_datetime: localDatetime,
                duration_hours: durationHours,
                staff_count: staffCount || 1,
              }),
            })
            if (cascadeResponse.ok) {
              cascadeData = await cascadeResponse.json()
            } else {
              const errorData = await cascadeResponse.json()
              cascadeError = errorData.detail || 'Error desconocido'
            }
          } catch (v1Error) {
            cascadeError = v1Error instanceof Error ? v1Error.message : 'Error desconocido'
          }
        }

        if (cascadeData) {
          setCreatingMessage("Actualizando vista...")
          toast.success(`Cascada creada: ${cascadeData.schedules_created} schedules en ${cascadeData.work_centers?.length || 0} centros`)
          // Refresh schedules without page reload
          // Small delay to ensure DB transaction is committed
          await new Promise(resolve => setTimeout(resolve, 500))
          await refetchSchedules()
          // Another small delay to let React process state update
          await new Promise(resolve => setTimeout(resolve, 100))
          return { id: 'cascade-created' }
        }

        if (cascadeError) {
          const isNoRouteError = cascadeError.includes("No production route") ||
                                 cascadeError.includes("not in the production route")
          if (!isNoRouteError) {
            // Other error (like overlap) - cascade may have partially created schedules
            // DO NOT create fallback, just show error and refresh
            console.error('Cascade error:', cascadeError)
            toast.error(`Error en cascada: ${cascadeError}`)
            await refetchSchedules()
            return null
          }
        }
      } catch (cascadeError) {
        console.warn('Cascade API error (falling back to single):', cascadeError)
      }
      } // End of if (shouldAttemptCascade)

      // Fallback: Create single schedule
      // This runs if: 1) Product has only one operation, 2) No productivity, or 3) Cascade failed
      setCreatingMessage("Creando schedule simple...")
      // operationId already declared above
      let calculatedQuantity = 0

      if (operationId && productId) {
        try {
          const prodData = await getProductivityByProductAndOperation(productId, operationId)

          if (prodData && prodData.is_active && durationHours > 0) {
            const baseQuantity = durationHours * Number(prodData.units_per_hour)
            calculatedQuantity = staffCount > 0
              ? Math.round(baseQuantity * staffCount)
              : Math.round(baseQuantity)
          }
        } catch (error) {
          console.error('Error consultando productividad:', error)
        }
      }

      const newSchedule = await createSchedule({
        resourceId,
        productId,
        quantity: calculatedQuantity,
        dayIndex,
        shiftNumber,
        durationHours,
        startHour
      })

      if (newSchedule?.id) {
        setLatestCreatedScheduleId(newSchedule.id)
        setTimeout(() => setLatestCreatedScheduleId(null), 2000)
      }

      return newSchedule
    } finally {
      setIsCreating(false)
      setCreatingMessage("")
    }
  }, [createSchedule, isCreating, getOperationIdByResourceId, getProductivityByProductAndOperation, currentWeekStart, getStaffing, refetchSchedules, fetchRoutesByProduct])

  const handleAddProduction = useCallback(async (
    resourceId: string,
    dayIndex: number,
    shiftNumber: 1 | 2 | 3,
    productId?: string,
    startHour?: number,
    durationHours?: number
  ) => {
    // try to auto-resolve product if not provided and resource has exactly one product
    let resolvedProductId = productId
    if (!resolvedProductId) {
      const resource = resourcesWithProducts.find(r => r.id === resourceId)
      if (resource && resource.products.length === 1) {
        resolvedProductId = resource.products[0].id
      }
    }

    // If we have product, we can do direct create
    if (resolvedProductId) {
      const finalStartHour = startHour !== undefined ? startHour : 0
      const finalDuration = durationHours !== undefined ? durationHours : 1 // default 1h if clicking +

      const result = await handleDirectCreate(
        resourceId,
        dayIndex,
        shiftNumber,
        resolvedProductId,
        finalStartHour,
        finalDuration
      )
      if (result) return // Successfully created directly
    }

    if (!resolvedProductId) {
      toast.error("Seleccione un producto para programar producción")
    }
  }, [handleDirectCreate, resourcesWithProducts])

  const handleEditSchedule = useCallback((schedule: ShiftSchedule) => {
    // Modal disabled for editing - using inline editing instead
    /*
    setEditingSchedule(schedule)
    setAddModalContext({
      resourceId: schedule.resourceId,
      dayIndex: schedule.dayIndex,
      shiftNumber: schedule.shiftNumber
    })
    setAddModalOpen(true)
    */
  }, [])

  const handleDeleteSchedule = useCallback(async (id: string) => {
    // Find the schedule to check if it belongs to a cascade order
    const schedule = schedules.find(s => s.id === id)
    const orderNumber = schedule?.productionOrderNumber

    if (orderNumber) {
      // Cascade delete: delete entire order + PP dependencies via API
      try {
        const response = await fetch(`${API_URL}/api/production/cascade/order/${orderNumber}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          const data = await response.json()
          toast.error(data.detail || "Error al eliminar orden")
          return
        }

        const result = await response.json()
        toast.success(result.message || "Orden eliminada con dependencias")
        refetchSchedules()
      } catch (err) {
        toast.error("Error al eliminar orden de producción")
      }
    } else {
      // Simple delete for non-cascade schedules
      const success = await deleteSchedule(id)
      if (success) {
        toast.success("Producción eliminada")
      }
    }
  }, [deleteSchedule, schedules, refetchSchedules])

  const handleUpdateQuantity = useCallback(async (id: string, quantity: number) => {
    const success = await updateQuantity(id, quantity)
    if (!success) {
      toast.error("Error al actualizar cantidad")
    }
  }, [updateQuantity])

  const handleStaffingChange = useCallback(async (
    resourceId: string,
    dayIndex: number,
    shiftNumber: 1 | 2 | 3,
    newStaffCount: number
  ) => {
    // Always refetch staffing so cascade creation picks up the new values
    const endDate = new Date(currentWeekStart)
    endDate.setDate(endDate.getDate() + 6)
    refetchStaffing(undefined, currentWeekStart, endDate)

    // Get all schedules for this resource, day, and shift
    const affectedSchedules = schedules.filter(
      s => s.resourceId === resourceId &&
           s.dayIndex === dayIndex &&
           s.shiftNumber === shiftNumber
    )

    if (affectedSchedules.length === 0) return

    // Get operation ID for this resource
    const operationId = getOperationIdByResourceId(resourceId)
    if (!operationId) return

    // Show loading toast
    toast.loading(`Recalculando ${affectedSchedules.length} ${affectedSchedules.length === 1 ? 'producción' : 'producciones'}...`, {
      id: 'recalculating-staffing'
    })

    let successCount = 0

    // Recalculate each schedule
    for (const schedule of affectedSchedules) {
      try {
        const prodData = await getProductivityByProductAndOperation(schedule.productId, operationId)

        if (prodData && prodData.is_active) {
          // Calculate base quantity from productivity
          const baseQuantity = schedule.durationHours * Number(prodData.units_per_hour)

          // Multiply by staff count if there are people assigned
          const newQuantity = newStaffCount > 0
            ? Math.round(baseQuantity * newStaffCount)
            : Math.round(baseQuantity)

          // Update the schedule quantity
          await updateQuantity(schedule.id, newQuantity)
          successCount++
        }
      } catch (error) {
        console.error('Error recalculating production:', error)
      }
    }

    // Show success toast
    toast.success(`${successCount} ${successCount === 1 ? 'producción recalculada' : 'producciones recalculadas'}`, {
      id: 'recalculating-staffing'
    })
  }, [schedules, getOperationIdByResourceId, getProductivityByProductAndOperation, updateQuantity, currentWeekStart, refetchStaffing])

  const handleUpdateTimes = useCallback(async (id: string, startDate: Date, durationHours: number) => {
    const success = await updateSchedule(id, { startDate, durationHours })
    if (!success) {
      toast.error("Error al actualizar tiempos")
    }
  }, [updateSchedule])

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

  const handleViewForecastBreakdown = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId)
    const productForecasts = forecastsByProduct.get(productId)
    const totalDemand = productForecasts?.reduce((sum: number, f: any) => sum + f.demand, 0) ?? 0

    setForecastContext({
      productId,
      productName: product?.name || 'Producto',
      emaForecast: totalDemand
    })
    setForecastModalOpen(true)
  }, [products, forecastsByProduct])

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
      durationHours: data.durationHours,
      startHour: addModalContext.startHour // New field
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

  const handleCreateCascade = useCallback((data: {
    productId: string
    productName: string
    durationHours: number
  }) => {
    if (!addModalContext) return

    // Calculate start datetime based on day and shift
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + addModalContext.dayIndex)

    // Get shift start hour
    const shiftStartHours = [22, 6, 14] // T1=22, T2=6, T3=14
    const startHour = addModalContext.startHour ?? shiftStartHours[addModalContext.shiftNumber - 1]
    date.setHours(startHour, 0, 0, 0)

    // For T1 (22:00), we need to go back one day since T1 starts the night before
    if (addModalContext.shiftNumber === 1 && startHour === 22) {
      date.setDate(date.getDate() - 1)
    }

    // Get staff count
    const staffCount = getStaffing(addModalContext.resourceId, date, addModalContext.shiftNumber)

    // Get work center name
    const resource = resourcesWithProducts.find(r => r.id === addModalContext.resourceId)

    setCascadeContext({
      workCenterId: addModalContext.resourceId,
      workCenterName: resource?.name || '',
      productId: data.productId,
      productName: data.productName,
      startDatetime: date.toISOString(),
      durationHours: data.durationHours,
      staffCount: staffCount
    })

    // Close add modal and open cascade modal
    setAddModalOpen(false)
    setCascadeModalOpen(true)
  }, [addModalContext, currentWeekStart, getStaffing, resourcesWithProducts])

  const handleToggleBlock = useCallback(async (
    resourceId: string,
    dayIndex: number,
    shiftNumber: 1 | 2 | 3
  ) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + dayIndex)
    await toggleBlock(resourceId, date, shiftNumber)
  }, [currentWeekStart, toggleBlock])

  // Drag-to-extend blocking (Excel-like: right/down = block, left/up = unblock)
  const [dragBlockRegion, setDragBlockRegion] = useState<{
    dayIndex: number; fromShift: number; toShift: number; resourceIds: Set<string>
    action: 'block' | 'unblock'
  } | null>(null)
  const dragBlockStartRef = useRef<{
    startResourceId: string; startDay: number; startShift: number
  } | null>(null)
  const dragBlockRegionRef = useRef(dragBlockRegion)
  dragBlockRegionRef.current = dragBlockRegion

  // Ordered resource IDs for calculating vertical direction
  const orderedResourceIds = useMemo(() => {
    return resourcesWithProducts.map(r => r.id)
  }, [resourcesWithProducts])
  const orderedResourceIdsRef = useRef(orderedResourceIds)
  orderedResourceIdsRef.current = orderedResourceIds

  const handleDragBlockStart = useCallback((
    resourceId: string, dayIndex: number, shiftNumber: number, e: React.MouseEvent
  ) => {
    e.preventDefault()
    e.stopPropagation()
    dragBlockStartRef.current = { startResourceId: resourceId, startDay: dayIndex, startShift: shiftNumber }
    setDragBlockRegion({
      dayIndex,
      fromShift: shiftNumber,
      toShift: shiftNumber,
      resourceIds: new Set([resourceId]),
      action: 'block',
    })

    const handleMouseMove = (ev: MouseEvent) => {
      const target = document.elementFromPoint(ev.clientX, ev.clientY)
      const cell = target?.closest('[data-block-resource]') as HTMLElement | null
      if (!cell || !dragBlockStartRef.current) return

      const cellDay = parseInt(cell.dataset.blockDay || '-1')
      const cellShift = parseInt(cell.dataset.blockShift || '0')
      const cellResource = cell.dataset.blockResource || ''
      const start = dragBlockStartRef.current
      const resourceIds = orderedResourceIdsRef.current

      // Only allow within same day
      if (cellDay !== start.startDay) return

      // Calculate shift range (bidirectional)
      const fromShift = Math.min(cellShift, start.startShift)
      const toShift = Math.max(cellShift, start.startShift)

      // Calculate resource range (bidirectional)
      const startIdx = resourceIds.indexOf(start.startResourceId)
      const currentIdx = resourceIds.indexOf(cellResource)
      if (startIdx === -1 || currentIdx === -1) return

      const fromIdx = Math.min(startIdx, currentIdx)
      const toIdx = Math.max(startIdx, currentIdx)
      const regionResourceIds = new Set(resourceIds.slice(fromIdx, toIdx + 1))

      // Determine action: left/up from start = unblock, right/down = block
      const isRetracting = cellShift < start.startShift || currentIdx < startIdx
      const action = isRetracting ? 'unblock' : 'block'

      setDragBlockRegion({ dayIndex: start.startDay, fromShift, toShift, resourceIds: regionResourceIds, action })
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      const region = dragBlockRegionRef.current
      if (region) {
        region.resourceIds.forEach(resId => {
          for (let s = region.fromShift; s <= region.toShift; s++) {
            const alreadyBlocked = isShiftBlocked(resId, region.dayIndex, s as 1 | 2 | 3)
            if (region.action === 'block' && !alreadyBlocked) {
              handleToggleBlock(resId, region.dayIndex, s as 1 | 2 | 3)
            } else if (region.action === 'unblock' && alreadyBlocked) {
              handleToggleBlock(resId, region.dayIndex, s as 1 | 2 | 3)
            }
          }
        })
      }
      dragBlockStartRef.current = null
      setDragBlockRegion(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [isShiftBlocked, handleToggleBlock])

  const handleCascadeConfirm = useCallback(() => {
    // Refresh schedules after cascade creation
    // The useShiftSchedules hook should auto-refresh, but we can trigger it if needed
    toast.success("Cascada creada exitosamente")
    setCascadeModalOpen(false)
    setCascadeContext(null)
  }, [])

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
    <div className="flex flex-col h-full bg-black relative">
      {/* Loading overlay while creating cascade */}
      {isCreating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-[#1C1C1E] rounded-2xl border border-[#2C2C2E] shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-[#0A84FF]" />
            <div className="text-center">
              <p className="text-white font-medium">{creatingMessage || "Procesando..."}</p>
              <p className="text-[#8E8E93] text-sm mt-1">Por favor espere</p>
            </div>
          </div>
        </div>
      )}

      {/* Top bar with week selector and summary */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#1C1C1E] border-b border-[#2C2C2E] overflow-x-auto scrollbar-hide">
        <WeekSelector
          weekInfo={weekInfo}
          onPreviousWeek={previousWeek}
          onNextWeek={nextWeek}
          onGoToCurrentWeek={goToCurrentWeek}
          onSelectWeek={goToWeek}
          weeksList={weeksList}
        />

        {/* Summary cards */}
        <div className="flex items-center gap-4 shrink-0">
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

          {/* View Toggle */}
          <div className="flex bg-[#2C2C2E] p-1 rounded-lg border border-white/5 ml-2">
            <button
              onClick={() => setIsProductionView(false)}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded transition-all",
                !isProductionView
                  ? "bg-[#0A84FF] text-white shadow-sm"
                  : "text-[#8E8E93] hover:text-white"
              )}
            >
              PLAN MAESTRO
            </button>
            <button
              onClick={() => setIsProductionView(true)}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded transition-all flex items-center gap-1.5",
                isProductionView
                  ? "bg-[#30D158] text-white shadow-sm"
                  : "text-[#8E8E93] hover:text-white"
              )}
            >
              <div className={cn("w-1 h-1 rounded-full", isProductionView ? "bg-white animate-pulse" : "bg-[#30D158]")} />
              PRODUCCIÓN
            </button>
          </div>
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
              resourcesWithProducts.map(resource => {
                // In production view, filter products that have production scheduled
                const filteredProducts = isProductionView
                  ? resource.products.filter(p => schedules.some(s => s.productId === p.id && s.resourceId === resource.id))
                  : resource.products

                if (isProductionView && filteredProducts.length === 0) return null

                return (
                  <WeeklyGridRow
                    key={resource.id}
                    resourceId={resource.id}
                    resourceName={resource.name}
                    products={filteredProducts}
                    schedules={schedules.filter(s => s.resourceId === resource.id)}
                    dailyForecasts={forecastsByProduct}
                    dailyBalances={balancesByProduct}
                    weekStartDate={currentWeekStart}
                    isProductionView={isProductionView}
                    onAddProduction={(resId, dayIdx, shift, prodId, start, dur) => { handleAddProduction(resId, dayIdx, shift, prodId, start, dur) }}
                    onEditSchedule={handleEditSchedule}
                    onDeleteSchedule={handleDeleteSchedule}
                    onUpdateQuantity={handleUpdateQuantity}
                    onUpdateTimes={handleUpdateTimes}
                    onMoveAcrossCells={moveSchedule}
                    onViewDemandBreakdown={handleViewDemandBreakdown}
                    onViewForecastBreakdown={handleViewForecastBreakdown}
                    onStaffingChange={handleStaffingChange}
                    isShiftBlocked={isShiftBlocked}
                    onToggleBlock={handleToggleBlock}
                    onDragBlockStart={handleDragBlockStart}
                    dragBlockRegion={dragBlockRegion}
                    cellWidth={CELL_WIDTH}
                    isToday={isToday}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Production Modal */}
      {addModalOpen && addModalContext && (() => {
        // Calculate staff count for the modal
        const date = new Date(currentWeekStart)
        date.setDate(date.getDate() + addModalContext.dayIndex)
        const staffCount = getStaffing(addModalContext.resourceId, date, addModalContext.shiftNumber)

        return (
          <AddProductionModal
            isOpen={addModalOpen}
            onClose={handleModalClose}
            onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
            onCreateCascade={handleCreateCascade}
            resourceId={addModalContext.resourceId}
            operationId={getOperationIdByResourceId(addModalContext.resourceId) || ''}
            dayIndex={addModalContext.dayIndex}
            shiftNumber={addModalContext.shiftNumber}
            weekStartDate={currentWeekStart}
            products={resourcesWithProducts.find(r => r.id === addModalContext.resourceId)?.products || []}
            editingSchedule={editingSchedule}
            initialStartHour={addModalContext.startHour}
            initialDurationHours={addModalContext.durationHours}
            staffCount={staffCount}
            showCascadeOption={true}
          />
        )
      })()}

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

      {/* Forecast Breakdown Modal (Análisis de Demanda Proyectada) */}
      {forecastModalOpen && forecastContext && (
        <ForecastBreakdownModal
          isOpen={forecastModalOpen}
          onClose={() => {
            setForecastModalOpen(false)
            setForecastContext(null)
          }}
          productId={forecastContext.productId}
          productName={forecastContext.productName}
          emaForecast={forecastContext.emaForecast}
        />
      )}

      {/* Cascade Preview Modal */}
      {cascadeModalOpen && cascadeContext && (
        <CascadePreviewModal
          isOpen={cascadeModalOpen}
          onClose={() => {
            setCascadeModalOpen(false)
            setCascadeContext(null)
          }}
          onConfirm={handleCascadeConfirm}
          workCenterId={cascadeContext.workCenterId}
          workCenterName={cascadeContext.workCenterName}
          productId={cascadeContext.productId}
          productName={cascadeContext.productName}
          startDatetime={cascadeContext.startDatetime}
          durationHours={cascadeContext.durationHours}
          staffCount={cascadeContext.staffCount}
        />
      )}
    </div>
  )
}
