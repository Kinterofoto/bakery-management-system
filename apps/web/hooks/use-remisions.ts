"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/database.types"

// FastAPI URL for direct client-side calls
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

type Remision = Database["public"]["Tables"]["remisions"]["Row"] & {
  order?: {
    order_number: string
    client_id: string
    expected_delivery_date: string
    total_value: number
  }
  client?: {
    id: string
    name: string
    razon_social: string | null
    nit: string | null
    phone: string | null
    email: string | null
    address: string | null
  }
  remision_items?: RemisionItem[]
}

type RemisionItem = Database["public"]["Tables"]["remision_items"]["Row"] & {
  product?: {
    name: string
    unit: string
  }
}

type RemisionInsert = Database["public"]["Tables"]["remisions"]["Insert"]
type RemisionItemInsert = Database["public"]["Tables"]["remision_items"]["Insert"]

interface CreateRemisionData {
  order_id: string
  client_data: Record<string, any>
  total_amount: number
  items: RemisionItemInsert[]
  notes?: string
  created_by: string
}

interface RemisionStatistics {
  total_remisions: number
  pending_remisions: number
  invoiced_remisions: number
  total_remision_amount: number
  avg_remision_amount: number
}

interface NonInvoicedOrder {
  order_id: string
  order_number: string
  client_name: string
  remision_number: string
  remision_date: string
  total_value: number
  route_name: string | null
  expected_delivery_date: string
  delivered_quantity_items: number
}

export function useRemisions() {
  const [remisions, setRemisions] = useState<Remision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchRemisions = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true)
      setError(null)

      // Build query params for FastAPI
      const searchParams = new URLSearchParams()
      searchParams.set("limit", "500")
      if (startDate) searchParams.set("date_from", startDate)
      if (endDate) searchParams.set("date_to", endDate)

      const url = `${API_URL}/api/billing/remisions/?${searchParams.toString()}`
      const response = await fetch(url, { cache: "no-store" })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }))
        throw new Error(errorData.detail || `Error: ${response.status}`)
      }

      const data = await response.json()

      // Map API response to expected Remision type format
      const mappedRemisions = (data.remisions || []).map((r: any) => ({
        id: r.id,
        remision_number: r.remision_number,
        order_id: r.order_id,
        total_amount: r.total_amount,
        notes: r.notes,
        created_at: r.created_at,
        created_by: r.created_by,
        client_data: {
          name: r.client_name,
          nit: r.client_nit
        },
        order: {
          order_number: r.order_number,
          expected_delivery_date: r.expected_delivery_date,
          purchase_order_number: r.purchase_order_number,
          branch: { name: r.branch_name }
        },
        client: {
          name: r.client_name,
          nit: r.client_nit
        }
      }))

      setRemisions(mappedRemisions)
    } catch (err: any) {
      console.error("Error fetching remisions:", err)
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createRemision = async (data: CreateRemisionData, pdfData?: Uint8Array): Promise<Remision | null> => {
    try {
      // Get next remision number
      const { data: remisionNumberData, error: numberError } = await supabase
        .rpc("get_next_remision_number")

      if (numberError) {
        throw numberError
      }

      const remisionNumber = remisionNumberData as string

      // Convert PDF data to base64 for storage
      let pdfDataForStorage = null
      if (pdfData) {
        console.log("Converting PDF to base64 for storage:", {
          pdfDataType: typeof pdfData,
          pdfDataLength: pdfData.length,
          isUint8Array: pdfData instanceof Uint8Array,
          firstBytes: Array.from(pdfData.slice(0, 10))
        })

        // Convert Uint8Array to base64 properly for large arrays
        let binaryString = ''
        for (let i = 0; i < pdfData.length; i++) {
          binaryString += String.fromCharCode(pdfData[i])
        }
        pdfDataForStorage = btoa(binaryString)

        console.log("Base64 conversion result:", {
          base64Length: pdfDataForStorage.length,
          base64Preview: pdfDataForStorage.substring(0, 50) + "..."
        })
      }

      // Create remision with PDF data if provided
      const { data: remisionData, error: remisionError } = await supabase
        .from("remisions")
        .insert({
          order_id: data.order_id,
          remision_number: remisionNumber,
          client_data: data.client_data,
          total_amount: data.total_amount,
          notes: data.notes,
          created_by: data.created_by,
          pdf_data: pdfDataForStorage
        })
        .select()
        .single()

      if (remisionError) {
        throw remisionError
      }

      // Create remision items
      const itemsWithRemisionId = data.items.map(item => ({
        ...item,
        remision_id: remisionData.id
      }))

      const { error: itemsError } = await supabase
        .from("remision_items")
        .insert(itemsWithRemisionId)

      if (itemsError) {
        // Rollback remision creation
        await supabase.from("remisions").delete().eq("id", remisionData.id)
        throw itemsError
      }

      // Mark order as having a remision (but not yet invoiced from remision)
      // This indicates the order has a remision but hasn't been invoiced yet
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          is_invoiced_from_remision: false  // False = has remision but not invoiced yet
        })
        .eq("id", data.order_id)

      if (orderError) {
        console.error("Error updating order remision flag:", orderError)
        // Don't rollback, just log error as remision was created successfully
      }

      // Refresh remisions list
      fetchRemisions()

      toast({
        title: "Remisión creada",
        description: `Remisión ${remisionNumber} creada exitosamente`,
      })

      return remisionData
    } catch (error: any) {
      console.error("Error creating remision:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la remisión",
        variant: "destructive",
      })
      throw error
    }
  }

  const getRemisionById = async (remisionId: string): Promise<Remision | null> => {
    try {
      // Fetch from FastAPI - single efficient query with JOINs
      const response = await fetch(`${API_URL}/api/billing/remisions/${remisionId}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }))
        throw new Error(errorData.detail || `Error: ${response.status}`)
      }

      const r = await response.json()

      // Map API response to expected Remision type format
      return {
        id: r.id,
        remision_number: r.remision_number,
        order_id: r.order_id,
        total_amount: r.total_amount,
        notes: r.notes,
        created_at: r.created_at,
        created_by: r.created_by,
        client_data: {
          name: r.client_name,
          razon_social: r.client_razon_social,
          nit: r.client_nit,
          phone: r.client_phone,
          email: r.client_email,
          address: r.client_address
        },
        order: {
          order_number: r.order_number,
          expected_delivery_date: r.expected_delivery_date,
          purchase_order_number: r.purchase_order_number,
          branch: { name: r.branch_name }
        },
        client: {
          id: '',
          name: r.client_name,
          razon_social: r.client_razon_social,
          nit: r.client_nit,
          phone: r.client_phone,
          email: r.client_email,
          address: r.client_address
        },
        remision_items: (r.items || []).map((item: any) => ({
          ...item,
          product: {
            name: item.product_name,
            unit: item.product_unit
          }
        }))
      } as Remision
    } catch (error: any) {
      console.error("Error fetching remision by ID:", error)
      throw error
    }
  }

  const downloadRemisionPDF = async (remisionId: string, fileName: string) => {
    try {
      console.log("=== Starting PDF download ===", {
        remisionId,
        fileName,
        timestamp: new Date().toISOString()
      })

      // Fetch remision detail from FastAPI - single efficient query with JOINs
      const response = await fetch(`${API_URL}/api/billing/remisions/${remisionId}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }))
        throw new Error(errorData.detail || `Error: ${response.status}`)
      }

      const remisionData = await response.json()

      // Generate PDF using react-pdf renderer
      const { generateRemisionPDFBlob } = await import('@/lib/pdf-remision-react')

      const clientInfo = {
        name: remisionData.client_name || 'Cliente no disponible',
        razon_social: remisionData.client_razon_social,
        nit: remisionData.client_nit,
        phone: remisionData.client_phone,
        email: remisionData.client_email,
        address: remisionData.client_address
      }

      // Map items from API response format
      const itemsForPDF = (remisionData.items || []).map((item: any) => ({
        ...item,
        product_name: item.product_name,
        product_unit: item.product_unit,
        units_per_package: item.units_per_package
      }))

      const pdfData = {
        remision_number: remisionData.remision_number,
        purchase_order_number: remisionData.purchase_order_number,
        branch_name: remisionData.branch_name,
        client: clientInfo,
        order: {
          order_number: remisionData.order_number || 'N/A',
          expected_delivery_date: remisionData.expected_delivery_date || new Date().toISOString()
        },
        items: itemsForPDF,
        total_amount: remisionData.total_amount,
        notes: remisionData.notes,
        created_at: remisionData.created_at || new Date().toISOString()
      }

      const blob = await generateRemisionPDFBlob(pdfData)

      console.log("PDF generation:", {
        blobSize: blob.size,
        blobType: blob.type
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)

      console.log("=== PDF download completed successfully ===")

      toast({
        title: "Descarga iniciada",
        description: `Se está descargando ${fileName}`,
      })
    } catch (error: any) {
      console.error("=== PDF download error ===", error)
      toast({
        title: "Error de descarga",
        description: error.message || "No se pudo descargar el PDF",
        variant: "destructive",
      })
      throw error
    }
  }

  const getRemisionStatistics = async (startDate?: string, endDate?: string): Promise<RemisionStatistics> => {
    try {
      const { data, error } = await supabase
        .rpc("get_remision_statistics", {
          start_date: startDate || null,
          end_date: endDate || null
        })

      if (error) {
        throw error
      }

      return data?.[0] || {
        total_remisions: 0,
        pending_remisions: 0,
        invoiced_remisions: 0,
        total_remision_amount: 0,
        avg_remision_amount: 0
      }
    } catch (error: any) {
      console.error("Error fetching remision statistics:", error)
      throw error
    }
  }

  const getNonInvoicedRemisionOrders = async (
    startDate?: string,
    endDate?: string,
    clientId?: string
  ): Promise<NonInvoicedOrder[]> => {
    try {
      const { data, error } = await supabase
        .rpc("get_non_invoiced_remision_orders", {
          start_date: startDate || null,
          end_date: endDate || null,
          client_id_filter: clientId || null
        })

      if (error) {
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error("Error fetching non-invoiced remision orders:", error)
      throw error
    }
  }

  const getOrdersForRemision = async (routeIds: string[]): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .rpc("get_orders_for_remision", {
          route_ids: routeIds
        })

      if (error) {
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error("Error fetching orders for remision:", error)
      throw error
    }
  }

  const getOrdersForDirectBilling = async (routeIds: string[]): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .rpc("get_orders_for_direct_billing", {
          route_ids: routeIds
        })

      if (error) {
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error("Error fetching orders for direct billing:", error)
      throw error
    }
  }

  const updateRemision = async (remisionId: string, updates: Partial<RemisionInsert>) => {
    try {
      const { data, error } = await supabase
        .from("remisions")
        .update(updates)
        .eq("id", remisionId)
        .select()
        .single()

      if (error) {
        throw error
      }

      // Refresh remisions list
      fetchRemisions()

      toast({
        title: "Remisión actualizada",
        description: "La remisión se actualizó exitosamente",
      })

      return data
    } catch (error: any) {
      console.error("Error updating remision:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la remisión",
        variant: "destructive",
      })
      throw error
    }
  }

  useEffect(() => {
    fetchRemisions()
  }, [])

  return {
    remisions,
    loading,
    error,
    createRemision,
    getRemisionById,
    downloadRemisionPDF,
    getRemisionStatistics,
    getNonInvoicedRemisionOrders,
    getOrdersForRemision,
    getOrdersForDirectBilling,
    updateRemision,
    refetch: fetchRemisions
  }
}