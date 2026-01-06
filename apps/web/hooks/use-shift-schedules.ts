"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { startOfWeek, addDays, addHours, format, isSameDay, differenceInHours } from "date-fns"

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
}

export interface ShiftDefinition {
  id: string
  name: string
  startHour: number
  durationHours: number
  isActive: boolean
}

// Default shift hours
const DEFAULT_SHIFTS: ShiftDefinition[] = [
  { id: '1', name: 'Turno 1', startHour: 6, durationHours: 8, isActive: true },
  { id: '2', name: 'Turno 2', startHour: 14, durationHours: 8, isActive: true },
  { id: '3', name: 'Turno 3', startHour: 22, durationHours: 8, isActive: true }
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

  // Normalize week start to Sunday at 6am
  const normalizedWeekStart = useMemo(() => {
    const date = startOfWeek(weekStartDate, { weekStartsOn: 0 })
    date.setHours(6, 0, 0, 0)
    return date
  }, [weekStartDate])

  const weekEndDate = useMemo(() => addDays(normalizedWeekStart, 7), [normalizedWeekStart])

  // Fetch shift definitions
  const fetchShiftDefinitions = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .schema('produccion')
        .from('shift_definitions')
        .select('*')
        .eq('is_active', true)
        .order('start_hour', { ascending: true })

      if (err) {
        console.error('Error fetching shift definitions:', err)
        return
      }

      if (data && data.length > 0) {
        setShiftDefinitions(data.map(d => ({
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
      setLoading(true)
      setError(null)

      const { data: rawSchedules, error: err } = await supabase
        .schema('produccion')
        .from('production_schedules')
        .select('*')
        .gte('start_date', format(normalizedWeekStart, "yyyy-MM-dd'T'HH:mm:ss"))
        .lt('start_date', format(weekEndDate, "yyyy-MM-dd'T'HH:mm:ss"))
        .order('start_date', { ascending: true })

      if (err) throw err

      // Get product names
      const productIds = [...new Set(rawSchedules?.map(s => s.product_id) || [])]
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds)

      const productMap = new Map(products?.map(p => [p.id, p.name]) || [])

      // Transform to ShiftSchedule format
      const transformedSchedules: ShiftSchedule[] = (rawSchedules || []).map(schedule => {
        const startDate = new Date(schedule.start_date)
        const endDate = new Date(schedule.end_date)
        const dayIndex = startDate.getDay()
        const startHour = startDate.getHours()

        // Determine which shift this belongs to
        let shiftNumber: 1 | 2 | 3 = 1
        if (startHour >= 6 && startHour < 14) shiftNumber = 1
        else if (startHour >= 14 && startHour < 22) shiftNumber = 2
        else shiftNumber = 3

        return {
          id: schedule.id,
          resourceId: schedule.resource_id,
          productId: schedule.product_id,
          productName: productMap.get(schedule.product_id) || 'Producto',
          quantity: schedule.quantity,
          startDate,
          endDate,
          dayIndex,
          shiftNumber,
          durationHours: differenceInHours(endDate, startDate),
          weekPlanId: schedule.week_plan_id
        }
      })

      setSchedules(transformedSchedules)
    } catch (err) {
      console.error('Error fetching schedules:', err)
      setError(err instanceof Error ? err.message : 'Error fetching schedules')
    } finally {
      setLoading(false)
    }
  }, [normalizedWeekStart, weekEndDate])

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

      // Check time overlap
      return startDate < s.endDate && endDate > s.startDate
    })
  }, [schedules])

  // Calculate start/end dates for a shift
  const getShiftDates = useCallback((
    dayIndex: number,
    shiftNumber: 1 | 2 | 3,
    durationHours: number = 8
  ): { startDate: Date; endDate: Date } => {
    const shift = shiftDefinitions[shiftNumber - 1] || DEFAULT_SHIFTS[shiftNumber - 1]
    const dayDate = addDays(normalizedWeekStart, dayIndex)

    const startDate = new Date(dayDate)
    startDate.setHours(shift.startHour, 0, 0, 0)

    // Handle overnight shift (Turno 3: 10pm - 6am)
    if (shift.startHour >= 22) {
      // Start is same day at 10pm
    }

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
    weekPlanId?: string
  }): Promise<ShiftSchedule | null> => {
    try {
      const { startDate, endDate } = getShiftDates(
        data.dayIndex,
        data.shiftNumber,
        data.durationHours || 8
      )

      // Check for conflicts
      if (hasConflict(data.resourceId, startDate, endDate)) {
        toast.error('Ya existe una programación en ese horario para esta máquina')
        return null
      }

      const { data: newSchedule, error: err } = await supabase
        .schema('produccion')
        .from('production_schedules')
        .insert([{
          resource_id: data.resourceId,
          product_id: data.productId,
          quantity: data.quantity,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          shift_number: data.shiftNumber,
          day_of_week: data.dayIndex,
          week_plan_id: data.weekPlanId
        }])
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

      setSchedules(prev => [...prev, transformedSchedule])
      toast.success('Programación creada')
      return transformedSchedule
    } catch (err) {
      console.error('Error creating schedule:', err)
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
      startDate: Date
      durationHours: number
    }>
  ): Promise<ShiftSchedule | null> => {
    try {
      const existing = schedules.find(s => s.id === id)
      if (!existing) {
        toast.error('Programación no encontrada')
        return null
      }

      const dayIndex = updates.dayIndex ?? existing.dayIndex
      const shiftNumber = updates.shiftNumber ?? existing.shiftNumber
      const durationHours = updates.durationHours ?? existing.durationHours

      let startDate: Date
      let endDate: Date

      if (updates.startDate) {
        startDate = updates.startDate
        endDate = addHours(startDate, durationHours)
      } else {
        const dates = getShiftDates(dayIndex, shiftNumber, durationHours)
        startDate = dates.startDate
        endDate = dates.endDate
      }

      // Check for conflicts (excluding self)
      if (hasConflict(existing.resourceId, startDate, endDate, id)) {
        toast.error('Ya existe una programación en ese horario para esta máquina')
        return null
      }

      const dbUpdates: any = {}
      if (updates.productId) dbUpdates.product_id = updates.productId
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity

      dbUpdates.start_date = startDate.toISOString()
      dbUpdates.end_date = endDate.toISOString()
      dbUpdates.shift_number = shiftNumber
      dbUpdates.day_of_week = dayIndex

      const { data: updatedSchedule, error: err } = await supabase
        .schema('produccion')
        .from('production_schedules')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err

      // Update local state
      setSchedules(prev => prev.map(s => {
        if (s.id !== id) return s
        return {
          ...s,
          productId: updatedSchedule.product_id,
          quantity: updatedSchedule.quantity,
          startDate: new Date(updatedSchedule.start_date),
          endDate: new Date(updatedSchedule.end_date),
          dayIndex,
          shiftNumber,
          durationHours
        }
      }))

      return schedules.find(s => s.id === id) || null
    } catch (err) {
      console.error('Error updating schedule:', err)
      toast.error(err instanceof Error ? err.message : 'Error al actualizar programación')
      return null
    }
  }, [schedules, getShiftDates, hasConflict])

  // Update just the quantity (fast path for inline editing)
  const updateQuantity = useCallback(async (id: string, quantity: number): Promise<boolean> => {
    try {
      const { error: err } = await supabase
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
    newShiftNumber: 1 | 2 | 3
  ): Promise<boolean> => {
    const result = await updateSchedule(id, { dayIndex: newDayIndex, shiftNumber: newShiftNumber })
    return result !== null
  }, [updateSchedule])

  // Delete a schedule
  const deleteSchedule = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .schema('produccion')
        .from('production_schedules')
        .delete()
        .eq('id', id)

      if (err) throw err

      setSchedules(prev => prev.filter(s => s.id !== id))
      toast.success('Programación eliminada')
      return true
    } catch (err) {
      console.error('Error deleting schedule:', err)
      toast.error('Error al eliminar programación')
      return false
    }
  }, [])

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
        'postgres_changes',
        { event: '*', schema: 'produccion', table: 'production_schedules' },
        () => fetchSchedules()
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
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
