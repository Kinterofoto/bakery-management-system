"use client"

import { useState, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface CascadeBatch {
  batch_number: number
  batch_size: number
  start_date: string
  end_date: string
  work_center_id: string
  work_center_name: string
  cascade_level: number
  processing_type: "parallel" | "sequential"
  duration_minutes: number
}

export interface CascadeWorkCenter {
  work_center_id: string
  work_center_name: string
  cascade_level: number
  processing_type: "parallel" | "sequential"
  batches: CascadeBatch[]
  total_duration_minutes: number
  earliest_start: string
  latest_end: string
}

export interface CascadePreviewResponse {
  product_id: string
  product_name: string
  total_units: number
  lote_minimo: number
  num_batches: number
  work_centers: CascadeWorkCenter[]
  cascade_start: string
  cascade_end: string
  warnings: string[]
}

export interface CascadeCreateResponse extends CascadePreviewResponse {
  production_order_number: number
  schedules_created: number
}

export interface CascadeOrderSchedule {
  id: string
  resource_id: string
  product_id: string
  product_name: string
  quantity: number
  start_date: string
  end_date: string
  cascade_level: number
  cascade_source_id: string | null
  batch_number: number
  total_batches: number
  batch_size: number
  work_center_id: string
  work_center_name: string
  status: string
}

export interface CascadeOrderDetail {
  production_order_number: number
  product_name: string
  total_schedules: number
  schedules: CascadeOrderSchedule[]
}

export interface CreateCascadeParams {
  work_center_id: string
  product_id: string
  start_datetime: string
  duration_hours: number
  staff_count?: number
  week_plan_id?: string
}

/**
 * Hook para manejar producción en cascada
 * Permite crear, previsualizar y eliminar órdenes de producción en cascada
 */
export function useCascadeProduction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Preview de cascada sin crear en BD
   */
  const previewCascade = useCallback(async (params: CreateCascadeParams): Promise<CascadePreviewResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/production/cascade/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Error al previsualizar cascada")
      }

      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Crear cascada en BD
   */
  const createCascade = useCallback(async (params: CreateCascadeParams): Promise<CascadeCreateResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/production/cascade/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Error al crear cascada")
      }

      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Obtener detalle de una orden de producción
   */
  const getOrderDetail = useCallback(async (orderNumber: number): Promise<CascadeOrderDetail | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/production/cascade/order/${orderNumber}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Error al obtener orden")
      }

      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Eliminar una orden de producción completa
   */
  const deleteOrder = useCallback(async (orderNumber: number): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/production/cascade/order/${orderNumber}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Error al eliminar orden")
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    previewCascade,
    createCascade,
    getOrderDetail,
    deleteOrder,
  }
}
