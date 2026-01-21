"use client"

import { useState, useEffect, useCallback } from "react"
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
export function useDailySchedules(workCenterId: string, date: Date = new Date()) {
  const [schedules, setSchedules] = useState<DailySchedule[]>([])
  const [loading, setLoading] = useState(true)

  // Convert date to primitive value to prevent infinite loops
  const dateTimestamp = date.getTime()

  const fetchDailySchedules = useCallback(async () => {
    if (!workCenterId) {
      setSchedules([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const currentDate = new Date(dateTimestamp)
      const dayStart = startOfDay(currentDate)
      const dayEnd = endOfDay(currentDate)

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
  }, [workCenterId, dateTimestamp])

  // Initial fetch
  useEffect(() => {
    fetchDailySchedules()
  }, [fetchDailySchedules])

  // Subscribe to changes
  useEffect(() => {
    const channel = supabase
      .channel(`daily-schedules-${workCenterId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'produccion',
          table: 'production_schedules',
          filter: `resource_id=eq.${workCenterId}`
        },
        () => fetchDailySchedules()
      )
      .subscribe()

    return () => {
      (supabase as any).removeChannel(channel)
    }
  }, [fetchDailySchedules, workCenterId])

  return {
    schedules,
    loading,
    refetch: fetchDailySchedules
  }
}
