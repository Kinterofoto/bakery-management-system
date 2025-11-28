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

      let query = supabase
        .from("inventory_movements")
        .select(`
          *,
          material:products!inventory_movements_material_id_fkey (
            id,
            name,
            category
          ),
          recorded_by_user:users!inventory_movements_recorded_by_fkey (
            id,
            name
          )
        `)
        .order("movement_date", { ascending: false })

      // Filter by material if provided
      if (materialId) {
        query = query.eq('material_id', materialId)
      }

      // Filter by movement type if provided
      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('movement_type', typeFilter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setMovements(data || [])
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
      const { data, error: fetchError } = await supabase
        .from("inventory_movements")
        .select(`
          material_id,
          material:products!inventory_movements_material_id_fkey (
            id,
            name,
            category
          )
        `)
        .eq('material.category', 'mp') // Only raw materials
        .order("material.name", { ascending: true })

      if (fetchError) throw fetchError

      // Group by material and get unique materials
      const materialsMap = new Map()
      data?.forEach((movement: any) => {
        if (movement.material && !materialsMap.has(movement.material_id)) {
          materialsMap.set(movement.material_id, movement.material)
        }
      })

      return Array.from(materialsMap.values())
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
