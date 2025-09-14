"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/database.types"

type ExportHistory = Database["public"]["Tables"]["export_history"]["Row"] & {
  created_by_user?: {
    id: string
    name: string
    email: string
  }
}

type ExportHistoryInsert = Database["public"]["Tables"]["export_history"]["Insert"]
type OrderInvoice = Database["public"]["Tables"]["order_invoices"]["Row"]

interface ExportStatistics {
  total_exports: number
  total_orders: number
  total_amount: number
  avg_orders_per_export: number
  latest_invoice_number: number
}

interface PendingOrder {
  order_id: string
  order_number: string
  client_name: string
  total_value: number
  route_name: string
  expected_delivery_date: string
}

export function useExportHistory() {
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchExportHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("export_history")
        .select(`
          *,
          created_by_user:users!export_history_created_by_fkey (
            id,
            name,
            email
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching export history:", error)
        setError(error.message)
        return
      }

      setExportHistory(data || [])
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createExportRecord = async (exportData: ExportHistoryInsert) => {
    try {
      const { data, error } = await supabase
        .from("export_history")
        .insert(exportData)
        .select(`
          *,
          created_by_user:users!export_history_created_by_fkey (
            id,
            name,
            email
          )
        `)
        .single()

      if (error) {
        throw error
      }

      setExportHistory(prev => [data, ...prev])
      return data
    } catch (error: any) {
      console.error("Error creating export record:", error)
      throw error
    }
  }

  const getExportDetails = async (exportId: string): Promise<OrderInvoice[]> => {
    try {
      const { data, error } = await supabase
        .from("order_invoices")
        .select("*")
        .eq("export_history_id", exportId)
        .order("invoice_number", { ascending: true })

      if (error) {
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error("Error fetching export details:", error)
      throw error
    }
  }

  const getExportStatistics = async (
    startDate?: string, 
    endDate?: string
  ): Promise<ExportStatistics> => {
    try {
      const { data, error } = await supabase
        .rpc("get_export_statistics", {
          start_date: startDate || null,
          end_date: endDate || null
        })

      if (error) {
        throw error
      }

      return data?.[0] || {
        total_exports: 0,
        total_orders: 0,
        total_amount: 0,
        avg_orders_per_export: 0,
        latest_invoice_number: 0
      }
    } catch (error: any) {
      console.error("Error fetching export statistics:", error)
      throw error
    }
  }

  const getPendingOrdersForRoutes = async (routeIds: string[]): Promise<PendingOrder[]> => {
    try {
      const { data, error } = await supabase
        .rpc("get_pending_orders_for_routes", {
          route_ids: routeIds
        })

      if (error) {
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error("Error fetching pending orders:", error)
      throw error
    }
  }

  const markOrdersAsInvoiced = async (
    orderIds: string[],
    exportHistoryId: string,
    invoiceStart: number
  ): Promise<number> => {
    try {
      const { data, error } = await supabase
        .rpc("mark_orders_as_invoiced", {
          order_ids: orderIds,
          export_history_id: exportHistoryId,
          invoice_start: invoiceStart
        })

      if (error) {
        throw error
      }

      return data || 0
    } catch (error: any) {
      console.error("Error marking orders as invoiced:", error)
      throw error
    }
  }

  const downloadExportFile = async (exportId: string, fileName: string) => {
    try {
      const { data, error } = await supabase
        .from("export_history")
        .select("file_data")
        .eq("id", exportId)
        .single()

      if (error) {
        throw error
      }

      if (!data.file_data) {
        throw new Error("No hay archivo disponible para descargar")
      }

      // Convert binary data back to blob and download
      const uint8Array = new Uint8Array(data.file_data)
      const blob = new Blob([uint8Array], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)

      toast({
        title: "Descarga iniciada",
        description: `Se está descargando ${fileName}`,
      })
    } catch (error: any) {
      console.error("Error downloading file:", error)
      toast({
        title: "Error de descarga",
        description: error.message || "No se pudo descargar el archivo",
        variant: "destructive",
      })
      throw error
    }
  }

  const getMonthlyStats = async (year?: number) => {
    try {
      const targetYear = year || new Date().getFullYear()
      const startDate = `${targetYear}-01-01`
      const endDate = `${targetYear}-12-31`

      const { data, error } = await supabase
        .from("export_history")
        .select("export_date, total_orders, total_amount")
        .gte("export_date", startDate)
        .lte("export_date", endDate)
        .order("export_date", { ascending: true })

      if (error) {
        throw error
      }

      // Group by month
      const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(targetYear, i, 1).toLocaleDateString("es-ES", { month: "long" }),
        exports: 0,
        orders: 0,
        amount: 0
      }))

      data.forEach(record => {
        const month = new Date(record.export_date).getMonth()
        monthlyStats[month].exports += 1
        monthlyStats[month].orders += record.total_orders
        monthlyStats[month].amount += record.total_amount
      })

      return monthlyStats
    } catch (error: any) {
      console.error("Error fetching monthly stats:", error)
      throw error
    }
  }

  useEffect(() => {
    fetchExportHistory()
  }, [])

  return {
    exportHistory,
    loading,
    error,
    createExportRecord,
    getExportDetails,
    getExportStatistics,
    getPendingOrdersForRoutes,
    markOrdersAsInvoiced,
    downloadExportFile,
    getMonthlyStats,
    refetch: fetchExportHistory
  }
}