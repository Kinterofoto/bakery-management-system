"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface WorkOrder {
  id: string
  order_number: number
  equipment_id: string
  schedule_id: string | null
  title: string
  description: string | null
  maintenance_type: "preventivo" | "correctivo" | "predictivo"
  priority: "baja" | "media" | "alta" | "critica"
  status: "pendiente" | "en_progreso" | "completada" | "cancelada"
  checklist: Array<{ item: string; done: boolean }>
  assigned_to: string | null
  requested_by: string | null
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  cost: number | null
  spare_parts_used: Array<{ name: string; quantity: number }>
  observations: string | null
  created_at: string
  updated_at: string
  // Joined
  equipment?: {
    id: string
    name: string
    code: string | null
    equipment_categories?: { id: string; name: string; color: string | null }
  }
}

export interface WorkOrderInsert {
  equipment_id: string
  schedule_id?: string | null
  title: string
  description?: string | null
  maintenance_type?: string
  priority?: string
  status?: string
  checklist?: Array<{ item: string; done: boolean }>
  assigned_to?: string | null
  scheduled_date?: string | null
}

export function useMaintenanceWorkOrders() {
  const [loading, setLoading] = useState(false)

  const getWorkOrders = useCallback(async (filters?: { status?: string; type?: string; equipmentId?: string }) => {
    try {
      setLoading(true)
      let query = (supabase.schema("mantenimiento" as any))
        .from("work_orders")
        .select("*, equipment(id, name, code, equipment_categories(id, name, color))")
        .order("created_at", { ascending: false })

      if (filters?.status) query = query.eq("status", filters.status)
      if (filters?.type) query = query.eq("maintenance_type", filters.type)
      if (filters?.equipmentId) query = query.eq("equipment_id", filters.equipmentId)

      const { data, error } = await query
      if (error) throw error
      return (data as unknown as WorkOrder[]) || []
    } catch (err) {
      toast.error("Error al obtener órdenes de trabajo")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getWorkOrderById = useCallback(async (id: string) => {
    try {
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("work_orders")
        .select("*, equipment(id, name, code, equipment_categories(id, name, color))")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as unknown as WorkOrder
    } catch (err) {
      return null
    }
  }, [])

  const createWorkOrder = useCallback(async (orderData: WorkOrderInsert) => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()

      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("work_orders")
        .insert({
          ...orderData,
          requested_by: userData?.user?.id || null,
        })
        .select()
        .single()

      if (error) throw error
      toast.success("Orden de trabajo creada")
      return data as unknown as WorkOrder
    } catch (err) {
      toast.error("Error al crear orden de trabajo")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateWorkOrder = useCallback(async (id: string, updates: Partial<WorkOrder>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("work_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      toast.success("Orden actualizada")
      return data as unknown as WorkOrder
    } catch (err) {
      toast.error("Error al actualizar orden")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteWorkOrder = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error } = await (supabase.schema("mantenimiento" as any))
        .from("work_orders")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Orden eliminada")
      return true
    } catch (err) {
      toast.error("Error al eliminar orden")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, getWorkOrders, getWorkOrderById, createWorkOrder, updateWorkOrder, deleteWorkOrder }
}
