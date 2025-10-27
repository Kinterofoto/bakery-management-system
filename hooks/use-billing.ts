"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { useSystemConfig } from "@/hooks/use-system-config"
import { useExportHistory } from "@/hooks/use-export-history"
import { useWorldOfficeExport } from "@/hooks/use-world-office-export"
import * as XLSX from "xlsx"

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  client: Database["public"]["Tables"]["clients"]["Row"]
  branch?: Database["public"]["Tables"]["branches"]["Row"]
  order_items: (Database["public"]["Tables"]["order_items"]["Row"] & {
    product: Database["public"]["Tables"]["products"]["Row"]
  })[]
}

export function useBilling() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [isBilling, setIsBilling] = useState(false)
  const { toast } = useToast()

  // Hooks from main for Excel generation and export history
  const { getInvoiceNumber, getWorldOfficeConfig } = useSystemConfig()
  const { createExportRecord, markOrdersAsInvoiced } = useExportHistory()
  const { generateExportData, fetchCompleteOrderData } = useWorldOfficeExport()

  // Fetch orders ready for billing (status = ready_dispatch)
  // Excludes orders that are already invoiced OR already have a remision
  const fetchPendingOrders = useCallback(async () => {
    try {
      setLoading(true)

      // First get all pending orders
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select(`
          *,
          client:clients(*),
          branch:branches(*),
          order_items(
            *,
            product:products(*)
          )
        `)
        .eq("status", "ready_dispatch")
        .eq("is_invoiced", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get all order IDs that already have a remision
      const { data: existingRemisions } = await supabase
        .from("remisions")
        .select("order_id")

      const remisionedOrderIds = new Set(
        (existingRemisions || []).map(r => r.order_id)
      )

      // Filter out orders that already have a remision
      const ordersWithoutRemision = (allOrders || []).filter(
        order => !remisionedOrderIds.has(order.id)
      )

      setPendingOrders(ordersWithoutRemision as any[])
    } catch (err) {
      console.error("Error fetching pending orders:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos pendientes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Toggle order selection
  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }, [])

  // Select all orders
  const selectAllOrders = useCallback(() => {
    const allSelected = pendingOrders.every(order => selectedOrders[order.id])

    if (allSelected) {
      // Deselect all
      setSelectedOrders({})
    } else {
      // Select all
      const newSelection: Record<string, boolean> = {}
      pendingOrders.forEach(order => {
        newSelection[order.id] = true
      })
      setSelectedOrders(newSelection)
    }
  }, [pendingOrders, selectedOrders])

  // Get selected order count
  const getSelectedOrderCount = useCallback(() => {
    return Object.values(selectedOrders).filter(Boolean).length
  }, [selectedOrders])

  // Get selected orders data
  const getSelectedOrdersData = useCallback(() => {
    return pendingOrders.filter(order => selectedOrders[order.id])
  }, [pendingOrders, selectedOrders])

  // Generate billing summary (matches main's SQL logic exactly)
  const generateBillingSummary = useCallback(() => {
    const selectedOrdersData = getSelectedOrdersData()

    // Remision orders: billing_type = 'remision' OR requires_remision = TRUE
    const remisionOrders = selectedOrdersData.filter(
      order => order.client?.billing_type === 'remision' || order.requires_remision === true
    )

    // Direct billing orders: billing_type = 'facturable' AND requires_remision IS NOT TRUE
    const directBillingOrders = selectedOrdersData.filter(
      order => order.client?.billing_type === 'facturable' &&
               (order.requires_remision === false || order.requires_remision === null || order.requires_remision === undefined)
    )

    const totalDirectBilling = directBillingOrders.reduce(
      (sum, order) => sum + (order.total_value || 0),
      0
    )

    const totalRemisions = remisionOrders.reduce(
      (sum, order) => sum + (order.total_value || 0),
      0
    )

    return {
      totalOrders: selectedOrdersData.length,
      directBillingOrders,
      remisionOrders,
      totalDirectBilling,
      totalRemisions,
      totalAmount: totalDirectBilling + totalRemisions,
      orderNumbers: selectedOrdersData.map(o => o.order_number)
    }
  }, [getSelectedOrdersData])

  // Bill selected orders (replicates main's executeExport logic exactly)
  const billSelectedOrders = useCallback(async (user: any) => {
    if (isBilling) return

    try {
      setIsBilling(true)
      const summary = generateBillingSummary()

      if (summary.totalOrders === 0) {
        toast({
          title: "Sin selección",
          description: "No hay pedidos seleccionados para facturar",
          variant: "destructive"
        })
        return
      }

      const today = new Date()
      let totalProcessed = 0
      let invoiceNumberStart = 0
      let invoiceNumberEnd = 0

      // Part 1: Process remision orders (generate remisions with PDFs like in main)
      if (summary.remisionOrders.length > 0) {
        toast({
          title: "Procesando remisiones",
          description: `Generando ${summary.remisionOrders.length} remisiones...`,
        })

        for (const order of summary.remisionOrders) {
          try {
            // Get complete order data for this order
            const completeOrderData = await fetchCompleteOrderData([order.id])
            const completeOrder = completeOrderData[0]

            if (!completeOrder || !completeOrder.order_items || completeOrder.order_items.length === 0) {
              console.warn(`Order ${order.id} has no items, skipping remision`)
              continue
            }

            // Get next remision number using database function (like main)
            const { data: remisionNumber, error: numberError } = await supabase
              .rpc("get_next_remision_number")

            if (numberError) throw numberError

            // Prepare client data
            const clientData = {
              name: order.client?.name,
              razon_social: completeOrder.client?.razon_social || null,
              nit: completeOrder.client?.nit || null,
              phone: completeOrder.client?.phone || null,
              email: completeOrder.client?.email || null,
              address: completeOrder.client?.address || null
            }

            // Calculate total amount using quantity_available (like main)
            let totalAmount = 0
            const remisionItems = completeOrder.order_items.map((item: any) => {
              const itemTotal = (item.quantity_available || 0) * (item.unit_price || 0)
              totalAmount += itemTotal

              return {
                product_id: item.product_id || null,
                product_name: item.product?.name || 'Producto sin nombre',
                quantity_delivered: item.quantity_available || 0,
                unit_price: item.unit_price || 0,
                total_price: itemTotal,
                product_unit: item.product?.unit || null
              }
            }).filter((item: any) => item.quantity_delivered > 0)

            if (remisionItems.length === 0) {
              console.warn(`Order ${order.id} has no available quantities, skipping remision`)
              continue
            }

            // Create remision record
            const { data: remisionData, error: remisionError } = await supabase
              .from("remisions")
              .insert({
                order_id: order.id,
                remision_number: remisionNumber as string,
                client_data: clientData,
                total_amount: totalAmount,
                created_by: user.id
              })
              .select()
              .single()

            if (remisionError) throw remisionError

            // Create remision items
            const itemsWithRemisionId = remisionItems.map(item => ({
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
            await supabase
              .from("orders")
              .update({
                is_invoiced_from_remision: false  // False = has remision but not invoiced yet
              })
              .eq("id", order.id)

            totalProcessed++
          } catch (remisionError) {
            console.error(`Error creating remision for order ${order.id}:`, remisionError)
            // Continue with other orders
          }
        }
      }

      // Part 2: Process direct billing orders (generate Excel like in main)
      if (summary.directBillingOrders.length > 0) {
        toast({
          title: "Procesando facturación",
          description: `Facturando ${summary.directBillingOrders.length} pedidos...`,
        })

        // Get starting invoice number
        invoiceNumberStart = await getInvoiceNumber()
        invoiceNumberEnd = invoiceNumberStart + summary.directBillingOrders.length - 1

        // Update the last invoice number for the range
        for (let i = 1; i < summary.directBillingOrders.length; i++) {
          await getInvoiceNumber()
        }

        // Get complete order data with order items
        const orderIdsForExport = summary.directBillingOrders.map(order => order.id)
        const ordersForExport = await fetchCompleteOrderData(orderIdsForExport)

        // Generate the XLSX data
        const exportData = await generateExportData(ordersForExport)

        if (exportData.length === 0) {
          throw new Error("No se pudieron generar datos para exportar")
        }

        // Create the Excel file
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(exportData)
        XLSX.utils.book_append_sheet(wb, ws, "Encab+Movim.Inven Talla y Color")

        // Add IVA sheet
        const woConfig = getWorldOfficeConfig()
        const ivaData = [{ IVA: woConfig.ivaRate }]
        const ivaWs = XLSX.utils.json_to_sheet(ivaData)
        XLSX.utils.book_append_sheet(wb, ivaWs, "Hoja1")

        // Generate filename
        const fileName = `WorldOffice_Pedidos_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_${invoiceNumberStart}-${invoiceNumberEnd}.xlsx`

        // Convert to binary for storage
        const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const uint8Array = new Uint8Array(xlsxBuffer)

        // Create export history record
        const exportRecord = await createExportRecord({
          invoice_number_start: invoiceNumberStart,
          invoice_number_end: invoiceNumberEnd,
          total_orders: summary.directBillingOrders.length,
          total_amount: summary.totalDirectBilling,
          routes_exported: [], // No routes, just orders
          route_names: [],
          file_name: fileName,
          file_data: uint8Array,
          export_summary: {
            orderNumbers: summary.orderNumbers,
            exportDate: today.toISOString(),
            userEmail: user?.email || 'unknown',
            directBillingOrders: summary.directBillingOrders.length,
            remisionOrders: summary.remisionOrders.length
          },
          created_by: user?.id || ''
        })

        // Mark direct billing orders as invoiced
        const invoicedCount = await markOrdersAsInvoiced(
          orderIdsForExport,
          exportRecord.id,
          invoiceNumberStart
        )

        // Download the Excel file
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

        totalProcessed += invoicedCount
      }

      // Clear selection and refetch
      setSelectedOrders({})
      await fetchPendingOrders()

      // Success message (like main)
      const messages = []
      if (summary.remisionOrders.length > 0) {
        messages.push(`${summary.remisionOrders.length} remisiones generadas`)
      }
      if (summary.directBillingOrders.length > 0) {
        messages.push(`${summary.directBillingOrders.length} pedidos facturados (${invoiceNumberStart} - ${invoiceNumberEnd})`)
      }

      toast({
        title: "Facturación exitosa",
        description: messages.join(', '),
      })

      return totalProcessed

    } catch (err: any) {
      console.error("Error billing orders:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo completar la facturación",
        variant: "destructive"
      })
      throw err
    } finally {
      setIsBilling(false)
    }
  }, [
    isBilling,
    generateBillingSummary,
    fetchPendingOrders,
    toast,
    getInvoiceNumber,
    getWorldOfficeConfig,
    createExportRecord,
    markOrdersAsInvoiced,
    generateExportData,
    fetchCompleteOrderData
  ])

  useEffect(() => {
    fetchPendingOrders()
  }, [fetchPendingOrders])

  return {
    pendingOrders,
    loading,
    isBilling,
    selectedOrders,
    toggleOrderSelection,
    selectAllOrders,
    getSelectedOrderCount,
    getSelectedOrdersData,
    generateBillingSummary,
    billSelectedOrders,
    refetch: fetchPendingOrders
  }
}
