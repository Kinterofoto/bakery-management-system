'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface KardexMovement {
  id: string
  material_id: string
  material_name: string
  material_category: string
  movement_type: 'reception' | 'consumption' | 'adjustment' | 'return' | 'waste' | 'transfer'
  quantity_change: number
  unit_of_measure: string
  warehouse_type: 'warehouse' | 'production' | null
  location: string | null
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  recorded_by: string | null
  recorded_by_name: string | null
  movement_date: string
  created_at: string
}

export interface KardexFilters {
  startDate?: string
  endDate?: string
  materialIds?: string[]
  movementTypes?: string[]
  warehouseType?: 'warehouse' | 'production' | 'all'
  searchTerm?: string
}

export interface KardexSummary {
  totalMovements: number
  totalMaterials: number
  todayMovements: number
  weekMovements: number
}

export function useKardex() {
  const [movements, setMovements] = useState<KardexMovement[]>([])
  const [summary, setSummary] = useState<KardexSummary>({
    totalMovements: 0,
    totalMaterials: 0,
    todayMovements: 0,
    weekMovements: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMovements = useCallback(async (filters?: KardexFilters) => {
    try {
      setLoading(true)
      setError(null)

      // Build query
      let query = supabase
        .from('inventory_movements')
        .select(`
          id,
          material_id,
          movement_type,
          quantity_change,
          unit_of_measure,
          warehouse_type,
          location,
          reference_id,
          reference_type,
          notes,
          recorded_by,
          movement_date,
          created_at
        `, { count: 'exact' })
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.startDate) {
        query = query.gte('movement_date', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('movement_date', filters.endDate)
      }

      if (filters?.materialIds && filters.materialIds.length > 0) {
        query = query.in('material_id', filters.materialIds)
      }

      if (filters?.movementTypes && filters.movementTypes.length > 0) {
        query = query.in('movement_type', filters.movementTypes)
      }

      if (filters?.warehouseType && filters.warehouseType !== 'all') {
        if (filters.warehouseType === 'warehouse') {
          query = query.or('warehouse_type.eq.warehouse,warehouse_type.is.null')
        } else {
          query = query.eq('warehouse_type', filters.warehouseType)
        }
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      // Fetch related product and user data manually
      const materialIds = [...new Set(data?.map(m => m.material_id) || [])]
      const userIds = [...new Set(data?.map(m => m.recorded_by).filter(Boolean) as string[] || [])]

      // Fetch materials
      const { data: materials } = await supabase
        .from('products')
        .select('id, name, category')
        .in('id', materialIds)

      // Fetch users (from auth.users via a helper view or RPC if available)
      // For now, we'll create a map with nulls - can be enhanced later
      const materialsMap = new Map(materials?.map(m => [m.id, m]) || [])

      // Enrich movements with related data
      const enrichedMovements: KardexMovement[] = (data || []).map(movement => {
        const material = materialsMap.get(movement.material_id)
        return {
          ...movement,
          material_name: material?.name || 'Unknown',
          material_category: material?.category || '',
          recorded_by_name: null, // TODO: Fetch from users if needed
        }
      })

      // Filter by search term if provided (client-side for now)
      let filteredMovements = enrichedMovements
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        filteredMovements = enrichedMovements.filter(m =>
          m.material_name.toLowerCase().includes(term) ||
          m.notes?.toLowerCase().includes(term) ||
          m.movement_type.toLowerCase().includes(term)
        )
      }

      setMovements(filteredMovements)

      // Calculate summary
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const todayCount = enrichedMovements.filter(m =>
        new Date(m.movement_date) >= today
      ).length

      const weekCount = enrichedMovements.filter(m =>
        new Date(m.movement_date) >= weekAgo
      ).length

      const uniqueMaterials = new Set(enrichedMovements.map(m => m.material_id)).size

      setSummary({
        totalMovements: count || enrichedMovements.length,
        totalMaterials: uniqueMaterials,
        todayMovements: todayCount,
        weekMovements: weekCount,
      })
    } catch (err) {
      console.error('Error fetching kardex movements:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch movements')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchMovements()
  }, [])

  return {
    movements,
    summary,
    loading,
    error,
    refetch: fetchMovements,
  }
}

// Movement type helpers
export const movementTypeConfig = {
  reception: {
    label: 'Recepción',
    color: 'green',
    icon: '📦',
  },
  consumption: {
    label: 'Consumo',
    color: 'red',
    icon: '🔨',
  },
  transfer: {
    label: 'Transferencia',
    color: 'blue',
    icon: '🔄',
  },
  adjustment: {
    label: 'Ajuste',
    color: 'yellow',
    icon: '⚖️',
  },
  return: {
    label: 'Devolución',
    color: 'purple',
    icon: '↩️',
  },
  waste: {
    label: 'Merma',
    color: 'gray',
    icon: '🗑️',
  },
} as const

export type MovementType = keyof typeof movementTypeConfig
