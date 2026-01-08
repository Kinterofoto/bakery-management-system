"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Productivity = Database["produccion"]["Tables"]["production_productivity"]["Row"]
type ProductivityInsert = Database["produccion"]["Tables"]["production_productivity"]["Insert"]
type ProductivityUpdate = Database["produccion"]["Tables"]["production_productivity"]["Update"]

export function useProductivity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getProductivityByProductAndOperation = useCallback(async (
    productId: string,
    operationId: string
  ): Promise<Productivity | null> => {
    try {
      console.log('🔍 [useProductivity] Consultando productividad...', { productId, operationId })
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("production_productivity")
        .select("*")
        .eq("product_id", productId)
        .eq("operation_id", operationId)
        .maybeSingle()

      console.log('📊 [useProductivity] Resultado de consulta:', { data, error })

      if (error) throw error
      return data
    } catch (err) {
      console.error("❌ [useProductivity] Error fetching productivity:", err)
      setError(err instanceof Error ? err.message : "Error fetching productivity")
      return null
    }
  }, [])

  const upsertProductivity = useCallback(async (
    productId: string,
    operationId: string,
    unitsPerHour: number
  ): Promise<Productivity | null> => {
    try {
      setLoading(true)
      setError(null)

      // Verificar si ya existe
      const existing = await getProductivityByProductAndOperation(productId, operationId)

      if (existing) {
        // Actualizar
        const { data, error } = await supabase
          .schema("produccion")
          .from("production_productivity")
          .update({
            units_per_hour: unitsPerHour,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Crear nuevo
        const { data, error } = await supabase
          .schema("produccion")
          .from("production_productivity")
          .insert({
            product_id: productId,
            operation_id: operationId,
            work_center_id: null,
            units_per_hour: unitsPerHour,
            is_active: true
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (err) {
      console.error("Error upserting productivity:", err)
      setError(err instanceof Error ? err.message : "Error upserting productivity")
      throw err
    } finally {
      setLoading(false)
    }
  }, [getProductivityByProductAndOperation])

  const deleteProductivity = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .schema("produccion")
        .from("production_productivity")
        .delete()
        .eq("id", id)

      if (error) throw error
    } catch (err) {
      console.error("Error deleting productivity:", err)
      setError(err instanceof Error ? err.message : "Error deleting productivity")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getProductivityByProductAndOperation,
    upsertProductivity,
    deleteProductivity
  }
}
