"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface SensoryEvaluation {
  id: string
  prototype_id: string
  evaluator_name: string
  evaluator_role: string | null
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
  purchase_intent: number | null
  photos: Record<string, unknown>[] | null
  submitted_at: string
}

export interface SensoryEvaluationInsert {
  prototype_id: string
  evaluator_name: string
  evaluator_role?: string | null
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
  purchase_intent?: number | null
  photos?: Record<string, unknown>[] | null
}

/**
 * Calcula el puntaje general como promedio de los puntajes no nulos
 */
function calculateOverallScore(data: SensoryEvaluationInsert): number | null {
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

export function useSensoryEvaluations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getEvaluationsByPrototype = useCallback(async (prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("sensory_evaluations")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("submitted_at", { ascending: false })

      if (fetchError) throw fetchError
      return (data as SensoryEvaluation[]) || []
    } catch (err) {
      console.error("Error al obtener evaluaciones sensoriales:", err)
      setError(err instanceof Error ? err.message : "Error al obtener evaluaciones sensoriales")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Obtiene un prototipo por su token sensorial (para paginas publicas)
   * No requiere autenticacion
   */
  const getPrototypeBySensoryToken = useCallback(async (token: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .select("id, product_name, code, version, status, sensory_token")
        .eq("sensory_token", token)
        .single()

      if (fetchError) throw fetchError
      return data
    } catch (err) {
      console.error("Error al obtener prototipo por token:", err)
      setError(err instanceof Error ? err.message : "Error al obtener prototipo por token")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Enviar evaluacion sensorial (acceso publico/anonimo)
   */
  const submitEvaluation = useCallback(async (evaluationData: SensoryEvaluationInsert) => {
    try {
      setLoading(true)
      setError(null)

      const overallScore = calculateOverallScore(evaluationData)

      const { data, error: insertError } = await (supabase
        .schema("investigacion" as any))
        .from("sensory_evaluations")
        .insert({
          ...evaluationData,
          overall_score: overallScore,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      toast.success("Evaluacion sensorial enviada exitosamente")
      return data as SensoryEvaluation
    } catch (err) {
      console.error("Error al enviar evaluacion sensorial:", err)
      setError(err instanceof Error ? err.message : "Error al enviar evaluacion sensorial")
      toast.error("Error al enviar evaluacion sensorial")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getEvaluationsByPrototype,
    getPrototypeBySensoryToken,
    submitEvaluation,
  }
}
