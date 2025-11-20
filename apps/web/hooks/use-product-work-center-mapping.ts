"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ProductWorkCenterMapping = Database["produccion"]["Tables"]["product_work_center_mapping"]["Row"]
type ProductWorkCenterMappingInsert = Database["produccion"]["Tables"]["product_work_center_mapping"]["Insert"]
type ProductWorkCenterMappingUpdate = Database["produccion"]["Tables"]["product_work_center_mapping"]["Update"]

export function useProductWorkCenterMapping() {
  const [mappings, setMappings] = useState<ProductWorkCenterMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("product_work_center_mapping")
        .select("*")

      if (error) throw error
      setMappings(data || [])
    } catch (err) {
      console.error("Error fetching product work center mappings:", err)
      setError(err instanceof Error ? err.message : "Error fetching mappings")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMappingsByOperation = useCallback(async (operationId: string) => {
    try {
      const { data, error } = await supabase
        .schema("produccion")
        .from("product_work_center_mapping")
        .select("*")
        .eq("operation_id", operationId)

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching mappings by operation:", err)
      return []
    }
  }, [])

  const fetchMappingsByProduct = useCallback(async (productId: string) => {
    try {
      const { data, error } = await supabase
        .schema("produccion")
        .from("product_work_center_mapping")
        .select("*")
        .eq("product_id", productId)

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching mappings by product:", err)
      return []
    }
  }, [])

  const getMappingByProductAndOperation = useCallback(
    (productId: string, operationId: string) => {
      return mappings.find(
        m => m.product_id === productId && m.operation_id === operationId
      )
    },
    [mappings]
  )

  const createMapping = useCallback(async (mapping: ProductWorkCenterMappingInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("product_work_center_mapping")
        .insert(mapping)
        .select()
        .single()

      if (error) throw error

      setMappings(prev => [...prev, data])
      return data
    } catch (err) {
      console.error("Error creating mapping:", err)
      setError(err instanceof Error ? err.message : "Error creating mapping")
      throw err
    }
  }, [])

  const updateMapping = useCallback(async (id: string, updates: ProductWorkCenterMappingUpdate) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("product_work_center_mapping")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      setMappings(prev =>
        prev.map(m => m.id === id ? data : m)
      )
      return data
    } catch (err) {
      console.error("Error updating mapping:", err)
      setError(err instanceof Error ? err.message : "Error updating mapping")
      throw err
    }
  }, [])

  const deleteMapping = useCallback(async (id: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .schema("produccion")
        .from("product_work_center_mapping")
        .delete()
        .eq("id", id)

      if (error) throw error

      setMappings(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      console.error("Error deleting mapping:", err)
      setError(err instanceof Error ? err.message : "Error deleting mapping")
      throw err
    }
  }, [])

  const upsertMapping = useCallback(
    async (productId: string, operationId: string, workCenterId: string) => {
      try {
        setError(null)
        const existing = mappings.find(
          m => m.product_id === productId && m.operation_id === operationId
        )

        if (existing) {
          return await updateMapping(existing.id, { work_center_id: workCenterId })
        } else {
          return await createMapping({
            product_id: productId,
            operation_id: operationId,
            work_center_id: workCenterId,
          })
        }
      } catch (err) {
        console.error("Error upserting mapping:", err)
        setError(err instanceof Error ? err.message : "Error upserting mapping")
        throw err
      }
    },
    [mappings, createMapping, updateMapping]
  )

  useEffect(() => {
    fetchMappings()
  }, [fetchMappings])

  return {
    mappings,
    loading,
    error,
    createMapping,
    updateMapping,
    deleteMapping,
    upsertMapping,
    fetchMappingsByOperation,
    fetchMappingsByProduct,
    getMappingByProductAndOperation,
    refetch: fetchMappings,
  }
}
