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

// === TYPES ===

export interface ExpressDeliveryItem {
  item_id: string
  quantity_delivered: number
  quantity_returned: number
  status: "delivered" | "partial" | "not_delivered"
}

export interface ExpressDeliveryData {
  order_id: string
  evidence_url?: string
  items: ExpressDeliveryItem[]
  general_return_reason?: string
}

export interface ExpressDeliveryResponse {
  success: boolean
  order_id: string
  new_status: string
  delivery_percentage: number
  message: string
  items_updated: number
  returns_created: number
}

// === EXPRESS DELIVERY ===

/**
 * Process express delivery for an order - Super Admin only.
 * Photo evidence is OPTIONAL.
 */
export async function expressDelivery(
  data: ExpressDeliveryData
): Promise<{ data: ExpressDeliveryResponse | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(
      `${API_URL}/api/orders/${data.order_id}/express-delivery`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          evidence_url: data.evidence_url,
          items: data.items,
          general_return_reason: data.general_return_reason,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        data: null,
        error: errorData.detail || `Error: ${response.status}`,
      }
    }

    const result = await response.json()
    return { data: result, error: null }
  } catch (error) {
    console.error("Error in expressDelivery:", error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Upload delivery evidence - reuses the routes endpoint.
 * Compresses image to max 50KB.
 */
export async function uploadEvidence(
  formData: FormData
): Promise<{ data: { success: boolean; evidence_url: string } | null; error: string | null }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("sb-access-token")?.value

    const response = await fetch(`${API_URL}/api/routes/upload-evidence`, {
      method: "POST",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        data: null,
        error: errorData.detail || `Error: ${response.status}`,
      }
    }

    const result = await response.json()
    return { data: result, error: null }
  } catch (error) {
    console.error("Error uploading evidence:", error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
