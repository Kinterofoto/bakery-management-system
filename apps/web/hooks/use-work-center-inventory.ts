"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type WorkCenterInventory = any

export function useWorkCenterInventory() {
  const [inventory, setInventory] = useState<WorkCenterInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch inventory for a specific work center - NEW INVENTORY SYSTEM
  const fetchInventoryByWorkCenter = async (workCenterId: string) => {
    try {
      setLoading(true)

      console.log('🔄 Fetching inventory for work center:', workCenterId)

      // First, get the location_id for this work center
      const { data: workCenterData, error: wcError } = await supabase
        .schema('produccion')
        .from('work_centers')
        .select('location_id, code, name')
        .eq('id', workCenterId)
        .single()

      if (wcError || !workCenterData) {
        console.error('❌ Error fetching work center:', wcError)
        throw new Error('No se pudo obtener el centro de trabajo')
      }

      if (!workCenterData.location_id) {
        console.log('⚠️ Work center has no location_id, returning empty inventory')
        setInventory([])
        return []
      }

      console.log('✅ Work center location:', workCenterData.location_id, workCenterData.code)

      // Fetch inventory balances for this location
      const { data, error: queryError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('*')
        .eq('location_id', workCenterData.location_id)
        .order('product_id')

      console.log('📦 Inventory balances:', { count: data?.length, error: queryError })

      if (queryError) throw queryError

      // Fetch product names for all materials
      const materialIds = data?.map(item => item.product_id) || []
      const { data: materialsData } = await supabase
        .from('products')
        .select('id, name, unit')
        .in('id', materialIds)

      const materialMap = new Map((materialsData || []).map(m => [m.id, m]))

      // Map to work center inventory format for backward compatibility
      const inventoryWithNames = data?.map(item => ({
        id: item.id,
        work_center_id: workCenterId,
        material_id: item.product_id,
        material_name: materialMap.get(item.product_id)?.name || 'Desconocido',
        quantity_available: item.quantity_on_hand,
        quantity_consumed: 0, // In new system, consumption is tracked differently
        unit_of_measure: materialMap.get(item.product_id)?.unit,
        batch_number: null, // Batch info is in movements
        expiry_date: null,
        last_updated_at: item.last_updated_at
      })) || []

      console.log('✅ Formatted inventory:', inventoryWithNames.length)

      setInventory(inventoryWithNames)
      setError(null)
      return inventoryWithNames
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching inventory'
      console.error('❌ Error in fetchInventoryByWorkCenter:', err)
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Get available quantity for a material in a work center
  const getAvailableQuantity = async (workCenterId: string, materialId: string, batchNumber?: string, expiryDate?: string) => {
    try {
      let query = (supabase as any)
        .schema('produccion')
        .from('work_center_inventory')
        .select('*')
        .eq('work_center_id', workCenterId)
        .eq('material_id', materialId)

      if (batchNumber) {
        query = query.eq('batch_number', batchNumber)
      }

      if (expiryDate) {
        query = query.eq('expiry_date', expiryDate)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const totalAvailable = data?.reduce((sum, item) => sum + (item.quantity_available - item.quantity_consumed), 0) || 0
      return totalAvailable
    } catch (err) {
      console.error('Error getting available quantity:', err)
      return 0
    }
  }

  // Consume material from work center inventory
  const consumeMaterial = async (workCenterId: string, materialId: string, quantity: number, batchNumber?: string, expiryDate?: string) => {
    try {
      setError(null)

      // Find the inventory record (prioritize by expiry date - FIFO)
      let query = (supabase as any)
        .schema('produccion')
        .from('work_center_inventory')
        .select('*')
        .eq('work_center_id', workCenterId)
        .eq('material_id', materialId)

      if (batchNumber) {
        query = query.eq('batch_number', batchNumber)
      }

      if (expiryDate) {
        query = query.eq('expiry_date', expiryDate)
      }

      query = query.order('expiry_date', { ascending: true })

      const { data: inventoryItems, error: fetchError } = await query

      if (fetchError) throw fetchError

      if (!inventoryItems || inventoryItems.length === 0) {
        throw new Error('No inventory found for this material')
      }

      let remainingQuantity = quantity
      const updatePromises = []

      // Consume from inventory items in order (FIFO by expiry date)
      for (const item of inventoryItems) {
        if (remainingQuantity <= 0) break

        const availableQuantity = item.quantity_available - item.quantity_consumed
        const consumeQuantity = Math.min(remainingQuantity, availableQuantity)

        if (consumeQuantity > 0) {
          updatePromises.push(
            (supabase as any)
              .schema('produccion')
              .from('work_center_inventory')
              .update({
                quantity_consumed: item.quantity_consumed + consumeQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          )

          remainingQuantity -= consumeQuantity
        }
      }

      if (remainingQuantity > 0) {
        throw new Error(`Insufficient inventory. Missing: ${remainingQuantity}`)
      }

      // Execute all updates
      const results = await Promise.all(updatePromises)
      const errors = results.filter(r => r.error).map(r => r.error)
      if (errors.length > 0) {
        throw errors[0]
      }

      await fetchInventoryByWorkCenter(workCenterId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error consuming material'
      setError(message)
      throw err
    }
  }

  // Get all work centers inventory
  const fetchAllWorkCentersInventory = async () => {
    try {
      setLoading(true)

      const { data, error: queryError } = await (supabase as any)
        .schema('produccion')
        .from('work_center_inventory')
        .select('*')
        .order('work_center_id')

      if (queryError) throw queryError

      // Fetch work centers
      const workCenterIds = [...new Set(data?.map(item => item.work_center_id) || [])]
      const { data: workCentersData } = await (supabase as any)
        .schema('produccion')
        .from('work_centers')
        .select('id, code, name')
        .in('id', workCenterIds)

      const workCenterMap = new Map((workCentersData || []).map(wc => [wc.id, wc]))

      // Fetch product names for all materials
      const materialIds = [...new Set(data?.map(item => item.material_id) || [])]
      const { data: materialsData } = await supabase
        .from('products')
        .select('id, name, unit')
        .in('id', materialIds)

      const materialMap = new Map((materialsData || []).map(m => [m.id, m]))

      // Combine with names
      const inventoryWithNames = data?.map(item => ({
        ...item,
        work_center_name: workCenterMap.get(item.work_center_id)?.name || 'Desconocido',
        work_center_code: workCenterMap.get(item.work_center_id)?.code || 'N/A',
        material_name: materialMap.get(item.material_id)?.name || 'Desconocido',
        unit_of_measure: item.unit_of_measure || materialMap.get(item.material_id)?.unit
      })) || []

      setInventory(inventoryWithNames)
      setError(null)
      return inventoryWithNames
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching all inventory'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Get inventory summary by work center
  const getInventorySummaryByWorkCenter = (workCenterId: string) => {
    return inventory.filter(item => item.work_center_id === workCenterId)
  }

  // Get total available quantity by material
  const getTotalAvailableByMaterial = (workCenterId: string, materialId: string) => {
    return inventory
      .filter(item => item.work_center_id === workCenterId && item.material_id === materialId)
      .reduce((sum, item) => sum + (item.quantity_available - item.quantity_consumed), 0)
  }

  return {
    inventory,
    loading,
    error,
    fetchInventoryByWorkCenter,
    fetchAllWorkCentersInventory,
    getAvailableQuantity,
    consumeMaterial,
    getInventorySummaryByWorkCenter,
    getTotalAvailableByMaterial
  }
}
