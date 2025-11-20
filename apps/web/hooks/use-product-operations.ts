"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Operation = Database["produccion"]["Tables"]["operations"]["Row"]
type OperationInsert = Database["produccion"]["Tables"]["operations"]["Insert"]
type OperationUpdate = Database["produccion"]["Tables"]["operations"]["Update"]

export function useProductOperations() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOperations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("operations")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setOperations(data || [])
    } catch (err) {
      console.error("Error fetching operations:", err)
      setError(err instanceof Error ? err.message : "Error fetching operations")
    } finally {
      setLoading(false)
    }
  }, [])

  const createOperation = useCallback(async (operation: OperationInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("operations")
        .insert(operation)
        .select()
        .single()

      if (error) throw error

      setOperations(prev => [...prev, data])
      return data
    } catch (err) {
      console.error("Error creating operation:", err)
      setError(err instanceof Error ? err.message : "Error creating operation")
      throw err
    }
  }, [])

  const updateOperation = useCallback(async (id: string, updates: OperationUpdate) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("operations")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      setOperations(prev =>
        prev.map(op => op.id === id ? data : op)
      )
      return data
    } catch (err) {
      console.error("Error updating operation:", err)
      setError(err instanceof Error ? err.message : "Error updating operation")
      throw err
    }
  }, [])

  const deleteOperation = useCallback(async (id: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .schema("produccion")
        .from("operations")
        .delete()
        .eq("id", id)

      if (error) throw error

      setOperations(prev => prev.filter(op => op.id !== id))
    } catch (err) {
      console.error("Error deleting operation:", err)
      setError(err instanceof Error ? err.message : "Error deleting operation")
      throw err
    }
  }, [])

  useEffect(() => {
    fetchOperations()
  }, [fetchOperations])

  return {
    operations,
    loading,
    error,
    createOperation,
    updateOperation,
    deleteOperation,
    refetch: fetchOperations,
  }
}
