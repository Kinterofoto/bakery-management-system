"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

const WIZARD_STORAGE_KEY = "prototype-wizard-step"
const DEBOUNCE_DELAY_MS = 1500

// Pasos del wizard:
// 1: Informacion basica
// 2: Materiales / Formula
// 3: Operaciones (planificacion)
// 4: Ejecucion en vivo (operaciones + timers)
// 5: Calidad y evaluacion
// 6: Rendimiento y costos
// 7: Conclusiones y revision

const TOTAL_STEPS = 7
const LIVE_PHASE_START = 4

export function usePrototypeWizard(prototypeId?: string) {
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar paso guardado desde localStorage al montar
  useEffect(() => {
    if (!prototypeId) return

    const storageKey = `${WIZARD_STORAGE_KEY}-${prototypeId}`
    const savedStep = localStorage.getItem(storageKey)
    if (savedStep) {
      const step = parseInt(savedStep, 10)
      if (step >= 1 && step <= TOTAL_STEPS) {
        setCurrentStep(step)
      }
    }
  }, [prototypeId])

  // Persistir paso en localStorage cuando cambia
  useEffect(() => {
    if (!prototypeId) return

    const storageKey = `${WIZARD_STORAGE_KEY}-${prototypeId}`
    localStorage.setItem(storageKey, String(currentStep))
  }, [currentStep, prototypeId])

  // Limpiar debounce timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step)
    }
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  }, [])

  const previousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }, [])

  /**
   * Guarda el progreso del wizard en la base de datos
   */
  const saveWizardProgress = useCallback(async (step?: number) => {
    if (!prototypeId) return

    try {
      setSaving(true)

      const stepToSave = step ?? currentStep

      const { error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .update({
          wizard_step: stepToSave,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prototypeId)

      if (updateError) throw updateError
    } catch (err) {
      console.error("Error al guardar progreso del wizard:", err)
      toast.error("Error al guardar progreso")
    } finally {
      setSaving(false)
    }
  }, [prototypeId, currentStep])

  /**
   * Marca el wizard como completado
   */
  const completeWizard = useCallback(async () => {
    if (!prototypeId) return

    try {
      setSaving(true)

      const { error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .update({
          wizard_step: TOTAL_STEPS,
          wizard_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prototypeId)

      if (updateError) throw updateError

      // Limpiar localStorage
      const storageKey = `${WIZARD_STORAGE_KEY}-${prototypeId}`
      localStorage.removeItem(storageKey)

      toast.success("Prototipo completado exitosamente")
    } catch (err) {
      console.error("Error al completar wizard:", err)
      toast.error("Error al completar el prototipo")
    } finally {
      setSaving(false)
    }
  }, [prototypeId])

  /**
   * Auto-guardado con debounce para la fase en vivo (paso >= 4)
   * Llama a la funcion de guardado proporcionada despues del delay
   */
  const debouncedAutoSave = useCallback((saveFn: () => Promise<void>) => {
    if (currentStep < LIVE_PHASE_START) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await saveFn()
      } catch (err) {
        console.error("Error en auto-guardado:", err)
      }
    }, DEBOUNCE_DELAY_MS)
  }, [currentStep])

  /**
   * Indica si el wizard esta en la fase en vivo
   */
  const isLivePhase = currentStep >= LIVE_PHASE_START

  return {
    currentStep,
    setCurrentStep: goToStep,
    goToStep,
    nextStep,
    previousStep,
    saveWizardProgress,
    completeWizard,
    debouncedAutoSave,
    isLivePhase,
    saving,
    totalSteps: TOTAL_STEPS,
  }
}
