"use server"

// API base URL - server-side can use internal URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// === Types ===

export interface OrderListItem {
  id: string
  order_number: string | null
  expected_delivery_date: string | null
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
  client_id: string | null
  client_name: string | null
  branch_id: string | null
  branch_name: string | null
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
    const response = await fetch(`${API_URL}/api/orders/${orderId}/transition`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`${API_URL}/api/orders/${orderId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`${API_URL}/api/orders/${orderId}/pending-missing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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

// === Client Frequencies ===

export interface ClientFrequency {
  id: string
  client_id: string
  branch_id: string
  day_of_week: number
  is_active: boolean
  created_at: string
}

export async function getClientFrequencies(): Promise<{
  data: ClientFrequency[] | null
  error: string | null
}> {
  try {
    const response = await fetch(`${API_URL}/api/orders/client-frequencies`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data: data.frequencies, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching frequencies" }
  }
}

// === Create Order Server Action ===

export async function createOrder(
  input: CreateOrderInput
): Promise<{ data: OrderCreateResponse | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/orders/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`${API_URL}/api/orders/${orderId}/full`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
