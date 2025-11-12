"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export interface OrderAuditLog {
  id: string
  order_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  changed_by: string | null
  changed_at: string
  ip_address: string | null
  user_agent: string | null
  changed_by_name?: string
  changed_by_email?: string
  changed_by_role?: string
  change_summary?: string
  source_table?: 'orders' | 'order_items' | 'order_item_deliveries' // To distinguish origin
  product_name?: string | null // Product name for order_items and deliveries logs
}

export interface FieldChange {
  field: string
  label: string
  oldValue: any
  newValue: any
  type: 'critical' | 'important' | 'normal'
}

/**
 * Hook to fetch and manage order audit logs
 */
export function useOrderAudit(orderId: string | null) {
  const [logs, setLogs] = useState<OrderAuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setLogs([])
      return
    }

    fetchAuditLogs()
  }, [orderId])

  const fetchAuditLogs = async () => {
    if (!orderId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch logs from all 3 tables in parallel
      const [ordersResult, orderItemsResult, deliveriesResult, productsResult] = await Promise.all([
        // Orders audit
        supabase
          .from('orders_audit_with_user')
          .select('*')
          .eq('order_id', orderId),

        // Order items audit
        supabase
          .from('order_items_audit_with_user')
          .select('*')
          .eq('order_id', orderId),

        // Order item deliveries audit
        supabase
          .from('order_item_deliveries_audit_with_user')
          .select('*')
          .eq('order_id', orderId),

        // Get all products to map names
        supabase
          .from('products')
          .select('id, name, weight')
      ])

      // Check for errors
      if (ordersResult.error) throw ordersResult.error
      if (orderItemsResult.error) throw orderItemsResult.error
      if (deliveriesResult.error) throw deliveriesResult.error

      // Create a product map for quick lookup
      const productMap = new Map<string, { name: string; weight: string | null }>()
      if (productsResult.data) {
        productsResult.data.forEach(product => {
          productMap.set(product.id, { name: product.name, weight: product.weight })
        })
      }

      // Enrich order items logs with product names
      const enrichedOrderItemsLogs = (orderItemsResult.data || []).map(log => {
        const productId = log.new_data?.product_id || log.old_data?.product_id
        const product = productId ? productMap.get(productId) : null

        return {
          ...log,
          source_table: 'order_items' as const,
          product_name: product ? `${product.name}${product.weight ? ` (${product.weight})` : ''}` : null
        }
      })

      // Enrich deliveries logs with product names (via order_item_id)
      const enrichedDeliveriesLogs = await Promise.all(
        (deliveriesResult.data || []).map(async (log) => {
          const orderItemId = log.new_data?.order_item_id || log.old_data?.order_item_id
          let productName = null

          if (orderItemId) {
            // Get product_id from order_items
            const { data: orderItem } = await supabase
              .from('order_items')
              .select('product_id')
              .eq('id', orderItemId)
              .single()

            if (orderItem?.product_id) {
              const product = productMap.get(orderItem.product_id)
              if (product) {
                productName = `${product.name}${product.weight ? ` (${product.weight})` : ''}`
              }
            }
          }

          return {
            ...log,
            source_table: 'order_item_deliveries' as const,
            product_name: productName
          }
        })
      )

      // Combine all logs
      const allLogs: OrderAuditLog[] = [
        ...(ordersResult.data || []).map(log => ({ ...log, source_table: 'orders' as const })),
        ...enrichedOrderItemsLogs,
        ...enrichedDeliveriesLogs
      ]

      // Sort by timestamp descending
      allLogs.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())

      setLogs(allLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching audit logs')
      console.error('Error fetching audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    logs,
    loading,
    error,
    refetch: fetchAuditLogs,
  }
}

/**
 * Parse changes from an audit log entry
 */
export function parseOrderChanges(log: OrderAuditLog): FieldChange[] {
  // Handle different source tables
  if (log.source_table === 'order_items') {
    return parseOrderItemChanges(log)
  }

  if (log.source_table === 'order_item_deliveries') {
    return parseDeliveryChanges(log)
  }

  // Default: orders table
  if (log.action === 'INSERT') {
    return [{
      field: 'order',
      label: 'Orden',
      oldValue: null,
      newValue: 'Creada',
      type: 'critical'
    }]
  }

  if (log.action === 'DELETE') {
    return [{
      field: 'order',
      label: 'Orden',
      oldValue: 'Existente',
      newValue: 'Eliminada',
      type: 'critical'
    }]
  }

  if (!log.old_data || !log.new_data) {
    return []
  }

  const changes: FieldChange[] = []
  const oldData = log.old_data
  const newData = log.new_data

  // Define field mappings and their importance
  const fieldConfig: Record<string, { label: string; type: FieldChange['type']; formatter?: (value: any) => string }> = {
    status: {
      label: 'Estado',
      type: 'critical',
      formatter: (value) => formatStatus(value)
    },
    assigned_route_id: {
      label: 'Ruta asignada',
      type: 'critical',
      formatter: (value) => value ? 'Asignada' : 'Sin asignar'
    },
    client_id: {
      label: 'Cliente',
      type: 'critical'
    },
    branch_id: {
      label: 'Sucursal',
      type: 'important'
    },
    total_value: {
      label: 'Valor total',
      type: 'critical',
      formatter: (value) => formatCurrency(value)
    },
    expected_delivery_date: {
      label: 'Fecha de entrega esperada',
      type: 'important',
      formatter: (value) => formatDate(value)
    },
    requested_delivery_date: {
      label: 'Fecha de entrega solicitada',
      type: 'important',
      formatter: (value) => formatDate(value)
    },
    purchase_order_number: {
      label: 'Número de orden de compra',
      type: 'normal'
    },
    observations: {
      label: 'Observaciones',
      type: 'normal'
    },
    is_invoiced: {
      label: 'Facturado',
      type: 'important',
      formatter: (value) => value ? 'Sí' : 'No'
    },
    invoiced_at: {
      label: 'Fecha de facturación',
      type: 'important',
      formatter: (value) => value ? formatDate(value) : 'N/A'
    },
    requires_remision: {
      label: 'Requiere remisión',
      type: 'important',
      formatter: (value) => value ? 'Sí' : 'No'
    }
  }

  // Compare all fields
  for (const [field, config] of Object.entries(fieldConfig)) {
    const oldValue = oldData[field]
    const newValue = newData[field]

    // Only log if value actually changed
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        label: config.label,
        oldValue: config.formatter ? config.formatter(oldValue) : oldValue,
        newValue: config.formatter ? config.formatter(newValue) : newValue,
        type: config.type
      })
    }
  }

  return changes
}

/**
 * Parse changes from order_items audit log
 */
function parseOrderItemChanges(log: OrderAuditLog): FieldChange[] {
  // Use product name if available, otherwise show generic label
  const productLabel = log.product_name ? ` - ${log.product_name}` : ''

  if (log.action === 'INSERT') {
    return [{
      field: 'product',
      label: `Producto agregado${productLabel}`,
      oldValue: null,
      newValue: `Cantidad: ${log.new_data?.quantity_requested || 0}`,
      type: 'important'
    }]
  }

  if (log.action === 'DELETE') {
    return [{
      field: 'product',
      label: `Producto eliminado${productLabel}`,
      oldValue: `Cantidad: ${log.old_data?.quantity_requested || 0}`,
      newValue: null,
      type: 'important'
    }]
  }

  if (!log.old_data || !log.new_data) {
    return []
  }

  const changes: FieldChange[] = []
  const oldData = log.old_data
  const newData = log.new_data

  // Order items specific fields with product context
  const itemFieldConfig: Record<string, { label: string; type: FieldChange['type']; formatter?: (value: any) => string }> = {
    quantity_requested: {
      label: `Cantidad solicitada${productLabel}`,
      type: 'critical'
    },
    quantity_available: {
      label: `Cantidad disponible${productLabel}`,
      type: 'important'
    },
    quantity_missing: {
      label: `Cantidad faltante${productLabel}`,
      type: 'important'
    },
    quantity_dispatched: {
      label: `Cantidad despachada${productLabel}`,
      type: 'critical'
    },
    quantity_delivered: {
      label: `Cantidad entregada${productLabel}`,
      type: 'critical'
    },
    quantity_returned: {
      label: `Cantidad devuelta${productLabel}`,
      type: 'important'
    },
    unit_price: {
      label: `Precio unitario${productLabel}`,
      type: 'important',
      formatter: (value) => formatCurrency(value)
    },
    availability_status: {
      label: `Estado de disponibilidad${productLabel}`,
      type: 'normal'
    },
    product_id: {
      label: 'Producto',
      type: 'critical'
    }
  }

  for (const [field, config] of Object.entries(itemFieldConfig)) {
    const oldValue = oldData[field]
    const newValue = newData[field]

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        label: config.label,
        oldValue: config.formatter ? config.formatter(oldValue) : oldValue,
        newValue: config.formatter ? config.formatter(newValue) : newValue,
        type: config.type
      })
    }
  }

  return changes
}

/**
 * Parse changes from order_item_deliveries audit log
 */
function parseDeliveryChanges(log: OrderAuditLog): FieldChange[] {
  // Use product name if available, otherwise show generic label
  const productLabel = log.product_name ? ` - ${log.product_name}` : ''

  if (log.action === 'INSERT') {
    return [{
      field: 'delivery',
      label: `Entrega registrada${productLabel}`,
      oldValue: null,
      newValue: `${log.new_data?.quantity_delivered || 0} unidades`,
      type: 'critical'
    }]
  }

  if (log.action === 'DELETE') {
    return [{
      field: 'delivery',
      label: `Registro de entrega eliminado${productLabel}`,
      oldValue: `${log.old_data?.quantity_delivered || 0} unidades`,
      newValue: null,
      type: 'important'
    }]
  }

  if (!log.old_data || !log.new_data) {
    return []
  }

  const changes: FieldChange[] = []
  const oldData = log.old_data
  const newData = log.new_data

  // Delivery specific fields with product context
  const deliveryFieldConfig: Record<string, { label: string; type: FieldChange['type']; formatter?: (value: any) => string }> = {
    delivery_status: {
      label: `Estado de entrega${productLabel}`,
      type: 'critical',
      formatter: (value) => {
        const statusMap: Record<string, string> = {
          delivered: 'Entregado',
          partial: 'Parcial',
          rejected: 'Rechazado',
          pending: 'Pendiente'
        }
        return statusMap[value] || value
      }
    },
    quantity_delivered: {
      label: `Cantidad entregada${productLabel}`,
      type: 'critical'
    },
    quantity_rejected: {
      label: `Cantidad rechazada${productLabel}`,
      type: 'important'
    },
    rejection_reason: {
      label: `Razón de rechazo${productLabel}`,
      type: 'important'
    },
    delivered_at: {
      label: `Fecha de entrega${productLabel}`,
      type: 'normal',
      formatter: (value) => formatDate(value)
    },
    delivery_notes: {
      label: `Notas de entrega${productLabel}`,
      type: 'normal'
    }
  }

  for (const [field, config] of Object.entries(deliveryFieldConfig)) {
    const oldValue = oldData[field]
    const newValue = newData[field]

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        label: config.label,
        oldValue: config.formatter ? config.formatter(oldValue) : oldValue,
        newValue: config.formatter ? config.formatter(newValue) : newValue,
        type: config.type
      })
    }
  }

  return changes
}

/**
 * Format helpers
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    received: 'Recibido',
    review_area1: 'Revisión Área 1',
    review_area2: 'Revisión Área 2',
    ready_dispatch: 'Listo para despacho',
    dispatched: 'Despachado',
    in_delivery: 'En entrega',
    delivered: 'Entregado',
    partially_delivered: 'Entregado parcialmente',
    returned: 'Devuelto',
    remisionado: 'Remisionado'
  }
  return statusMap[status] || status
}

function formatCurrency(value: any): string {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

function formatDate(value: any): string {
  if (!value) return 'N/A'
  try {
    const dateString = String(value)

    // Check if it's a date-only string (YYYY-MM-DD) without time component
    const hasTime = dateString.includes('T') || dateString.includes(' ')

    let dateObj: Date

    if (!hasTime && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Parse date-only strings as local date to avoid timezone issues
      const parts = dateString.split('-').map(p => parseInt(p, 10))
      dateObj = new Date(parts[0], parts[1] - 1, parts[2]) // month is 0-indexed
    } else {
      // For timestamps with time, parse normally
      dateObj = new Date(dateString)
    }

    return dateObj.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return value
  }
}

/**
 * Get a human-readable summary of changes
 */
export function getChangeSummary(log: OrderAuditLog): string {
  const changes = parseOrderChanges(log)

  if (log.action === 'INSERT') {
    return 'Orden creada'
  }

  if (log.action === 'DELETE') {
    return 'Orden eliminada'
  }

  if (changes.length === 0) {
    return 'Sin cambios detectados'
  }

  // Prioritize critical changes in summary
  const criticalChanges = changes.filter(c => c.type === 'critical')
  if (criticalChanges.length > 0) {
    return criticalChanges.map(c => `${c.label}: ${c.oldValue} → ${c.newValue}`).join(', ')
  }

  return changes.map(c => `${c.label} modificado`).join(', ')
}

/**
 * Format relative time (e.g., "hace 2 horas")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'ahora mismo'
  if (diffMins < 60) return `hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  if (diffDays < 7) return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`

  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
