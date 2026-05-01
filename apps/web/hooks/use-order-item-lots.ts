"use client"

import { useCallback } from "react"
import { supabase } from "@/lib/supabase-with-context"

export interface FefoSuggestionRow {
  lot_id: string
  lot_code: string
  quantity_to_take: number
  quantity_remaining_after: number
  expiry_date: string | null
  received_at: string
  sequence: number
}

export interface LotInternalCodeRow {
  shift_production_id: string | null
  internal_code: string | null
  movement_date: string
  quantity: number
}

export interface OrderItemLotRow {
  id: string
  order_item_id: string
  lot_id: string
  shift_production_id: string | null
  internal_code: string | null
  quantity: number
  sequence: number
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  lot?: {
    id: string
    lot_code: string
    expiry_date: string | null
    received_at: string
    quantity_remaining: number
    product_id: string
  } | null
}

export interface ProductLotWithCodes {
  id: string
  lot_code: string
  expiry_date: string | null
  received_at: string
  quantity_remaining: number
  internal_codes: LotInternalCodeRow[]
}

export interface DistributionRow {
  lot_id: string
  lot_code: string
  shift_production_id: string | null
  internal_code: string | null
  quantity: number
  sequence: number
}

export interface AssignFefoResult {
  rows: OrderItemLotRow[]
  totalAssigned: number
  shortage: number
  insufficient: boolean
}

export function useOrderItemLots() {
  const suggestFefoLots = useCallback(async (productId: string, qty: number): Promise<FefoSuggestionRow[]> => {
    const { data, error } = await supabase
      .schema("inventario")
      .rpc("suggest_fefo_lots", { p_product_id: productId, p_quantity_needed: qty })
    if (error) throw error
    return (data || []) as FefoSuggestionRow[]
  }, [])

  const fetchLotInternalCodes = useCallback(async (lotId: string): Promise<LotInternalCodeRow[]> => {
    const { data, error } = await supabase
      .schema("inventario")
      .rpc("lot_internal_codes", { p_lot_id: lotId })
    if (error) throw error
    return (data || []) as LotInternalCodeRow[]
  }, [])

  const getLotsForOrderItem = useCallback(async (orderItemId: string): Promise<OrderItemLotRow[]> => {
    const { data, error } = await supabase
      .from("order_item_lots")
      .select("*")
      .eq("order_item_id", orderItemId)
      .order("sequence", { ascending: true })

    if (error) throw error
    const rows = (data || []) as OrderItemLotRow[]

    if (rows.length === 0) return rows

    const lotIds = Array.from(new Set(rows.map(r => r.lot_id)))
    const { data: lotsData, error: lotsError } = await supabase
      .schema("inventario")
      .from("lots")
      .select("id, lot_code, expiry_date, received_at, quantity_remaining, product_id")
      .in("id", lotIds)
    if (lotsError) throw lotsError

    const lotMap = new Map((lotsData || []).map((l: any) => [l.id, l]))
    return rows.map(r => ({ ...r, lot: lotMap.get(r.lot_id) || null }))
  }, [])

  const getProductLotsWithInternalCodes = useCallback(async (productId: string): Promise<ProductLotWithCodes[]> => {
    const { data: lotsData, error: lotsError } = await supabase
      .schema("inventario")
      .from("lots")
      .select("id, lot_code, expiry_date, received_at, quantity_remaining")
      .eq("product_id", productId)
      .gt("quantity_remaining", 0)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("received_at", { ascending: true })

    if (lotsError) throw lotsError
    const lots = (lotsData || []) as Array<{
      id: string
      lot_code: string
      expiry_date: string | null
      received_at: string
      quantity_remaining: number
    }>

    const results: ProductLotWithCodes[] = await Promise.all(
      lots.map(async lot => {
        const codes = await fetchLotInternalCodes(lot.id)
        return {
          ...lot,
          internal_codes: codes,
        }
      })
    )

    return results
  }, [fetchLotInternalCodes])

  const clearLots = useCallback(async (orderItemId: string) => {
    const { error: delErr } = await supabase
      .from("order_item_lots")
      .delete()
      .eq("order_item_id", orderItemId)
    if (delErr) throw delErr

    const { error: updErr } = await supabase
      .from("order_items")
      .update({ lot_id: null, internal_code: null, lote: null })
      .eq("id", orderItemId)
    if (updErr) throw updErr
  }, [])

  const assignFefoLots = useCallback(
    async (
      orderItemId: string,
      productId: string,
      dispatchedQty: number,
      userId: string | null
    ): Promise<AssignFefoResult> => {
      const { error: delErr } = await supabase
        .from("order_item_lots")
        .delete()
        .eq("order_item_id", orderItemId)
      if (delErr) throw delErr

      const suggestions = await suggestFefoLots(productId, dispatchedQty)

      if (suggestions.length === 0) {
        await supabase
          .from("order_items")
          .update({ lot_id: null, internal_code: null, lote: null })
          .eq("id", orderItemId)
        return { rows: [], totalAssigned: 0, shortage: dispatchedQty, insufficient: true }
      }

      const inserts = await Promise.all(
        suggestions.map(async s => {
          const codes = await fetchLotInternalCodes(s.lot_id)
          const oldest = codes.length > 0 ? codes[0] : null
          return {
            order_item_id: orderItemId,
            lot_id: s.lot_id,
            shift_production_id: oldest?.shift_production_id ?? null,
            internal_code: oldest?.internal_code ?? null,
            quantity: Number(s.quantity_to_take),
            sequence: s.sequence,
            created_by: userId,
          }
        })
      )

      const { data: inserted, error: insErr } = await supabase
        .from("order_item_lots")
        .insert(inserts)
        .select("*")
      if (insErr) throw insErr

      const insertedRows = (inserted || []) as OrderItemLotRow[]
      insertedRows.sort((a, b) => a.sequence - b.sequence)

      const first = insertedRows[0]
      const firstSuggestion = suggestions.find(s => s.lot_id === first.lot_id)

      const { error: updErr } = await supabase
        .from("order_items")
        .update({
          lot_id: first.lot_id,
          internal_code: first.internal_code,
          lote: firstSuggestion?.lot_code ?? null,
        })
        .eq("id", orderItemId)
      if (updErr) throw updErr

      const totalAssigned = insertedRows.reduce((acc, r) => acc + Number(r.quantity || 0), 0)
      const shortage = Math.max(0, dispatchedQty - totalAssigned)

      return {
        rows: insertedRows,
        totalAssigned,
        shortage,
        insufficient: shortage > 0.0001,
      }
    },
    [suggestFefoLots, fetchLotInternalCodes]
  )

  const replaceLots = useCallback(
    async (orderItemId: string, distribution: DistributionRow[], userId: string | null) => {
      const { error: delErr } = await supabase
        .from("order_item_lots")
        .delete()
        .eq("order_item_id", orderItemId)
      if (delErr) throw delErr

      if (distribution.length === 0) {
        const { error: updErr } = await supabase
          .from("order_items")
          .update({ lot_id: null, internal_code: null, lote: null })
          .eq("id", orderItemId)
        if (updErr) throw updErr
        return [] as OrderItemLotRow[]
      }

      const inserts = distribution.map((d, idx) => ({
        order_item_id: orderItemId,
        lot_id: d.lot_id,
        shift_production_id: d.shift_production_id,
        internal_code: d.internal_code,
        quantity: Number(d.quantity),
        sequence: idx + 1,
        created_by: userId,
      }))

      const { data: inserted, error: insErr } = await supabase
        .from("order_item_lots")
        .insert(inserts)
        .select("*")
      if (insErr) throw insErr

      const insertedRows = (inserted || []) as OrderItemLotRow[]
      insertedRows.sort((a, b) => a.sequence - b.sequence)
      const first = insertedRows[0]
      const firstSrc = distribution.find(d => d.lot_id === first.lot_id)

      const { error: updErr } = await supabase
        .from("order_items")
        .update({
          lot_id: first.lot_id,
          internal_code: first.internal_code,
          lote: firstSrc?.lot_code ?? null,
        })
        .eq("id", orderItemId)
      if (updErr) throw updErr

      return insertedRows
    },
    []
  )

  return {
    suggestFefoLots,
    fetchLotInternalCodes,
    getLotsForOrderItem,
    getProductLotsWithInternalCodes,
    assignFefoLots,
    replaceLots,
    clearLots,
  }
}
