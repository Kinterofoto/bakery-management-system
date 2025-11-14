"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

type MaterialReception = any
type MaterialReceptionInsert = any
type MaterialReceptionUpdate = any
type PurchaseOrder = any
type Product = any

type MaterialReceptionWithDetails = MaterialReception & {
  purchase_order?: PurchaseOrder
  material?: Product
}

export function useMaterialReception() {
  const { user } = useAuth()
  const [receptions, setReceptions] = useState<MaterialReceptionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all receptions
  const fetchReceptions = async () => {
    try {
      setLoading(true)
      const { data, error: queryError } = await (supabase as any)
        .from('compras.material_receptions')
        .select('*')
        .order('reception_date', { ascending: false })

      if (queryError) throw queryError
      setReceptions((data as MaterialReceptionWithDetails[]) || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching receptions')
    } finally {
      setLoading(false)
    }
  }

  // Create reception
  const createReception = async (data: MaterialReceptionInsert) => {
    try {
      setError(null)
      const { data: newReception, error: insertError } = await (supabase as any)
        .from('compras.material_receptions')
        .insert({
          ...data,
          operator_id: user?.id,
          reception_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (insertError) throw insertError
      
      setReceptions(prev => [newReception as MaterialReceptionWithDetails, ...prev])
      return newReception
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating reception'
      setError(message)
      throw err
    }
  }

  // Update reception
  const updateReception = async (id: string, data: MaterialReceptionUpdate) => {
    try {
      setError(null)
      const { data: updated, error: updateError } = await (supabase as any)
        .from('compras.material_receptions')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      
      setReceptions(prev => 
        prev.map(r => r.id === id ? (updated as MaterialReceptionWithDetails) : r)
      )
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating reception'
      setError(message)
      throw err
    }
  }

  // Delete reception
  const deleteReception = async (id: string) => {
    try {
      setError(null)
      const { error: deleteError } = await (supabase as any)
        .from('compras.material_receptions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      setReceptions(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting reception'
      setError(message)
      throw err
    }
  }

  // Get receptions by material
  const getReceptionsByMaterial = (materialId: string) => {
    return receptions.filter(r => r.material_id === materialId)
  }

  // Get receptions by purchase order
  const getReceptionsByOrder = (orderId: string) => {
    return receptions.filter(r => r.purchase_order_id === orderId)
  }

  // Get receptions by date range
  const getReceptionsByDateRange = (startDate: string, endDate: string) => {
    return receptions.filter(r => {
      const date = r.reception_date
      return date >= startDate && date <= endDate
    })
  }

  // Get today's receptions
  const getTodayReceptions = () => {
    const today = new Date().toISOString().split('T')[0]
    return receptions.filter(r => r.reception_date === today)
  }

  useEffect(() => {
    fetchReceptions()
  }, [])

  return {
    receptions,
    loading,
    error,
    fetchReceptions,
    createReception,
    updateReception,
    deleteReception,
    getReceptionsByMaterial,
    getReceptionsByOrder,
    getReceptionsByDateRange,
    getTodayReceptions
  }
}
