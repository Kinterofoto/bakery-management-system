"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useExportHistory } from "@/hooks/use-export-history"
import { useWorldOfficeExport } from "@/hooks/use-world-office-export"
import { useSystemConfig } from "@/hooks/use-system-config"
import type { Database } from "@/lib/database.types"
import * as XLSX from "xlsx"

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
  // Additional fields for complete order data
  order_items?: Array<{
    id: string
    product_name: string
    quantity_delivered: number
    unit_price: number
    total_price: number
    product_unit?: string | null
  }>
  client_data?: Record<string, any>
}

interface RemisionInvoiceSelection {
  [orderId: string]: boolean
}

interface InvoiceFromRemisionSummary {
  selectedOrders: NonInvoicedOrder[]
  totalOrders: number
  totalAmount: number
  orderNumbers: string[]
}

export function useNonInvoicedOrders() {
  const [nonInvoicedOrders, setNonInvoicedOrders] = useState<NonInvoicedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrders, setSelectedOrders] = useState<RemisionInvoiceSelection>({})
  const [isInvoicing, setIsInvoicing] = useState(false)

  const { toast } = useToast()
  const { getInvoiceNumber, getWorldOfficeConfig } = useSystemConfig()
  const { createExportRecord, markOrdersAsInvoiced } = useExportHistory()
  const { generateExportData } = useWorldOfficeExport()

  const fetchNonInvoicedOrders = async (
    startDate?: string,
    endDate?: string,
    clientId?: string
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Use the SQL function to get remision orders that haven't been invoiced yet
      const { data, error } = await supabase.rpc("get_non_invoiced_remision_orders", {
        start_date: startDate || null,
        end_date: endDate || null,
        client_id_filter: clientId || null
      })

      if (error) {
        console.error("Error fetching non-invoiced orders:", error)
        setError(error.message)
        return
      }

      setNonInvoicedOrders(data || [])
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  const selectAllOrders = () => {
    if (getSelectedOrderCount() === nonInvoicedOrders.length) {
      setSelectedOrders({})
    } else {
      const selection: RemisionInvoiceSelection = {}
      nonInvoicedOrders.forEach(order => {
        selection[order.order_id] = true
      })
      setSelectedOrders(selection)
    }
  }

  const getSelectedOrderIds = () => {
    return Object.keys(selectedOrders).filter(id => selectedOrders[id])
  }

  const getSelectedOrderCount = () => {
    return getSelectedOrderIds().length
  }

  const getSelectedOrdersData = (): NonInvoicedOrder[] => {
    const selectedIds = getSelectedOrderIds()
    return nonInvoicedOrders.filter(order => selectedIds.includes(order.order_id))
  }

  const generateInvoiceFromRemisionSummary = (): InvoiceFromRemisionSummary => {
    const selectedOrdersData = getSelectedOrdersData()

    return {
      selectedOrders: selectedOrdersData,
      totalOrders: selectedOrdersData.length,
      totalAmount: selectedOrdersData.reduce((sum, order) => sum + (order.total_value || 0), 0),
      orderNumbers: selectedOrdersData.map(order => order.order_number)
    }
  }

  const getOrderDeliveryData = async (orderId: string) => {
    try {
      // Get delivery data for the order to use quantity_delivered
      const { data, error } = await supabase
        .from("order_item_deliveries")
        .select(`
          order_item_id,
          quantity_delivered,
          order_items:order_item_id (
            id,
            product_id,
            unit_price,
            products:product_id (
              name,
              unit
            )
          )
        `)
        .eq("order_items.order_id", orderId)

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error(`Error fetching delivery data for order ${orderId}:`, error)
      return []
    }
  }

  const invoiceSelectedRemisionOrders = async (currentUser: any) => {
    if (isInvoicing) return
    if (getSelectedOrderCount() === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un pedido para facturar",
        variant: "destructive"
      })
      return
    }

    try {
      setIsInvoicing(true)

      const selectedOrdersData = getSelectedOrdersData()
      const invoiceNumberStart = await getInvoiceNumber()
      const invoiceNumberEnd = invoiceNumberStart + selectedOrdersData.length - 1

      // Update invoice numbers for the range
      for (let i = 1; i < selectedOrdersData.length; i++) {
        await getInvoiceNumber()
      }

      // Create export data using delivered quantities
      const exportData: any[] = []

      for (const order of selectedOrdersData) {
        // Get delivery data to use quantity_delivered instead of quantity_available
        const deliveryData = await getOrderDeliveryData(order.order_id)

        for (const delivery of deliveryData) {
          if (delivery.quantity_delivered > 0) {
            const product = delivery.order_items?.products
            const unitPrice = delivery.order_items?.unit_price || 0
            const totalPrice = delivery.quantity_delivered * unitPrice

            exportData.push({
              TIPO_ITEM: 1,
              ITEM: product?.name || 'Producto',
              DESCRIPCION: product?.name || 'Producto',
              UNIDAD_MEDIDA: product?.unit || 'UN',
              CANTIDAD: delivery.quantity_delivered,
              VALOR_UNITARIO: unitPrice,
              VALOR_TOTAL: totalPrice,
              PEDIDO: order.order_number,
              CLIENTE: order.client_name,
              FECHA_ENTREGA: order.expected_delivery_date,
              REMISION_PREVIA: order.remision_number // Special field to indicate previous remision
            })
          }
        }
      }

      if (exportData.length === 0) {
        throw new Error("No hay datos de entrega disponibles para los pedidos seleccionados")
      }

      // Create Excel file
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, "Pedidos Remisionados")

      // Add IVA sheet
      const woConfig = getWorldOfficeConfig()
      const ivaData = [{ IVA: woConfig.ivaRate }]
      const ivaWs = XLSX.utils.json_to_sheet(ivaData)
      XLSX.utils.book_append_sheet(wb, ivaWs, "Hoja1")

      // Generate filename
      const today = new Date()
      const fileName = `WorldOffice_PedidosRemisionados_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_${invoiceNumberStart}-${invoiceNumberEnd}.xlsx`

      // Convert to binary for storage
      const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const uint8Array = new Uint8Array(xlsxBuffer)

      const totalAmount = selectedOrdersData.reduce((sum, order) => sum + order.total_value, 0)

      // Create export history record
      const exportRecord = await createExportRecord({
        invoice_number_start: invoiceNumberStart,
        invoice_number_end: invoiceNumberEnd,
        total_orders: selectedOrdersData.length,
        total_amount: totalAmount,
        routes_exported: [], // No specific routes for remision invoicing
        route_names: [...new Set(selectedOrdersData.map(order => order.route_name).filter(Boolean))],
        file_name: fileName,
        file_data: uint8Array,
        export_summary: {
          type: 'remision_invoicing',
          remision_numbers: selectedOrdersData.map(order => order.remision_number),
          exportDate: today.toISOString(),
          userEmail: currentUser?.email || 'unknown'
        },
        created_by: currentUser?.id || ''
      })

      // Mark orders as invoiced using special remision function
      const { data: invoicedCount, error: invoiceError } = await supabase
        .rpc("mark_remision_orders_as_invoiced", {
          order_ids: selectedOrdersData.map(order => order.order_id),
          export_history_id: exportRecord.id,
          invoice_start: invoiceNumberStart
        })

      if (invoiceError) {
        throw invoiceError
      }

      // Download the file
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

      // Reset selections and refresh data
      setSelectedOrders({})
      await fetchNonInvoicedOrders()

      toast({
        title: "Facturación exitosa",
        description: `Se facturaron ${invoicedCount} pedidos remisionados. Facturas: ${invoiceNumberStart} - ${invoiceNumberEnd}`,
      })

      return exportRecord

    } catch (error: any) {
      console.error("Error invoicing remision orders:", error)
      toast({
        title: "Error en facturación",
        description: error.message || "No se pudo completar la facturación",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsInvoicing(false)
    }
  }

  useEffect(() => {
    fetchNonInvoicedOrders()
  }, [])

  return {
    nonInvoicedOrders,
    loading,
    error,
    selectedOrders,
    isInvoicing,
    toggleOrderSelection,
    selectAllOrders,
    getSelectedOrderIds,
    getSelectedOrderCount,
    getSelectedOrdersData,
    generateInvoiceFromRemisionSummary,
    invoiceSelectedRemisionOrders,
    refetch: fetchNonInvoicedOrders
  }
}