"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type WorkCenter = Database["produccion"]["Tables"]["work_centers"]["Row"]
type WorkCenterInsert = Database["produccion"]["Tables"]["work_centers"]["Insert"]
type WorkCenterUpdate = Database["produccion"]["Tables"]["work_centers"]["Update"]

export function useWorkCenters() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkCenters = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from("produccion.work_centers")
        .select("*")
        .order("name")

      if (error) throw error
      setWorkCenters(data || [])
    } catch (err) {
      console.error("Error fetching work centers:", err)
      setError(err instanceof Error ? err.message : "Error fetching work centers")
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkCenter = useCallback(async (workCenter: WorkCenterInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from("produccion.work_centers")
        .insert(workCenter)
        .select()
        .single()

      if (error) throw error
      
      setWorkCenters(prev => [...prev, data])
      return data
    } catch (err) {
      console.error("Error creating work center:", err)
      setError(err instanceof Error ? err.message : "Error creating work center")
      throw err
    }
  }, [])

  const updateWorkCenter = useCallback(async (id: string, updates: WorkCenterUpdate) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from("produccion.work_centers")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      
      setWorkCenters(prev => 
        prev.map(wc => wc.id === id ? data : wc)
      )
      return data
    } catch (err) {
      console.error("Error updating work center:", err)
      setError(err instanceof Error ? err.message : "Error updating work center")
      throw err
    }
  }, [])

  const deleteWorkCenter = useCallback(async (id: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .from("produccion.work_centers")
        .delete()
        .eq("id", id)

      if (error) throw error
      
      setWorkCenters(prev => prev.filter(wc => wc.id !== id))
    } catch (err) {
      console.error("Error deleting work center:", err)
      setError(err instanceof Error ? err.message : "Error deleting work center")
      throw err
    }
  }, [])

  const getActiveWorkCenters = useCallback(() => {
    return workCenters.filter(wc => wc.is_active)
  }, [workCenters])

  const getWorkCenterById = useCallback((id: string) => {
    return workCenters.find(wc => wc.id === id)
  }, [workCenters])

  useEffect(() => {
    fetchWorkCenters()
  }, [fetchWorkCenters])

  return {
    workCenters,
    loading,
    error,
    createWorkCenter,
    updateWorkCenter,
    deleteWorkCenter,
    getActiveWorkCenters,
    getWorkCenterById,
    refetch: fetchWorkCenters,
  }
}