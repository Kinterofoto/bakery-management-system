"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type InventoryMovement = any
type InventoryMovementInsert = any
type Product = any

interface MaterialInventoryStatus extends Product {
  current_stock: number
  total_consumed: number
  total_waste: number
  last_movement_date?: string
  total_receptions: number
}

export function useInventoryRealtime() {
  const [inventory, setInventory] = useState<MaterialInventoryStatus[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch warehouse inventory only (bodega) - NEW SYSTEM
  const fetchWarehouseInventory = async () => {
    try {
      setLoading(true)

      console.log('📦 Fetching WH1-RECEIVING inventory only...')

      // First, get the WH1-RECEIVING location ID (área de recepción)
      const { data: warehouseLocation, error: whError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name')
        .eq('code', 'WH1-RECEIVING')
        .single()

      if (whError) {
        console.error('❌ Error fetching WH1-RECEIVING location:', whError)
        throw new Error('No se pudo obtener la ubicación de área de recepción')
      }

      console.log('✅ WH1-RECEIVING location:', warehouseLocation.id)

      // Fetch balances ONLY from WH1-RECEIVING location
      const { data: balances, error: balancesError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('product_id, location_id, quantity_on_hand')
        .eq('location_id', warehouseLocation.id)  // Filter by WH1-RECEIVING only

      console.log('📦 WH1-RECEIVING balances:', balances?.length)

      if (balancesError) throw balancesError

      // Get unique product IDs
      const productIds = [...new Set(balances?.map(b => b.product_id) || [])]

      // Fetch product details
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, unit')
        .in('id', productIds)

      if (productsError) throw productsError

      // Create products map
      const productsMap = new Map(products?.map(p => [p.id, p]) || [])

      // Build inventory status (no aggregation needed since we're only querying one location)
      const inventoryStatus: MaterialInventoryStatus[] = (balances || []).map((balance) => {
        const product = productsMap.get(balance.product_id)
        return {
          id: balance.product_id,
          name: product?.name || 'Unknown',
          category: product?.category || '',
          unit: product?.unit || '',
          current_stock: balance.quantity_on_hand,
          total_consumed: 0,
          total_waste: 0,
          total_receptions: 0,
        }
      }).filter(item => item.name !== 'Unknown')
        .sort((a, b) => a.name.localeCompare(b.name))

      console.log('📦 Final WH1-RECEIVING inventory:', inventoryStatus.length)

      setInventory(inventoryStatus)
      setError(null)
    } catch (err) {
      console.error('❌ Error fetching warehouse inventory:', err)
      setError(err instanceof Error ? err.message : 'Error fetching warehouse inventory')
    } finally {
      setLoading(false)
    }
  }

  // Fetch production inventory only (centros de trabajo)
  const fetchProductionInventory = async () => {
    try {
      setLoading(true)
      const { data, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('production_inventory_status')
        .select('*')
        .order('name', { ascending: true })

      if (queryError) throw queryError
      setInventory(((data || []) as unknown) as MaterialInventoryStatus[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching production inventory')
    } finally {
      setLoading(false)
    }
  }

  // Fetch current inventory status (all products with movements) - NEW SYSTEM
  const fetchInventoryStatus = async () => {
    try {
      setLoading(true)

      console.log('📦 Fetching inventory balances...')

      // Fetch balances from new inventory system
      const { data: balances, error: balancesError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('product_id, location_id, quantity_on_hand')

      console.log('📦 Balances result:', {
        count: balances?.length,
        balances: balances?.slice(0, 5),
        error: balancesError
      })

      if (balancesError) throw balancesError

      // Get unique product IDs
      const productIds = [...new Set(balances?.map(b => b.product_id) || [])]

      console.log('📦 Unique product IDs:', productIds.length, productIds.slice(0, 5))

      // Fetch product details
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, unit')
        .in('id', productIds)

      console.log('📦 Products result:', {
        count: products?.length,
        products: products?.slice(0, 5),
        error: productsError
      })

      if (productsError) throw productsError

      // Create products map
      const productsMap = new Map(products?.map(p => [p.id, p]) || [])

      // Aggregate balances by product
      const aggregated = new Map<string, number>()
      for (const balance of balances || []) {
        const current = aggregated.get(balance.product_id) || 0
        aggregated.set(balance.product_id, current + balance.quantity_on_hand)
      }

      console.log('📦 Aggregated balances:', aggregated.size, Array.from(aggregated.entries()).slice(0, 5))

      // Build inventory status
      const inventoryStatus: MaterialInventoryStatus[] = Array.from(aggregated.entries()).map(([productId, quantity]) => {
        const product = productsMap.get(productId)
        return {
          id: productId,
          name: product?.name || 'Unknown',
          category: product?.category || '',
          unit: product?.unit || '',
          current_stock: quantity,
          total_consumed: 0,
          total_waste: 0,
          total_receptions: 0,
        }
      }).filter(item => item.name !== 'Unknown')
        .sort((a, b) => a.name.localeCompare(b.name))

      console.log('📦 Final inventory status:', inventoryStatus.length, inventoryStatus.slice(0, 3))

      setInventory(inventoryStatus)
      setError(null)
    } catch (err) {
      console.error('❌ Error fetching inventory:', err)
      setError(err instanceof Error ? err.message : 'Error fetching inventory')
    } finally {
      setLoading(false)
    }
  }

  // Fetch inventory status for raw materials only (mp category)
  const fetchMPInventoryStatus = async () => {
    try {
      setLoading(true)
      const { data, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('mp_material_inventory_status')
        .select('*')
        .order('name', { ascending: true })

      if (queryError) throw queryError
      setInventory(((data || []) as unknown) as MaterialInventoryStatus[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching mp inventory')
    } finally {
      setLoading(false)
    }
  }

  // Fetch movements for a specific material
  const fetchMovements = async (materialId?: string) => {
    try {
      let query = (supabase as any)
        .schema('compras')
        .from('inventory_movements')
        .select('*')
        .order('movement_date', { ascending: false })

      if (materialId) {
        query = query.eq('material_id', materialId)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError
      setMovements(((data || []) as unknown) as InventoryMovement[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching movements')
    }
  }

  // Create inventory movement
  const recordMovement = async (data: InventoryMovementInsert) => {
    try {
      setError(null)
      const { error: insertError } = await (supabase as any)
        .schema('compras')
        .from('inventory_movements')
        .insert(data)

      if (insertError) throw insertError

      // Refresh inventory after recording movement
      await fetchInventoryStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error recording movement'
      setError(message)
      throw err
    }
  }

  // Get inventory for a specific material
  const getMaterialInventory = (materialId: string) => {
    return inventory.find(item => item.id === materialId)
  }

  // Get low stock materials
  const getLowStockMaterials = (threshold: number = 10) => {
    return inventory.filter(item => item.current_stock < threshold)
  }

  // Get materials with zero stock
  const getOutOfStockMaterials = () => {
    return inventory.filter(item => item.current_stock <= 0)
  }

  // Get inventory statistics
  const getInventoryStats = () => {
    return {
      totalMaterials: inventory.length,
      lowStockCount: getLowStockMaterials().length,
      outOfStockCount: getOutOfStockMaterials().length,
      totalStock: inventory.reduce((sum, item) => sum + (item.current_stock || 0), 0),
      lastUpdated: new Date().toISOString()
    }
  }

  // Get movements for a material
  const getMaterialMovements = (materialId: string) => {
    return movements.filter(m => m.material_id === materialId)
  }

  // Get movements by type
  const getMovementsByType = (type: 'reception' | 'consumption' | 'adjustment' | 'return' | 'waste' | 'transfer') => {
    return movements.filter(m => m.movement_type === type)
  }

  // Removed auto-refresh - page now manages its own refresh based on location filter
  // useEffect(() => {
  //   fetchInventoryStatus()
  //   const interval = setInterval(fetchInventoryStatus, 30000)
  //   return () => clearInterval(interval)
  // }, [])

  return {
    inventory,
    movements,
    loading,
    error,
    fetchInventoryStatus,
    fetchWarehouseInventory,
    fetchProductionInventory,
    fetchMPInventoryStatus,
    fetchMovements,
    recordMovement,
    getMaterialInventory,
    getLowStockMaterials,
    getOutOfStockMaterials,
    getInventoryStats,
    getMaterialMovements,
    getMovementsByType
  }
}
