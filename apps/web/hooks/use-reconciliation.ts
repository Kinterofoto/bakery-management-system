"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { toast } from 'sonner'

type InventoryReconciliation = Database['public']['Tables']['inventory_reconciliations']['Row']
type InventoryFinalResult = Database['public']['Tables']['inventory_final_results']['Row']

export function useReconciliation(inventoryId?: string) {
  const [reconciliations, setReconciliations] = useState<InventoryReconciliation[]>([])
  const [finalResults, setFinalResults] = useState<InventoryFinalResult[]>([])
  const [loading, setLoading] = useState(true)
  const [isReconciled, setIsReconciled] = useState(false)

  const fetchReconciliationStatus = useCallback(async () => {
    if (!inventoryId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Verificar si ya existe conciliación
      const { data: reconciliationData, error: reconciliationError } = await supabase
        .from('inventory_reconciliations')
        .select('*')
        .eq('inventory_id', inventoryId)

      if (reconciliationError) throw reconciliationError

      // Verificar si ya existen resultados finales
      const { data: finalResultsData, error: finalResultsError } = await supabase
        .from('inventory_final_results')
        .select('*')
        .eq('inventory_id', inventoryId)

      if (finalResultsError) throw finalResultsError

      setReconciliations(reconciliationData || [])
      setFinalResults(finalResultsData || [])
      setIsReconciled((reconciliationData?.length || 0) > 0 && (finalResultsData?.length || 0) > 0)
      
    } catch (err) {
      console.error('Error checking reconciliation status:', err)
    } finally {
      setLoading(false)
    }
  }, [inventoryId])

  const saveReconciliation = useCallback(async (reconciliationItems: any[]) => {
    if (!inventoryId) return false

    try {
      // Primero, limpiar cualquier conciliación existente (por si algo salió mal antes)
      await supabase
        .from('inventory_reconciliations')
        .delete()
        .eq('inventory_id', inventoryId)

      await supabase
        .from('inventory_final_results')
        .delete()
        .eq('inventory_id', inventoryId)

      // Guardar reconciliaciones
      const reconciliationData = reconciliationItems.map(item => ({
        inventory_id: inventoryId,
        product_id: item.product.id,
        count1_quantity: item.count1?.quantity_units || null,
        count1_grams_per_unit: item.count1?.grams_per_unit || null,
        count1_total_grams: item.count1?.total_grams || null,
        count2_quantity: item.count2?.quantity_units || null,
        count2_grams_per_unit: item.count2?.grams_per_unit || null,
        count2_total_grams: item.count2?.total_grams || null,
        final_quantity: item.finalQuantity,
        final_grams_per_unit: item.finalGramsPerUnit,
        // final_total_grams se calcula automáticamente como columna generada
        variance_percentage: item.variancePercent,
        resolution_method: item.resolution,
        notes: item.notes || null
      }))

      console.log('Enviando reconciliationData:', reconciliationData)
      
      const { error: reconciliationError } = await supabase
        .from('inventory_reconciliations')
        .insert(reconciliationData)

      if (reconciliationError) {
        console.error('Error en reconciliations:', reconciliationError)
        throw reconciliationError
      }

      // Guardar resultados finales
      const finalResultsData = reconciliationItems.map(item => {
        const count1Total = item.count1?.total_grams || 0
        const count2Total = item.count2?.total_grams || 0
        const finalTotal = item.finalQuantity * item.finalGramsPerUnit
        
        return {
          inventory_id: inventoryId,
          product_id: item.product.id,
          final_quantity: item.finalQuantity,
          final_grams_per_unit: item.finalGramsPerUnit,
          variance_from_count1_percentage: count1Total > 0 ? 
            Math.abs((finalTotal - count1Total) / count1Total * 100) : 0,
          variance_from_count2_percentage: count2Total > 0 ? 
            Math.abs((finalTotal - count2Total) / count2Total * 100) : 0,
          resolution_method: item.resolution,
          notes: item.notes
        }
      })

      console.log('Enviando finalResultsData:', finalResultsData)
      
      const { error: finalResultsError } = await supabase
        .from('inventory_final_results')
        .insert(finalResultsData)

      if (finalResultsError) {
        console.error('Error en final_results:', finalResultsError)
        throw finalResultsError
      }

      // Actualizar estado local
      await fetchReconciliationStatus()
      
      return true
      
    } catch (error) {
      console.error('Error saving reconciliation:', error)
      toast.error('Error al guardar la conciliación')
      return false
    }
  }, [inventoryId, fetchReconciliationStatus])

  useEffect(() => {
    fetchReconciliationStatus()
  }, [fetchReconciliationStatus])

  return {
    reconciliations,
    finalResults,
    loading,
    isReconciled,
    saveReconciliation,
    refetch: fetchReconciliationStatus
  }
}