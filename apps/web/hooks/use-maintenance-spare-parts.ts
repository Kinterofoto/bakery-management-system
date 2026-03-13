"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface SparePart {
  id: string
  equipment_id: string
  name: string
  part_number: string | null
  supplier: string | null
  quantity_in_stock: number
  minimum_stock: number
  unit_cost: number | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  equipment?: { id: string; name: string; code: string | null }
}

export function useMaintenanceSpareParts() {
  const [loading, setLoading] = useState(false)

  const getSpareParts = useCallback(async (filters?: { equipmentId?: string }) => {
    try {
      setLoading(true)
      let query = (supabase.schema("mantenimiento" as any))
        .from("spare_parts")
        .select("*, equipment(id, name, code)")
        .order("name")

      if (filters?.equipmentId) query = query.eq("equipment_id", filters.equipmentId)

      const { data, error } = await query
      if (error) throw error
      return (data as unknown as SparePart[]) || []
    } catch (err) {
      toast.error("Error al obtener repuestos")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createSparePart = useCallback(async (partData: Partial<SparePart>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("spare_parts")
        .insert(partData)
        .select()
        .single()

      if (error) throw error
      toast.success("Repuesto creado")
      return data as unknown as SparePart
    } catch (err) {
      toast.error("Error al crear repuesto")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSparePart = useCallback(async (id: string, updates: Partial<SparePart>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("spare_parts")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      toast.success("Repuesto actualizado")
      return data as unknown as SparePart
    } catch (err) {
      toast.error("Error al actualizar repuesto")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, getSpareParts, createSparePart, updateSparePart }
}
