'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type LotSourceType = 'reception' | 'production' | 'manual' | 'backfill' | string

export interface LotBalanceRow {
  id: string
  lot_code: string
  quantity_remaining: number
  expiry_date: string | null
  received_at: string
  source_type: LotSourceType
  product_id: string
  product_name: string
  product_category: string
  product_unit: string
}

export function useLotsBalance() {
  const [lots, setLots] = useState<LotBalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLots = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: lotsData, error: lotsError } = await supabase
        .schema('inventario')
        .from('lots')
        .select(`
          id,
          lot_code,
          quantity_remaining,
          expiry_date,
          received_at,
          source_type,
          product_id
        `)
        .gt('quantity_remaining', 0)
        .order('received_at', { ascending: true })

      if (lotsError) throw lotsError

      const productIds = [...new Set((lotsData || []).map(l => l.product_id))]

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, unit')
        .in('id', productIds)

      if (productsError) throw productsError

      const productsMap = new Map(productsData?.map(p => [p.id, p]) || [])

      const enriched: LotBalanceRow[] = (lotsData || []).map(lot => {
        const product = productsMap.get(lot.product_id)
        return {
          id: lot.id,
          lot_code: lot.lot_code,
          quantity_remaining: Number(lot.quantity_remaining),
          expiry_date: lot.expiry_date,
          received_at: lot.received_at,
          source_type: lot.source_type,
          product_id: lot.product_id,
          product_name: product?.name || 'Unknown',
          product_category: product?.category || '',
          product_unit: product?.unit || '',
        }
      })

      enriched.sort((a, b) => {
        const nameCompare = a.product_name.localeCompare(b.product_name, 'es')
        if (nameCompare !== 0) return nameCompare
        return new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
      })

      setLots(enriched)
    } catch (err) {
      console.error('Error fetching lots balance:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch lots')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLots()
  }, [fetchLots])

  return {
    lots,
    loading,
    error,
    refetch: fetchLots,
  }
}
