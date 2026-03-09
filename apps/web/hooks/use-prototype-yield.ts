"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface PrototypeYieldTracking {
  id: string
  prototype_id: string
  total_input_weight_grams: number | null
  total_output_weight_grams: number | null
  total_output_units: number | null
  overall_yield_percentage: number | null
  total_waste_grams: number | null
  total_waste_percentage: number | null
  unit_weight_grams: number | null
  formulation_with_trim: boolean
  weight_before_trim_grams: number | null
  trim_weight_grams: number | null
  weight_after_trim_grams: number | null
  notes: string | null
}

export interface PrototypeYieldInsert {
  prototype_id: string
  total_input_weight_grams?: number | null
  total_output_weight_grams?: number | null
  total_output_units?: number | null
  formulation_with_trim?: boolean
  weight_before_trim_grams?: number | null
  trim_weight_grams?: number | null
  notes?: string | null
}

export interface PrototypeYieldUpdate {
  total_input_weight_grams?: number | null
  total_output_weight_grams?: number | null
  total_output_units?: number | null
  formulation_with_trim?: boolean
  weight_before_trim_grams?: number | null
  trim_weight_grams?: number | null
  notes?: string | null
}

/**
 * Calcula campos derivados de rendimiento
 */
function calculateDerivedFields(data: {
  total_input_weight_grams?: number | null
  total_output_weight_grams?: number | null
  total_output_units?: number | null
  weight_before_trim_grams?: number | null
  trim_weight_grams?: number | null
}) {
  const input = data.total_input_weight_grams || 0
  const output = data.total_output_weight_grams || 0
  const units = data.total_output_units || 0

  const overall_yield_percentage = input > 0 ? (output / input) * 100 : null
  const total_waste_grams = input > 0 ? input - output : null
  const total_waste_percentage = input > 0 && total_waste_grams !== null ? (total_waste_grams / input) * 100 : null
  const unit_weight_grams = units > 0 ? output / units : null

  const beforeTrim = data.weight_before_trim_grams || 0
  const trimWeight = data.trim_weight_grams || 0
  const weight_after_trim_grams = beforeTrim > 0 ? beforeTrim - trimWeight : null

  return {
    overall_yield_percentage,
    total_waste_grams,
    total_waste_percentage,
    unit_weight_grams,
    weight_after_trim_grams,
  }
}

export function usePrototypeYield() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getYieldByPrototype = useCallback(async (prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_yield_tracking")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError
      return (data as PrototypeYieldTracking[]) || []
    } catch (err) {
      console.error("Error al obtener datos de rendimiento:", err)
      setError(err instanceof Error ? err.message : "Error al obtener datos de rendimiento")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const saveYield = useCallback(async (yieldData: PrototypeYieldInsert) => {
    try {
      setLoading(true)
      setError(null)

      const derivedFields = calculateDerivedFields(yieldData)

      // Check if a yield record already exists for this prototype
      const { data: existing } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_yield_tracking")
        .select("id")
        .eq("prototype_id", yieldData.prototype_id)
        .limit(1)

      let result
      if (existing && existing.length > 0) {
        // Update existing record
        const { prototype_id, ...updateData } = yieldData
        const { data, error: updateError } = await (supabase
          .schema("investigacion" as any))
          .from("prototype_yield_tracking")
          .update({
            ...updateData,
            ...derivedFields,
          })
          .eq("id", existing[0].id)
          .select()
          .single()

        if (updateError) throw updateError
        result = data
      } else {
        // Insert new record
        const { data, error: insertError } = await (supabase
          .schema("investigacion" as any))
          .from("prototype_yield_tracking")
          .insert({
            ...yieldData,
            ...derivedFields,
          })
          .select()
          .single()

        if (insertError) throw insertError
        result = data
      }

      toast.success("Datos de rendimiento guardados")
      return result as PrototypeYieldTracking
    } catch (err) {
      console.error("Error al guardar datos de rendimiento:", err)
      setError(err instanceof Error ? err.message : "Error al guardar datos de rendimiento")
      toast.error("Error al guardar datos de rendimiento")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateYield = useCallback(async (id: string, updates: PrototypeYieldUpdate) => {
    try {
      setLoading(true)
      setError(null)

      const { data: current, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_yield_tracking")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError

      const merged = { ...current, ...updates }
      const derivedFields = calculateDerivedFields(merged)

      const { data, error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_yield_tracking")
        .update({
          ...updates,
          ...derivedFields,
        })
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError

      toast.success("Datos de rendimiento actualizados")
      return data as PrototypeYieldTracking
    } catch (err) {
      console.error("Error al actualizar datos de rendimiento:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar datos de rendimiento")
      toast.error("Error al actualizar datos de rendimiento")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getYieldByPrototype,
    saveYield,
    updateYield,
  }
}
