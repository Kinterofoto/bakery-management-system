"use server"

/**
 * Master Data Server Actions
 *
 * Shared across all V2 modules - reusable anywhere in the app.
 * All data fetched through FastAPI backend (no direct Supabase calls).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// === Types ===

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  nit: string | null
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number | null
  weight: number | null
  category: string | null
  is_active: boolean
  created_at: string
}

export interface Branch {
  id: string
  name: string
  address: string | null
  client_id: string
  client: { id: string; name: string } | null
  created_at: string
}

export interface ReceivingSchedule {
  id: string
  branch_id: string
  day_of_week: number
  start_time: string
  end_time: string
  created_at: string
}

export interface ProductConfig {
  id: string
  product_id: string
  product: { id: string; name: string; description: string | null; weight: number | null; price: number | null } | null
  config_type: string
  config_value: string | null
  created_at: string
}

export interface ClientFrequency {
  id: string
  client_id: string
  branch_id: string
  day_of_week: number
  is_active: boolean
  created_at: string
}

// === API Response Type ===

type ApiResult<T> = { data: T | null; error: string | null }

// === Server Actions ===

export async function getClients(): Promise<ApiResult<Client[]>> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/clients`, { cache: "no-store" })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }
    const data = await response.json()
    return { data: data.clients, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching clients" }
  }
}

export async function getProducts(params?: {
  activeOnly?: boolean
  category?: string
}): Promise<ApiResult<Product[]>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.activeOnly !== undefined) searchParams.set("active_only", params.activeOnly.toString())
    if (params?.category) searchParams.set("category", params.category)

    const query = searchParams.toString()
    const url = `${API_URL}/api/masterdata/products${query ? `?${query}` : ""}`

    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }
    const data = await response.json()
    return { data: data.products, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching products" }
  }
}

export async function getBranches(): Promise<ApiResult<Branch[]>> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/branches`, { cache: "no-store" })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }
    const data = await response.json()
    return { data: data.branches, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching branches" }
  }
}

export async function getReceivingSchedules(): Promise<ApiResult<ReceivingSchedule[]>> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/receiving-schedules`, { cache: "no-store" })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }
    const data = await response.json()
    return { data: data.schedules, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching receiving schedules" }
  }
}

export async function getProductConfigs(): Promise<ApiResult<ProductConfig[]>> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/product-configs`, { cache: "no-store" })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }
    const data = await response.json()
    return { data: data.configs, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching product configs" }
  }
}

export async function getClientFrequencies(): Promise<ApiResult<ClientFrequency[]>> {
  try {
    const response = await fetch(`${API_URL}/api/masterdata/client-frequencies`, { cache: "no-store" })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }
    const data = await response.json()
    return { data: data.frequencies, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching client frequencies" }
  }
}

// === Helper Functions ===

/**
 * Get branches filtered by client ID
 */
export async function getBranchesByClient(clientId: string): Promise<ApiResult<Branch[]>> {
  const result = await getBranches()
  if (result.error || !result.data) return result

  const filtered = result.data.filter(b => b.client_id === clientId)
  return { data: filtered, error: null }
}

/**
 * Get frequencies filtered by branch ID
 */
export async function getFrequenciesByBranch(branchId: string): Promise<ApiResult<ClientFrequency[]>> {
  const result = await getClientFrequencies()
  if (result.error || !result.data) return result

  const filtered = result.data.filter(f => f.branch_id === branchId)
  return { data: filtered, error: null }
}

/**
 * Get schedules filtered by branch ID
 */
export async function getSchedulesByBranch(branchId: string): Promise<ApiResult<ReceivingSchedule[]>> {
  const result = await getReceivingSchedules()
  if (result.error || !result.data) return result

  const filtered = result.data.filter(s => s.branch_id === branchId)
  return { data: filtered, error: null }
}

/**
 * Get only finished products (categories PT, PP)
 */
export async function getFinishedProducts(): Promise<ApiResult<Product[]>> {
  return getProducts({ activeOnly: true, category: "PT,PP" })
}
