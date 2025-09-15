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
  const { generateExportData, fetchCompleteOrderData } = useWorldOfficeExport()

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
      // First get all order_items for this order
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderId)

      if (orderItemsError) {
        throw orderItemsError
      }

      if (!orderItems || orderItems.length === 0) {
        console.log(`No order items found for order ${orderId}`)
        return []
      }

      const orderItemIds = orderItems.map(item => item.id)

      // Now get delivery data for these order items
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
        .in("order_item_id", orderItemIds)

      if (error) {
        throw error
      }

      console.log(`Found ${data?.length || 0} delivery records for order ${orderId}:`, data)
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
      console.log("=== Starting invoice process ===")
      console.log("Selected orders data:", selectedOrdersData)

      const invoiceNumberStart = await getInvoiceNumber()
      const invoiceNumberEnd = invoiceNumberStart + selectedOrdersData.length - 1
      console.log(`Invoice numbers: ${invoiceNumberStart} - ${invoiceNumberEnd}`)

      // Update invoice numbers for the range
      for (let i = 1; i < selectedOrdersData.length; i++) {
        await getInvoiceNumber()
      }

      // Get complete order data with the same structure as direct billing
      const orderIds = selectedOrdersData.map(order => order.order_id)
      console.log("Order IDs to fetch:", orderIds)

      console.log("Fetching complete order data for remision orders...")
      let completeOrdersData
      try {
        // Use our own fetch function without restrictive filters for remision orders
        const { data, error } = await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            client_id,
            branch_id,
            expected_delivery_date,
            purchase_order_number,
            is_invoiced,
            client:clients (
              id,
              name,
              nit
            ),
            branch:branches (
              id,
              name,
              address
            ),
            order_items (
              id,
              product_id,
              quantity_available,
              product:products (
                id,
                name,
                price,
                codigo_wo,
                nombre_wo,
                tax_rate
              )
            )
          `)
          .in("id", orderIds)
          .in("status", ["delivered", "partially_delivered"]) // Remision orders are delivered/partially delivered
          // Don't filter by is_invoiced since remision orders may have different invoicing states

        if (error) {
          throw error
        }

        completeOrdersData = data || []
        console.log("Fetched complete order data successfully:", completeOrdersData)
      } catch (fetchError) {
        console.error("Error fetching complete order data:", fetchError)
        throw new Error(`Error obteniendo datos completos de pedidos: ${fetchError.message}`)
      }

      if (!completeOrdersData || completeOrdersData.length === 0) {
        console.error("No complete order data returned for order IDs:", orderIds)
        throw new Error("No se pudieron obtener los datos completos de los pedidos seleccionados")
      }

      // Modify the order items to use quantity_delivered instead of quantity_available
      const modifiedOrdersData = await Promise.all(
        completeOrdersData.map(async (order) => {
          console.log(`Processing order ${order.id} (${order.order_number}) for delivery data...`)

          // Get delivery data for this order
          const deliveryData = await getOrderDeliveryData(order.id)
          console.log(`Order ${order.order_number}: Found ${deliveryData.length} delivery records`)

          // Create a map of delivery quantities by order_item_id
          const deliveryMap = new Map()
          deliveryData.forEach(delivery => {
            if (delivery.order_item_id) {
              deliveryMap.set(delivery.order_item_id, delivery.quantity_delivered)
              console.log(`  - Item ${delivery.order_item_id}: delivered ${delivery.quantity_delivered}`)
            }
          })

          console.log(`Order ${order.order_number}: Original order_items count: ${order.order_items?.length || 0}`)

          // Update order_items to use quantity_delivered
          const updatedOrderItems = order.order_items?.map(item => {
            const deliveredQty = deliveryMap.get(item.id) || 0
            console.log(`  - Order item ${item.id}: original qty_available=${item.quantity_available}, delivered=${deliveredQty}`)
            return {
              ...item,
              quantity_available: deliveredQty // Use delivered quantity as "available"
            }
          }).filter(item => {
            const keep = item.quantity_available > 0
            if (!keep) {
              console.log(`  - Filtering out item ${item.id}: no delivered quantity`)
            }
            return keep
          }) // Only include items with delivered quantity

          console.log(`Order ${order.order_number}: Final order_items count: ${updatedOrderItems?.length || 0}`)

          return {
            ...order,
            order_items: updatedOrderItems
          }
        })
      )

      // Filter out orders with no delivered items
      const ordersWithDeliveries = modifiedOrdersData.filter(order => {
        const hasDeliveries = order.order_items && order.order_items.length > 0
        if (!hasDeliveries) {
          console.log(`Filtering out order ${order.order_number}: no delivered items`)
        }
        return hasDeliveries
      })

      console.log(`Final result: ${ordersWithDeliveries.length} orders with deliveries out of ${selectedOrdersData.length} selected`)

      if (ordersWithDeliveries.length === 0) {
        console.error("No orders with delivery data found. Selected orders:", selectedOrdersData)
        throw new Error("No hay datos de entrega disponibles para los pedidos seleccionados")
      }

      // Generate export data using the same World Office function as direct billing
      const exportData = await generateExportData(ordersWithDeliveries)

      // Create Excel file with same structure as direct billing
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, "Encab+Movim.Inven Talla y Color")

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