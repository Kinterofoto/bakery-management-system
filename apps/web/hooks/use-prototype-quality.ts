"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface PrototypeQuality {
  id: string
  prototype_id: string
  prototype_operation_id: string | null
  texture_score: number | null
  texture_notes: string | null
  color_score: number | null
  color_notes: string | null
  appearance_score: number | null
  appearance_notes: string | null
  taste_score: number | null
  taste_notes: string | null
  aroma_score: number | null
  aroma_notes: string | null
  crumb_structure_score: number | null
  crumb_structure_notes: string | null
  overall_score: number | null
  overall_notes: string | null
  approved: boolean | null
  evaluated_by: string | null
}

export interface PrototypeQualityInsert {
  prototype_id: string
  prototype_operation_id?: string | null
  texture_score?: number | null
  texture_notes?: string | null
  color_score?: number | null
  color_notes?: string | null
  appearance_score?: number | null
  appearance_notes?: string | null
  taste_score?: number | null
  taste_notes?: string | null
  aroma_score?: number | null
  aroma_notes?: string | null
  crumb_structure_score?: number | null
  crumb_structure_notes?: string | null
  overall_notes?: string | null
  approved?: boolean | null
  evaluated_by?: string | null
}

export interface PrototypeQualityUpdate {
  prototype_operation_id?: string | null
  texture_score?: number | null
  texture_notes?: string | null
  color_score?: number | null
  color_notes?: string | null
  appearance_score?: number | null
  appearance_notes?: string | null
  taste_score?: number | null
  taste_notes?: string | null
  aroma_score?: number | null
  aroma_notes?: string | null
  crumb_structure_score?: number | null
  crumb_structure_notes?: string | null
  overall_notes?: string | null
  approved?: boolean | null
  evaluated_by?: string | null
}

/**
 * Calcula el puntaje general como promedio de los puntajes no nulos
 */
function calculateOverallScore(data: PrototypeQualityInsert | PrototypeQualityUpdate): number | null {
  const scores = [
    data.texture_score,
    data.color_score,
    data.appearance_score,
    data.taste_score,
    data.aroma_score,
    data.crumb_structure_score,
  ].filter((s): s is number => s !== null && s !== undefined)

  if (scores.length === 0) return null
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

export function usePrototypeQuality() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getQualityByPrototype = useCallback(async (prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_quality")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError
      return (data as PrototypeQuality[]) || []
    } catch (err) {
      console.error("Error al obtener evaluaciones de calidad:", err)
      setError(err instanceof Error ? err.message : "Error al obtener evaluaciones de calidad")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const saveQuality = useCallback(async (qualityData: PrototypeQualityInsert) => {
    try {
      setLoading(true)
      setError(null)

      const overallScore = calculateOverallScore(qualityData)

      const { data, error: insertError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_quality")
        .insert({
          ...qualityData,
          overall_score: overallScore,
        })
        .select()
        .single()

      if (insertError) throw insertError

      toast.success("Evaluacion de calidad guardada exitosamente")
      return data as PrototypeQuality
    } catch (err) {
      console.error("Error al guardar evaluacion de calidad:", err)
      setError(err instanceof Error ? err.message : "Error al guardar evaluacion de calidad")
      toast.error("Error al guardar evaluacion de calidad")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateQuality = useCallback(async (id: string, updates: PrototypeQualityUpdate) => {
    try {
      setLoading(true)
      setError(null)

      // Si se actualizan puntajes, recalcular el overall_score
      // Primero obtener los datos actuales para combinar con las actualizaciones
      const { data: current, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_quality")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError

      // Combinar datos actuales con actualizaciones para calcular el promedio correcto
      const merged = { ...current, ...updates }
      const overallScore = calculateOverallScore(merged)

      const { data, error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_quality")
        .update({
          ...updates,
          overall_score: overallScore,
        })
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError

      toast.success("Evaluacion de calidad actualizada exitosamente")
      return data as PrototypeQuality
    } catch (err) {
      console.error("Error al actualizar evaluacion de calidad:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar evaluacion de calidad")
      toast.error("Error al actualizar evaluacion de calidad")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getQualityByPrototype,
    saveQuality,
    updateQuality,
  }
}
