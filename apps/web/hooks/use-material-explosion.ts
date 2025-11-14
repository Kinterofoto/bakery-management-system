"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type Product = Database['public']['Tables']['products']['Row']
type BillOfMaterials = Database['produccion']['Tables']['bill_of_materials']['Row']
type MaterialSupplier = Database['compras']['Tables']['material_suppliers']['Row']
type Supplier = Database['compras']['Tables']['suppliers']['Row']
type MaterialExplosionHistory = Database['compras']['Tables']['material_explosion_history']['Row']
type MaterialExplosionItem = Database['compras']['Tables']['material_explosion_items']['Row']

type ExplosionResultItem = {
  material_id: string
  material_name: string
  material_unit: string
  quantity_per_unit: number
  total_quantity_needed: number
  suggested_supplier_id?: string | null
  suggested_supplier_name?: string
  unit_price?: number
  packaging_unit?: number
  adjusted_quantity?: number
  estimated_cost?: number
}

type ExplosionResult = {
  product_id: string
  product_name: string
  quantity_requested: number
  items: ExplosionResultItem[]
  total_estimated_cost: number
}

export function useMaterialExplosion() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [explosionHistory, setExplosionHistory] = useState<MaterialExplosionHistory[]>([])

  const calculateMaterialExplosion = async (
    productId: string,
    quantity: number
  ): Promise<ExplosionResult | null> => {
    try {
      setLoading(true)
      setError(null)

      // 1. Get product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (productError) throw productError

      // 2. Get BOM for this product
      const { data: bomItems, error: bomError } = await supabase
        .schema('produccion')
        .from('bill_of_materials')
        .select('*')
        .eq('product_id', productId)

      if (bomError) throw bomError

      if (!bomItems || bomItems.length === 0) {
        setError('No hay lista de materiales (BOM) configurada para este producto')
        return null
      }

      // 3. Get all materials details
      const materialIds = bomItems.map(item => item.material_id)
      const { data: materials, error: materialsError } = await supabase
        .from('products')
        .select('*')
        .in('id', materialIds)

      if (materialsError) throw materialsError

      // 4. Get material suppliers for price and packaging info
      const { data: materialSuppliers, error: msError } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .select('*')
        .in('material_id', materialIds)
        .eq('status', 'active')

      if (msError) throw msError

      // 5. Get supplier details
      const supplierIds = materialSuppliers?.map(ms => ms.supplier_id) || []
      const { data: suppliers, error: suppliersError } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('*')
        .in('id', supplierIds)

      if (suppliersError) throw suppliersError

      // 6. Build explosion result
      const items: ExplosionResultItem[] = bomItems.map(bomItem => {
        const material = materials?.find(m => m.id === bomItem.material_id)
        const totalQuantity = bomItem.quantity_grams * quantity

        // Find best supplier (preferred first, then cheapest)
        const materialSuppliersForItem = materialSuppliers?.filter(
          ms => ms.material_id === bomItem.material_id
        ) || []

        const preferredSupplier = materialSuppliersForItem.find(ms => ms.is_preferred)
        const cheapestSupplier = materialSuppliersForItem.reduce((best, current) => {
          if (!best) return current
          return current.unit_price < best.unit_price ? current : best
        }, null as MaterialSupplier | null)

        const suggestedMs = preferredSupplier || cheapestSupplier
        const supplier = suggestedMs ? suppliers?.find(s => s.id === suggestedMs.supplier_id) : undefined

        // Calculate adjusted quantity and cost
        let adjustedQuantity = totalQuantity
        let estimatedCost = 0

        if (suggestedMs) {
          const packagingUnit = suggestedMs.packaging_unit || 1
          adjustedQuantity = Math.ceil(totalQuantity / packagingUnit) * packagingUnit
          estimatedCost = (adjustedQuantity / packagingUnit) * suggestedMs.unit_price
        }

        return {
          material_id: bomItem.material_id,
          material_name: material?.name || 'Desconocido',
          material_unit: material?.unit || 'g',
          quantity_per_unit: bomItem.quantity_grams,
          total_quantity_needed: totalQuantity,
          suggested_supplier_id: suggestedMs?.supplier_id,
          suggested_supplier_name: supplier?.company_name,
          unit_price: suggestedMs?.unit_price,
          packaging_unit: suggestedMs?.packaging_unit,
          adjusted_quantity: adjustedQuantity,
          estimated_cost: estimatedCost,
        }
      })

      const totalEstimatedCost = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0)

      const result: ExplosionResult = {
        product_id: productId,
        product_name: product.name,
        quantity_requested: quantity,
        items,
        total_estimated_cost: totalEstimatedCost,
      }

      return result
    } catch (err) {
      console.error('Error calculating material explosion:', err)
      setError(err instanceof Error ? err.message : 'Error al calcular explosión de materiales')
      return null
    } finally {
      setLoading(false)
    }
  }

  const saveExplosionHistory = async (
    productId: string,
    quantity: number,
    items: ExplosionResultItem[],
    userId?: string,
    notes?: string
  ): Promise<string | null> => {
    try {
      // Create history record
      const { data: historyData, error: historyError } = await supabase
        .schema('compras')
        .from('material_explosion_history')
        .insert([{
          product_id: productId,
          quantity_requested: quantity,
          created_by: userId || null,
          notes: notes || null,
        }])
        .select()
        .single()

      if (historyError) throw historyError

      // Create explosion items
      const explosionItems = items.map(item => ({
        explosion_id: historyData.id,
        material_id: item.material_id,
        quantity_per_unit: item.quantity_per_unit,
        total_quantity_needed: item.total_quantity_needed,
        suggested_supplier_id: item.suggested_supplier_id || null,
      }))

      const { error: itemsError } = await supabase
        .schema('compras')
        .from('material_explosion_items')
        .insert(explosionItems)

      if (itemsError) throw itemsError

      return historyData.id
    } catch (err) {
      console.error('Error saving explosion history:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar historial')
      return null
    }
  }

  const fetchExplosionHistory = async (): Promise<void> => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .schema('compras')
        .from('material_explosion_history')
        .select('*')
        .order('calculation_date', { ascending: false })
        .limit(50)

      if (error) throw error

      setExplosionHistory(data || [])
    } catch (err) {
      console.error('Error fetching explosion history:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  const getExplosionById = async (explosionId: string): Promise<{
    history: MaterialExplosionHistory
    items: MaterialExplosionItem[]
  } | null> => {
    try {
      const [historyResponse, itemsResponse] = await Promise.all([
        supabase
          .schema('compras')
          .from('material_explosion_history')
          .select('*')
          .eq('id', explosionId)
          .single(),
        supabase
          .schema('compras')
          .from('material_explosion_items')
          .select('*')
          .eq('explosion_id', explosionId)
      ])

      if (historyResponse.error) throw historyResponse.error
      if (itemsResponse.error) throw itemsResponse.error

      return {
        history: historyResponse.data,
        items: itemsResponse.data || []
      }
    } catch (err) {
      console.error('Error fetching explosion details:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar detalles')
      return null
    }
  }

  const calculateExplosionFromHistory = async (explosionId: string): Promise<ExplosionResult | null> => {
    try {
      const explosionData = await getExplosionById(explosionId)
      if (!explosionData) return null

      const { history, items } = explosionData

      // Get product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', history.product_id)
        .single()

      if (productError) throw productError

      // Get material details
      const materialIds = items.map(item => item.material_id)
      const { data: materials, error: materialsError } = await supabase
        .from('products')
        .select('*')
        .in('id', materialIds)

      if (materialsError) throw materialsError

      // Build result from history
      const resultItems: ExplosionResultItem[] = items.map(item => {
        const material = materials?.find(m => m.id === item.material_id)

        return {
          material_id: item.material_id,
          material_name: material?.name || 'Desconocido',
          material_unit: material?.unit || 'g',
          quantity_per_unit: item.quantity_per_unit,
          total_quantity_needed: item.total_quantity_needed,
          suggested_supplier_id: item.suggested_supplier_id,
        }
      })

      return {
        product_id: history.product_id,
        product_name: product.name,
        quantity_requested: history.quantity_requested,
        items: resultItems,
        total_estimated_cost: 0, // Not stored in history
      }
    } catch (err) {
      console.error('Error reconstructing explosion from history:', err)
      setError(err instanceof Error ? err.message : 'Error al reconstruir cálculo')
      return null
    }
  }

  return {
    loading,
    error,
    explosionHistory,
    calculateMaterialExplosion,
    saveExplosionHistory,
    fetchExplosionHistory,
    getExplosionById,
    calculateExplosionFromHistory,
  }
}
