"use server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://bakery-api-793944100518.us-central1.run.app"
const CLOUD_RUN_URL = "https://bakery-api-793944100518.us-central1.run.app"

// Helper: fetch with automatic fallback to Cloud Run if local API is down
async function fetchWithFallback(path: string): Promise<Response> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" })
    return res
  } catch {
    // Local API unreachable, fallback to production
    if (API_URL !== CLOUD_RUN_URL) {
      return fetch(`${CLOUD_RUN_URL}${path}`, { cache: "no-store" })
    }
    throw new Error("API no disponible")
  }
}

// === Types ===

export interface EmailLog {
  id: string
  email_subject: string
  email_from: string
  cliente: string | null
  oc_number: string | null
  status: string
  created_at: string
}

export interface EmailProduct {
  producto: string
  cantidad: number | null
  fecha_entrega: string | null
  precio: number | null
  unidad: string | null
}

export interface EmailDetail extends EmailLog {
  productos: EmailProduct[]
  pdf_url: string | null
  email_body_preview: string | null
  sucursal: string | null
  direccion: string | null
}

export interface EmailStats {
  total_orders: number
  by_status: Record<string, number>
  last_24_hours: number
}

// === Server Actions ===

export async function getEmailLogs(): Promise<{ data: EmailLog[] | null; error: string | null }> {
  try {
    const response = await fetchWithFallback("/api/emails/logs?limit=200")

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const json = await response.json()
    // API returns { status, count, logs: [...] }
    const logs = json.logs ?? json.data ?? json
    return { data: Array.isArray(logs) ? logs : [], error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching email logs" }
  }
}

export async function getEmailDetail(id: string): Promise<{ data: EmailDetail | null; error: string | null }> {
  try {
    const response = await fetchWithFallback(`/api/emails/logs/${id}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const json = await response.json()
    // API returns { status, order: {...}, products: [...] }
    const order = json.order ?? json
    const products = json.products ?? json.productos ?? order.products ?? []
    return { data: { ...order, productos: products }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching email detail" }
  }
}

export async function getEmailStats(): Promise<{ data: EmailStats | null; error: string | null }> {
  try {
    const response = await fetchWithFallback("/api/emails/stats")

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const json = await response.json()
    // API returns { status, stats: { total_orders, by_status, last_24_hours } }
    const stats = json.stats ?? json
    return { data: stats, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching email stats" }
  }
}
