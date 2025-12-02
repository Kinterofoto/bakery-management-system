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

      // 1. Obtener una ubicación con stock del material
      const { data: balances, error: balanceError } = await supabase
        .schema("inventario")
        .from("inventory_balances")
        .select("location_id, quantity_on_hand")
        .eq("product_id", consumption.material_id)
        .gt("quantity_on_hand", 0)
        .order("quantity_on_hand", { ascending: false })
        .limit(1)

      if (balanceError) throw balanceError

      // Si no hay stock disponible, lanzar error
      if (!balances || balances.length === 0) {
        throw new Error("No hay stock disponible del material en ninguna ubicación")
      }

      const locationId = balances[0].location_id

      // 2. Registrar el consumo en producción
      const { data, error } = await supabase
        .schema("produccion")
        .from("material_consumptions")
        .insert(consumption)
        .select()
        .single()

      if (error) throw error

      // 3. Generar movimiento de salida en inventario
      // El material_id es el product_id del material (MP)
      await registerConsumption({
        productId: consumption.material_id,
        quantity: consumption.quantity_consumed,
        locationId: locationId,
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