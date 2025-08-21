"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ShiftProduction = Database["produccion"]["Tables"]["shift_productions"]["Row"]
type ShiftProductionInsert = Database["produccion"]["Tables"]["shift_productions"]["Insert"]
type ShiftProductionUpdate = Database["produccion"]["Tables"]["shift_productions"]["Update"]
type ProductionRecord = Database["produccion"]["Tables"]["production_records"]["Row"]
type ProductionRecordInsert = Database["produccion"]["Tables"]["production_records"]["Insert"]

export function useShiftProductions(shiftId?: string) {
  const [productions, setProductions] = useState<ShiftProduction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProductions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from("produccion.shift_productions")
        .select("*")
        .order("started_at", { ascending: false })

      if (shiftId) {
        query = query.eq("shift_id", shiftId)
      }

      const { data, error } = await query

      if (error) throw error
      setProductions(data || [])
    } catch (err) {
      console.error("Error fetching shift productions:", err)
      setError(err instanceof Error ? err.message : "Error fetching shift productions")
    } finally {
      setLoading(false)
    }
  }, [shiftId])

  const createProduction = useCallback(async (production: ShiftProductionInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from("produccion.shift_productions")
        .insert(production)
        .select()
        .single()

      if (error) throw error
      
      setProductions(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error("Error creating production:", err)
      setError(err instanceof Error ? err.message : "Error creating production")
      throw err
    }
  }, [])

  const updateProduction = useCallback(async (id: string, updates: ShiftProductionUpdate) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from("produccion.shift_productions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      
      setProductions(prev => 
        prev.map(prod => prod.id === id ? data : prod)
      )
      return data
    } catch (err) {
      console.error("Error updating production:", err)
      setError(err instanceof Error ? err.message : "Error updating production")
      throw err
    }
  }, [])

  const endProduction = useCallback(async (id: string, notes?: string) => {
    try {
      return await updateProduction(id, {
        status: "completed",
        ended_at: new Date().toISOString(),
        notes
      })
    } catch (err) {
      console.error("Error ending production:", err)
      throw err
    }
  }, [updateProduction])

  const addProductionRecord = useCallback(async (record: ProductionRecordInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from("produccion.production_records")
        .insert(record)
        .select()
        .single()

      if (error) throw error
      
      // Refetch productions to update totals (trigger handles this automatically)
      fetchProductions()
      
      return data
    } catch (err) {
      console.error("Error adding production record:", err)
      setError(err instanceof Error ? err.message : "Error adding production record")
      throw err
    }
  }, [fetchProductions])

  const getProductionRecords = useCallback(async (shiftProductionId: string) => {
    try {
      const { data, error } = await supabase
        .from("produccion.production_records")
        .select("*")
        .eq("shift_production_id", shiftProductionId)
        .order("recorded_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching production records:", err)
      return []
    }
  }, [])

  const getActiveProductions = useCallback(() => {
    return productions.filter(prod => prod.status === "active")
  }, [productions])

  const getProductionById = useCallback((id: string) => {
    return productions.find(prod => prod.id === id)
  }, [productions])

  const getProductionsByProduct = useCallback((productId: string) => {
    return productions.filter(prod => prod.product_id === productId)
  }, [productions])

  const getTotalUnitsProduced = useCallback(() => {
    return productions.reduce((total, prod) => total + prod.total_good_units, 0)
  }, [productions])

  const getTotalBadUnits = useCallback(() => {
    return productions.reduce((total, prod) => total + prod.total_bad_units, 0)
  }, [productions])

  useEffect(() => {
    fetchProductions()
  }, [fetchProductions])

  return {
    productions,
    loading,
    error,
    createProduction,
    updateProduction,
    endProduction,
    addProductionRecord,
    getProductionRecords,
    getActiveProductions,
    getProductionById,
    getProductionsByProduct,
    getTotalUnitsProduced,
    getTotalBadUnits,
    refetch: fetchProductions,
  }
}