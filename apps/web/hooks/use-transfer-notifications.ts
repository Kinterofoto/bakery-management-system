"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function useTransferNotifications() {
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0)
  const [pendingReturnsCount, setPendingReturnsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch pending transfers count
  const fetchPendingTransfersCount = async (workCenterId?: string) => {
    try {
      let query = (supabase as any)
        .schema('compras')
        .from('material_transfers')
        .select('id', { count: 'exact' })
        .eq('status', 'pending_receipt')

      if (workCenterId) {
        query = query.eq('work_center_id', workCenterId)
      }

      const { count, error: queryError } = await query

      if (queryError) throw queryError

      setPendingTransfersCount(count || 0)
      setError(null)
      return count || 0
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching transfers count'
      setError(message)
      return 0
    }
  }

  // Fetch pending returns count (in compras module)
  const fetchPendingReturnsCount = async () => {
    try {
      const { count, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('material_returns')
        .select('id', { count: 'exact' })
        .eq('status', 'pending_receipt')

      if (queryError) throw queryError

      setPendingReturnsCount(count || 0)
      setError(null)
      return count || 0
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching returns count'
      setError(message)
      return 0
    }
  }

  // Get pending transfers by work center
  const getPendingTransfersCountByWorkCenter = async (workCenterId: string) => {
    return fetchPendingTransfersCount(workCenterId)
  }

  // Refresh all counts
  const refreshCounts = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchPendingTransfersCount(),
        fetchPendingReturnsCount()
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshCounts()

    // Optional: Set up real-time subscription for notifications
    // This is a simplified version without real-time updates
    // For real-time updates, you would subscribe to the tables
    const interval = setInterval(refreshCounts, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return {
    pendingTransfersCount,
    pendingReturnsCount,
    loading,
    error,
    fetchPendingTransfersCount,
    fetchPendingReturnsCount,
    getPendingTransfersCountByWorkCenter,
    refreshCounts
  }
}
