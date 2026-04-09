"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface WriteOff {
  id: string
  product_id: string
  product_category: string
  quantity: number
  unit: string
  reason: string
  notes: string | null
  inventory_movement_id: string | null
  recorded_by: string | null
  created_at: string
  product?: { id: string; name: string; weight: string | null; category: string; unit: string }
}

export interface CreateWriteOffParams {
  productId: string
  productCategory: string
  quantity: number
  unit: string
  reason: string
  notes?: string
}

export function useWriteOffs() {
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([])
  const [loading, setLoading] = useState(false)

  const fetchWriteOffs = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .schema("qms" as any)
        .from("write_offs")
        .select(`
          *,
          product:product_id(id, name, weight, category, unit)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setWriteOffs((data as any) || [])
      return data
    } catch (error: any) {
      console.error("Error fetching write-offs:", error)
      toast.error(error.message || "Error cargando bajas")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createWriteOff = useCallback(async (params: CreateWriteOffParams) => {
    try {
      setLoading(true)

      // 1. Create inventory movement (OUT / waste)
      const { data: movementData, error: movementError } = await supabase
        .schema("inventario")
        .rpc("perform_inventory_movement", {
          p_product_id: params.productId,
          p_quantity: params.quantity,
          p_movement_type: "OUT",
          p_reason_type: "waste",
          p_location_id_from: null,
          p_location_id_to: null,
          p_reference_id: null,
          p_reference_type: "baja",
          p_notes: `Baja: ${params.reason}${params.notes ? ` - ${params.notes}` : ""}`,
          p_recorded_by: null,
          p_batch_number: null,
          p_expiry_date: null,
        })

      if (movementError) throw movementError

      // 2. Create write-off record in qms
      const { data, error } = await supabase
        .schema("qms" as any)
        .from("write_offs")
        .insert({
          product_id: params.productId,
          product_category: params.productCategory,
          quantity: params.quantity,
          unit: params.unit,
          reason: params.reason,
          notes: params.notes || null,
          inventory_movement_id: movementData?.movement_id || null,
        } as any)
        .select(`
          *,
          product:product_id(id, name, weight, category, unit)
        `)
        .single()

      if (error) throw error

      setWriteOffs(prev => [(data as any), ...prev])
      toast.success("Baja registrada exitosamente")
      return data
    } catch (error: any) {
      console.error("Error creating write-off:", error)
      toast.error(error.message || "Error registrando baja")
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    writeOffs,
    loading,
    fetchWriteOffs,
    createWriteOff,
  }
}
