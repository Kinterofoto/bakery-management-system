"use client"

import { useState, useCallback } from "react"
import { useSystemConfig } from "@/hooks/use-system-config"
import { useExportHistory } from "@/hooks/use-export-history"
import { useWorldOfficeExport } from "@/hooks/use-world-office-export"
import { useRemisions } from "@/hooks/use-remisions"
import { useToast } from "@/hooks/use-toast"
import { generateRemisionPDF, getRemisionFileName } from "@/lib/pdf-generator"
import * as XLSX from "xlsx"

interface RouteSelection {
  [routeId: string]: boolean
}

interface ExportSummary {
  totalRoutes: number
  totalOrders: number
  totalAmount: number
  routeNames: string[]
  pendingOrders: any[]
  // New fields for dual billing
  directBillingOrders: any[]
  remisionOrders: any[]
  totalDirectBilling: number
  totalRemisions: number
}

export function useMultiRouteExport() {
  const [selectedRoutes, setSelectedRoutes] = useState<RouteSelection>({})
  const [isExporting, setIsExporting] = useState(false)
  const [exportSummary, setExportSummary] = useState<ExportSummary | null>(null)

  const { getInvoiceNumber, getWorldOfficeConfig } = useSystemConfig()
  const { createExportRecord, getPendingOrdersForRoutes, markOrdersAsInvoiced } = useExportHistory()
  const { generateExportData, fetchCompleteOrderData } = useWorldOfficeExport()
  const {
    createRemision,
    getOrdersForRemision,
    getOrdersForDirectBilling
  } = useRemisions()
  const { toast } = useToast()

  const toggleRouteSelection = useCallback((routeId: string) => {
    setSelectedRoutes(prev => ({
      ...prev,
      [routeId]: !prev[routeId]
    }))
  }, [])

  const selectAllRoutes = useCallback((routeIds: string[]) => {
    const selection: RouteSelection = {}
    routeIds.forEach(id => {
      selection[id] = true
    })
    setSelectedRoutes(selection)
  }, [])

  const deselectAllRoutes = useCallback(() => {
    setSelectedRoutes({})
  }, [])

  const getSelectedRouteIds = useCallback(() => {
    return Object.keys(selectedRoutes).filter(id => selectedRoutes[id])
  }, [selectedRoutes])

  const getSelectedRouteCount = useCallback(() => {
    return getSelectedRouteIds().length
  }, [getSelectedRouteIds])

  const generateExportSummary = useCallback(async (routes: any[]) => {
    try {
      const selectedRouteIds = getSelectedRouteIds()
      const selectedRouteData = routes.filter(route => selectedRouteIds.includes(route.id))

      if (selectedRouteData.length === 0) {
        setExportSummary(null)
        return null
      }

      // Get orders separated by billing type
      const [directBillingOrders, remisionOrders] = await Promise.all([
        getOrdersForDirectBilling(selectedRouteIds),
        getOrdersForRemision(selectedRouteIds)
      ])

      const totalDirectBilling = directBillingOrders.reduce((sum, order) => sum + (order.total_value || 0), 0)
      const totalRemisions = remisionOrders.reduce((sum, order) => sum + (order.total_value || 0), 0)
      const totalOrders = directBillingOrders.length + remisionOrders.length
      const totalAmount = totalDirectBilling + totalRemisions

      const summary: ExportSummary = {
        totalRoutes: selectedRouteData.length,
        totalOrders: totalOrders,
        totalAmount: totalAmount,
        routeNames: selectedRouteData.map(route => route.route_name),
        pendingOrders: [...directBillingOrders, ...remisionOrders], // Keep for backward compatibility
        // New fields for dual billing
        directBillingOrders: directBillingOrders,
        remisionOrders: remisionOrders,
        totalDirectBilling: totalDirectBilling,
        totalRemisions: totalRemisions
      }

      setExportSummary(summary)
      return summary
    } catch (error: any) {
      console.error("Error generating export summary:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el resumen de exportación",
        variant: "destructive"
      })
      return null
    }
  }, [getSelectedRouteIds, getOrdersForDirectBilling, getOrdersForRemision, toast])

  const executeExport = useCallback(async (currentUser: any, routes: any[]) => {
    if (isExporting) return

    try {
      setIsExporting(true)

      const selectedRouteIds = getSelectedRouteIds()
      if (selectedRouteIds.length === 0) {
        throw new Error("No hay rutas seleccionadas")
      }

      // Get current summary or generate it
      const summary = exportSummary || await generateExportSummary(routes)
      if (!summary || summary.totalOrders === 0) {
        throw new Error("No hay pedidos pendientes en las rutas seleccionadas")
      }

      const today = new Date()
      let totalProcessed = 0
      let invoiceNumberStart = 0
      let invoiceNumberEnd = 0

      // Part 1: Process remision orders (generate PDFs)
      if (summary.remisionOrders.length > 0) {
        toast({
          title: "Procesando remisiones",
          description: `Generando ${summary.remisionOrders.length} remisiones...`,
        })

        for (const order of summary.remisionOrders) {
          try {
            // Get complete order data for this order
            const completeOrderData = await fetchCompleteOrderData([order.order_id])
            const completeOrder = completeOrderData[0]

            if (!completeOrder || !completeOrder.order_items || completeOrder.order_items.length === 0) {
              console.warn(`Order ${order.order_id} has no items, skipping remision`)
              continue
            }


            // Prepare client data
            const clientData = {
              name: order.client_name,
              razon_social: completeOrder.client?.razon_social || null,
              nit: completeOrder.client?.nit || null,
              phone: completeOrder.client?.phone || null,
              email: completeOrder.client?.email || null,
              address: completeOrder.client?.address || null
            }

            // Calculate total amount using quantity_available (like current export)
            let totalAmount = 0
            const remisionItems = completeOrder.order_items.map((item: any) => {
              const itemTotal = (item.quantity_available || 0) * (item.unit_price || 0)
              totalAmount += itemTotal


              return {
                product_name: item.product?.name || 'Producto sin nombre',
                quantity_delivered: item.quantity_available || 0,
                unit_price: item.unit_price || 0,
                total_price: itemTotal,
                product_unit: item.product?.unit || null
              }
            }).filter((item: any) => item.quantity_delivered > 0) // Only include items with quantity


            if (remisionItems.length === 0) {
              console.warn(`Order ${order.order_id} has no available quantities, skipping remision`)
              continue
            }

            // Generate PDF
            const pdfData = generateRemisionPDF({
              remision_number: '', // Will be set by createRemision
              client: clientData,
              order: {
                order_number: order.order_number,
                expected_delivery_date: order.expected_delivery_date
              },
              items: remisionItems,
              total_amount: totalAmount,
              notes: null,
              created_at: today.toISOString()
            })

            // Create remision record with PDF data
            await createRemision({
              order_id: order.order_id,
              client_data: clientData,
              total_amount: totalAmount,
              items: remisionItems.map(item => ({
                product_name: item.product_name,
                quantity_delivered: item.quantity_delivered,
                unit_price: item.unit_price,
                total_price: item.total_price,
                product_unit: item.product_unit
              })),
              notes: null,
              created_by: currentUser?.id || ''
            }, pdfData)

            totalProcessed++
          } catch (remisionError) {
            console.error(`Error creating remision for order ${order.order_id}:`, remisionError)
            // Continue with other orders
          }
        }
      }

      // Part 2: Process direct billing orders (generate Excel)
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
        const orderIdsForExport = summary.directBillingOrders.map(order => order.order_id)
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
        const fileName = `WorldOffice_Rutas_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_${invoiceNumberStart}-${invoiceNumberEnd}.xlsx`

        // Convert to binary for storage
        const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const uint8Array = new Uint8Array(xlsxBuffer)

        // Create export history record
        const exportRecord = await createExportRecord({
          invoice_number_start: invoiceNumberStart,
          invoice_number_end: invoiceNumberEnd,
          total_orders: summary.directBillingOrders.length,
          total_amount: summary.totalDirectBilling,
          routes_exported: selectedRouteIds,
          route_names: summary.routeNames,
          file_name: fileName,
          file_data: uint8Array,
          export_summary: {
            routes: summary.routeNames,
            exportDate: today.toISOString(),
            userEmail: currentUser?.email || 'unknown',
            directBillingOrders: summary.directBillingOrders.length,
            remisionOrders: summary.remisionOrders.length
          },
          created_by: currentUser?.id || ''
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

      // Reset selections
      deselectAllRoutes()
      setExportSummary(null)

      // Success message
      const messages = []
      if (summary.remisionOrders.length > 0) {
        messages.push(`${summary.remisionOrders.length} remisiones generadas`)
      }
      if (summary.directBillingOrders.length > 0) {
        messages.push(`${summary.directBillingOrders.length} pedidos facturados (${invoiceNumberStart} - ${invoiceNumberEnd})`)
      }

      toast({
        title: "Exportación exitosa",
        description: messages.join(', '),
      })

      return totalProcessed

    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "Error en exportación",
        description: error.message || "No se pudo completar la exportación",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsExporting(false)
    }
  }, [
    isExporting,
    getSelectedRouteIds,
    exportSummary,
    generateExportSummary,
    getInvoiceNumber,
    createExportRecord,
    markOrdersAsInvoiced,
    generateExportData,
    fetchCompleteOrderData,
    getWorldOfficeConfig,
    createRemision,
    deselectAllRoutes,
    toast
  ])

  const validateSelection = useCallback((routes: any[]) => {
    const selectedRouteIds = getSelectedRouteIds()
    const selectedRouteData = routes.filter(route => selectedRouteIds.includes(route.id))
    
    const validationResult = {
      hasSelection: selectedRouteIds.length > 0,
      selectedCount: selectedRouteIds.length,
      routeNames: selectedRouteData.map(route => route.route_name),
      warnings: [] as string[]
    }

    if (selectedRouteIds.length === 0) {
      validationResult.warnings.push("Selecciona al menos una ruta para exportar")
    }

    return validationResult
  }, [getSelectedRouteIds])

  return {
    selectedRoutes,
    isExporting,
    exportSummary,
    toggleRouteSelection,
    selectAllRoutes,
    deselectAllRoutes,
    getSelectedRouteIds,
    getSelectedRouteCount,
    generateExportSummary,
    executeExport,
    validateSelection
  }
}