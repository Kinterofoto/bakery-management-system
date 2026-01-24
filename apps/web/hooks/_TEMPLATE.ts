/**
 * TEMPLATE ESTÁNDAR PARA HOOKS DE DATOS
 * 
 * Usar este template para TODOS los hooks nuevos.
 * Mantener consistencia en:
 * - Naming (use[Entity])
 * - Error handling (try/catch + toast)
 * - Loading states (setLoading)
 * - Optimistic updates (cuando sea posible)
 * - useCallback para todas las funciones
 */

"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

// Reemplazar [Entity] con tu entidad (ej: Order, Client, Product)
type Entity = Database['public']['Tables']['table_name']['Row']
type EntityInsert = Database['public']['Tables']['table_name']['Insert']
type EntityUpdate = Database['public']['Tables']['table_name']['Update']

export function useEntity() {
  // 1. Estado
  const [data, setData] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 2. Fetch (con useCallback)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: result, error: fetchError } = await supabase
        .from('table_name')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setData(result || [])
    } catch (err) {
      const error = err as Error
      setError(error)
      console.error('Error fetching data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  // 3. Create (con optimistic update)
  const createEntity = useCallback(async (entityData: EntityInsert) => {
    // Optimistic: Crear ID temporal
    const optimisticEntity = {
      ...entityData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    } as Entity

    // Update UI inmediatamente
    setData(prev => [optimisticEntity, ...prev])

    try {
      const { data: result, error: createError } = await supabase
        .from('table_name')
        .insert(entityData)
        .select()
        .single()

      if (createError) throw createError

      // Reemplazar optimistic con real
      setData(prev => prev.map(item => 
        item.id === optimisticEntity.id ? result : item
      ))

      toast.success('Creado exitosamente')
      return result
    } catch (err) {
      const error = err as Error
      console.error('Error creating:', error)
      
      // Revert optimistic update
      setData(prev => prev.filter(item => item.id !== optimisticEntity.id))
      
      toast.error('Error al crear')
      throw error
    }
  }, [])

  // 4. Update (con optimistic update)
  const updateEntity = useCallback(async (id: string, updates: EntityUpdate) => {
    // Backup del estado anterior
    const previousData = data

    // Optimistic update
    setData(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ))

    try {
      const { error: updateError } = await supabase
        .from('table_name')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError

      toast.success('Actualizado exitosamente')
    } catch (err) {
      const error = err as Error
      console.error('Error updating:', error)
      
      // Revert
      setData(previousData)
      
      toast.error('Error al actualizar')
      throw error
    }
  }, [data])

  // 5. Delete (con optimistic update)
  const deleteEntity = useCallback(async (id: string) => {
    // Backup
    const previousData = data
    const deletedItem = data.find(item => item.id === id)

    // Optimistic delete
    setData(prev => prev.filter(item => item.id !== id))

    try {
      const { error: deleteError } = await supabase
        .from('table_name')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      toast.success('Eliminado exitosamente')
    } catch (err) {
      const error = err as Error
      console.error('Error deleting:', error)
      
      // Revert
      setData(previousData)
      
      toast.error('Error al eliminar')
      throw error
    }
  }, [data])

  // 6. Effect inicial
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 7. API pública del hook
  return {
    // Estado
    data,
    loading,
    error,
    
    // Operaciones
    createEntity,
    updateEntity,
    deleteEntity,
    
    // Utilidades
    refetch: fetchData,
  }
}
