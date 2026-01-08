"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"

export interface WorkCenterStaffing {
  id: string
  work_center_id: string
  date: string // ISO date format YYYY-MM-DD
  shift_number: 1 | 2 | 3
  staff_count: number
  created_at: string
  updated_at: string
}

interface StaffingInput {
  work_center_id: string
  date: Date | string
  shift_number: 1 | 2 | 3
  staff_count: number
}

/**
 * Hook para gestionar la asignación de personal (staffing) por centro de trabajo, fecha y turno
 */
export function useWorkCenterStaffing(weekStartDate?: Date) {
  const [staffings, setStaffings] = useState<WorkCenterStaffing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch staffing data for a specific work center and date range
   */
  const fetchStaffing = useCallback(async (workCenterId?: string, startDate?: Date, endDate?: Date) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .schema("produccion")
        .from("work_center_staffing")
        .select("*")

      // Add filters if provided
      if (workCenterId) {
        query = query.eq("work_center_id", workCenterId)
      }

      if (startDate) {
        query = query.gte("date", format(startDate, "yyyy-MM-dd"))
      }

      if (endDate) {
        query = query.lte("date", format(endDate, "yyyy-MM-dd"))
      }

      const { data, error: fetchError } = await query.order("date").order("shift_number")

      if (fetchError) throw fetchError

      setStaffings(data || [])
      return data || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar staffing"
      setError(errorMessage)
      console.error("Error fetching staffing:", err)
      toast.error(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Upsert staffing (create or update)
   */
  const upsertStaffing = useCallback(async (input: StaffingInput) => {
    try {
      setError(null)

      const dateStr = input.date instanceof Date
        ? format(input.date, "yyyy-MM-dd")
        : input.date

      const payload = {
        work_center_id: input.work_center_id,
        date: dateStr,
        shift_number: input.shift_number,
        staff_count: input.staff_count
      }

      const { data, error: upsertError } = await supabase
        .schema("produccion")
        .from("work_center_staffing")
        .upsert(payload, {
          onConflict: "work_center_id,date,shift_number"
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      // Update local state
      setStaffings(prev => {
        const existing = prev.find(
          s => s.work_center_id === input.work_center_id &&
               s.date === dateStr &&
               s.shift_number === input.shift_number
        )

        if (existing) {
          return prev.map(s =>
            s.id === existing.id ? data : s
          )
        } else {
          return [...prev, data]
        }
      })

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al guardar staffing"
      setError(errorMessage)
      console.error("Error upserting staffing:", err)
      toast.error(errorMessage)
      return null
    }
  }, [])

  /**
   * Upsert multiple staffing records at once (batch operation)
   * Useful for "sync" mode where we update all days for a specific shift
   */
  const upsertMultipleStaffing = useCallback(async (inputs: StaffingInput[]) => {
    try {
      setError(null)

      const payloads = inputs.map(input => ({
        work_center_id: input.work_center_id,
        date: input.date instanceof Date ? format(input.date, "yyyy-MM-dd") : input.date,
        shift_number: input.shift_number,
        staff_count: input.staff_count
      }))

      const { data, error: upsertError } = await supabase
        .schema("produccion")
        .from("work_center_staffing")
        .upsert(payloads, {
          onConflict: "work_center_id,date,shift_number"
        })
        .select()

      if (upsertError) throw upsertError

      // Update local state
      setStaffings(prev => {
        const newStaffings = [...prev]

        data?.forEach(newItem => {
          const existingIndex = newStaffings.findIndex(
            s => s.work_center_id === newItem.work_center_id &&
                 s.date === newItem.date &&
                 s.shift_number === newItem.shift_number
          )

          if (existingIndex >= 0) {
            newStaffings[existingIndex] = newItem
          } else {
            newStaffings.push(newItem)
          }
        })

        return newStaffings
      })

      return data || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al guardar múltiples staffing"
      setError(errorMessage)
      console.error("Error upserting multiple staffing:", err)
      toast.error(errorMessage)
      return []
    }
  }, [])

  /**
   * Delete staffing record
   */
  const deleteStaffing = useCallback(async (id: string) => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .schema("produccion")
        .from("work_center_staffing")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      // Update local state
      setStaffings(prev => prev.filter(s => s.id !== id))

      toast.success("Staffing eliminado")
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar staffing"
      setError(errorMessage)
      console.error("Error deleting staffing:", err)
      toast.error(errorMessage)
      return false
    }
  }, [])

  /**
   * Get staffing for a specific work center, date, and shift
   */
  const getStaffing = useCallback((workCenterId: string, date: Date | string, shiftNumber: 1 | 2 | 3): number => {
    const dateStr = date instanceof Date ? format(date, "yyyy-MM-dd") : date

    const found = staffings.find(
      s => s.work_center_id === workCenterId &&
           s.date === dateStr &&
           s.shift_number === shiftNumber
    )

    return found?.staff_count || 0
  }, [staffings])

  /**
   * Build a map for quick lookups: key = "workCenterId-date-shift", value = staff_count
   */
  const getStaffingMap = useCallback((): Map<string, number> => {
    const map = new Map<string, number>()

    staffings.forEach(s => {
      const key = `${s.work_center_id}-${s.date}-${s.shift_number}`
      map.set(key, s.staff_count)
    })

    return map
  }, [staffings])

  // Auto-fetch on mount if weekStartDate is provided
  useEffect(() => {
    if (weekStartDate) {
      const endDate = new Date(weekStartDate)
      endDate.setDate(endDate.getDate() + 6) // 7 days total
      fetchStaffing(undefined, weekStartDate, endDate)
    }
  }, [weekStartDate, fetchStaffing])

  return {
    staffings,
    loading,
    error,
    fetchStaffing,
    upsertStaffing,
    upsertMultipleStaffing,
    deleteStaffing,
    getStaffing,
    getStaffingMap
  }
}
