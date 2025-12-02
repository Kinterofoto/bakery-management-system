"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type PendingTransfer = {
  movement_id: string
  movement_number: string
  product_id: string
  product_name: string
  quantity: number
  unit_of_measure: string
  location_from_id: string
  location_from_name: string
  requested_by: string
  requested_at: string
  notes: string | null
}

/**
 * Hook to get pending transfers for a specific work center location
 * Shows a count badge and list of materials awaiting confirmation
 */
export function usePendingTransfers(workCenterId: string | null) {
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingTransfers = async () => {
    if (!workCenterId) {
      setPendingTransfers([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔔 Fetching pending transfers for work center:', workCenterId)

      // First, get the location_id for this work center
      const { data: workCenterData, error: wcError } = await supabase
        .schema('produccion')
        .from('work_centers')
        .select('location_id, code, name')
        .eq('id', workCenterId)
        .single()

      if (wcError || !workCenterData) {
        console.error('❌ Error fetching work center:', wcError)
        throw new Error('No se pudo obtener el centro de trabajo')
      }

      if (!workCenterData.location_id) {
        console.log('⚠️ Work center has no location_id, no pending transfers')
        setPendingTransfers([])
        return
      }

      console.log('✅ Work center location:', workCenterData.location_id, workCenterData.code)

      // Get pending transfers for this location
      const { data, error: queryError } = await supabase
        .schema('inventario')
        .rpc('get_pending_transfers_for_location', {
          p_location_id: workCenterData.location_id
        })

      if (queryError) {
        console.error('❌ Error fetching pending transfers:', queryError)
        throw queryError
      }

      console.log('🔔 Pending transfers:', data?.length || 0)

      setPendingTransfers(data || [])
    } catch (err) {
      console.error('❌ Error in usePendingTransfers:', err)
      setError(err instanceof Error ? err.message : 'Error fetching pending transfers')
      setPendingTransfers([])
    } finally {
      setLoading(false)
    }
  }

  // Confirm a pending transfer
  const confirmTransfer = async (movementId: string) => {
    try {
      setError(null)

      console.log('✅ Confirming transfer:', movementId)

      const { data, error: confirmError } = await supabase
        .schema('inventario')
        .rpc('confirm_pending_transfer', {
          p_movement_in_id: movementId,
          p_confirmed_by: null // Will use auth.uid() in the function
        })

      if (confirmError) {
        console.error('❌ Error confirming transfer:', confirmError)
        throw confirmError
      }

      console.log('✅ Transfer confirmed:', data)

      // Refresh pending transfers
      await fetchPendingTransfers()

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error confirming transfer'
      console.error('❌ Confirm error:', err)
      setError(message)
      throw err
    }
  }

  // Auto-fetch when work center changes
  useEffect(() => {
    fetchPendingTransfers()
  }, [workCenterId])

  // Set up real-time subscription for new pending transfers
  useEffect(() => {
    if (!workCenterId) return

    console.log('🔔 Setting up real-time subscription for pending transfers')

    // Subscribe to inventory_movements changes
    const channel = supabase
      .channel('pending-transfers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'inventario',
          table: 'inventory_movements',
          filter: `status=eq.pending`
        },
        (payload) => {
          console.log('🔔 Pending transfer change detected:', payload)
          fetchPendingTransfers()
        }
      )
      .subscribe()

    return () => {
      console.log('🔕 Unsubscribing from pending transfers')
      supabase.removeChannel(channel)
    }
  }, [workCenterId])

  return {
    pendingTransfers,
    pendingCount: pendingTransfers.length,
    loading,
    error,
    fetchPendingTransfers,
    confirmTransfer
  }
}
