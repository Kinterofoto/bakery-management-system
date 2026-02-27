"use server"

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

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

export interface OrderListItem {
  id: string
  order_number: string | null
  expected_delivery_date: string | null
  requested_delivery_date: string | null  // Original date requested by client
  status: string
  total: number | null
  client_id: string | null
  client_name: string | null
  branch_id: string | null
  branch_name: string | null
  items_count: number
  created_at: string | null
  has_pending_missing: boolean
  // Source identification (woocommerce, outlook, whatsapp, or user name)
  source: string | null
  // Delivery percentage (0-100)
  delivery_percentage: number | null
}

export interface OrderListResponse {
  orders: OrderListItem[]
  total_count: number
  page: number
  limit: number
  has_more: boolean
}

export interface OrderItemDetail {
  id: string
  product_id: string
  product_name: string | null
  product_code: string | null
  quantity_requested: number | null
  quantity_available: number | null
  quantity_missing: number | null
  quantity_dispatched: number | null
  quantity_delivered: number | null
  quantity_returned: number | null
  unit_price: number | null
  subtotal: number | null
  availability_status: string | null
  lote: string | null
}

export interface OrderDetail {
  id: string
  order_number: string | null
  expected_delivery_date: string | null
  requested_delivery_date: string | null
  status: string
  total: number | null
  subtotal: number | null
  vat_amount: number | null
  observations: string | null
  purchase_order_number: string | null
  has_pending_missing: boolean
  is_invoiced: boolean
  created_at: string | null
  updated_at: string | null
  pdf_filename: string | null
  // Client data (full contact info)
  client_id: string | null
  client_name: string | null
  client_razon_social: string | null
  client_address: string | null
  client_phone: string | null
  client_email: string | null
  client_contact_person: string | null
  // Branch data (full contact info)
  branch_id: string | null
  branch_name: string | null
  branch_address: string | null
  branch_phone: string | null
  branch_email: string | null
  branch_contact_person: string | null
  // Creator
  created_by: string | null
  created_by_name: string | null
  items: OrderItemDetail[]
}

export interface OrderStats {
  today: number
  tomorrow: number
  this_week: number
  by_status: Record<string, number>
  total: number
}

export interface DashboardData {
  stats: OrderStats
  recent_orders: Array<{
    id: string
    order_number: string | null
    expected_delivery_date: string | null
    status: string
    total: number | null
    client_name: string | null
  }>
  alerts: {
    pending_missing_count: number
    needs_review_count: number
  }
}

// === Server Actions ===

export async function getOrders(params: {
  view?: "list" | "review_area1" | "review_area2" | "ready_dispatch" | "today" | "tomorrow" | "week"
  page?: number
  limit?: number
  status?: string
  search?: string
  client_id?: string
  date?: string
} = {}): Promise<{ data: OrderListResponse | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams()
    if (params.view) searchParams.set("view", params.view)
    if (params.page) searchParams.set("page", params.page.toString())
    if (params.limit) searchParams.set("limit", params.limit.toString())
    if (params.status) searchParams.set("status", params.status)
    if (params.search) searchParams.set("search", params.search)
    if (params.client_id) searchParams.set("client_id", params.client_id)
    if (params.date) searchParams.set("date", params.date)

    const query = searchParams.toString()
    const url = `${API_URL}/api/orders/${query ? `?${query}` : ""}`

    const response = await fetch(url, {
      cache: "no-store", // Always fresh data
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching orders" }
  }
}

export async function getOrder(orderId: string): Promise<{ data: OrderDetail | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching order" }
  }
}

export async function getOrdersBatch(orderIds: string[]): Promise<{ data: OrderDetail[] | null; error: string | null }> {
  try {
    if (orderIds.length === 0) {
      return { data: [], error: null }
    }

    const response = await fetch(`${API_URL}/api/orders/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: orderIds }),
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching orders batch" }
  }
}

export async function getOrderStats(): Promise<{ data: OrderStats | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/orders/stats`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching stats" }
  }
}

export async function getDashboard(): Promise<{ data: DashboardData | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/orders/dashboard`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching dashboard" }
  }
}

export async function transitionOrder(
  orderId: string,
  newStatus: string,
  notes?: string
): Promise<{ data: { success: boolean; previous_status: string; new_status: string; allowed_next: string[] } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/orders/${orderId}/transition`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ new_status: newStatus, notes }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error transitioning order" }
  }
}

export async function cancelOrder(
  orderId: string,
  reason: string,
  notes?: string
): Promise<{ data: { success: boolean; message: string } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason, notes }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error cancelling order" }
  }
}

export async function batchUpdateItems(
  orderId: string,
  updates: Array<{
    item_id: string
    quantity_available?: number
    availability_status?: string
    lote?: string
    quantity_dispatched?: number
    quantity_delivered?: number
  }>
): Promise<{ data: { success: boolean; updated_count: number; errors: any[] | null } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/orders/${orderId}/items`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ updates }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error updating items" }
  }
}

export async function updatePendingMissing(
  orderId: string,
  hasPendingMissing: boolean
): Promise<{ data: { success: boolean } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/orders/${orderId}/pending-missing`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ has_pending_missing: hasPendingMissing }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error updating pending missing" }
  }
}

// === Order Create/Update Types ===

export interface OrderItemInput {
  id?: string // Existing item id (for updates)
  product_id: string
  quantity_requested: number
  unit_price: number
}

export interface CreateOrderInput {
  client_id: string
  branch_id?: string
  expected_delivery_date: string
  purchase_order_number?: string
  observations?: string
  items: OrderItemInput[]
}

export interface UpdateOrderFullInput {
  client_id?: string
  branch_id?: string
  expected_delivery_date?: string
  purchase_order_number?: string
  observations?: string
  items: OrderItemInput[]
}

export interface OrderCreateResponse {
  id: string
  order_number: string
  status: string
  message: string
}

export interface OrderFullUpdateResponse {
  success: boolean
  order_id: string
  total_value: number
  items_created: number
  items_updated: number
  items_deleted: number
  message: string
}

// === Master Data ===
// Import directly from "@/lib/api/masterdata" for master data functions
// Example: import { getClients, getProducts } from "@/lib/api/masterdata"

// === Create Order Server Action ===

export async function createOrder(
  input: CreateOrderInput
): Promise<{ data: OrderCreateResponse | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/orders/`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error creating order" }
  }
}

// === Full Order Update Server Action ===

export async function updateOrderFull(
  orderId: string,
  input: UpdateOrderFullInput
): Promise<{ data: OrderFullUpdateResponse | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/orders/${orderId}/full`, {
      method: "PUT",
      headers,
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error updating order" }
  }
}

// === Order Weight Calculation ===

function parseWeightToKg(weightStr: string): number | null {
  const cleaned = weightStr.trim().toLowerCase()
  const match = cleaned.match(/^([\d.,]+)\s*(kg|g|gr|kgs|grs|gramos|kilos|kilogramos)?$/)
  if (!match) return null

  const value = parseFloat(match[1].replace(",", "."))
  if (isNaN(value)) return null

  const unit = match[2] || "g"
  if (unit === "kg" || unit === "kgs" || unit === "kilos" || unit === "kilogramos") {
    return value
  }
  return value / 1000
}

export async function getOrderTotalWeight(
  orderId: string
): Promise<{ data: { total_weight_kg: number } | null; error: string | null }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )

    // Fetch items separately (no joins - CLAUDE.md warns about FK schema cache issues)
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity_requested")
      .eq("order_id", orderId)

    if (itemsError) {
      return { data: null, error: itemsError.message }
    }

    if (!items || items.length === 0) {
      return { data: { total_weight_kg: 0 }, error: null }
    }

    // Fetch products with weight and unit
    const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))]
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, weight, unit")
      .in("id", productIds)

    if (productsError) {
      return { data: null, error: productsError.message }
    }

    // Fetch units_per_package from product_config
    // quantity_requested is always in paquetes, so we need units_per_package to get total units
    const { data: configs } = await supabase
      .from("product_config")
      .select("product_id, units_per_package")
      .in("product_id", productIds)

    const productMap = new Map(
      (products || []).map(p => [p.id, { weight: p.weight, unit: p.unit }])
    )
    const configMap = new Map(
      (configs || []).map(c => [c.product_id, c.units_per_package])
    )

    let totalWeightKg = 0
    for (const item of items) {
      if (!item.quantity_requested || !item.product_id) continue

      const product = productMap.get(item.product_id)
      if (!product) continue

      const unitsPerPackage = configMap.get(item.product_id) ?? 1
      const totalUnits = item.quantity_requested * unitsPerPackage

      // If product is sold by kg, quantity_requested is paquetes, totalUnits is the weight in kg
      if (product.unit === "kg") {
        totalWeightKg += totalUnits
        continue
      }

      // If product is sold by grams, totalUnits is the weight in grams
      if (product.unit === "gramos") {
        totalWeightKg += totalUnits / 1000
        continue
      }

      // For products sold by units (unidades, etc.), parse the weight string
      if (product.weight) {
        const weightKg = parseWeightToKg(product.weight)
        if (weightKg !== null) {
          totalWeightKg += weightKg * totalUnits
        }
      }
    }

    return { data: { total_weight_kg: Math.round(totalWeightKg * 100) / 100 }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error calculating weight" }
  }
}
