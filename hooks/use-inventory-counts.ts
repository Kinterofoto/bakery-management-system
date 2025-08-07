"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { toast } from 'sonner'

type InventoryCount = Database['public']['Tables']['inventory_counts']['Row']
type InventoryCountInsert = Database['public']['Tables']['inventory_counts']['Insert']
type InventoryCountUpdate = Database['public']['Tables']['inventory_counts']['Update']

type InventoryCountItem = Database['public']['Tables']['inventory_count_items']['Row']
type InventoryCountItemInsert = Database['public']['Tables']['inventory_count_items']['Insert']
type InventoryCountItemUpdate = Database['public']['Tables']['inventory_count_items']['Update']

interface InventoryCountWithItems extends InventoryCount {
  inventory_count_items: (InventoryCountItem & {
    product: {
      id: string
      name: string
      unit: string
      description: string | null
    }
  })[]
}

export function useInventoryCounts(inventoryId?: string) {
  const [counts, setCounts] = useState<InventoryCountWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCount, setActiveCount] = useState<InventoryCountWithItems | null>(null)

  const fetchCounts = useCallback(async () => {
    if (!inventoryId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error: countsError } = await supabase
        .from('inventory_counts')
        .select(`
          *,
          inventory_count_items (
            *,
            product:products (
              id,
              name,
              unit,
              description
            )
          )
        `)
        .eq('inventory_id', inventoryId)
        .order('count_number', { ascending: true })

      if (countsError) throw countsError

      setCounts(data as InventoryCountWithItems[])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar conteos'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [inventoryId])

  const createCount = useCallback(async (countData: InventoryCountInsert) => {
    try {
      const { data, error } = await supabase
        .from('inventory_counts')
        .insert([countData])
        .select()
        .single()

      if (error) throw error

      await fetchCounts()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear conteo'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchCounts])

  const updateCount = useCallback(async (id: string, updates: InventoryCountUpdate) => {
    try {
      const { error } = await supabase
        .from('inventory_counts')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchCounts()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar conteo'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchCounts])

  const addCountItem = useCallback(async (itemData: InventoryCountItemInsert) => {
    try {
      const { data, error } = await supabase
        .from('inventory_count_items')
        .insert([itemData])
        .select()
        .single()

      if (error) throw error

      toast.success('Producto agregado al conteo')
      await fetchCounts()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al agregar producto al conteo'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchCounts])

  const updateCountItem = useCallback(async (id: string, updates: InventoryCountItemUpdate) => {
    try {
      const { error } = await supabase
        .from('inventory_count_items')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchCounts()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar producto'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchCounts])

  const removeCountItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory_count_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchCounts()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar producto'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchCounts])

  const completeCount = useCallback(async (countId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_counts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', countId)

      if (error) throw error

      toast.success('Conteo completado exitosamente')
      await fetchCounts()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al completar conteo'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchCounts])

  const getFirstCountProducts = useCallback(async (inventoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_counts')
        .select(`
          inventory_count_items (
            product_id,
            product:products (
              id,
              name,
              unit,
              description
            )
          )
        `)
        .eq('inventory_id', inventoryId)
        .eq('count_number', 1)
        .eq('status', 'completed')
        .single()

      if (error) throw error

      return data?.inventory_count_items?.map(item => item.product) || []
    } catch (err) {
      console.error('Error fetching first count products:', err)
      return []
    }
  }, [])

  const getOrCreateActiveCount = useCallback(async (inventoryId: string, countNumber: number = 1) => {
    try {
      const { data: existingCount, error: fetchError } = await supabase
        .from('inventory_counts')
        .select(`
          *,
          inventory_count_items (
            *,
            product:products (
              id,
              name,
              unit,
              description
            )
          )
        `)
        .eq('inventory_id', inventoryId)
        .eq('count_number', countNumber)
        .eq('status', 'in_progress')
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existingCount) {
        return existingCount
      }

      const { data: newCount, error: createError } = await supabase
        .from('inventory_counts')
        .insert([{
          inventory_id: inventoryId,
          count_number: countNumber,
          status: 'in_progress'
        }])
        .select()
        .single()

      if (createError) throw createError

      await fetchCounts()
      return newCount
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener/crear conteo activo'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchCounts])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return {
    counts,
    loading,
    error,
    activeCount,
    setActiveCount,
    createCount,
    updateCount,
    addCountItem,
    updateCountItem,
    removeCountItem,
    completeCount,
    getFirstCountProducts,
    getOrCreateActiveCount,
    refetch: fetchCounts
  }
}