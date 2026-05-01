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

export interface LotInternalCodeRow {
  shift_production_id: string
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
  lot_code: string | null
  source_type: string | null
  expiry_date: string | null
  received_at: string | null
  parent_shift_production_id: string | null
}

export interface OrderItemForTraceability {
  id: string
  product_id: string | null
  product_name: string | null
  product_category: string | null
  product_unit: string | null
  product_weight: number | null
  quantity_requested: number
  quantity_dispatched: number | null
  lots: OrderItemLotRow[]
}

export interface OrderForTraceability {
  id: string
  order_number: string
  client_name: string | null
  expected_delivery_date: string
  status: string
  items: OrderItemForTraceability[]
}

function normalizeCode(input: string): string {
  return (input || "").trim()
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

  const getLotInternalCodes = useCallback(async (lotId: string): Promise<LotInternalCodeRow[]> => {
    if (!lotId) return []
    const { data, error } = await supabase
      .schema("inventario")
      .rpc("lot_internal_codes", { p_lot_id: lotId })
    if (error) throw error
    return ((data || []) as LotInternalCodeRow[]).filter((r) => !!r.shift_production_id)
  }, [])

  const findLotByCode = useCallback(
    async (
      input: string
    ): Promise<{ lot_id: string; product_id: string; matched_by: "lot_code" | "internal_code"; matches: number } | null> => {
      const code = normalizeCode(input)
      if (!code) return null

      const { data: lotMatches, error: lotErr } = await supabase
        .schema("inventario")
        .from("lots")
        .select("id, product_id, lot_code")
        .ilike("lot_code", code)
        .order("received_at", { ascending: false })
        .limit(5)

      if (lotErr) throw lotErr
      if (lotMatches && lotMatches.length > 0) {
        return {
          lot_id: lotMatches[0].id,
          product_id: lotMatches[0].product_id,
          matched_by: "lot_code",
          matches: lotMatches.length,
        }
      }

      const { data: spMatches, error: spErr } = await supabase
        .schema("produccion")
        .from("shift_productions")
        .select("id, product_id, internal_code")
        .ilike("internal_code", code)
        .order("started_at", { ascending: false })
        .limit(5)

      if (spErr) throw spErr
      if (!spMatches || spMatches.length === 0) return null

      const spIds = spMatches.map((s) => s.id)

      const { data: movements, error: movErr } = await supabase
        .schema("inventario")
        .from("inventory_movements")
        .select("lot_id, reference_id, movement_date")
        .in("reference_id", spIds)
        .eq("movement_type", "IN")
        .eq("reason_type", "production")
        .eq("reference_type", "shift_production")
        .not("lot_id", "is", null)
        .order("movement_date", { ascending: false })
        .limit(10)

      if (movErr) throw movErr
      if (!movements || movements.length === 0) return null

      const firstMovement = movements[0]
      const matchedSp = spMatches.find((s) => s.id === firstMovement.reference_id) || spMatches[0]

      return {
        lot_id: firstMovement.lot_id as string,
        product_id: matchedSp.product_id as string,
        matched_by: "internal_code",
        matches: spMatches.length,
      }
    },
    []
  )

  const getOrderLots = useCallback(async (orderIdOrNumber: string): Promise<OrderForTraceability | null> => {
    const trimmed = normalizeCode(orderIdOrNumber)
    if (!trimmed) return null

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)

    let orderQuery = supabase
      .from("orders")
      .select(
        `id, order_number, expected_delivery_date, status,
         client:clients(name),
         order_items(
           id, product_id, quantity_requested, quantity_dispatched,
           product:products(id, name, category, unit, weight)
         )`
      )
      .limit(1)

    if (isUuid) {
      orderQuery = orderQuery.eq("id", trimmed)
    } else {
      orderQuery = orderQuery.eq("order_number", trimmed)
    }

    const { data: orders, error: ordersErr } = await orderQuery
    if (ordersErr) throw ordersErr
    if (!orders || orders.length === 0) return null

    const order = orders[0] as any
    const itemIds: string[] = (order.order_items || []).map((it: any) => it.id)

    let oilByItem = new Map<string, OrderItemLotRow[]>()
    if (itemIds.length > 0) {
      const { data: oils, error: oilErr } = await supabase
        .from("order_item_lots")
        .select("id, order_item_id, lot_id, shift_production_id, internal_code, quantity, sequence")
        .in("order_item_id", itemIds)
        .order("sequence", { ascending: true })

      if (oilErr) throw oilErr

      const lotIds = Array.from(new Set((oils || []).map((o) => o.lot_id).filter(Boolean)))

      let lotMap = new Map<
        string,
        {
          lot_code: string
          source_type: string
          expiry_date: string | null
          received_at: string | null
          shift_production_id: string | null
        }
      >()
      if (lotIds.length > 0) {
        const { data: lots, error: lotsErr } = await supabase
          .schema("inventario")
          .from("lots")
          .select("id, lot_code, source_type, expiry_date, received_at, shift_production_id")
          .in("id", lotIds)
        if (lotsErr) throw lotsErr
        for (const l of lots || []) {
          lotMap.set(l.id, {
            lot_code: l.lot_code,
            source_type: l.source_type,
            expiry_date: l.expiry_date,
            received_at: l.received_at,
            shift_production_id: l.shift_production_id,
          })
        }
      }

      for (const oil of oils || []) {
        const lotInfo = lotMap.get(oil.lot_id)
        const row: OrderItemLotRow = {
          id: oil.id,
          order_item_id: oil.order_item_id,
          lot_id: oil.lot_id,
          shift_production_id: oil.shift_production_id,
          internal_code: oil.internal_code,
          quantity: Number(oil.quantity || 0),
          sequence: oil.sequence ?? 0,
          lot_code: lotInfo?.lot_code ?? null,
          source_type: lotInfo?.source_type ?? null,
          expiry_date: lotInfo?.expiry_date ?? null,
          received_at: lotInfo?.received_at ?? null,
          parent_shift_production_id: oil.shift_production_id ?? lotInfo?.shift_production_id ?? null,
        }
        const arr = oilByItem.get(oil.order_item_id) || []
        arr.push(row)
        oilByItem.set(oil.order_item_id, arr)
      }
    }

    const items: OrderItemForTraceability[] = (order.order_items || []).map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.product?.name ?? null,
      product_category: it.product?.category ?? null,
      product_unit: it.product?.unit ?? null,
      product_weight: it.product?.weight ?? null,
      quantity_requested: Number(it.quantity_requested ?? 0),
      quantity_dispatched: it.quantity_dispatched != null ? Number(it.quantity_dispatched) : null,
      lots: oilByItem.get(it.id) || [],
    }))

    return {
      id: order.id,
      order_number: order.order_number,
      client_name: order.client?.name ?? null,
      expected_delivery_date: order.expected_delivery_date,
      status: order.status,
      items,
    }
  }, [])

  return { getLotsForProduct, getParentLots, getLotInternalCodes, findLotByCode, getOrderLots }
}
