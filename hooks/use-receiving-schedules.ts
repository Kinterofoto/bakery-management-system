"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ReceivingSchedule = Database["public"]["Tables"]["receiving_schedules"]["Row"]
type ReceivingScheduleInsert = Database["public"]["Tables"]["receiving_schedules"]["Insert"]
type ReceivingScheduleUpdate = Database["public"]["Tables"]["receiving_schedules"]["Update"]

export interface ScheduleSlot {
  id?: string
  start_time: string
  end_time: string
  status: "available" | "unavailable"
  metadata?: Record<string, any>
}

export interface DaySchedule {
  day_of_week: number
  slots: ScheduleSlot[]
}

export function useReceivingSchedules() {
  const [schedules, setSchedules] = useState<ReceivingSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("receiving_schedules")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true })

      if (error) {
        console.error("Error fetching receiving schedules:", error)
        setError(error.message)
        return
      }

      setSchedules(data || [])
    } catch (err: any) {
      console.error("Error fetching receiving schedules:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createSchedule = async (scheduleData: ReceivingScheduleInsert): Promise<ReceivingSchedule> => {
    try {
      // First check for overlaps
      const hasOverlap = await checkTimeOverlap(
        scheduleData.client_id || undefined,
        scheduleData.branch_id || undefined,
        scheduleData.day_of_week,
        scheduleData.start_time,
        scheduleData.end_time
      )

      if (hasOverlap) {
        throw new Error("El horario se superpone con uno existente")
      }

      const { data, error } = await supabase
        .from("receiving_schedules")
        .insert([scheduleData])
        .select()
        .single()

      if (error) {
        console.error("Error creating receiving schedule:", error)
        throw error
      }

      setSchedules(prev => [...prev, data])
      return data
    } catch (err: any) {
      console.error("Error creating receiving schedule:", err)
      throw err
    }
  }

  const updateSchedule = async (
    scheduleId: string, 
    scheduleData: ReceivingScheduleUpdate
  ): Promise<ReceivingSchedule> => {
    try {
      const { data, error } = await supabase
        .from("receiving_schedules")
        .update(scheduleData)
        .eq("id", scheduleId)
        .select()
        .single()

      if (error) {
        console.error("Error updating receiving schedule:", error)
        throw error
      }

      setSchedules(prev => 
        prev.map(schedule => 
          schedule.id === scheduleId ? data : schedule
        )
      )
      return data
    } catch (err: any) {
      console.error("Error updating receiving schedule:", err)
      throw err
    }
  }

  const deleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from("receiving_schedules")
        .delete()
        .eq("id", scheduleId)

      if (error) {
        console.error("Error deleting receiving schedule:", error)
        throw error
      }

      setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId))
    } catch (err: any) {
      console.error("Error deleting receiving schedule:", err)
      throw err
    }
  }

  const getSchedulesByClient = (clientId: string): ReceivingSchedule[] => {
    return schedules.filter(schedule => schedule.client_id === clientId)
  }

  const getSchedulesByBranch = (branchId: string): ReceivingSchedule[] => {
    return schedules.filter(schedule => schedule.branch_id === branchId)
  }

  const getSchedulesByDay = (dayOfWeek: number): ReceivingSchedule[] => {
    return schedules.filter(schedule => schedule.day_of_week === dayOfWeek)
  }

  const checkTimeOverlap = async (
    clientId?: string,
    branchId?: string,
    dayOfWeek?: number,
    startTime?: string,
    endTime?: string,
    excludeId?: string
  ): Promise<boolean> => {
    if (!dayOfWeek || !startTime || !endTime) return false

    try {
      const { data, error } = await supabase.rpc("check_schedule_overlap", {
        p_day_of_week: dayOfWeek,
        p_start_time: startTime,
        p_end_time: endTime,
        p_client_id: clientId || null,
        p_branch_id: branchId || null,
        p_exclude_id: excludeId || null,
      })

      if (error) {
        console.error("Error checking schedule overlap:", error)
        return false
      }

      return data || false
    } catch (err: any) {
      console.error("Error checking schedule overlap:", err)
      return false
    }
  }

  // Bulk operations for matrix UI
  const createBulkSchedules = async (schedulesData: ReceivingScheduleInsert[]): Promise<ReceivingSchedule[]> => {
    try {
      const { data, error } = await supabase
        .from("receiving_schedules")
        .insert(schedulesData)
        .select()

      if (error) {
        console.error("Error creating bulk schedules:", error)
        throw error
      }

      setSchedules(prev => [...prev, ...data])
      return data
    } catch (err: any) {
      console.error("Error creating bulk schedules:", err)
      throw err
    }
  }

  const deleteBulkSchedules = async (scheduleIds: string[]) => {
    try {
      const { error } = await supabase
        .from("receiving_schedules")
        .delete()
        .in("id", scheduleIds)

      if (error) {
        console.error("Error deleting bulk schedules:", error)
        throw error
      }

      setSchedules(prev => prev.filter(schedule => !scheduleIds.includes(schedule.id)))
    } catch (err: any) {
      console.error("Error deleting bulk schedules:", err)
      throw err
    }
  }

  // Copy schedules from one client/branch to another
  const copySchedules = async (
    fromClientId?: string,
    fromBranchId?: string,
    toClientId?: string,
    toBranchId?: string,
    days?: number[] // Optional: only copy specific days
  ) => {
    try {
      let query = supabase
        .from("receiving_schedules")
        .select("*")

      if (fromClientId) {
        query = query.eq("client_id", fromClientId)
      } else if (fromBranchId) {
        query = query.eq("branch_id", fromBranchId)
      }

      if (days && days.length > 0) {
        query = query.in("day_of_week", days)
      }

      const { data: sourceSchedules, error } = await query

      if (error) {
        console.error("Error fetching source schedules:", error)
        throw error
      }

      if (!sourceSchedules || sourceSchedules.length === 0) {
        throw new Error("No se encontraron horarios para copiar")
      }

      // Create new schedules based on source
      const newSchedules: ReceivingScheduleInsert[] = sourceSchedules.map(schedule => ({
        client_id: toClientId || null,
        branch_id: toBranchId || null,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        status: schedule.status,
        timezone: schedule.timezone,
        metadata: schedule.metadata,
      }))

      return await createBulkSchedules(newSchedules)
    } catch (err: any) {
      console.error("Error copying schedules:", err)
      throw err
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [])

  return {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getSchedulesByClient,
    getSchedulesByBranch,
    getSchedulesByDay,
    checkTimeOverlap,
    createBulkSchedules,
    deleteBulkSchedules,
    copySchedules,
    refetch: fetchSchedules,
  }
}