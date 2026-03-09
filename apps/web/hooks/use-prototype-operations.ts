"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface PrototypeOperation {
  id: string
  prototype_id: string
  operation_id: string | null
  operation_name: string | null
  is_custom_operation: boolean
  step_number: number
  duration_minutes: number | null
  temperature_celsius: number | null
  humidity_percentage: number | null
  speed_rpm: number | null
  input_weight_grams: number | null
  output_weight_grams: number | null
  yield_percentage: number | null
  waste_grams: number | null
  people_count: number | null
  labor_time_minutes: number | null
  avg_assembly_time_seconds: number | null
  produces_sub_product: boolean
  sub_product_name: string | null
  is_filling: boolean
  sub_product_input_grams: number | null
  sub_product_output_grams: number | null
  sub_product_waste_grams: number | null
  has_trim: boolean
  weight_before_trim_grams: number | null
  trim_weight_grams: number | null
  weight_after_trim_grams: number | null
  instructions: string | null
  observations: string | null
}

export interface PrototypeOperationInsert {
  prototype_id: string
  operation_id?: string | null
  operation_name?: string | null
  is_custom_operation?: boolean
  step_number: number
  duration_minutes?: number | null
  temperature_celsius?: number | null
  humidity_percentage?: number | null
  speed_rpm?: number | null
  input_weight_grams?: number | null
  output_weight_grams?: number | null
  people_count?: number | null
  labor_time_minutes?: number | null
  avg_assembly_time_seconds?: number | null
  produces_sub_product?: boolean
  sub_product_name?: string | null
  is_filling?: boolean
  sub_product_input_grams?: number | null
  sub_product_output_grams?: number | null
  sub_product_waste_grams?: number | null
  has_trim?: boolean
  weight_before_trim_grams?: number | null
  trim_weight_grams?: number | null
  weight_after_trim_grams?: number | null
  instructions?: string | null
  observations?: string | null
}

export interface PrototypeOperationUpdate {
  operation_id?: string | null
  operation_name?: string | null
  is_custom_operation?: boolean
  step_number?: number
  duration_minutes?: number | null
  temperature_celsius?: number | null
  humidity_percentage?: number | null
  speed_rpm?: number | null
  input_weight_grams?: number | null
  output_weight_grams?: number | null
  yield_percentage?: number | null
  waste_grams?: number | null
  people_count?: number | null
  labor_time_minutes?: number | null
  avg_assembly_time_seconds?: number | null
  produces_sub_product?: boolean
  sub_product_name?: string | null
  is_filling?: boolean
  sub_product_input_grams?: number | null
  sub_product_output_grams?: number | null
  sub_product_waste_grams?: number | null
  has_trim?: boolean
  weight_before_trim_grams?: number | null
  trim_weight_grams?: number | null
  weight_after_trim_grams?: number | null
  instructions?: string | null
  observations?: string | null
}

export function usePrototypeOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getOperationsByPrototype = useCallback(async (prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_operations")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("step_number", { ascending: true })

      if (fetchError) throw fetchError
      return (data as PrototypeOperation[]) || []
    } catch (err) {
      console.error("Error al obtener operaciones:", err)
      setError(err instanceof Error ? err.message : "Error al obtener operaciones")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const addOperation = useCallback(async (operationData: PrototypeOperationInsert) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: insertError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_operations")
        .insert(operationData)
        .select()
        .single()

      if (insertError) throw insertError

      toast.success("Operación agregada")
      return data as PrototypeOperation
    } catch (err) {
      console.error("Error al agregar operación:", err)
      setError(err instanceof Error ? err.message : "Error al agregar operación")
      toast.error("Error al agregar operación")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateOperation = useCallback(async (id: string, updates: PrototypeOperationUpdate) => {
    try {
      setLoading(true)
      setError(null)

      const updatesWithCalc = { ...updates }
      if (
        updates.input_weight_grams !== undefined &&
        updates.output_weight_grams !== undefined &&
        updates.input_weight_grams !== null &&
        updates.output_weight_grams !== null &&
        updates.input_weight_grams > 0
      ) {
        updatesWithCalc.yield_percentage =
          (updates.output_weight_grams / updates.input_weight_grams) * 100
        updatesWithCalc.waste_grams =
          updates.input_weight_grams - updates.output_weight_grams
      }

      const { data, error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_operations")
        .update(updatesWithCalc)
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError

      toast.success("Operación actualizada")
      return data as PrototypeOperation
    } catch (err) {
      console.error("Error al actualizar operación:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar operación")
      toast.error("Error al actualizar operación")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const removeOperation = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_operations")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      toast.success("Operación eliminada")
      return true
    } catch (err) {
      console.error("Error al eliminar operación:", err)
      setError(err instanceof Error ? err.message : "Error al eliminar operación")
      toast.error("Error al eliminar operación")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const reorderOperations = useCallback(async (
    prototypeId: string,
    orderedIds: string[]
  ) => {
    try {
      setLoading(true)
      setError(null)

      const updates = orderedIds.map((id, index) =>
        (supabase
          .schema("investigacion" as any))
          .from("prototype_operations")
          .update({ step_number: index + 1 })
          .eq("id", id)
          .eq("prototype_id", prototypeId)
      )

      await Promise.all(updates)

      toast.success("Orden actualizado")
      return true
    } catch (err) {
      console.error("Error al reordenar operaciones:", err)
      setError(err instanceof Error ? err.message : "Error al reordenar operaciones")
      toast.error("Error al reordenar operaciones")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getOperationsByPrototype,
    addOperation,
    updateOperation,
    removeOperation,
    reorderOperations,
  }
}
