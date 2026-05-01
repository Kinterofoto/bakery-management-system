"use client"

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface ProductLot {
  id: string
  product_id: string
  lot_code: string
  quantity_initial: number
  quantity_remaining: number
  expiry_date: string | null
  received_at: string
  source_type: string
  notes: string | null
  reception_id: string | null
  shift_production_id: string | null
}

export function useProductLots() {
  const fetchLotsForProduct = useCallback(async (productId: string): Promise<ProductLot[]> => {
    const { data: positiveLots, error: positiveError } = await supabase
      .schema('inventario')
      .from('lots')
      .select('*')
      .eq('product_id', productId)
      .gt('quantity_remaining', 0)
      .order('received_at', { ascending: true })

    if (positiveError) throw positiveError

    const lots = (positiveLots || []) as ProductLot[]

    const { data: latestLot, error: latestError } = await supabase
      .schema('inventario')
      .from('lots')
      .select('*')
      .eq('product_id', productId)
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestError) throw latestError

    if (latestLot && !lots.some(l => l.id === latestLot.id)) {
      lots.push(latestLot as ProductLot)
    }

    return lots
  }, [])

  const adjustLotQuantity = useCallback(async (params: {
    lotId: string
    newRemaining: number
    notes: string | null
    recordedBy: string | null
  }) => {
    const { data, error } = await supabase
      .schema('inventario')
      .rpc('adjust_lot_quantity', {
        p_lot_id: params.lotId,
        p_new_remaining: params.newRemaining,
        p_notes: params.notes ?? undefined,
        p_recorded_by: params.recordedBy ?? undefined,
      })

    if (error) throw error
    return data
  }, [])

  return {
    fetchLotsForProduct,
    adjustLotQuantity,
  }
}
