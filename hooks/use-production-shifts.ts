"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ProductionShift = Database["produccion"]["Tables"]["production_shifts"]["Row"]
type ProductionShiftInsert = Database["produccion"]["Tables"]["production_shifts"]["Insert"]
type ProductionShiftUpdate = Database["produccion"]["Tables"]["production_shifts"]["Update"]

export function useProductionShifts(workCenterId?: string) {
  const [shifts, setShifts] = useState<ProductionShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .schema("produccion")
        .from("production_shifts")
        .select("*")
        .order("started_at", { ascending: false })

      if (workCenterId) {
        query = query.eq("work_center_id", workCenterId)
      }

      const { data, error } = await query

      if (error) throw error
      setShifts(data || [])
    } catch (err) {
      console.error("Error fetching production shifts:", err)
      setError(err instanceof Error ? err.message : "Error fetching production shifts")
    } finally {
      setLoading(false)
    }
  }, [workCenterId])

  const createShift = useCallback(async (shift: ProductionShiftInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("production_shifts")
        .insert(shift)
        .select()
        .single()

      if (error) throw error
      
      setShifts(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error("Error creating shift:", err)
      setError(err instanceof Error ? err.message : "Error creating shift")
      throw err
    }
  }, [])

  const updateShift = useCallback(async (id: string, updates: ProductionShiftUpdate) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("production_shifts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      
      setShifts(prev => 
        prev.map(shift => shift.id === id ? data : shift)
      )
      return data
    } catch (err) {
      console.error("Error updating shift:", err)
      setError(err instanceof Error ? err.message : "Error updating shift")
      throw err
    }
  }, [])

  const endShift = useCallback(async (id: string, notes?: string) => {
    try {
      return await updateShift(id, {
        status: "completed",
        ended_at: new Date().toISOString(),
        notes
      })
    } catch (err) {
      console.error("Error ending shift:", err)
      throw err
    }
  }, [updateShift])

  const pauseShift = useCallback(async (id: string) => {
    try {
      return await updateShift(id, { status: "paused" })
    } catch (err) {
      console.error("Error pausing shift:", err)
      throw err
    }
  }, [updateShift])

  const resumeShift = useCallback(async (id: string) => {
    try {
      return await updateShift(id, { status: "active" })
    } catch (err) {
      console.error("Error resuming shift:", err)
      throw err
    }
  }, [updateShift])

  const getActiveShifts = useCallback(() => {
    return shifts.filter(shift => shift.status === "active")
  }, [shifts])

  const getShiftById = useCallback((id: string) => {
    return shifts.find(shift => shift.id === id)
  }, [shifts])

  const hasActiveShift = useCallback((workCenterId: string) => {
    return shifts.some(shift => 
      shift.work_center_id === workCenterId && shift.status === "active"
    )
  }, [shifts])

  const getActiveShiftForWorkCenter = useCallback((workCenterId: string) => {
    return shifts.find(shift => 
      shift.work_center_id === workCenterId && shift.status === "active"
    )
  }, [shifts])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  return {
    shifts,
    loading,
    error,
    createShift,
    updateShift,
    endShift,
    pauseShift,
    resumeShift,
    getActiveShifts,
    getShiftById,
    hasActiveShift,
    getActiveShiftForWorkCenter,
    refetch: fetchShifts,
  }
}