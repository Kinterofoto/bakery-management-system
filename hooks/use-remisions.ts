"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/database.types"

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

      let query = supabase
        .from("remisions")
        .select(`
          *,
          order:orders (
            order_number,
            client_id,
            expected_delivery_date,
            total_value
          ),
          remision_items (
            *,
            product:products (
              name,
              unit
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (startDate) {
        query = query.gte("created_at", startDate)
      }
      if (endDate) {
        query = query.lte("created_at", endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching remisions:", error)
        setError(error.message)
        return
      }

      // Fetch client data for each remision
      const remisionsWithClients = await Promise.all(
        (data || []).map(async (remision) => {
          if (remision.order?.client_id) {
            const { data: clientData } = await supabase
              .from("clients")
              .select("id, name, razon_social, nit, phone, email, address")
              .eq("id", remision.order.client_id)
              .single()

            return {
              ...remision,
              client: clientData
            }
          }
          return remision
        })
      )

      setRemisions(remisionsWithClients)
    } catch (err: any) {
      console.error("Unexpected error:", err)
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
      const { data, error } = await supabase
        .from("remisions")
        .select(`
          *,
          order:orders (
            order_number,
            client_id,
            expected_delivery_date,
            total_value
          ),
          remision_items (
            *,
            product:products (
              name,
              unit
            )
          )
        `)
        .eq("id", remisionId)
        .single()

      if (error) {
        throw error
      }

      // Fetch client data
      if (data.order?.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id, name, razon_social, nit, phone, email, address")
          .eq("id", data.order.client_id)
          .single()

        return {
          ...data,
          client: clientData
        }
      }

      return data
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

      // First try to get existing PDF data
      const { data: remisionData, error } = await supabase
        .from("remisions")
        .select(`
          pdf_data,
          remision_number,
          client_data,
          total_amount,
          notes,
          created_at,
          order:orders (
            order_number,
            expected_delivery_date
          ),
          remision_items (
            product_name,
            quantity_delivered,
            unit_price,
            total_price,
            product_unit
          )
        `)
        .eq("id", remisionId)
        .single()

      console.log("Database query result:", {
        hasError: !!error,
        hasData: !!remisionData,
        errorMessage: error?.message
      })

      if (error) {
        throw error
      }

      let pdfData = remisionData.pdf_data

      console.log("PDF data analysis:", {
        hasPdfData: !!pdfData,
        pdfDataType: typeof pdfData,
        pdfDataLength: pdfData ? pdfData.length : 0,
        isString: typeof pdfData === 'string',
        startsWithHex: typeof pdfData === 'string' && pdfData.startsWith('\\x'),
        pdfDataPreview: pdfData ?
          (typeof pdfData === 'string' ? pdfData.substring(0, 100) + "..." : "Non-string data")
          : null,
        firstCharCode: typeof pdfData === 'string' && pdfData.length > 0 ? pdfData.charCodeAt(0) : null
      })

      // If no PDF data exists, generate it now
      if (!pdfData) {
        console.log("No PDF data found, generating new PDF...")

        const { generateRemisionPDF } = await import("@/lib/pdf-generator-simple")

        const newPdfData = generateRemisionPDF({
          remision_number: remisionData.remision_number,
          client: remisionData.client_data as any,
          order: {
            order_number: remisionData.order?.order_number || 'N/A',
            expected_delivery_date: remisionData.order?.expected_delivery_date || new Date().toISOString()
          },
          items: remisionData.remision_items || [],
          total_amount: remisionData.total_amount,
          notes: remisionData.notes,
          created_at: remisionData.created_at
        })

        console.log("Generated new PDF data:", {
          newPdfDataLength: newPdfData.length,
          newPdfDataType: typeof newPdfData,
          firstBytes: Array.from(newPdfData.slice(0, 10))
        })

        // Save the generated PDF to database for future use (convert to base64)
        let binaryString = ''
        for (let i = 0; i < newPdfData.length; i++) {
          binaryString += String.fromCharCode(newPdfData[i])
        }
        const newPdfDataBase64 = btoa(binaryString)
        await supabase
          .from("remisions")
          .update({ pdf_data: newPdfDataBase64 })
          .eq("id", remisionId)

        console.log("Saved new PDF to database as base64:", {
          base64Length: newPdfDataBase64.length,
          base64Preview: newPdfDataBase64.substring(0, 50) + "..."
        })

        pdfData = newPdfData
      }

      // Convert binary data back to blob and download
      let uint8Array: Uint8Array

      console.log("Starting data conversion process...")

      // Handle different data types from database
      if (typeof pdfData === 'string') {
        console.log("PDF data is string, checking format...")

        // Check if it's hexadecimal format (PostgreSQL BYTEA output)
        if (pdfData.startsWith('\\x')) {
          console.log("Detected PostgreSQL hexadecimal format, converting...")
          const hexString = pdfData.substring(2) // Remove \x prefix

          console.log("Hexadecimal conversion details:", {
            originalLength: pdfData.length,
            hexStringLength: hexString.length,
            expectedArrayLength: hexString.length / 2,
            hexPreview: hexString.substring(0, 20) + "..."
          })

          // First decode hex to get the base64 string
          const hexBytes = new Uint8Array(hexString.length / 2)
          for (let i = 0; i < hexString.length; i += 2) {
            const hexPair = hexString.substring(i, i + 2)
            const byteValue = parseInt(hexPair, 16)
            hexBytes[i / 2] = byteValue
          }

          // Convert bytes back to base64 string
          const base64String = String.fromCharCode(...hexBytes)

          console.log("Intermediate base64 extraction:", {
            hexBytesLength: hexBytes.length,
            base64StringLength: base64String.length,
            base64Preview: base64String.substring(0, 50) + "...",
            looksLikeBase64: base64String.startsWith('JVBERi') // Base64 for "%PDF"
          })

          // Now decode the base64 to get actual PDF bytes
          try {
            const binaryString = atob(base64String)
            uint8Array = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i)
            }

            console.log("Final PDF decode successful:", {
              uint8ArrayLength: uint8Array.length,
              firstBytes: Array.from(uint8Array.slice(0, 10)),
              lastBytes: Array.from(uint8Array.slice(-10)),
              isValidPDF: uint8Array[0] === 37 && uint8Array[1] === 80 && uint8Array[2] === 68 && uint8Array[3] === 70, // %PDF
              pdfHeader: String.fromCharCode(...uint8Array.slice(0, 8))
            })
          } catch (base64Error) {
            console.error("Failed to decode base64 from hex data:", base64Error)
            // Fallback to treating hex data as direct PDF bytes
            uint8Array = hexBytes
          }
        } else {
          try {
            // Try to decode as base64
            console.log("Trying base64 decode...")
            const binaryString = atob(pdfData)
            uint8Array = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i)
            }
            console.log("Base64 decode successful:", {
              originalBase64Length: pdfData.length,
              binaryStringLength: binaryString.length,
              uint8ArrayLength: uint8Array.length,
              firstBytes: Array.from(uint8Array.slice(0, 10)),
              isValidPDF: uint8Array[0] === 37 && uint8Array[1] === 80 && uint8Array[2] === 68 && uint8Array[3] === 70
            })
          } catch (e) {
            console.error("Base64 decode failed:", e)
            console.log("Trying TextEncoder fallback...")
            // Fallback: convert string to bytes directly (for legacy PDFs)
            const encoder = new TextEncoder()
            uint8Array = encoder.encode(pdfData)
            console.log("TextEncoder fallback result:", {
              uint8ArrayLength: uint8Array.length,
              firstBytes: Array.from(uint8Array.slice(0, 10))
            })
          }
        }
      } else if (pdfData instanceof ArrayBuffer) {
        console.log("PDF data is ArrayBuffer, converting...")
        uint8Array = new Uint8Array(pdfData)
      } else if (Array.isArray(pdfData)) {
        console.log("PDF data is Array, converting...")
        uint8Array = new Uint8Array(pdfData)
      } else {
        console.log("PDF data is other type, converting...")
        uint8Array = new Uint8Array(pdfData)
      }

      console.log("Final data preparation:", {
        finalArrayLength: uint8Array.length,
        finalArrayType: uint8Array.constructor.name,
        firstTenBytes: Array.from(uint8Array.slice(0, 10)),
        isValidPDFHeader: uint8Array[0] === 37 && uint8Array[1] === 80 && uint8Array[2] === 68 && uint8Array[3] === 70
      })

      const blob = new Blob([uint8Array], {
        type: "application/pdf"
      })

      console.log("Blob creation:", {
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