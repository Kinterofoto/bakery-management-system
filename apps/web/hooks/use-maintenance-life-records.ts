"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface EquipmentLifeRecord {
  id: string
  equipment_id: string
  work_order_id: string | null
  record_date: string
  intervention_type: "preventivo" | "correctivo" | "predictivo" | "instalacion" | "calibracion" | "inspeccion"
  description: string
  technician: string | null
  cost: number | null
  spare_parts_used: string | null
  downtime_hours: number | null
  observations: string | null
  recorded_by: string | null
  created_at: string
  // Joined
  equipment?: { id: string; name: string; code: string | null }
  work_orders?: { id: string; order_number: number; title: string } | null
}

export function useMaintenanceLifeRecords() {
  const [loading, setLoading] = useState(false)

  const getLifeRecords = useCallback(async (filters?: { equipmentId?: string }) => {
    try {
      setLoading(true)
      let query = (supabase.schema("mantenimiento" as any))
        .from("equipment_life_records")
        .select("*, equipment(id, name, code), work_orders(id, order_number, title)")
        .order("record_date", { ascending: false })

      if (filters?.equipmentId) query = query.eq("equipment_id", filters.equipmentId)

      const { data, error } = await query
      if (error) throw error
      return (data as unknown as EquipmentLifeRecord[]) || []
    } catch (err) {
      toast.error("Error al obtener hojas de vida")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createLifeRecord = useCallback(async (recordData: Partial<EquipmentLifeRecord>) => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()

      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("equipment_life_records")
        .insert({
          ...recordData,
          recorded_by: userData?.user?.id || null,
        })
        .select()
        .single()

      if (error) throw error
      toast.success("Registro de vida creado")
      return data as unknown as EquipmentLifeRecord
    } catch (err) {
      toast.error("Error al crear registro")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, getLifeRecords, createLifeRecord }
}
