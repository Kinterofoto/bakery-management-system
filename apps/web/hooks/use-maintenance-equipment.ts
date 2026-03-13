"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface EquipmentCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  created_at: string
}

export interface Equipment {
  id: string
  category_id: string
  name: string
  code: string | null
  brand: string | null
  model: string | null
  serial_number: string | null
  year: number | null
  location: string | null
  voltage: string | null
  power: string | null
  capacity: string | null
  dimensions: string | null
  weight: string | null
  supplier: string | null
  supplier_phone: string | null
  purchase_date: string | null
  warranty_expiry: string | null
  photo_url: string | null
  manual_url: string | null
  status: "operativo" | "en_mantenimiento" | "fuera_servicio" | "dado_de_baja"
  notes: string | null
  specs: Record<string, any>
  created_at: string
  updated_at: string
  // Joined
  equipment_categories?: EquipmentCategory
}

export interface EquipmentFilters {
  categoryId?: string
  status?: string
  search?: string
}

export function useMaintenanceEquipment() {
  const [loading, setLoading] = useState(false)

  const getCategories = useCallback(async () => {
    try {
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("equipment_categories")
        .select("*")
        .order("name")

      if (error) throw error
      return (data as unknown as EquipmentCategory[]) || []
    } catch (err) {
      toast.error("Error al obtener categorías")
      return []
    }
  }, [])

  const getEquipment = useCallback(async (filters?: EquipmentFilters) => {
    try {
      setLoading(true)
      let query = (supabase.schema("mantenimiento" as any))
        .from("equipment")
        .select("*, equipment_categories(*)")
        .order("name")

      if (filters?.categoryId) {
        query = query.eq("category_id", filters.categoryId)
      }
      if (filters?.status) {
        query = query.eq("status", filters.status)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data as unknown as Equipment[]) || []
    } catch (err) {
      toast.error("Error al obtener equipos")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getEquipmentById = useCallback(async (id: string) => {
    try {
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("equipment")
        .select("*, equipment_categories(*)")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as unknown as Equipment
    } catch (err) {
      return null
    }
  }, [])

  const createEquipment = useCallback(async (equipmentData: Partial<Equipment>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("equipment")
        .insert(equipmentData)
        .select()
        .single()

      if (error) throw error
      toast.success("Equipo creado exitosamente")
      return data as unknown as Equipment
    } catch (err) {
      toast.error("Error al crear equipo")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEquipment = useCallback(async (id: string, updates: Partial<Equipment>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("equipment")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      toast.success("Equipo actualizado")
      return data as unknown as Equipment
    } catch (err) {
      toast.error("Error al actualizar equipo")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    getCategories,
    getEquipment,
    getEquipmentById,
    createEquipment,
    updateEquipment,
  }
}
