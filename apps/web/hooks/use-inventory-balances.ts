'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface MaterialBalance {
  id: string
  material_id: string
  material_name: string
  material_category: string
  warehouse_stock: number
  production_stock: number
  total_stock: number
  unit_of_measure: string
  last_movement_date: string | null
  last_updated_at: string
}

export interface LocationBalance {
  material_id: string
  material_name: string
  warehouse_stock: number
  production_stock: number
  production_centers: WorkCenterStock[]
}

export interface WorkCenterStock {
  work_center_id: string
  work_center_name: string
  stock: number
}

export interface BalanceSummary {
  totalWarehouseStock: number
  totalProductionStock: number
  materialsTracked: number
  materialsWithStock: number
}

export function useInventoryBalances() {
  const [balances, setBalances] = useState<MaterialBalance[]>([])
  const [summary, setSummary] = useState<BalanceSummary>({
    totalWarehouseStock: 0,
    totalProductionStock: 0,
    materialsTracked: 0,
    materialsWithStock: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = useCallback(async (categoryFilter?: string) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch balances from physical table
      const { data: balanceData, error: balanceError } = await supabase
        .from('material_inventory_balances')
        .select('*')
        .order('total_stock', { ascending: false })

      if (balanceError) throw balanceError

      // Fetch material details
      const materialIds = balanceData?.map(b => b.material_id) || []
      const { data: materials, error: materialsError } = await supabase
        .from('products')
        .select('id, name, category')
        .in('id', materialIds)

      if (materialsError) throw materialsError

      const materialsMap = new Map(materials?.map(m => [m.id, m]) || [])

      // Enrich balances with material data
      let enrichedBalances: MaterialBalance[] = (balanceData || []).map(balance => {
        const material = materialsMap.get(balance.material_id)
        return {
          id: balance.id,
          material_id: balance.material_id,
          material_name: material?.name || 'Unknown',
          material_category: material?.category || '',
          warehouse_stock: parseFloat(balance.warehouse_stock) || 0,
          production_stock: parseFloat(balance.production_stock) || 0,
          total_stock: parseFloat(balance.total_stock) || 0,
          unit_of_measure: balance.unit_of_measure || 'kg',
          last_movement_date: balance.last_movement_date,
          last_updated_at: balance.last_updated_at,
        }
      })

      // Filter by category if provided
      if (categoryFilter && categoryFilter !== 'all') {
        enrichedBalances = enrichedBalances.filter(b => b.material_category === categoryFilter)
      }

      // Filter only raw materials (mp)
      enrichedBalances = enrichedBalances.filter(b => b.material_category === 'mp')

      setBalances(enrichedBalances)

      // Calculate summary
      const warehouseTotal = enrichedBalances.reduce((sum, b) => sum + b.warehouse_stock, 0)
      const productionTotal = enrichedBalances.reduce((sum, b) => sum + b.production_stock, 0)
      const withStock = enrichedBalances.filter(b => b.total_stock > 0).length

      setSummary({
        totalWarehouseStock: warehouseTotal,
        totalProductionStock: productionTotal,
        materialsTracked: enrichedBalances.length,
        materialsWithStock: withStock,
      })
    } catch (err) {
      console.error('Error fetching inventory balances:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch balances')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLocationBalances = useCallback(async (): Promise<LocationBalance[]> => {
    try {
      // Fetch main balances
      const { data: balanceData, error: balanceError } = await supabase
        .from('material_inventory_balances')
        .select('*')
        .gt('total_stock', 0)

      if (balanceError) throw balanceError

      // Fetch material details
      const materialIds = balanceData?.map(b => b.material_id) || []
      const { data: materials } = await supabase
        .from('products')
        .select('id, name, category')
        .in('id', materialIds)
        .eq('category', 'mp')

      const materialsMap = new Map(materials?.map(m => [m.id, m]) || [])

      // Fetch work center inventory for breakdown
      const { data: wcInventory } = await supabase
        .from('work_center_inventory')
        .select(`
          material_id,
          work_center_id,
          quantity_available
        `)
        .in('material_id', materialIds)

      // Fetch work centers
      const wcIds = [...new Set(wcInventory?.map(wc => wc.work_center_id) || [])]
      const { data: workCenters } = await supabase
        .from('work_centers')
        .select('id, code, description')
        .in('id', wcIds)

      const workCentersMap = new Map(workCenters?.map(wc => [wc.id, wc]) || [])

      // Build location balances
      const locationBalances: LocationBalance[] = (balanceData || [])
        .filter(balance => materialsMap.has(balance.material_id))
        .map(balance => {
          const material = materialsMap.get(balance.material_id)!
          const wcStocks = (wcInventory || [])
            .filter(wc => wc.material_id === balance.material_id)
            .map(wc => {
              const center = workCentersMap.get(wc.work_center_id)
              return {
                work_center_id: wc.work_center_id,
                work_center_name: center ? `${center.code} - ${center.description}` : 'Unknown',
                stock: parseFloat(wc.quantity_available) || 0,
              }
            })

          return {
            material_id: balance.material_id,
            material_name: material.name,
            warehouse_stock: parseFloat(balance.warehouse_stock) || 0,
            production_stock: parseFloat(balance.production_stock) || 0,
            production_centers: wcStocks,
          }
        })

      return locationBalances
    } catch (err) {
      console.error('Error fetching location balances:', err)
      return []
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchBalances()
  }, [])

  return {
    balances,
    summary,
    loading,
    error,
    refetch: fetchBalances,
    fetchLocationBalances,
  }
}
