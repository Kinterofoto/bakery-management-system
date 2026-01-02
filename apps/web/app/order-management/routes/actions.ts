"use server"

import { cookies } from "next/headers"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// === AUTH HELPERS ===

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("sb-access-token")?.value
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get("sb-access-token")?.value || null
}

// === TYPES ===

export interface RouteListResponse {
  routes: any[]
  total: number
  page: number
  limit: number
  total_pages: number
  has_more: boolean
}

export interface RoutesInitResponse {
  success: boolean
  routes: any[]
  vehicles: any[]
  drivers: any[]
  stats: {
    active_routes: number
    total_vehicles: number
    total_drivers: number
  }
  error?: string
}

export interface ItemReceiveUpdate {
  item_id: string
  quantity_available: number
  quantity_missing: number
}

export interface ItemDeliveryUpdate {
  item_id: string
  delivery_status: string
  quantity_delivered: number
  quantity_rejected?: number
  rejection_reason?: string
}

export interface CompleteDeliveryData {
  route_order_id: string
  order_id: string
  evidence_url: string
  items: ItemDeliveryUpdate[]
  general_return_reason?: string
}

export interface CreateReturnData {
  order_id: string
  product_id: string
  quantity_returned: number
  return_reason: string
  route_id?: string
  rejection_reason?: string
}

// === READ OPERATIONS ===

export async function getRoutesInit(): Promise<{
  data: RoutesInitResponse | null
  error: string | null
}> {
  try {
    const token = await getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}/api/routes/init`, {
      cache: "no-store",
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error fetching routes init",
    }
  }
}

export async function getDriverRoutes(
  driverId: string,
  role: string,
  page: number = 1
): Promise<{ data: RouteListResponse | null; error: string | null }> {
  try {
    const token = await getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const params = new URLSearchParams({
      role,
      page: page.toString(),
      limit: "20",
    })

    const response = await fetch(
      `${API_URL}/api/routes/driver/${driverId}?${params}`,
      {
        cache: "no-store",
        headers,
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error fetching driver routes",
    }
  }
}

export async function getCompletedRoutes(
  driverId: string,
  role: string,
  page: number = 1
): Promise<{ data: RouteListResponse | null; error: string | null }> {
  try {
    const token = await getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const params = new URLSearchParams({
      role,
      page: page.toString(),
      limit: "20",
    })

    if (driverId) {
      params.set("driver_id", driverId)
    }

    const response = await fetch(
      `${API_URL}/api/routes/completed/list?${params}`,
      {
        cache: "no-store",
        headers,
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error fetching completed routes",
    }
  }
}

export async function getPendingOrders(
  driverId: string,
  role: string
): Promise<{ data: { orders: any[]; total: number } | null; error: string | null }> {
  try {
    const token = await getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const params = new URLSearchParams({ role })

    const response = await fetch(
      `${API_URL}/api/routes/pending-orders/${driverId}?${params}`,
      {
        cache: "no-store",
        headers,
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error fetching pending orders",
    }
  }
}

// === WRITE OPERATIONS ===

export async function uploadEvidence(
  formData: FormData
): Promise<{ data: { success: boolean; evidence_url: string } | null; error: string | null }> {
  try {
    const token = await getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    // Note: Don't set Content-Type for FormData, browser will set it with boundary

    const response = await fetch(`${API_URL}/api/routes/upload-evidence`, {
      method: "POST",
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error uploading evidence",
    }
  }
}

export async function receiveOrderToRoute(
  orderId: string,
  items: ItemReceiveUpdate[]
): Promise<{ data: any | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_URL}/api/routes/receive`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: orderId,
        items,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error receiving order",
    }
  }
}

export async function completeDelivery(
  deliveryData: CompleteDeliveryData
): Promise<{ data: any | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_URL}/api/routes/complete-delivery`, {
      method: "POST",
      headers,
      body: JSON.stringify(deliveryData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error completing delivery",
    }
  }
}

export async function createReturn(
  returnData: CreateReturnData
): Promise<{ data: any | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_URL}/api/routes/returns`, {
      method: "POST",
      headers,
      body: JSON.stringify(returnData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error creating return",
    }
  }
}

export async function completeRoute(
  routeId: string
): Promise<{ data: any | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_URL}/api/routes/${routeId}/complete`, {
      method: "PATCH",
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error completing route",
    }
  }
}
