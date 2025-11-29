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

  // Fetch warehouse inventory only (bodega)
  const fetchWarehouseInventory = async () => {
    try {
      setLoading(true)

      // DIAGNOSTIC: Check if we have products with category 'mp'
      const { data: diagnosticProducts } = await (supabase as any)
        .schema('compras')
        .from('diagnostic_products')
        .select('*')
      console.log('🔍 DIAGNOSTIC: Products with category mp:', diagnosticProducts)

      // DIAGNOSTIC: Check if we have movements
      const { data: diagnosticMovements } = await (supabase as any)
        .schema('compras')
        .from('diagnostic_movements')
        .select('*')
      console.log('🔍 DIAGNOSTIC: Recent movements:', diagnosticMovements)

      // DIAGNOSTIC: Check all products (not just mp)
      const { data: diagnosticAllProducts } = await (supabase as any)
        .schema('compras')
        .from('diagnostic_warehouse_all_products')
        .select('*')
      console.log('🔍 DIAGNOSTIC: Warehouse for ALL products:', diagnosticAllProducts)

      const { data, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('warehouse_inventory_status')
        .select('*')
        .order('name', { ascending: true })

      if (queryError) throw queryError

      console.log('🔵 WAREHOUSE INVENTORY DATA:', data)
      console.log('🔵 Total materials in warehouse:', data?.length || 0)
      console.log('🔵 Sample material:', data?.[0])
      if (data && data.length > 0) {
        console.log('🔵 First 3 materials:', data.slice(0, 3))
      }

      setInventory(((data || []) as unknown) as MaterialInventoryStatus[])
      setError(null)
    } catch (err) {
      console.error('❌ Warehouse inventory error:', err)
      setError(err instanceof Error ? err.message : 'Error fetching warehouse inventory')
    } finally {
      setLoading(false)
    }
  }

  // Fetch production inventory only (centros de trabajo)
  const fetchProductionInventory = async () => {
    try {
      setLoading(true)

      // DIAGNOSTIC: Check work center inventory
      const { data: diagnosticWorkCenter } = await (supabase as any)
        .schema('compras')
        .from('diagnostic_work_center_inventory')
        .select('*')
      console.log('🔍 DIAGNOSTIC: Work center inventory entries:', diagnosticWorkCenter)

      const { data, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('production_inventory_status')
        .select('*')
        .order('name', { ascending: true })

      if (queryError) throw queryError

      console.log('🏭 PRODUCTION INVENTORY DATA:', data)
      console.log('🏭 Total materials in production:', data?.length || 0)
      console.log('🏭 Sample material:', data?.[0])
      if (data && data.length > 0) {
        console.log('🏭 First 3 materials:', data.slice(0, 3))
      }

      setInventory(((data || []) as unknown) as MaterialInventoryStatus[])
      setError(null)
    } catch (err) {
      console.error('❌ Production inventory error:', err)
      setError(err instanceof Error ? err.message : 'Error fetching production inventory')
    } finally {
      setLoading(false)
    }
  }

  // Fetch current inventory status (all products with movements) - kept for compatibility
  const fetchInventoryStatus = async () => {
    try {
      setLoading(true)
      const { data, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('material_inventory_status')
        .select('*')
        .order('name', { ascending: true })

      if (queryError) throw queryError
      setInventory(((data || []) as unknown) as MaterialInventoryStatus[])
      setError(null)
    } catch (err) {
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

  useEffect(() => {
    fetchInventoryStatus()

    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchInventoryStatus, 30000)

    return () => clearInterval(interval)
  }, [])

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
