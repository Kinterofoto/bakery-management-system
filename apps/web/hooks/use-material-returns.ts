"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

type MaterialReturn = any
type ReturnItem = any
type WorkCenter = any

type MaterialReturnWithDetails = MaterialReturn & {
  items?: ReturnItem[]
  work_center?: WorkCenter
}

export function useMaterialReturns() {
  const { user } = useAuth()
  const [returns, setReturns] = useState<MaterialReturnWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all returns with items
  const fetchReturns = async () => {
    try {
      setLoading(true)

      // Fetch return headers
      const { data: returnData, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('material_returns')
        .select('*')
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      // Fetch all items for these returns
      const returnIds = returnData?.map(r => r.id) || []
      const { data: itemsData, error: itemsError } = await (supabase as any)
        .schema('compras')
        .from('return_items')
        .select('*')
        .in('return_id', returnIds)

      if (itemsError) throw itemsError

      // Fetch work centers
      const workCenterIds = returnData?.map(r => r.work_center_id) || []
      const { data: workCentersData } = await (supabase as any)
        .schema('produccion')
        .from('work_centers')
        .select('id, code, name, is_active')
        .in('id', workCenterIds)

      const workCenterMap = new Map((workCentersData || []).map(wc => [wc.id, wc]))

      // Fetch product names for all materials
      const materialIds = itemsData?.map(item => item.material_id) || []
      const { data: materialsData } = await supabase
        .from('products')
        .select('id, name, unit')
        .in('id', materialIds)

      const materialMap = new Map((materialsData || []).map(m => [m.id, m]))

      // Combine returns with their items and material names
      const returnsWithItems = returnData?.map(ret => ({
        ...ret,
        work_center: workCenterMap.get(ret.work_center_id),
        items: (itemsData?.filter(item => item.return_id === ret.id) || []).map(item => ({
          ...item,
          material_name: materialMap.get(item.material_id)?.name || 'Desconocido',
          unit_of_measure: item.unit_of_measure || materialMap.get(item.material_id)?.unit
        }))
      })) || []

      setReturns(returnsWithItems as MaterialReturnWithDetails[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching returns')
    } finally {
      setLoading(false)
    }
  }

  // Create return with multiple items
  const createReturn = async (workCenterId: string, items: Array<any>, reason?: string, notes?: string) => {
    try {
      setError(null)

      // Create return header
      const { data: newReturn, error: insertError } = await (supabase as any)
        .schema('compras')
        .from('material_returns')
        .insert({
          work_center_id: workCenterId,
          status: 'pending_receipt',
          requested_by: user?.id,
          reason: reason || null,
          notes: notes || null
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Create return items if provided
      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          return_id: newReturn.id,
          material_id: item.material_id,
          quantity_returned: item.quantity_returned,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null,
          unit_of_measure: item.unit_of_measure,
          notes: item.notes || null
        }))

        const { error: itemsError } = await (supabase as any)
          .schema('compras')
          .from('return_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      await fetchReturns()
      return newReturn
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating return'
      setError(message)
      throw err
    }
  }

  // Accept return in compras module
  const acceptReturn = async (returnId: string) => {
    try {
      setError(null)

      // Update return status to received
      const { error: updateError } = await (supabase as any)
        .schema('compras')
        .from('material_returns')
        .update({
          status: 'received',
          accepted_by: user?.id,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', returnId)

      if (updateError) throw updateError

      await fetchReturns()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error accepting return'
      setError(message)
      throw err
    }
  }

  // Get pending returns for compras module (not yet accepted)
  const getPendingReturns = () => {
    return returns.filter(r => r.status === 'pending_receipt')
  }

  // Get pending returns for a specific work center
  const getPendingReturnsByWorkCenter = (workCenterId: string) => {
    return returns.filter(r =>
      r.work_center_id === workCenterId && r.status === 'pending_receipt'
    )
  }

  // Get returns by work center
  const getReturnsByWorkCenter = (workCenterId: string) => {
    return returns.filter(r => r.work_center_id === workCenterId)
  }

  // Get returns by status
  const getReturnsByStatus = (status: string) => {
    return returns.filter(r => r.status === status)
  }

  // Get return by ID with full details
  const getReturnById = (returnId: string) => {
    return returns.find(r => r.id === returnId)
  }

  useEffect(() => {
    fetchReturns()
  }, [])

  return {
    returns,
    loading,
    error,
    fetchReturns,
    createReturn,
    acceptReturn,
    getPendingReturns,
    getPendingReturnsByWorkCenter,
    getReturnsByWorkCenter,
    getReturnsByStatus,
    getReturnById
  }
}
