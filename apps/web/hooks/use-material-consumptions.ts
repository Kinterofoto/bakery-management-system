"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { useMaterialConsumption } from "./use-inventory-movements"

type MaterialConsumption = Database["produccion"]["Tables"]["material_consumptions"]["Row"]
type MaterialConsumptionInsert = Database["produccion"]["Tables"]["material_consumptions"]["Insert"]

export function useMaterialConsumptions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { registerConsumption } = useMaterialConsumption()

  const getConsumptions = useCallback(async (shiftProductionId: string) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("material_consumptions")
        .select("*")
        .eq("shift_production_id", shiftProductionId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching material consumptions:", err)
      setError(err instanceof Error ? err.message : "Error fetching material consumptions")
      return []
    }
  }, [])

  const addConsumption = useCallback(async (consumption: MaterialConsumptionInsert) => {
    try {
      setLoading(true)
      setError(null)

      // 1. Obtener el location_id del centro de trabajo desde shift_production
      // Primero obtenemos la shift_production para conseguir el shift_id
      const { data: shiftProduction, error: shiftProdError } = await supabase
        .schema("produccion")
        .from("shift_productions")
        .select("shift_id")
        .eq("id", consumption.shift_production_id)
        .single()

      if (shiftProdError) throw shiftProdError
      if (!shiftProduction) throw new Error("No se encontró la producción del turno")

      // Luego obtenemos el shift para conseguir el work_center_id
      const { data: shift, error: shiftError } = await supabase
        .schema("produccion")
        .from("production_shifts")
        .select("work_center_id")
        .eq("id", shiftProduction.shift_id)
        .single()

      if (shiftError) throw shiftError
      if (!shift) throw new Error("No se encontró el turno de producción")

      // Finalmente obtenemos el work_center para conseguir su location_id
      const { data: workCenter, error: wcError } = await supabase
        .schema("produccion")
        .from("work_centers")
        .select("location_id")
        .eq("id", shift.work_center_id)
        .single()

      if (wcError) throw wcError
      if (!workCenter || !workCenter.location_id) {
        throw new Error("El centro de trabajo no tiene una ubicación de inventario configurada")
      }

      const workCenterLocationId = workCenter.location_id

      // 2. Verificar stock disponible en la ubicación del centro de trabajo
      const { data: balance, error: balanceError } = await supabase
        .schema("inventario")
        .from("inventory_balances")
        .select("quantity_on_hand")
        .eq("product_id", consumption.material_id)
        .eq("location_id", workCenterLocationId)
        .single()

      if (balanceError && balanceError.code !== 'PGRST116') throw balanceError

      const availableStock = balance?.quantity_on_hand || 0
      if (availableStock < consumption.quantity_consumed) {
        throw new Error(
          `Stock insuficiente en el centro de trabajo. Disponible: ${availableStock}, Requerido: ${consumption.quantity_consumed}`
        )
      }

      // 3. Registrar el consumo en producción
      const { data, error } = await supabase
        .schema("produccion")
        .from("material_consumptions")
        .insert(consumption)
        .select()
        .single()

      if (error) throw error

      // 4. Generar movimiento de salida en inventario desde la ubicación del centro de trabajo
      await registerConsumption({
        productId: consumption.material_id,
        quantity: consumption.quantity_consumed,
        locationId: workCenterLocationId,
        referenceId: consumption.shift_production_id,
        notes: consumption.consumption_type === 'wasted'
          ? `Desperdicio en producción`
          : `Consumo en producción`
      })

      return data
    } catch (err) {
      console.error("Error adding material consumption:", err)
      setError(err instanceof Error ? err.message : "Error adding material consumption")
      throw err
    } finally {
      setLoading(false)
    }
  }, [registerConsumption])

  const updateConsumption = useCallback(async (
    id: string,
    updates: Partial<MaterialConsumption>
  ) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .schema("produccion")
        .from("material_consumptions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error("Error updating material consumption:", err)
      setError(err instanceof Error ? err.message : "Error updating material consumption")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteConsumption = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase
        .schema("produccion")
        .from("material_consumptions")
        .delete()
        .eq("id", id)

      if (error) throw error
    } catch (err) {
      console.error("Error deleting material consumption:", err)
      setError(err instanceof Error ? err.message : "Error deleting material consumption")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getConsumptions,
    addConsumption,
    updateConsumption,
    deleteConsumption,
  }
}