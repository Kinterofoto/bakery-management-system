"use client"

import { useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  format,
  getWeek,
  getYear,
  isSameWeek
} from "date-fns"
import { es } from "date-fns/locale"

export interface WeeklyPlan {
  id: string
  weekStartDate: Date
  weekNumber: number
  year: number
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  notes?: string
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface WeekInfo {
  weekStartDate: Date
  weekEndDate: Date
  weekNumber: number
  year: number
  label: string
  isCurrentWeek: boolean
  isPast: boolean
  isFuture: boolean
}

/**
 * Hook para manejar la navegación entre semanas y planes semanales
 */
export function useWeeklyPlan(initialDate?: Date) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const date = initialDate || new Date()
    const weekStart = startOfWeek(date, { weekStartsOn: 0 }) // Sunday
    weekStart.setHours(6, 0, 0, 0)
    return weekStart
  })

  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get info about current week
  const weekInfo = useMemo((): WeekInfo => {
    const now = new Date()
    const todayWeekStart = startOfWeek(now, { weekStartsOn: 0 })
    todayWeekStart.setHours(6, 0, 0, 0)

    const weekEnd = addWeeks(currentWeekStart, 1)
    weekEnd.setHours(5, 59, 59, 999) // End at 5:59am next Sunday

    const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 0 })
    const year = getYear(currentWeekStart)

    const isCurrentWeek = isSameWeek(currentWeekStart, now, { weekStartsOn: 0 })
    const isPast = currentWeekStart < todayWeekStart
    const isFuture = currentWeekStart > todayWeekStart

    // Format: "Semana 1 - Ene 5 al 11, 2026"
    const startFormatted = format(currentWeekStart, "MMM d", { locale: es })
    const endFormatted = format(addWeeks(currentWeekStart, 1), "d, yyyy", { locale: es })
    const label = `Semana ${weekNumber} - ${startFormatted} al ${endFormatted}`

    return {
      weekStartDate: currentWeekStart,
      weekEndDate: weekEnd,
      weekNumber,
      year,
      label,
      isCurrentWeek,
      isPast,
      isFuture
    }
  }, [currentWeekStart])

  // Navigate to next week
  const nextWeek = useCallback(() => {
    setCurrentWeekStart(prev => {
      const next = addWeeks(prev, 1)
      next.setHours(6, 0, 0, 0)
      return next
    })
  }, [])

  // Navigate to previous week
  const previousWeek = useCallback(() => {
    setCurrentWeekStart(prev => {
      const prev2 = subWeeks(prev, 1)
      prev2.setHours(6, 0, 0, 0)
      return prev2
    })
  }, [])

  // Navigate to today's week
  const goToCurrentWeek = useCallback(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 0 })
    weekStart.setHours(6, 0, 0, 0)
    setCurrentWeekStart(weekStart)
  }, [])

  // Navigate to a specific date's week
  const goToWeek = useCallback((date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 })
    weekStart.setHours(6, 0, 0, 0)
    setCurrentWeekStart(weekStart)
  }, [])

  // Get list of weeks for selector (e.g., 8 weeks before and after)
  const getWeeksList = useCallback((weeksBack: number = 4, weeksForward: number = 8): WeekInfo[] => {
    const weeks: WeekInfo[] = []
    const now = new Date()
    const todayWeekStart = startOfWeek(now, { weekStartsOn: 0 })
    todayWeekStart.setHours(6, 0, 0, 0)

    for (let i = -weeksBack; i <= weeksForward; i++) {
      const weekStart = addWeeks(todayWeekStart, i)
      weekStart.setHours(6, 0, 0, 0)

      const weekEnd = addWeeks(weekStart, 1)
      weekEnd.setHours(5, 59, 59, 999)

      const weekNumber = getWeek(weekStart, { weekStartsOn: 0 })
      const year = getYear(weekStart)
      const isCurrentWeek = i === 0
      const isPast = i < 0
      const isFuture = i > 0

      const startFormatted = format(weekStart, "MMM d", { locale: es })
      const endFormatted = format(addWeeks(weekStart, 1), "d", { locale: es })
      const label = `Sem ${weekNumber} (${startFormatted}-${endFormatted})`

      weeks.push({
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber,
        year,
        label,
        isCurrentWeek,
        isPast,
        isFuture
      })
    }

    return weeks
  }, [])

  // Fetch or create weekly plan for current week
  const fetchOrCreatePlan = useCallback(async (): Promise<WeeklyPlan | null> => {
    try {
      setLoading(true)
      setError(null)

      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd')

      // Try to fetch existing plan
      const { data: existingPlan, error: fetchError } = await supabase
        .schema('produccion')
        .from('weekly_plans')
        .select('*')
        .eq('week_start_date', weekStartStr)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        throw fetchError
      }

      if (existingPlan) {
        const plan: WeeklyPlan = {
          id: existingPlan.id,
          weekStartDate: new Date(existingPlan.week_start_date),
          weekNumber: existingPlan.week_number,
          year: existingPlan.year,
          status: existingPlan.status,
          notes: existingPlan.notes,
          createdBy: existingPlan.created_by,
          createdAt: new Date(existingPlan.created_at),
          updatedAt: new Date(existingPlan.updated_at)
        }
        setCurrentPlan(plan)
        return plan
      }

      // Create new plan
      const { data: newPlan, error: createError } = await supabase
        .schema('produccion')
        .from('weekly_plans')
        .insert([{
          week_start_date: weekStartStr,
          status: 'draft'
        }])
        .select()
        .single()

      if (createError) throw createError

      const plan: WeeklyPlan = {
        id: newPlan.id,
        weekStartDate: new Date(newPlan.week_start_date),
        weekNumber: newPlan.week_number,
        year: newPlan.year,
        status: newPlan.status,
        notes: newPlan.notes,
        createdBy: newPlan.created_by,
        createdAt: new Date(newPlan.created_at),
        updatedAt: new Date(newPlan.updated_at)
      }

      setCurrentPlan(plan)
      return plan
    } catch (err) {
      console.error('Error fetching/creating plan:', err)
      setError(err instanceof Error ? err.message : 'Error con el plan semanal')
      return null
    } finally {
      setLoading(false)
    }
  }, [currentWeekStart])

  // Update plan status
  const updatePlanStatus = useCallback(async (
    status: 'draft' | 'active' | 'completed' | 'cancelled'
  ): Promise<boolean> => {
    if (!currentPlan) {
      toast.error('No hay plan activo')
      return false
    }

    try {
      const { error: err } = await supabase
        .schema('produccion')
        .from('weekly_plans')
        .update({ status })
        .eq('id', currentPlan.id)

      if (err) throw err

      setCurrentPlan(prev => prev ? { ...prev, status } : null)
      toast.success(`Plan ${status === 'active' ? 'activado' : status === 'completed' ? 'completado' : 'actualizado'}`)
      return true
    } catch (err) {
      console.error('Error updating plan status:', err)
      toast.error('Error al actualizar el estado del plan')
      return false
    }
  }, [currentPlan])

  // Update plan notes
  const updatePlanNotes = useCallback(async (notes: string): Promise<boolean> => {
    if (!currentPlan) return false

    try {
      const { error: err } = await supabase
        .schema('produccion')
        .from('weekly_plans')
        .update({ notes })
        .eq('id', currentPlan.id)

      if (err) throw err

      setCurrentPlan(prev => prev ? { ...prev, notes } : null)
      return true
    } catch (err) {
      console.error('Error updating plan notes:', err)
      return false
    }
  }, [currentPlan])

  // Duplicate plan to another week
  const duplicatePlan = useCallback(async (targetWeekStart: Date): Promise<boolean> => {
    if (!currentPlan) {
      toast.error('No hay plan para duplicar')
      return false
    }

    try {
      setLoading(true)

      // Create new plan for target week
      const targetWeekStr = format(targetWeekStart, 'yyyy-MM-dd')

      // Check if target week already has a plan
      const { data: existingPlan } = await supabase
        .schema('produccion')
        .from('weekly_plans')
        .select('id')
        .eq('week_start_date', targetWeekStr)
        .single()

      if (existingPlan) {
        toast.error('La semana destino ya tiene un plan')
        return false
      }

      // Create new plan
      const { data: newPlan, error: planError } = await supabase
        .schema('produccion')
        .from('weekly_plans')
        .insert([{
          week_start_date: targetWeekStr,
          status: 'draft',
          notes: `Duplicado de Semana ${currentPlan.weekNumber}`
        }])
        .select()
        .single()

      if (planError) throw planError

      // Get schedules from current week
      const weekEndDate = addWeeks(currentWeekStart, 1)
      const { data: schedules } = await supabase
        .schema('produccion')
        .from('production_schedules')
        .select('*')
        .eq('week_plan_id', currentPlan.id)

      if (schedules && schedules.length > 0) {
        // Calculate days difference
        const daysDiff = Math.round(
          (targetWeekStart.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Duplicate schedules with adjusted dates
        const newSchedules = schedules.map(s => {
          const oldStart = new Date(s.start_date)
          const oldEnd = new Date(s.end_date)

          const newStart = new Date(oldStart.getTime() + daysDiff * 24 * 60 * 60 * 1000)
          const newEnd = new Date(oldEnd.getTime() + daysDiff * 24 * 60 * 60 * 1000)

          return {
            resource_id: s.resource_id,
            product_id: s.product_id,
            quantity: s.quantity,
            start_date: newStart.toISOString(),
            end_date: newEnd.toISOString(),
            shift_number: s.shift_number,
            day_of_week: s.day_of_week,
            week_plan_id: newPlan.id
          }
        })

        const { error: scheduleError } = await supabase
          .schema('produccion')
          .from('production_schedules')
          .insert(newSchedules)

        if (scheduleError) throw scheduleError
      }

      toast.success(`Plan duplicado a Semana ${getWeek(targetWeekStart, { weekStartsOn: 0 })}`)
      return true
    } catch (err) {
      console.error('Error duplicating plan:', err)
      toast.error('Error al duplicar el plan')
      return false
    } finally {
      setLoading(false)
    }
  }, [currentPlan, currentWeekStart])

  return {
    currentWeekStart,
    weekInfo,
    currentPlan,
    loading,
    error,
    nextWeek,
    previousWeek,
    goToCurrentWeek,
    goToWeek,
    getWeeksList,
    fetchOrCreatePlan,
    updatePlanStatus,
    updatePlanNotes,
    duplicatePlan
  }
}
