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

      // Fetch write-offs (qms schema)
      const { data: rows, error } = await supabase
        .schema("qms" as any)
        .from("write_offs")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      if (!rows || rows.length === 0) { setWriteOffs([]); return [] }

      // Fetch related products from public schema
      const productIds = [...new Set((rows as any[]).map(r => r.product_id))]
      const { data: products } = await supabase
        .from("products")
        .select("id, name, weight, category, unit")
        .in("id", productIds)

      const productMap = new Map((products || []).map(p => [p.id, p]))

      const enriched = (rows as any[]).map(r => ({
        ...r,
        product: productMap.get(r.product_id) || null,
      }))

      setWriteOffs(enriched)
      return enriched
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
        .select("*")
        .single()

      if (error) throw error

      // Fetch product info for the new record
      const { data: product } = await supabase
        .from("products")
        .select("id, name, weight, category, unit")
        .eq("id", params.productId)
        .single()

      const enriched = { ...(data as any), product }
      setWriteOffs(prev => [enriched, ...prev])
      toast.success("Baja registrada exitosamente")
      return enriched
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
