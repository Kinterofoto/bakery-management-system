"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { useSystemConfig } from "@/hooks/use-system-config"
import { useCreditTerms } from "@/hooks/use-credit-terms"
import { useClientPriceLists } from "@/hooks/use-client-price-lists"
import { useProductConfigs } from "@/hooks/use-product-configs"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface OrderForExport {
  id: string
  order_number: string
  client_id: string
  branch_id: string
  expected_delivery_date: string
  purchase_order_number?: string | null
  client?: {
    id: string
    name: string
    nit?: string | null
    assigned_user?: {
      id: string
      name: string
      cedula?: string | null
    } | null
  }
  branch?: {
    id: string
    name: string
    address: string | null
  }
  order_items?: {
    id: string
    product_id: string
    quantity_available: number
    product?: {
      id: string
      name: string
      price: number | null
      codigo_wo: string | null
      nombre_wo: string | null
      tax_rate: number | null
    }
  }[]
}

interface ExportRow {
  // Exact order as specified
  "Encab: Empresa": string
  "Encab: Tipo Documento": string
  "Encab: Prefijo": string
  "Encab: Documento Número": number
  "Encab: Fecha": string
  "Encab: Tercero Interno": string
  "Encab: Tercero Externo": string
  "Encab: Nota": string
  "Encab: FormaPago": string
  "Encab: Fecha Entrega": string
  "Encab: Prefijo Documento Externo": null
  "Encab: Número_Documento_Externo": null
  "Encab: Verificado": null
  "Encab: Anulado": null
  "Encab: Personalizado 1": null
  "Encab: Personalizado 2": string | null
  "Encab: Personalizado 3": null
  "Encab: Personalizado 4": null
  "Encab: Personalizado 5": null
  "Encab: Personalizado 6": null
  "Encab: Personalizado 7": null
  "Encab: Personalizado 8": null
  "Encab: Personalizado 9": null
  "Encab: Personalizado 10": null
  "Encab: Personalizado 11": null
  "Encab: Personalizado 12": null
  "Encab: Personalizado 13": null
  "Encab: Personalizado 14": null
  "Encab: Personalizado 15": null
  "Encab: Sucursal": string
  "Encab: Clasificación": null
  "Detalle: Producto": string
  "Detalle: Bodega": string
  "Detalle: UnidadDeMedida": string
  "Cantidad": number
  "Detalle: IVA": number
  "Detalle: Valor Unitario": number
  "Detalle: Descuento": number
  "Detalle: Vencimiento": string
  "Detalle: Nota": null
  "Detalle: Centro costos": null
  "Detalle: Personalizado1": null
  "Detalle: Personalizado2": null
  "Detalle: Personalizado3": null
  "Detalle: Personalizado4": null
  "Detalle: Personalizado5": null
  "Detalle: Personalizado6": null
  "Detalle: Personalizado7": null
  "Detalle: Personalizado8": null
  "Detalle: Personalizado9": null
  "Detalle: Personalizado10": null
  "Detalle: Personalizado11": null
  "Detalle: Personalizado12": null
  "Detalle: Personalizado13": null
  "Detalle: Personalizado14": null
  "Detalle: Personalizado15": null
  "Detalle: Código Centro Costos": null
}

export function useWorldOfficeExport() {
  const [exporting, setExporting] = useState(false)
  const { getWorldOfficeConfig, getConfigNumber, updateConfig } = useSystemConfig()
  const { calculateDueDate } = useCreditTerms()
  const { calculateUnitPrice } = useClientPriceLists()
  const { productConfigs } = useProductConfigs()
  const { toast } = useToast()

  const fetchCompleteOrderData = async (orderIds: string[]): Promise<OrderForExport[]> => {
    try {
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
            nit,
            assigned_user_id,
            assigned_user:users!assigned_user_id (
              id,
              name,
              cedula
            )
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
        .eq("status", "ready_dispatch")
        .eq("is_invoiced", false)

      if (error) {
        throw error
      }

      return data as OrderForExport[]
    } catch (error: any) {
      console.error("Error fetching complete order data:", error)
      throw error
    }
  }

  // Helper function to format dates to DD/MM/YYYY
  const formatDateForExport = (dateString: string): string => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const generateExportData = async (orders: OrderForExport[]): Promise<ExportRow[]> => {
    const woConfig = getWorldOfficeConfig()
    const exportRows: ExportRow[] = []

    // Filter orders that have items
    const validOrders = orders.filter(order => order.order_items && order.order_items.length > 0)

    // Get starting invoice number
    const startingInvoiceNumber = getConfigNumber("invoice_last_number") || 63629

    // Assign consecutive numbers to each order
    const orderInvoiceMap = new Map<string, number>()
    validOrders.forEach((order, index) => {
      orderInvoiceMap.set(order.id, startingInvoiceNumber + index + 1)
    })

    // Update the last invoice number in config (once at the end)
    const finalInvoiceNumber = startingInvoiceNumber + validOrders.length
    await updateConfig("invoice_last_number", finalInvoiceNumber.toString())

    // Each order gets its own consecutive invoice number
    for (const order of validOrders) {
      // Get pre-assigned invoice number for this order
      const invoiceNumber = orderInvoiceMap.get(order.id)!

      // Calculate branch info for Encab: Sucursal
      const branchInfo = order.branch?.name || order.client?.name || ""

      // Format delivery date to DD/MM/YYYY
      const deliveryDateFormatted = formatDateForExport(order.expected_delivery_date)

      // Calculate due date: delivery date + credit days
      const dueDateRaw = calculateDueDate(
        order.expected_delivery_date,
        order.client_id
      )
      const dueDateFormatted = formatDateForExport(dueDateRaw)

      for (const item of order.order_items) {
        if (!item.product || item.quantity_available <= 0) continue

        // Find product config for unit conversion
        const productConfig = productConfigs.find(pc => pc.product_id === item.product_id)
        const unitsPerPackage = productConfig?.units_per_package || 1

        // Convert quantity from packages to units
        const quantityInUnits = item.quantity_available * unitsPerPackage

        // Calculate unit price
        const packagePrice = item.product.price || 0
        const unitPrice = calculateUnitPrice(
          packagePrice,
          unitsPerPackage,
          item.product_id,
          order.client_id
        )

        // Calculate IVA based on product tax_rate
        const productTaxRate = item.product.tax_rate || 0
        const ivaRate = productTaxRate === 0 ? 0 : productTaxRate / 100

        const row: ExportRow = {
          // Exact order as specified
          "Encab: Empresa": woConfig.companyName,
          "Encab: Tipo Documento": woConfig.documentType,
          "Encab: Prefijo": woConfig.documentPrefix,
          "Encab: Documento Número": invoiceNumber,
          "Encab: Fecha": deliveryDateFormatted,
          "Encab: Tercero Interno": order.client?.assigned_user?.cedula || woConfig.thirdPartyInternal,
          "Encab: Tercero Externo": order.client?.nit || woConfig.thirdPartyExternal,
          "Encab: Nota": "",
          "Encab: FormaPago": "Credito",
          "Encab: Fecha Entrega": deliveryDateFormatted,
          "Encab: Prefijo Documento Externo": null,
          "Encab: Número_Documento_Externo": null,
          "Encab: Verificado": null,
          "Encab: Anulado": null,
          "Encab: Personalizado 1": null,
          "Encab: Personalizado 2": order.purchase_order_number || null,
          "Encab: Personalizado 3": null,
          "Encab: Personalizado 4": null,
          "Encab: Personalizado 5": null,
          "Encab: Personalizado 6": null,
          "Encab: Personalizado 7": null,
          "Encab: Personalizado 8": null,
          "Encab: Personalizado 9": null,
          "Encab: Personalizado 10": null,
          "Encab: Personalizado 11": null,
          "Encab: Personalizado 12": null,
          "Encab: Personalizado 13": null,
          "Encab: Personalizado 14": null,
          "Encab: Personalizado 15": null,
          "Encab: Sucursal": branchInfo,
          "Encab: Clasificación": null,
          "Detalle: Producto": item.product.codigo_wo || item.product.name,
          "Detalle: Bodega": woConfig.warehouse,
          "Detalle: UnidadDeMedida": woConfig.unitMeasure,
          "Cantidad": quantityInUnits,
          "Detalle: IVA": ivaRate,
          "Detalle: Valor Unitario": Math.round(unitPrice),
          "Detalle: Descuento": 0,
          "Detalle: Vencimiento": dueDateFormatted,
          "Detalle: Nota": null,
          "Detalle: Centro costos": null,
          "Detalle: Personalizado1": null,
          "Detalle: Personalizado2": null,
          "Detalle: Personalizado3": null,
          "Detalle: Personalizado4": null,
          "Detalle: Personalizado5": null,
          "Detalle: Personalizado6": null,
          "Detalle: Personalizado7": null,
          "Detalle: Personalizado8": null,
          "Detalle: Personalizado9": null,
          "Detalle: Personalizado10": null,
          "Detalle: Personalizado11": null,
          "Detalle: Personalizado12": null,
          "Detalle: Personalizado13": null,
          "Detalle: Personalizado14": null,
          "Detalle: Personalizado15": null,
          "Detalle: Código Centro Costos": null,
        }

        exportRows.push(row)
      }
    }

    return exportRows
  }

  const exportToXLSX = async (orders: OrderForExport[]) => {
    try {
      setExporting(true)
      
      if (!orders.length) {
        toast({
          title: "No hay datos",
          description: "No hay pedidos disponibles para exportar",
          variant: "destructive",
        })
        return
      }

      // Validate that products have World Office codes
      const missingCodes = orders.flatMap(order => 
        order.order_items?.filter(item => 
          !item.product?.codigo_wo && item.quantity_available > 0
        ) || []
      )

      if (missingCodes.length > 0) {
        toast({
          title: "Códigos faltantes",
          description: `${missingCodes.length} productos no tienen código de World Office configurado`,
          variant: "destructive",
        })
        return
      }

      const exportData = await generateExportData(orders)
      
      if (!exportData.length) {
        toast({
          title: "No hay datos",
          description: "No se generaron filas para exportar",
          variant: "destructive",
        })
        return
      }

      // Create workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Add the main sheet
      XLSX.utils.book_append_sheet(wb, ws, "Encab+Movim.Inven Talla y Color")
      
      // Add secondary sheet with IVA (like in the template)
      const woConfig = getWorldOfficeConfig()
      const ivaData = [{ IVA: woConfig.ivaRate }]
      const ivaWs = XLSX.utils.json_to_sheet(ivaData)
      XLSX.utils.book_append_sheet(wb, ivaWs, "Hoja1")

      // Generate filename with current date
      const today = new Date()
      const filename = `WorldOffice_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.xlsx`

      // Save file
      XLSX.writeFile(wb, filename)

      toast({
        title: "Exportación exitosa",
        description: `Se generó el archivo ${filename} con ${exportData.length} productos`,
      })

    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "Error en exportación",
        description: error.message || "No se pudo generar el archivo",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  return {
    exportToXLSX,
    exporting,
    generateExportData,
    fetchCompleteOrderData
  }
}