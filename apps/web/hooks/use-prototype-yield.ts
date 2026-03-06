"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface PrototypeYieldTracking {
  id: string
  prototype_id: string
  total_input_weight_grams: number | null
  total_output_weight_grams: number | null
  total_units_produced: number | null
  yield_percentage: number | null
  waste_grams: number | null
  waste_percentage: number | null
  unit_weight_grams: number | null
  has_trim: boolean
  weight_before_trim_grams: number | null
  trim_weight_grams: number | null
  weight_after_trim_grams: number | null
  notes: string | null
}

export interface PrototypeYieldInsert {
  prototype_id: string
  total_input_weight_grams?: number | null
  total_output_weight_grams?: number | null
  total_units_produced?: number | null
  has_trim?: boolean
  weight_before_trim_grams?: number | null
  trim_weight_grams?: number | null
  notes?: string | null
}

export interface PrototypeYieldUpdate {
  total_input_weight_grams?: number | null
  total_output_weight_grams?: number | null
  total_units_produced?: number | null
  has_trim?: boolean
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
  total_units_produced?: number | null
  weight_before_trim_grams?: number | null
  trim_weight_grams?: number | null
}) {
  const input = data.total_input_weight_grams || 0
  const output = data.total_output_weight_grams || 0
  const units = data.total_units_produced || 0

  const yieldPercentage = input > 0 ? (output / input) * 100 : null
  const wasteGrams = input > 0 ? input - output : null
  const wastePercentage = input > 0 && wasteGrams !== null ? (wasteGrams / input) * 100 : null
  const unitWeightGrams = units > 0 ? output / units : null

  // Calculo de peso despues de recorte
  const beforeTrim = data.weight_before_trim_grams || 0
  const trimWeight = data.trim_weight_grams || 0
  const weightAfterTrim = beforeTrim > 0 ? beforeTrim - trimWeight : null

  return {
    yield_percentage: yieldPercentage,
    waste_grams: wasteGrams,
    waste_percentage: wastePercentage,
    unit_weight_grams: unitWeightGrams,
    weight_after_trim_grams: weightAfterTrim,
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

      toast.success("Datos de rendimiento guardados exitosamente")
      return data as PrototypeYieldTracking
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

      // Obtener datos actuales para combinar y recalcular
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

      toast.success("Datos de rendimiento actualizados exitosamente")
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
