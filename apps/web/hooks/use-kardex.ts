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
  balance_after: number
  unit_of_measure: string
  warehouse_type: 'warehouse' | 'production' | null
  location: string | null
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  recorded_by: string | null
  recorded_by_name: string | null
  recorded_by_email: string | null
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
  limit?: number
  offset?: number
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
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 50
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchMovements = useCallback(async (filters?: KardexFilters, append = false) => {
    try {
      setLoading(true)
      setError(null)

      // Calculate pagination
      const limit = filters?.limit || ITEMS_PER_PAGE
      const offset = filters?.offset || 0

      // Build query with pagination
      let query = supabase
        .schema('compras')
        .from('inventory_movements')
        .select(`
          id,
          material_id,
          movement_type,
          quantity_change,
          balance_after,
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
        .range(offset, offset + limit - 1)

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

      // Check if there are more results
      setHasMore(count ? (offset + limit) < count : false)

      // Fetch related product data
      const materialIds = [...new Set(data?.map(m => m.material_id) || [])]
      const userIds = [...new Set(data?.map(m => m.recorded_by).filter(Boolean) as string[] || [])]

      // Fetch materials
      const { data: materials } = await supabase
        .from('products')
        .select('id, name, category')
        .in('id', materialIds)

      // Fetch users from profiles table
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      const materialsMap = new Map(materials?.map(m => [m.id, m]) || [])
      const usersMap = new Map(users?.map(u => [u.id, u]) || [])

      // Enrich movements with related data
      // balance_after now comes directly from the database (calculated by triggers)
      const enrichedMovements: KardexMovement[] = (data || []).map(movement => {
        const material = materialsMap.get(movement.material_id)
        const user = usersMap.get(movement.recorded_by || '')

        return {
          ...movement,
          material_name: material?.name || 'Unknown',
          material_category: material?.category || '',
          recorded_by_name: user?.full_name || null,
          recorded_by_email: user?.email || null,
          // balance_after already comes from DB, no calculation needed
        }
      })

      // Apply client-side search filter only if provided
      // Note: For better scalability, this should be moved to server-side using full-text search
      let filteredMovements = enrichedMovements
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        filteredMovements = enrichedMovements.filter(m =>
          m.material_name.toLowerCase().includes(term) ||
          m.notes?.toLowerCase().includes(term) ||
          m.movement_type.toLowerCase().includes(term)
        )
      }

      // Append or replace movements based on mode
      if (append) {
        setMovements(prev => [...prev, ...filteredMovements])
      } else {
        setMovements(filteredMovements)
      }

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

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    const newPage = currentPage + 1
    setCurrentPage(newPage)
    fetchMovements({
      offset: (newPage - 1) * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
    }, true).finally(() => setIsLoadingMore(false))
  }, [currentPage, ITEMS_PER_PAGE, hasMore, isLoadingMore, fetchMovements])

  const resetPagination = useCallback(() => {
    setCurrentPage(1)
    setHasMore(true)
  }, [])

  return {
    movements,
    summary,
    loading,
    error,
    hasMore,
    currentPage,
    totalPages: Math.ceil(summary.totalMovements / ITEMS_PER_PAGE),
    itemsPerPage: ITEMS_PER_PAGE,
    refetch: fetchMovements,
    loadMore,
    resetPagination,
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
