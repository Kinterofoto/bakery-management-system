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

      // Fetch balances from NEW inventory system (including negative balances)
      const { data: balanceData, error: balanceError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('*')
        .order('quantity_on_hand', { ascending: false })

      if (balanceError) throw balanceError

      // Fetch product details (cross-schema)
      const productIds = balanceData?.map(b => b.product_id) || []
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, unit')
        .in('id', productIds)

      if (productsError) throw productsError

      // Fetch location details
      const locationIds = balanceData?.map(b => b.location_id) || []
      const { data: locations, error: locationsError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name, location_type')
        .in('id', locationIds)

      if (locationsError) throw locationsError

      const productsMap = new Map(products?.map(m => [m.id, m]) || [])
      const locationsMap = new Map(locations?.map(l => [l.id, l]) || [])

      // Group by product and aggregate across all locations
      const productBalances = new Map<string, MaterialBalance>()

      for (const balance of balanceData || []) {
        const product = productsMap.get(balance.product_id)
        const location = locationsMap.get(balance.location_id)

        if (!product) continue

        const existing = productBalances.get(balance.product_id)
        const quantity = parseFloat(balance.quantity_on_hand) || 0

        // Determine if warehouse or production based on location type
        // Assume location_type 'warehouse' = warehouse stock, others = production
        const isWarehouse = location?.location_type === 'warehouse' || !location
        const warehouseStock = isWarehouse ? quantity : 0
        const productionStock = !isWarehouse ? quantity : 0

        if (existing) {
          existing.warehouse_stock += warehouseStock
          existing.production_stock += productionStock
          existing.total_stock += quantity
          // Update last_updated_at if this is newer
          if (balance.last_updated_at > existing.last_updated_at) {
            existing.last_updated_at = balance.last_updated_at
          }
        } else {
          productBalances.set(balance.product_id, {
            id: balance.id,
            material_id: balance.product_id,
            material_name: product.name,
            material_category: product.category || '',
            warehouse_stock: warehouseStock,
            production_stock: productionStock,
            total_stock: quantity,
            unit_of_measure: product.unit || 'kg',
            last_movement_date: null, // Not tracked in new system yet
            last_updated_at: balance.last_updated_at,
          })
        }
      }

      let enrichedBalances = Array.from(productBalances.values())

      // Filter by category if provided
      if (categoryFilter && categoryFilter !== 'all') {
        enrichedBalances = enrichedBalances.filter(b => b.material_category === categoryFilter)
      }

      // Filter only raw materials (MP)
      enrichedBalances = enrichedBalances.filter(b => b.material_category === 'MP')

      // Sort by total stock descending
      enrichedBalances.sort((a, b) => b.total_stock - a.total_stock)

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
      // Fetch balances from NEW inventory system (including negative balances)
      const { data: balanceData, error: balanceError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('*')

      if (balanceError) throw balanceError

      // Fetch product details (cross-schema)
      const productIds = [...new Set(balanceData?.map(b => b.product_id) || [])]
      const { data: products } = await supabase
        .from('products')
        .select('id, name, category')
        .in('id', productIds)
        .eq('category', 'MP')

      const productsMap = new Map(products?.map(m => [m.id, m]) || [])

      // Fetch location details
      const locationIds = [...new Set(balanceData?.map(b => b.location_id) || [])]
      const { data: locations } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name, location_type')
        .in('id', locationIds)

      const locationsMap = new Map(locations?.map(l => [l.id, l]) || [])

      // Group by product and aggregate by location type
      const productLocationMap = new Map<string, LocationBalance>()

      for (const balance of balanceData || []) {
        if (!productsMap.has(balance.product_id)) continue

        const product = productsMap.get(balance.product_id)!
        const location = locationsMap.get(balance.location_id)
        const quantity = parseFloat(balance.quantity_on_hand) || 0

        const existing = productLocationMap.get(balance.product_id)
        const isWarehouse = location?.location_type === 'warehouse' || !location

        if (existing) {
          if (isWarehouse) {
            existing.warehouse_stock += quantity
          } else {
            existing.production_stock += quantity
            // Add to work centers if it's a production location
            if (location) {
              existing.production_centers.push({
                work_center_id: location.id,
                work_center_name: `${location.code} - ${location.name}`,
                stock: quantity,
              })
            }
          }
        } else {
          const newBalance: LocationBalance = {
            material_id: balance.product_id,
            material_name: product.name,
            warehouse_stock: isWarehouse ? quantity : 0,
            production_stock: !isWarehouse ? quantity : 0,
            production_centers: !isWarehouse && location ? [{
              work_center_id: location.id,
              work_center_name: `${location.code} - ${location.name}`,
              stock: quantity,
            }] : [],
          }
          productLocationMap.set(balance.product_id, newBalance)
        }
      }

      return Array.from(productLocationMap.values())
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
