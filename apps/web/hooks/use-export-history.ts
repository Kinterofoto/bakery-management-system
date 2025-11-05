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
      console.log("=== Starting export file download ===", {
        exportId,
        fileName,
        timestamp: new Date().toISOString()
      })

      const { data, error } = await supabase
        .from("export_history")
        .select("file_data")
        .eq("id", exportId)
        .single()

      console.log("Database query result:", {
        hasError: !!error,
        hasData: !!data,
        hasFileData: !!data?.file_data,
        errorMessage: error?.message
      })

      if (error) {
        throw error
      }

      if (!data.file_data) {
        throw new Error("No hay archivo disponible para descargar")
      }

      let fileData = data.file_data

      console.log("File data analysis:", {
        hasFileData: !!fileData,
        fileDataType: typeof fileData,
        fileDataLength: fileData ? fileData.length : 0,
        isString: typeof fileData === 'string',
        startsWithHex: typeof fileData === 'string' && fileData.startsWith('\\x'),
        fileDataPreview: fileData ?
          (typeof fileData === 'string' ? fileData.substring(0, 100) + "..." : "Non-string data")
          : null
      })

      // Convert binary data back to blob and download
      let uint8Array: Uint8Array

      // Handle different data types from database (same logic as PDF downloads)
      if (typeof fileData === 'string') {
        console.log("File data is string, checking format...")

        // Check if it's hexadecimal format (PostgreSQL BYTEA output)
        if (fileData.startsWith('\\x')) {
          console.log("Detected PostgreSQL hexadecimal format, converting...")
          const hexString = fileData.substring(2) // Remove \x prefix

          console.log("Hexadecimal conversion details:", {
            originalLength: fileData.length,
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

          // Convert bytes back to base64 string (chunk by chunk to avoid stack overflow)
          let base64String = ''
          const chunkSize = 8192 // Process in 8KB chunks
          for (let i = 0; i < hexBytes.length; i += chunkSize) {
            const chunk = hexBytes.slice(i, i + chunkSize)
            base64String += String.fromCharCode(...chunk)
          }

          console.log("Intermediate base64 extraction:", {
            hexBytesLength: hexBytes.length,
            base64StringLength: base64String.length,
            base64Preview: base64String.substring(0, 50) + "...",
            looksLikeBase64: /^[A-Za-z0-9+/]/.test(base64String) // Basic base64 check
          })

          // Check if the extracted string looks like base64 (for newer files)
          const looksLikeBase64 = /^[A-Za-z0-9+/]/.test(base64String) && base64String.length > 100

          if (looksLikeBase64) {
            // Try to decode as base64 (for files stored as base64)
            try {
              const binaryString = atob(base64String)
              uint8Array = new Uint8Array(binaryString.length)
              for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i)
              }

              console.log("Final Excel decode from base64 successful:", {
                uint8ArrayLength: uint8Array.length,
                firstBytes: Array.from(uint8Array.slice(0, 10)),
                lastBytes: Array.from(uint8Array.slice(-10)),
                // Check for Excel file signature (PK for zip-based files like .xlsx)
                isValidExcel: uint8Array[0] === 80 && uint8Array[1] === 75,
                fileHeader: String.fromCharCode(...uint8Array.slice(0, 4))
              })
            } catch (base64Error) {
              console.error("Failed to decode base64 from hex data:", base64Error)
              // Fallback to treating hex data as direct Excel bytes
              console.log("Using hex bytes directly as Excel data")
              uint8Array = hexBytes
            }
          } else {
            // Data is not base64, check if it's JSON format
            console.log("Data is not base64, checking if it's JSON format...")

            if (base64String.startsWith('{"0"')) {
              // Data is stored as JSON object {"0":80,"1":75,...}
              console.log("Detected JSON array format, converting...")

              try {
                const jsonObject = JSON.parse(base64String)
                const arrayLength = Object.keys(jsonObject).length
                uint8Array = new Uint8Array(arrayLength)

                // Convert JSON object back to Uint8Array
                for (let i = 0; i < arrayLength; i++) {
                  uint8Array[i] = jsonObject[i.toString()]
                }

                console.log("JSON to Excel conversion successful:", {
                  uint8ArrayLength: uint8Array.length,
                  firstBytes: Array.from(uint8Array.slice(0, 10)),
                  lastBytes: Array.from(uint8Array.slice(-10)),
                  // Check for Excel file signature (PK for zip-based files like .xlsx)
                  isValidExcel: uint8Array[0] === 80 && uint8Array[1] === 75,
                  fileHeader: String.fromCharCode(...uint8Array.slice(0, 4))
                })
              } catch (jsonError) {
                console.error("Failed to parse JSON format:", jsonError)
                // Fallback to using hex bytes directly
                uint8Array = hexBytes
              }
            } else {
              // Data is not base64 and not JSON, use hex bytes directly
              console.log("Data is neither base64 nor JSON, using hex bytes directly as Excel data")
              uint8Array = hexBytes

              console.log("Direct hex to Excel conversion:", {
                uint8ArrayLength: uint8Array.length,
                firstBytes: Array.from(uint8Array.slice(0, 10)),
                lastBytes: Array.from(uint8Array.slice(-10)),
                // Check for Excel file signature (PK for zip-based files like .xlsx)
                isValidExcel: uint8Array[0] === 80 && uint8Array[1] === 75,
                fileHeader: String.fromCharCode(...uint8Array.slice(0, 4))
              })
            }
          }
        } else {
          try {
            // Try to decode as base64
            console.log("Trying base64 decode...")
            const binaryString = atob(fileData)
            uint8Array = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i)
            }
            console.log("Base64 decode successful:", {
              originalBase64Length: fileData.length,
              binaryStringLength: binaryString.length,
              uint8ArrayLength: uint8Array.length,
              firstBytes: Array.from(uint8Array.slice(0, 10)),
              isValidExcel: uint8Array[0] === 80 && uint8Array[1] === 75
            })
          } catch (e) {
            console.error("Base64 decode failed:", e)
            console.log("Trying TextEncoder fallback...")
            // Fallback: convert string to bytes directly
            const encoder = new TextEncoder()
            uint8Array = encoder.encode(fileData)
            console.log("TextEncoder fallback result:", {
              uint8ArrayLength: uint8Array.length,
              firstBytes: Array.from(uint8Array.slice(0, 10))
            })
          }
        }
      } else if (fileData instanceof ArrayBuffer) {
        console.log("File data is ArrayBuffer, converting...")
        uint8Array = new Uint8Array(fileData)
      } else if (Array.isArray(fileData)) {
        console.log("File data is Array, converting...")
        uint8Array = new Uint8Array(fileData)
      } else {
        console.log("File data is other type, converting...")
        uint8Array = new Uint8Array(fileData)
      }

      console.log("Final data preparation:", {
        finalArrayLength: uint8Array.length,
        finalArrayType: uint8Array.constructor.name,
        firstTenBytes: Array.from(uint8Array.slice(0, 10)),
        isValidExcelHeader: uint8Array[0] === 80 && uint8Array[1] === 75 // PK signature for Excel/zip files
      })

      const blob = new Blob([uint8Array], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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

      console.log("=== Export file download completed successfully ===")

      toast({
        title: "Descarga iniciada",
        description: `Se está descargando ${fileName}`,
      })
    } catch (error: any) {
      console.error("=== Export file download error ===", error)
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