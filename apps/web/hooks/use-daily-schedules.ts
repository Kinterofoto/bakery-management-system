"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { startOfDay, endOfDay } from "date-fns"

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
 * Hook para obtener los schedules programados para un día específico y centro de trabajo
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

      const dayStart = new Date(dateKey)
      const dayEnd = endOfDay(dayStart)

      const { data: rawSchedules, error: err } = await (supabase as any)
        .schema('produccion')
        .from('production_schedules')
        .select('*')
        .eq('resource_id', workCenterId)
        .gte('start_date', dayStart.toISOString())
        .lte('start_date', dayEnd.toISOString())
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
  }, [workCenterId, dateKey])

  // Initial fetch
  useEffect(() => {
    fetchDailySchedules()
  }, [fetchDailySchedules])

  return {
    schedules,
    loading,
    refetch: fetchDailySchedules
  }
}
