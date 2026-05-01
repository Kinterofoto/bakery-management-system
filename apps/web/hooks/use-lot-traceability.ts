"use client"

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface LotRow {
  id: string
  lot_code: string
  quantity_initial: number
  quantity_remaining: number
  expiry_date: string | null
  received_at: string
  source_type: string
  product_id: string
  shift_production_id: string | null
  reception_id: string | null
}

export interface ParentLotRow extends LotRow {
  consumedQuantity: number
  consumedUnit: string
  productName: string
  productCategory: string | null
  productUnit: string | null
}

export function useLotTraceability() {
  const getLotsForProduct = useCallback(async (productId: string): Promise<LotRow[]> => {
    if (!productId || productId === "all") return []

    const { data, error } = await supabase
      .schema("inventario")
      .from("lots")
      .select(
        "id, lot_code, quantity_initial, quantity_remaining, expiry_date, received_at, source_type, product_id, shift_production_id, reception_id"
      )
      .eq("product_id", productId)
      .order("received_at", { ascending: false })

    if (error) throw error
    return (data || []) as LotRow[]
  }, [])

  const getParentLots = useCallback(async (shiftProductionId: string | null): Promise<ParentLotRow[]> => {
    if (!shiftProductionId) return []

    const { data: movements, error: movementsError } = await supabase
      .schema("inventario")
      .from("inventory_movements")
      .select("lot_id, quantity, unit_of_measure, product_id")
      .eq("reference_id", shiftProductionId)
      .eq("movement_type", "OUT")
      .eq("reason_type", "consumption")
      .not("lot_id", "is", null)

    if (movementsError) throw movementsError
    if (!movements || movements.length === 0) return []

    const aggregated = new Map<string, { quantity: number; unit: string; product_id: string }>()
    for (const m of movements) {
      if (!m.lot_id) continue
      const prev = aggregated.get(m.lot_id)
      if (prev) {
        prev.quantity += Number(m.quantity || 0)
      } else {
        aggregated.set(m.lot_id, {
          quantity: Number(m.quantity || 0),
          unit: m.unit_of_measure || "",
          product_id: m.product_id,
        })
      }
    }

    const lotIds = Array.from(aggregated.keys())
    if (lotIds.length === 0) return []

    const { data: lots, error: lotsError } = await supabase
      .schema("inventario")
      .from("lots")
      .select(
        "id, lot_code, quantity_initial, quantity_remaining, expiry_date, received_at, source_type, product_id, shift_production_id, reception_id"
      )
      .in("id", lotIds)

    if (lotsError) throw lotsError

    const productIds = Array.from(new Set((lots || []).map((l) => l.product_id)))
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, category, unit, weight")
      .in("id", productIds)

    if (productsError) throw productsError

    const productMap = new Map((products || []).map((p) => [p.id, p]))

    const result: ParentLotRow[] = (lots || []).map((lot) => {
      const agg = aggregated.get(lot.id)
      const product = productMap.get(lot.product_id)
      return {
        ...(lot as LotRow),
        consumedQuantity: agg?.quantity ?? 0,
        consumedUnit: agg?.unit ?? "",
        productName: product?.name ?? "Producto desconocido",
        productCategory: (product?.category as string | undefined) ?? null,
        productUnit: (product?.unit as string | undefined) ?? null,
      }
    })

    result.sort((a, b) => b.consumedQuantity - a.consumedQuantity)
    return result
  }, [])

  return { getLotsForProduct, getParentLots }
}
