"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { startOfDay, addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns"

export interface DailySchedule {
  id: string
  productId: string
  productName: string
  quantity: number
  startDate: Date
  endDate: Date
  shiftNumber: number
  status: string
}

/**
 * Set time to 14:00:00.000
 */
function setTo14Hours(date: Date): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, 14), 0), 0), 0)
}

/**
 * Hook para obtener los schedules programados para un día específico y centro de trabajo
 * Muestra producciones desde las 14:00 del día actual hasta las 14:00 del día siguiente
 */
export function useDailySchedules(workCenterId: string, date?: Date) {
  const [schedules, setSchedules] = useState<DailySchedule[]>([])
  const [loading, setLoading] = useState(true)

  // Stabilize the date to prevent infinite loops
  // If no date provided, use today at start of day (stable)
  const dateKey = useMemo(() => {
    if (!date) {
      // When no date is provided, use today at midnight (stable key)
      return startOfDay(new Date()).toISOString()
    }
    // When date is provided, use start of that day
    return startOfDay(date).toISOString()
  }, [date?.getFullYear(), date?.getMonth(), date?.getDate()])

  const fetchDailySchedules = useCallback(async () => {
    if (!workCenterId) {
      setSchedules([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Window from 14:00 to 14:00 (next 24h window)
      const now = new Date()
      const baseDate = new Date(dateKey)

      let windowStart: Date
      if (!date && now.getHours() >= 14) {
        // Si ya pasaron las 14:00 de hoy, la ventana empieza mañana a las 14:00
        windowStart = setTo14Hours(addDays(baseDate, 1))
      } else {
        // Si es antes de las 14:00, o si hay fecha especificada, usar la fecha base
        windowStart = setTo14Hours(baseDate)
      }

      const windowEnd = setTo14Hours(addDays(windowStart, 1))

      const { data: rawSchedules, error: err } = await (supabase as any)
        .schema('produccion')
        .from('production_schedules')
        .select('*')
        .eq('resource_id', workCenterId)
        .gte('start_date', windowStart.toISOString())
        .lt('start_date', windowEnd.toISOString())
        .order('start_date', { ascending: true })

      if (err) {
        console.error('Error fetching daily schedules:', err)
        setSchedules([])
        return
      }

      // Get product names
      const productIds = [...new Set((rawSchedules || []).map((s: any) => s.product_id))] as string[]

      if (productIds.length === 0) {
        setSchedules([])
        return
      }

      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds)

      const productMap = new Map(products?.map(p => [p.id, p.name]) || [])

      // Transform to DailySchedule format
      const transformedSchedules: DailySchedule[] = (rawSchedules || []).map((schedule: any) => ({
        id: schedule.id,
        productId: schedule.product_id,
        productName: productMap.get(schedule.product_id) || 'Producto',
        quantity: schedule.quantity,
        startDate: new Date(schedule.start_date),
        endDate: new Date(schedule.end_date),
        shiftNumber: schedule.shift_number,
        status: schedule.status || 'scheduled'
      }))

      setSchedules(transformedSchedules)
    } catch (err) {
      console.error('Error in fetchDailySchedules:', err)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [workCenterId, dateKey, date])

  // Initial fetch
  useEffect(() => {
    fetchDailySchedules()
  }, [fetchDailySchedules])

  // Compute window dates for display
  const { windowStart, windowEnd } = useMemo(() => {
    const now = new Date()
    const baseDate = new Date(dateKey)

    let start: Date
    if (!date && now.getHours() >= 14) {
      // Si ya pasaron las 14:00 de hoy, la ventana empieza mañana a las 14:00
      start = setTo14Hours(addDays(baseDate, 1))
    } else {
      // Si es antes de las 14:00, o si hay fecha especificada, usar la fecha base
      start = setTo14Hours(baseDate)
    }

    const end = setTo14Hours(addDays(start, 1))

    return { windowStart: start, windowEnd: end }
  }, [dateKey, date])

  return {
    schedules,
    loading,
    refetch: fetchDailySchedules,
    windowStart,
    windowEnd
  }
}
