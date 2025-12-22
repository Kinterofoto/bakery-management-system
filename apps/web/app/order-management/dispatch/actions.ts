"use server"

import { cookies } from 'next/headers'

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Helper to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {})
  }
}

// === Types ===

export interface RouteListItem {
  id: string
  route_number: number | null
  route_name: string
  route_date: string
  status: string
  driver_id: string | null
  driver_name: string | null
  vehicle_id: string | null
  vehicle_code: string | null
  orders_count: number
  created_at: string | null
}

export interface RouteOrderInfo {
  id: string
  order_id: string
  delivery_sequence: number
  order_number: string | null
  client_name: string | null
  branch_name: string | null
  expected_delivery_date: string | null
  status: string | null
  items_count: number | null
}

export interface RouteDetail extends RouteListItem {
  route_orders: RouteOrderInfo[]
}

export interface RouteListResponse {
  routes: RouteListItem[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface DispatchStats {
  active_routes: number
  dispatched_today: number
  unassigned_orders: number
  ready_for_dispatch: number
}

export interface DispatchOrderResponse {
  success: boolean
  order_id: string
  new_status: string
  inventory_movements_created: boolean
  inventory_errors: string[] | null
  message: string
}

export interface VehicleItem {
  id: string
  vehicle_code: string
  plate_number: string | null
  capacity: number | null
  status: string | null
  driver_id: string | null
}

export interface DriverItem {
  id: string
  name: string
  email: string | null
  cedula: string | null
}

// === Routes Server Actions ===

export async function getRoutes(params: {
  status?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
  exclude_completed?: boolean
} = {}): Promise<{ data: RouteListResponse | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams()
    if (params.status) searchParams.set("status", params.status)
    if (params.date_from) searchParams.set("date_from", params.date_from)
    if (params.date_to) searchParams.set("date_to", params.date_to)
    if (params.page) searchParams.set("page", params.page.toString())
    if (params.limit) searchParams.set("limit", params.limit.toString())
    if (params.exclude_completed !== undefined) searchParams.set("exclude_completed", params.exclude_completed.toString())

    const query = searchParams.toString()
    const url = `${API_URL}/api/routes/${query ? `?${query}` : ""}`

    const response = await fetch(url, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching routes" }
  }
}

export async function getRoute(routeId: string): Promise<{ data: RouteDetail | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/routes/${routeId}`, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching route" }
  }
}

export async function createRoute(input: {
  route_name: string
  route_date: string
  driver_id?: string | null
  vehicle_id?: string | null
}): Promise<{ data: { success: boolean; route: any; message: string } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/routes/`, {
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
    return { data: null, error: err instanceof Error ? err.message : "Error creating route" }
  }
}

export async function updateRoute(
  routeId: string,
  input: {
    driver_id?: string | null
    vehicle_id?: string | null
    status?: string
  }
): Promise<{ data: { success: boolean; route: any; message: string } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/routes/${routeId}`, {
      method: "PATCH",
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
    return { data: null, error: err instanceof Error ? err.message : "Error updating route" }
  }
}

// === Route Orders Server Actions ===

export async function getRouteOrders(routeId: string): Promise<{ data: { orders: any[]; total: number } | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/routes/${routeId}/orders`, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching route orders" }
  }
}

export async function getUnassignedOrders(): Promise<{ data: { orders: any[]; total: number } | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/routes/unassigned`, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching unassigned orders" }
  }
}

export async function assignOrdersToRoute(
  routeId: string,
  orderIds: string[]
): Promise<{ data: { success: boolean; assigned_count: number; message: string } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/routes/${routeId}/orders`, {
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
    return { data: null, error: err instanceof Error ? err.message : "Error assigning orders to route" }
  }
}

export async function removeOrderFromRoute(
  routeId: string,
  orderId: string
): Promise<{ data: { success: boolean; message: string } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/routes/${routeId}/orders/${orderId}`, {
      method: "DELETE",
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error removing order from route" }
  }
}

export async function reorderRouteSequence(
  routeId: string,
  items: Array<{ route_order_id: string; new_sequence: number }>
): Promise<{ data: { success: boolean; updated_count: number; message: string } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/routes/${routeId}/orders/sequence`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ items }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error reordering sequence" }
  }
}

export async function swapOrderPositions(
  routeId: string,
  routeOrderId1: string,
  routeOrderId2: string
): Promise<{ data: { success: boolean; message: string } | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const searchParams = new URLSearchParams()
    searchParams.set("route_order_id_1", routeOrderId1)
    searchParams.set("route_order_id_2", routeOrderId2)

    const response = await fetch(`${API_URL}/api/routes/${routeId}/orders/swap?${searchParams.toString()}`, {
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
    return { data: null, error: err instanceof Error ? err.message : "Error swapping order positions" }
  }
}

// === Dispatch Server Actions ===

export async function getDispatchStats(): Promise<{ data: DispatchStats | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/dispatch/stats`, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching dispatch stats" }
  }
}

export async function dispatchOrder(
  orderId: string,
  options: {
    route_id?: string
    create_inventory_movements?: boolean
  } = {}
): Promise<{ data: DispatchOrderResponse | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/dispatch/orders/${orderId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        route_id: options.route_id,
        create_inventory_movements: options.create_inventory_movements ?? true,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error dispatching order" }
  }
}

export async function getOrdersReadyForDispatch(params: {
  assigned_only?: boolean
  unassigned_only?: boolean
  route_id?: string
} = {}): Promise<{ data: { orders: any[]; total: number } | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams()
    if (params.assigned_only) searchParams.set("assigned_only", "true")
    if (params.unassigned_only) searchParams.set("unassigned_only", "true")
    if (params.route_id) searchParams.set("route_id", params.route_id)

    const query = searchParams.toString()
    const url = `${API_URL}/api/dispatch/orders/ready${query ? `?${query}` : ""}`

    const response = await fetch(url, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching ready orders" }
  }
}

// === Master Data Server Actions ===

export async function getVehicles(): Promise<{ data: { vehicles: VehicleItem[] } | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/vehicles`, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching vehicles" }
  }
}

export async function getDrivers(): Promise<{ data: { drivers: DriverItem[] } | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/drivers`, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching drivers" }
  }
}

export async function getReceivingSchedules(): Promise<{ data: { schedules: any[] } | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/receiving-schedules`, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching receiving schedules" }
  }
}

export async function getClientFrequencies(): Promise<{ data: { frequencies: any[] } | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/client-frequencies`, { cache: "no-store" })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching client frequencies" }
  }
}
