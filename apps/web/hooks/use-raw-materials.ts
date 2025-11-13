"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type Product = Database['public']['Tables']['products']['Row']
type ProductUpdate = Database['public']['Tables']['products']['Update']

export function useRawMaterials() {
  const [materials, setMaterials] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMaterials = async () => {
    try {
      setLoading(true)

      // Buscar productos con category 'mp' o 'MP'
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('category.eq.mp,category.eq.MP')
        .order('name', { ascending: true })

      if (error) throw error

      setMaterials(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching raw materials:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getMaterialById = async (id: string): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('Error fetching material:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener material')
      return null
    }
  }

  const updateMaterial = async (id: string, updates: ProductUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchMaterials() // Refresh the list
      return true
    } catch (err) {
      console.error('Error updating material:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar material')
      return false
    }
  }

  const toggleMaterialStatus = async (id: string, currentStatus: boolean | null): Promise<boolean> => {
    return updateMaterial(id, { is_active: !currentStatus })
  }

  const getActiveMaterials = (): Product[] => {
    return materials.filter(m => m.is_active !== false) // incluye null como activo
  }

  const getMaterialStats = () => {
    return {
      totalMaterials: materials.length,
      activeMaterials: materials.filter(m => m.is_active !== false).length,
      inactiveMaterials: materials.filter(m => m.is_active === false).length,
    }
  }

  const searchMaterials = (query: string): Product[] => {
    const lowerQuery = query.toLowerCase()
    return materials.filter(material =>
      material.name.toLowerCase().includes(lowerQuery) ||
      material.code?.toLowerCase().includes(lowerQuery) ||
      material.description?.toLowerCase().includes(lowerQuery)
    )
  }

  useEffect(() => {
    fetchMaterials()
  }, [])

  return {
    materials,
    loading,
    error,
    fetchMaterials,
    getMaterialById,
    updateMaterial,
    toggleMaterialStatus,
    getActiveMaterials,
    getMaterialStats,
    searchMaterials,
  }
}
