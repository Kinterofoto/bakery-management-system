"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format, addDays } from "date-fns"

export interface ShiftBlocking {
  id: string
  work_center_id: string
  date: string // ISO date format YYYY-MM-DD
  shift_number: 1 | 2 | 3
  created_at: string
}

/**
 * Hook para gestionar el bloqueo de turnos por centro de trabajo, fecha y turno.
 * Un turno bloqueado no permite programar producción y la cascada lo salta.
 */
export function useShiftBlocking(weekStartDate?: Date) {
  const [blockings, setBlockings] = useState<ShiftBlocking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch blockings for a date range
   */
  const fetchBlockings = useCallback(async (startDate?: Date, endDate?: Date) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .schema("produccion")
        .from("shift_blocking")
        .select("*")

      if (startDate) {
        query = query.gte("date", format(startDate, "yyyy-MM-dd"))
      }

      if (endDate) {
        query = query.lte("date", format(endDate, "yyyy-MM-dd"))
      }

      const { data, error: fetchError } = await query.order("date").order("shift_number")

      if (fetchError) throw fetchError

      setBlockings(data || [])
      return data || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar bloqueos"
      setError(errorMessage)
      console.error("Error fetching shift blockings:", err)
      toast.error(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Toggle block: insert if not exists, delete if exists
   */
  const toggleBlock = useCallback(async (workCenterId: string, date: Date | string, shiftNumber: 1 | 2 | 3) => {
    try {
      setError(null)

      const dateStr = date instanceof Date
        ? format(date, "yyyy-MM-dd")
        : date

      // Check if blocking exists
      const existing = blockings.find(
        b => b.work_center_id === workCenterId &&
             b.date === dateStr &&
             b.shift_number === shiftNumber
      )

      if (existing) {
        // Delete existing blocking
        const { error: deleteError } = await supabase
          .schema("produccion")
          .from("shift_blocking")
          .delete()
          .eq("id", existing.id)

        if (deleteError) throw deleteError

        setBlockings(prev => prev.filter(b => b.id !== existing.id))
        return false // Now unblocked
      } else {
        // Insert new blocking
        const { data, error: insertError } = await supabase
          .schema("produccion")
          .from("shift_blocking")
          .upsert({
            work_center_id: workCenterId,
            date: dateStr,
            shift_number: shiftNumber,
          }, {
            onConflict: "work_center_id,date,shift_number"
          })
          .select()
          .single()

        if (insertError) throw insertError

        setBlockings(prev => [...prev, data])
        return true // Now blocked
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cambiar bloqueo"
      setError(errorMessage)
      console.error("Error toggling shift blocking:", err)
      toast.error(errorMessage)
      return null
    }
  }, [blockings])

  /**
   * Check if a specific shift is blocked
   */
  const isShiftBlocked = useCallback((workCenterId: string, dayIndex: number, shiftNumber: 1 | 2 | 3): boolean => {
    if (!weekStartDate) return false

    const date = addDays(weekStartDate, dayIndex)
    const dateStr = format(date, "yyyy-MM-dd")

    return blockings.some(
      b => b.work_center_id === workCenterId &&
           b.date === dateStr &&
           b.shift_number === shiftNumber
    )
  }, [blockings, weekStartDate])

  // Auto-fetch on mount if weekStartDate is provided
  useEffect(() => {
    if (weekStartDate) {
      const endDate = addDays(weekStartDate, 6) // 7 days total
      fetchBlockings(weekStartDate, endDate)
    }
  }, [weekStartDate, fetchBlockings])

  return {
    blockings,
    loading,
    error,
    fetchBlockings,
    toggleBlock,
    isShiftBlocked,
  }
}
