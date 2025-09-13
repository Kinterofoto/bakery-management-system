"use client"

import { useState, useCallback } from "react"
import { useSystemConfig } from "@/hooks/use-system-config"
import { useExportHistory } from "@/hooks/use-export-history"
import { useWorldOfficeExport } from "@/hooks/use-world-office-export"
import { useToast } from "@/hooks/use-toast"
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
}

export function useMultiRouteExport() {
  const [selectedRoutes, setSelectedRoutes] = useState<RouteSelection>({})
  const [isExporting, setIsExporting] = useState(false)
  const [exportSummary, setExportSummary] = useState<ExportSummary | null>(null)
  
  const { getInvoiceNumber, getWorldOfficeConfig } = useSystemConfig()
  const { createExportRecord, getPendingOrdersForRoutes, markOrdersAsInvoiced } = useExportHistory()
  const { generateExportData, fetchCompleteOrderData } = useWorldOfficeExport()
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

      // Get pending orders for selected routes
      const pendingOrders = await getPendingOrdersForRoutes(selectedRouteIds)
      
      const summary: ExportSummary = {
        totalRoutes: selectedRouteData.length,
        totalOrders: pendingOrders.length,
        totalAmount: pendingOrders.reduce((sum, order) => sum + (order.total_value || 0), 0),
        routeNames: selectedRouteData.map(route => route.route_name),
        pendingOrders: pendingOrders
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
  }, [getSelectedRouteIds, getPendingOrdersForRoutes, toast])

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
      if (!summary || summary.pendingOrders.length === 0) {
        throw new Error("No hay pedidos pendientes de facturación en las rutas seleccionadas")
      }

      // Get starting invoice number
      const invoiceNumberStart = await getInvoiceNumber()
      const invoiceNumberEnd = invoiceNumberStart + summary.totalOrders - 1

      // Update the last invoice number for the range
      for (let i = 1; i < summary.totalOrders; i++) {
        await getInvoiceNumber()
      }

      // Get complete order data with order items
      const orderIdsForExport = summary.pendingOrders.map(order => order.order_id)
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
      const today = new Date()
      const fileName = `WorldOffice_Rutas_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_${invoiceNumberStart}-${invoiceNumberEnd}.xlsx`

      // Convert to binary for storage
      const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const uint8Array = new Uint8Array(xlsxBuffer)

      // Create export history record
      const exportRecord = await createExportRecord({
        invoice_number_start: invoiceNumberStart,
        invoice_number_end: invoiceNumberEnd,
        total_orders: summary.totalOrders,
        total_amount: summary.totalAmount,
        routes_exported: selectedRouteIds,
        route_names: summary.routeNames,
        file_name: fileName,
        file_data: uint8Array,
        export_summary: {
          routes: summary.routeNames,
          exportDate: today.toISOString(),
          userEmail: currentUser?.email || 'unknown'
        },
        created_by: currentUser?.id || ''
      })

      // Mark orders as invoiced
      const orderIds = summary.pendingOrders.map(order => order.order_id)
      const invoicedCount = await markOrdersAsInvoiced(
        orderIds, 
        exportRecord.id, 
        invoiceNumberStart
      )

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

      // Reset selections
      deselectAllRoutes()
      setExportSummary(null)

      toast({
        title: "Exportación exitosa",
        description: `Se facturaron ${invoicedCount} pedidos de ${summary.totalRoutes} rutas. Facturas: ${invoiceNumberStart} - ${invoiceNumberEnd}`,
      })

      return exportRecord

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