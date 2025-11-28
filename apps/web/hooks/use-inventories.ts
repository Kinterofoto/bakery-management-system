"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { toast } from 'sonner'

type Inventory = Database['public']['Tables']['inventories']['Row']
type InventoryInsert = Database['public']['Tables']['inventories']['Insert']
type InventoryUpdate = Database['public']['Tables']['inventories']['Update']

interface InventoryWithCounts extends Inventory {
  inventory_counts: {
    count_number: number
    status: string
    completed_at: string | null
    inventory_count_items: {
      product: {
        id: string
        name: string
        unit: string
      }
      quantity_units: number
      grams_per_unit: number
      total_grams: number
    }[]
  }[]
}

export function useInventories() {
  const [inventories, setInventories] = useState<InventoryWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: inventoriesData, error: inventoriesError } = await supabase
        .from('inventories')
        .select(`
          *,
          inventory_counts (
            count_number,
            status,
            completed_at,
            inventory_count_items (
              quantity_units,
              grams_per_unit,
              total_grams,
              product:products (
                id,
                name,
                unit
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (inventoriesError) throw inventoriesError

      setInventories(inventoriesData as InventoryWithCounts[])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar inventarios'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  const generateInventoryName = useCallback(async (): Promise<string> => {
    try {
      // Obtener el conteo de inventarios para calcular el consecutivo
      const { count, error: countError } = await supabase
        .from('inventories')
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError

      const consecutive = (count || 0) + 1
      const now = new Date()
      const weekNumber = getWeekNumber(now)
      const formattedDate = now.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })

      return `Conteo #${consecutive} - Semana ${weekNumber} - ${formattedDate}`
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar nombre del inventario'
      toast.error(errorMessage)
      throw err
    }
  }, [])

  const createInventory = useCallback(async (inventoryData: InventoryInsert) => {
    try {
      const { data, error } = await supabase
        .from('inventories')
        .insert([inventoryData])
        .select()
        .single()

      if (error) throw error

      toast.success('Inventario creado exitosamente')
      await fetchInventories()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear inventario'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchInventories])

  const updateInventory = useCallback(async (id: string, updates: InventoryUpdate) => {
    try {
      const { error } = await supabase
        .from('inventories')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('Inventario actualizado exitosamente')
      await fetchInventories()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar inventario'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchInventories])

  const deleteInventory = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventories')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Inventario eliminado exitosamente')
      await fetchInventories()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar inventario'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchInventories])

  const getInventorySummary = useCallback(async (inventoryId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_inventory_summary', { inventory_uuid: inventoryId })

      if (error) throw error

      return data[0] || null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener resumen del inventario'
      toast.error(errorMessage)
      throw err
    }
  }, [])

  useEffect(() => {
    fetchInventories()
  }, [fetchInventories])

  return {
    inventories,
    loading,
    error,
    createInventory,
    updateInventory,
    deleteInventory,
    getInventorySummary,
    generateInventoryName,
    refetch: fetchInventories
  }
}