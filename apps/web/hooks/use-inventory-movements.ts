"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface InventoryMovement {
  id: string
  material_id: string
  movement_type: 'reception' | 'consumption' | 'adjustment' | 'return' | 'waste' | 'transfer'
  quantity_change: number
  unit_of_measure: string | null
  reference_id: string | null
  reference_type: string | null
  location: string | null
  notes: string | null
  recorded_by: string | null
  movement_date: string
  created_at: string
  // Joined data
  material?: {
    id: string
    name: string
    category: string
  }
  recorded_by_user?: {
    id: string
    name: string
  }
}

export interface MovementTypeFilter {
  label: string
  value: 'all' | 'reception' | 'consumption' | 'adjustment' | 'return' | 'waste' | 'transfer'
}

export const MOVEMENT_TYPE_FILTERS: MovementTypeFilter[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Recepciones', value: 'reception' },
  { label: 'Consumos', value: 'consumption' },
  { label: 'Ajustes', value: 'adjustment' },
  { label: 'Devoluciones', value: 'return' },
  { label: 'Desperdicios', value: 'waste' },
  { label: 'Traslados', value: 'transfer' },
]

export function useInventoryMovements(materialId?: string) {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchMovements()
  }, [materialId])

  const fetchMovements = async (typeFilter?: string) => {
    try {
      setLoading(true)

      // Manual data fetching due to cross-schema foreign key issues
      // Step 1: Fetch movements without joins
      let query = (supabase as any)
        .schema('compras')
        .from("inventory_movements")
        .select("*")
        .order("movement_date", { ascending: false })

      // Filter by material if provided
      if (materialId) {
        query = query.eq('material_id', materialId)
      }

      // Filter by movement type if provided
      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('movement_type', typeFilter)
      }

      const { data: movementsData, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Step 2: Fetch related data separately
      const [productsData, usersData] = await Promise.all([
        supabase.from("products").select("id, name, category"),
        supabase.from("users").select("id, name")
      ])

      // Step 3: Manually combine the data
      const enrichedMovements: InventoryMovement[] = (movementsData || []).map((movement: any) => ({
        ...movement,
        material: productsData.data?.find((p: any) => p.id === movement.material_id) || undefined,
        recorded_by_user: usersData.data?.find((u: any) => u.id === movement.recorded_by) || undefined
      }))

      setMovements(enrichedMovements)
      setError(null)
    } catch (err) {
      console.error("Error fetching inventory movements:", err)
      setError(err as Error)
      toast.error("Error al cargar movimientos de inventario")
    } finally {
      setLoading(false)
    }
  }

  const getMovementsByMaterial = async () => {
    try {
      // Manual data fetching due to cross-schema foreign key issues
      // Step 1: Fetch movements with distinct material_ids
      const { data: movementsData, error: fetchError } = await (supabase as any)
        .schema('compras')
        .from("inventory_movements")
        .select("material_id")

      if (fetchError) throw fetchError

      // Step 2: Get unique material IDs
      const uniqueMaterialIds = Array.from(new Set(movementsData?.map((m: any) => m.material_id) || []))

      // Step 3: Fetch products for these material IDs, filtered by 'mp' category
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, category")
        .in("id", uniqueMaterialIds)
        .eq("category", "mp")
        .order("name", { ascending: true })

      return productsData || []
    } catch (err) {
      console.error("Error fetching materials with movements:", err)
      toast.error("Error al cargar materiales")
      return []
    }
  }

  const getMovementTypeLabel = (type: string): string => {
    const filter = MOVEMENT_TYPE_FILTERS.find(f => f.value === type)
    return filter?.label || type
  }

  const getMovementTypeColor = (type: string): string => {
    switch (type) {
      case 'reception':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'consumption':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'adjustment':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'return':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'waste':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'transfer':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return {
    movements,
    loading,
    error,
    refetch: fetchMovements,
    getMovementsByMaterial,
    getMovementTypeLabel,
    getMovementTypeColor,
  }
}
