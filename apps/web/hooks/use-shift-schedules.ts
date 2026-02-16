"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { startOfWeek, addDays, addHours, format, differenceInHours } from "date-fns"

export interface ShiftSchedule {
  id: string
  resourceId: string
  productId: string
  productName?: string
  quantity: number
  startDate: Date
  endDate: Date
  dayIndex: number // 0=Sunday, 6=Saturday
  shiftNumber: 1 | 2 | 3
  durationHours: number
  weekPlanId?: string
  productionOrderNumber?: number
  producedForOrderNumber?: number
  batchNumber?: number
  totalBatches?: number
  batchSize?: number
}

export interface ShiftDefinition {
  id: string
  name: string
  startHour: number
  durationHours: number
  isActive: boolean
}

// Parse date string as local time (ignore timezone suffix)
function parseDateAsLocal(dateStr: string): Date {
  // Remove timezone suffix (+00:00, Z, etc) and parse as local
  const cleanStr = dateStr.replace(/([+-]\d{2}:\d{2}|Z)$/, '')
  return new Date(cleanStr)
}

// Default shift hours
const DEFAULT_SHIFTS: ShiftDefinition[] = [
  { id: '1', name: 'Turno 1', startHour: 22, durationHours: 8, isActive: true }, // T1: 22:00 (día anterior) - 06:00 (día actual)
  { id: '2', name: 'Turno 2', startHour: 6, durationHours: 8, isActive: true },  // T2: 06:00 - 14:00
  { id: '3', name: 'Turno 3', startHour: 14, durationHours: 8, isActive: true }  // T3: 14:00 - 22:00
]

/**
 * Hook para manejar schedules de producción agrupados por turno
 * Permite programar producción en la grilla semanal por turnos
 */
export function useShiftSchedules(weekStartDate: Date) {
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([])
  const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinition[]>(DEFAULT_SHIFTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedOnce = useRef(false)

  // Sunday reference for display (day column calculations)
  const normalizedWeekStart = useMemo(() => {
    const date = startOfWeek(weekStartDate, { weekStartsOn: 0 })
    date.setHours(6, 0, 0, 0)
    return date
  }, [weekStartDate])

  // Query boundaries aligned with backend: Saturday 22:00 to Saturday 22:00
  // This captures T1 shifts (starting Saturday 22:00) that belong to Sunday
  const queryStart = useMemo(() => {
    const sunday = startOfWeek(weekStartDate, { weekStartsOn: 0 })
    const saturday = new Date(sunday)
    saturday.setDate(saturday.getDate() - 1)
    saturday.setHours(22, 0, 0, 0)
    return saturday
  }, [weekStartDate])

  const queryEnd = useMemo(() => addDays(queryStart, 7), [queryStart])

  // Fetch shift definitions
  const fetchShiftDefinitions = useCallback(async () => {
    try {
      const { data, error: err } = await (supabase as any)
        .schema('produccion')
        .from('shift_definitions')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true })

      if (err) {
        console.error('Error fetching shift definitions:', err)
        return
      }

      if (data && data.length > 0) {
        setShiftDefinitions(data.map((d: any) => ({
          id: d.id,
          name: d.name,
          startHour: d.start_hour,
          durationHours: d.duration_hours,
          isActive: d.is_active
        })))
      }
    } catch (err) {
      console.error('Error in fetchShiftDefinitions:', err)
    }
  }, [])

  // Fetch schedules for the week
  const fetchSchedules = useCallback(async () => {
    try {
      // Only show loading spinner on initial load, not on refetches
      if (!hasLoadedOnce.current) setLoading(true)
      setError(null)

      const { data: rawSchedules, error: err } = await (supabase as any)
        .schema('produccion')
        .from('production_schedules')
        .select('*')
        .gte('start_date', format(queryStart, "yyyy-MM-dd'T'HH:mm:ss"))
        .lt('start_date', format(queryEnd, "yyyy-MM-dd'T'HH:mm:ss"))
        .order('start_date', { ascending: true })

      if (err) throw err

      // Get product names
      const productIds = [...new Set((rawSchedules || []).map((s: any) => s.product_id))] as string[]
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds)

      const productMap = new Map(products?.map(p => [p.id, p.name]) || [])

      // Transform to ShiftSchedule format
      const transformedSchedules: ShiftSchedule[] = (rawSchedules || []).map((schedule: any) => {
        // Parse as local time to avoid timezone conversion
        const startDate = parseDateAsLocal(schedule.start_date)
        const endDate = parseDateAsLocal(schedule.end_date)
        const startHour = startDate.getHours()

        // Determine shift number based on actual start hour
        // T1: 22:00 - 06:00, T2: 06:00 - 14:00, T3: 14:00 - 22:00
        let shiftNumber: 1 | 2 | 3
        if (startHour >= 22 || startHour < 6) {
          shiftNumber = 1
        } else if (startHour >= 6 && startHour < 14) {
          shiftNumber = 2
        } else {
          shiftNumber = 3
        }

        // For T1 (22:00-06:00), the schedule "belongs to" the NEXT day
        // because T1 starts at 22:00 of previous day and ends at 06:00 of the "actual" day
        let dayIndex = startDate.getDay()
        if (startHour >= 22) {
          // This is T1, shift dayIndex to next day
          dayIndex = (dayIndex + 1) % 7
        }

        return {
          id: schedule.id,
          resourceId: schedule.resource_id,
          productId: schedule.product_id,
          productName: productMap.get(schedule.product_id) || 'Producto',
          quantity: schedule.quantity,
          startDate,
          endDate,
          dayIndex, // Use calculated dayIndex with T1 offset applied
          shiftNumber, // Use calculated shiftNumber based on actual start hour
          durationHours: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60),
          weekPlanId: schedule.week_plan_id,
          productionOrderNumber: schedule.production_order_number ?? undefined,
          producedForOrderNumber: schedule.produced_for_order_number ?? undefined,
          batchNumber: schedule.batch_number ?? undefined,
          totalBatches: schedule.total_batches ?? undefined,
          batchSize: schedule.batch_size ?? undefined
        }
      })

      setSchedules(transformedSchedules)
      hasLoadedOnce.current = true
    } catch (err) {
      console.error('Error fetching schedules:', err)
      setError(err instanceof Error ? err.message : 'Error fetching schedules')
    } finally {
      setLoading(false)
    }
  }, [queryStart, queryEnd])

  // Get schedules for a specific cell (resource + day + shift)
  const getSchedulesForCell = useCallback((
    resourceId: string,
    dayIndex: number,
    shiftNumber: 1 | 2 | 3
  ): ShiftSchedule[] => {
    return schedules.filter(s =>
      s.resourceId === resourceId &&
      s.dayIndex === dayIndex &&
      s.shiftNumber === shiftNumber
    )
  }, [schedules])

  // Get all schedules for a resource on a specific day
  const getSchedulesForDay = useCallback((
    resourceId: string,
    dayIndex: number
  ): ShiftSchedule[] => {
    return schedules.filter(s =>
      s.resourceId === resourceId &&
      s.dayIndex === dayIndex
    )
  }, [schedules])

  // Check for conflicts (same resource, overlapping time)
  const hasConflict = useCallback((
    resourceId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): boolean => {
    return schedules.some(s => {
      if (excludeId && s.id === excludeId) return false
      if (s.resourceId !== resourceId) return false

      // Check time overlap with 1-second buffer to handle floating point/ISO string precision
      const sStart = s.startDate.getTime()
      const sEnd = s.endDate.getTime()
      const start = startDate.getTime()
      const end = endDate.getTime()

      return start < sEnd - 1000 && end > sStart + 1000
    })
  }, [schedules])

  // Calculate start/end dates for a shift
  const getShiftDates = useCallback((
    dayIndex: number,
    shiftNumber: 1 | 2 | 3,
    durationHours: number = 8,
    startHour?: number
  ): { startDate: Date; endDate: Date } => {
    const shift = shiftDefinitions[shiftNumber - 1] || DEFAULT_SHIFTS[shiftNumber - 1]
    let dayDate = addDays(normalizedWeekStart, dayIndex)

    // T1 (Turno 1) comienza el día anterior a las 22:00
    if (shiftNumber === 1) {
      dayDate = addDays(dayDate, -1)
    }

    // startDate starts at the shift's base start hour
    const baseDate = new Date(dayDate)
    baseDate.setHours(shift.startHour, 0, 0, 0)

    // If startHour is provided, it's a relative offset from the shift start
    const startDate = startHour !== undefined ? addHours(baseDate, startHour) : baseDate
    const endDate = addHours(startDate, durationHours)

    return { startDate, endDate }
  }, [normalizedWeekStart, shiftDefinitions])

  // Create a new schedule
  const createSchedule = useCallback(async (data: {
    resourceId: string
    productId: string
    quantity: number
    dayIndex: number
    shiftNumber: 1 | 2 | 3
    durationHours?: number
    startHour?: number
    weekPlanId?: string
  }): Promise<ShiftSchedule | null> => {
    try {
      const { startDate, endDate } = getShiftDates(
        data.dayIndex,
        data.shiftNumber,
        data.durationHours || 8,
        data.startHour
      )

      // Check for conflicts
      if (hasConflict(data.resourceId, startDate, endDate)) {
        toast.error('Ya existe una programación en ese horario para esta máquina')
        return null
      }

      const insertData: any = {
        resource_id: data.resourceId,
        product_id: data.productId,
        quantity: data.quantity,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        shift_number: data.shiftNumber,
        day_of_week: data.dayIndex
      }

      if (data.weekPlanId) {
        insertData.week_plan_id = data.weekPlanId
      }

      const { data: newSchedule, error: err } = await (supabase as any)
        .schema('produccion')
        .from('production_schedules')
        .insert([insertData])
        .select()
        .single()

      if (err) throw err

      // Get product name
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', data.productId)
        .single()

      const transformedSchedule: ShiftSchedule = {
        id: newSchedule.id,
        resourceId: newSchedule.resource_id,
        productId: newSchedule.product_id,
        productName: product?.name || 'Producto',
        quantity: newSchedule.quantity,
        startDate: new Date(newSchedule.start_date),
        endDate: new Date(newSchedule.end_date),
        dayIndex: data.dayIndex,
        shiftNumber: data.shiftNumber,
        durationHours: data.durationHours || 8,
        weekPlanId: newSchedule.week_plan_id
      }

      setSchedules(prev => {
        if (prev.some(s => s.id === transformedSchedule.id)) return prev
        return [...prev, transformedSchedule]
      })

      toast.success('Programación creada')
      return transformedSchedule
    } catch (err: any) {
      if (err?.code === 'P0001') {
        toast.error('Esta máquina ya tiene una programación en ese horario')
        return null
      }
      console.error('Detailed error creating schedule:', {
        error: err,
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint
      })
      toast.error(err instanceof Error ? err.message : 'Error al crear programación')
      return null
    }
  }, [getShiftDates, hasConflict])

  // Update an existing schedule
  const updateSchedule = useCallback(async (
    id: string,
    updates: Partial<{
      productId: string
      quantity: number
      dayIndex: number
      shiftNumber: 1 | 2 | 3
      resourceId: string
      startDate: Date
      durationHours: number
      startHour: number
    }>
  ): Promise<ShiftSchedule | null> => {
    try {
      const existing = schedules.find(s => s.id === id)
      if (!existing) {
        toast.error('Programación no encontrada')
        return null
      }

      const resourceId = updates.resourceId ?? existing.resourceId
      const dayIndex = updates.dayIndex ?? existing.dayIndex
      const shiftNumber = updates.shiftNumber ?? existing.shiftNumber
      const durationHours = updates.durationHours ?? existing.durationHours

      let startDate: Date
      let endDate: Date

      if (updates.startDate) {
        startDate = updates.startDate
        endDate = addHours(startDate, durationHours)
      } else {
        const dates = getShiftDates(dayIndex, shiftNumber, durationHours, updates.startHour)
        startDate = dates.startDate
        endDate = dates.endDate
      }

      // Check for conflicts (excluding self)
      if (hasConflict(resourceId, startDate, endDate, id)) {
        toast.error('Ya existe una programación en ese horario para esta máquina')
        return null
      }

      const dbUpdates: any = {}
      if (updates.productId) dbUpdates.product_id = updates.productId
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity
      if (updates.resourceId) dbUpdates.resource_id = updates.resourceId

      dbUpdates.start_date = startDate.toISOString()
      dbUpdates.end_date = endDate.toISOString()
      dbUpdates.shift_number = shiftNumber
      dbUpdates.day_of_week = dayIndex

      const { data: updatedSchedule, error: err } = await (supabase as any)
        .schema('produccion')
        .from('production_schedules')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err

      const finalUpdatedSchedule: ShiftSchedule = {
        ...existing,
        resourceId,
        productId: updatedSchedule.product_id,
        quantity: updatedSchedule.quantity,
        startDate: new Date(updatedSchedule.start_date),
        endDate: new Date(updatedSchedule.end_date),
        dayIndex,
        shiftNumber,
        durationHours
      }

      setSchedules(prev => prev.map(s => s.id === id ? finalUpdatedSchedule : s))

      return finalUpdatedSchedule
    } catch (err: any) {
      if (err?.code === 'P0001') {
        toast.error('Esta máquina ya tiene una programación en ese horario')
        return null
      }
      console.error('Detailed error updating schedule:', {
        error: err,
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        updates
      })
      toast.error(err instanceof Error ? err.message : 'Error al actualizar programación')
      return null
    }
  }, [schedules, getShiftDates, hasConflict])

  // Update just the quantity (fast path for inline editing)
  const updateQuantity = useCallback(async (id: string, quantity: number): Promise<boolean> => {
    try {
      const { error: err } = await (supabase as any)
        .schema('produccion')
        .from('production_schedules')
        .update({ quantity })
        .eq('id', id)

      if (err) throw err

      setSchedules(prev => prev.map(s => s.id === id ? { ...s, quantity } : s))
      return true
    } catch (err) {
      console.error('Error updating quantity:', err)
      toast.error('Error al actualizar cantidad')
      return false
    }
  }, [])

  // Move schedule to a different cell
  const moveSchedule = useCallback(async (
    id: string,
    newDayIndex: number,
    newShiftNumber: 1 | 2 | 3,
    newResourceId?: string,
    newStartHour?: number
  ): Promise<boolean> => {
    const existing = schedules.find(s => s.id === id)
    if (!existing) return false

    // Derive current relative start hour
    const shiftStart = shiftDefinitions[existing.shiftNumber - 1]?.startHour ?? DEFAULT_SHIFTS[existing.shiftNumber - 1].startHour
    let h = existing.startDate.getHours() + (existing.startDate.getMinutes() / 60)
    // Handle T1 (22:00-06:00) crossing midnight
    if (existing.shiftNumber === 1 && h < 6) h += 24
    const startHour = Math.max(0, h - shiftStart)

    const result = await updateSchedule(id, {
      resourceId: newResourceId || existing.resourceId,
      dayIndex: newDayIndex,
      shiftNumber: newShiftNumber,
      startHour: newStartHour !== undefined ? newStartHour : startHour
    })
    return result !== null
  }, [updateSchedule, schedules, shiftDefinitions])

  // Delete a schedule
  const deleteSchedule = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await (supabase as any)
        .schema('produccion')
        .from('production_schedules')
        .delete()
        .eq('id', id)

      if (err) throw err

      setSchedules(prev => prev.filter(s => s.id !== id))
      return true
    } catch (err: any) {
      console.error('Detailed error deleting schedule:', {
        error: err,
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint
      })
      toast.error('Error al eliminar programación')
      return false
    }
  }, [fetchSchedules])

  // Get total production by product for the week
  const getWeeklyTotalsByProduct = useMemo(() => {
    const totals = new Map<string, number>()
    schedules.forEach(s => {
      totals.set(s.productId, (totals.get(s.productId) || 0) + s.quantity)
    })
    return totals
  }, [schedules])

  // Get total production for the week
  const weeklyGrandTotal = useMemo(() => {
    return schedules.reduce((sum, s) => sum + s.quantity, 0)
  }, [schedules])

  // Initial fetch
  useEffect(() => {
    fetchShiftDefinitions()
    fetchSchedules()
  }, [fetchShiftDefinitions, fetchSchedules])

  // Subscribe to changes
  useEffect(() => {
    const channel = supabase
      .channel('shift-schedules-changes')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'produccion', table: 'production_schedules' },
        () => fetchSchedules()
      )
      .subscribe()

    return () => {
      (supabase as any).removeChannel(channel)
    }
  }, [fetchSchedules])

  return {
    schedules,
    shiftDefinitions,
    loading,
    error,
    weekStartDate: normalizedWeekStart,
    getSchedulesForCell,
    getSchedulesForDay,
    hasConflict,
    getShiftDates,
    createSchedule,
    updateSchedule,
    updateQuantity,
    moveSchedule,
    deleteSchedule,
    getWeeklyTotalsByProduct,
    weeklyGrandTotal,
    refetch: fetchSchedules
  }
}
