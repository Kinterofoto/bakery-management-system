"use server"

import { cookies } from 'next/headers'

// API base URL - server-side can use internal URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Helper to get auth headers for write operations
async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {})
  }
}

// === Types ===

export interface PendingOrderItem {
  id: string
  product_id: string
  product_name: string | null
  product_code: string | null
  quantity_requested: number | null
  quantity_available: number | null
  unit_price: number | null
  subtotal: number | null
}

export interface PendingOrder {
  id: string
  order_number: string | null
  expected_delivery_date: string | null
  total_value: number | null
  status: string
  requires_remision: boolean | null
  client_id: string | null
  client_name: string | null
  client_razon_social: string | null
  client_nit: string | null
  client_billing_type: string | null
  branch_id: string | null
  branch_name: string | null
  items: PendingOrderItem[]
  items_count: number
  created_at: string | null
}

export interface PendingOrdersResponse {
  orders: PendingOrder[]
  total_count: number
  page: number
  limit: number
}

export interface UnfacturedOrder {
  id: string
  order_id: string
  order_number: string | null
  expected_delivery_date: string | null
  total_value: number | null
  client_name: string | null
  client_nit: string | null
  branch_name: string | null
  remision_id: string
  remision_number: string | null
  remision_created_at: string | null
  remision_total_amount: number | null
}

export interface UnfacturedOrdersResponse {
  orders: UnfacturedOrder[]
  total_count: number
}

export interface RemisionItem {
  id: string
  remision_id: string
  product_id: string | null
  product_name: string | null
  product_unit: string | null
  quantity_delivered: number | null
  unit_price: number | null
  total_price: number | null
  units_per_package: number | null
}

export interface RemisionListItem {
  id: string
  remision_number: string | null
  order_id: string | null
  order_number: string | null
  total_amount: number | null
  client_name: string | null
  client_nit: string | null
  expected_delivery_date: string | null
  branch_name: string | null
  purchase_order_number: string | null
  notes: string | null
  created_at: string | null
  created_by: string | null
  created_by_name: string | null
}

export interface RemisionDetail {
  id: string
  remision_number: string | null
  order_id: string | null
  order_number: string | null
  total_amount: number | null
  client_name: string | null
  client_razon_social: string | null
  client_nit: string | null
  client_phone: string | null
  client_email: string | null
  client_address: string | null
  expected_delivery_date: string | null
  branch_name: string | null
  purchase_order_number: string | null
  items: RemisionItem[]
  notes: string | null
  created_at: string | null
  created_by: string | null
  created_by_name: string | null
}

export interface RemisionsListResponse {
  remisions: RemisionListItem[]
  total_count: number
  page: number
  limit: number
}

export interface ExportHistoryItem {
  id: string
  export_date: string | null
  invoice_number_start: number | null
  invoice_number_end: number | null
  total_orders: number | null
  total_amount: number | null
  file_name: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string | null
}

export interface ExportHistoryResponse {
  exports: ExportHistoryItem[]
  total_count: number
  page: number
  limit: number
}

export interface BillingSummary {
  total_orders: number
  direct_billing_count: number
  remision_count: number
  total_direct_billing_amount: number
  total_remision_amount: number
  total_amount: number
  order_numbers: string[]
}

export interface BillingProcessResponse {
  success: boolean
  summary: BillingSummary
  invoice_number_start: number | null
  invoice_number_end: number | null
  export_history_id: string | null
  remisions_created: number
  excel_file_name: string | null
  errors: string[]
}

// === Server Actions ===

export async function getPendingOrders(params: {
  page?: number
  limit?: number
  client_id?: string
  date?: string
} = {}): Promise<{ data: PendingOrdersResponse | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set("page", params.page.toString())
    if (params.limit) searchParams.set("limit", params.limit.toString())
    if (params.client_id) searchParams.set("client_id", params.client_id)
    if (params.date) searchParams.set("date", params.date)

    const query = searchParams.toString()
    const url = `${API_URL}/api/billing/pending${query ? `?${query}` : ""}`

    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching pending orders" }
  }
}

export async function getUnfacturedOrders(): Promise<{ data: UnfacturedOrdersResponse | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/billing/unfactured`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching unfactured orders" }
  }
}

export async function markOrdersAsInvoiced(
  orderIds: string[]
): Promise<{ data: { success: boolean; updated_count: number } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/billing/unfactured/mark-invoiced`, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_ids: orderIds }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error marking orders as invoiced" }
  }
}

export async function getRemisions(params: {
  page?: number
  limit?: number
  date_from?: string
  date_to?: string
} = {}): Promise<{ data: RemisionsListResponse | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set("page", params.page.toString())
    if (params.limit) searchParams.set("limit", params.limit.toString())
    if (params.date_from) searchParams.set("date_from", params.date_from)
    if (params.date_to) searchParams.set("date_to", params.date_to)

    const query = searchParams.toString()
    const url = `${API_URL}/api/billing/remisions/${query ? `?${query}` : ""}`

    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching remisions" }
  }
}

export async function getRemisionDetail(
  remisionId: string
): Promise<{ data: RemisionDetail | null; error: string | null }> {
  try {
    const url = `${API_URL}/api/billing/remisions/${remisionId}`
    console.log("[getRemisionDetail] Fetching:", url)

    const response = await fetch(url, {
      cache: "no-store",
    })

    console.log("[getRemisionDetail] Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[getRemisionDetail] Error response:", errorText)
      try {
        const errorJson = JSON.parse(errorText)
        return { data: null, error: errorJson.detail || `Error: ${response.status}` }
      } catch {
        return { data: null, error: `Error ${response.status}: ${errorText.substring(0, 200)}` }
      }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    console.error("[getRemisionDetail] Exception:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error fetching remision detail" }
  }
}

export async function getExportHistory(params: {
  page?: number
  limit?: number
} = {}): Promise<{ data: ExportHistoryResponse | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set("page", params.page.toString())
    if (params.limit) searchParams.set("limit", params.limit.toString())

    const query = searchParams.toString()
    const url = `${API_URL}/api/billing/history${query ? `?${query}` : ""}`

    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching export history" }
  }
}

export async function downloadExportFile(
  exportId: string
): Promise<{ data: { base64: string; fileName: string; mimeType: string } | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/billing/history/${exportId}/download`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get("Content-Disposition")
    let fileName = `export_${exportId}.xlsx`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) fileName = match[1]
    }

    // Get mime type
    const mimeType = response.headers.get("Content-Type") || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    // Convert to base64 for serialization (Server Actions can't pass Blob objects)
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    return { data: { base64, fileName, mimeType }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error downloading export file" }
  }
}

export async function processBilling(
  orderIds: string[]
): Promise<{ data: BillingProcessResponse | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/billing/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_ids: orderIds }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error processing billing" }
  }
}

export async function getLastInvoiceNumber(): Promise<{ data: { last_number: number } | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/billing/config/invoice-number`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching invoice number" }
  }
}

export async function createRemision(
  orderId: string
): Promise<{ data: { success: boolean; remision_id: string; remision_number: string; total_amount: number; items_count: number } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/billing/remisions/?order_id=${orderId}`, {
      method: "POST",
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error creating remision" }
  }
}

export async function processUnfacturedBilling(
  orderIds: string[]
): Promise<{ data: BillingProcessResponse | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/billing/unfactured/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_ids: orderIds }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error processing unfactured billing" }
  }
}
