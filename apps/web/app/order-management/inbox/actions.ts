"use server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
  nombre: string
  cantidad: number | null
  fecha_entrega: string | null
  precio: number | null
  unidad: string | null
}

export interface EmailDetail extends EmailLog {
  productos: EmailProduct[]
  pdf_url: string | null
  email_body: string | null
}

export interface EmailStats {
  total_orders: number
  by_status: Record<string, number>
  last_24_hours: number
}

// === Server Actions ===

export async function getEmailLogs(): Promise<{ data: EmailLog[] | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/emails/logs`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching email logs" }
  }
}

export async function getEmailDetail(id: string): Promise<{ data: EmailDetail | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/emails/logs/${id}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching email detail" }
  }
}

export async function getEmailStats(): Promise<{ data: EmailStats | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/emails/stats`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }))
      return { data: null, error: error.detail || `Error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching email stats" }
  }
}
