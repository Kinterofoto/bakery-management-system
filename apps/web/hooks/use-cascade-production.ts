"use client"

import { useState, useCallback } from "react"
import { createCascadeV2, previewCascadeV2 } from "@/app/planmaster/actions"

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
   * V2: Server Action → RPC directo (~500ms)
   * V1 fallback: fetch → FastAPI → Supabase REST (~13s)
   */
  const previewCascade = useCallback(async (params: CreateCascadeParams): Promise<CascadePreviewResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      // V2: Server Action → PL/pgSQL RPC
      try {
        const result = await previewCascadeV2({
          product_id: params.product_id,
          start_datetime: params.start_datetime,
          duration_hours: params.duration_hours,
          staff_count: params.staff_count ?? 1,
          week_plan_id: params.week_plan_id,
        })
        return result as CascadePreviewResponse
      } catch (v2Error) {
        console.warn("Cascade V2 preview failed, falling back to V1:", v2Error)
      }

      // V1 fallback: FastAPI
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
   * V2: Server Action → RPC directo (~500ms)
   * V1 fallback: fetch → FastAPI → Supabase REST (~13s)
   */
  const createCascade = useCallback(async (params: CreateCascadeParams): Promise<CascadeCreateResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      // V2: Server Action → PL/pgSQL RPC
      try {
        const result = await createCascadeV2({
          product_id: params.product_id,
          start_datetime: params.start_datetime,
          duration_hours: params.duration_hours,
          staff_count: params.staff_count ?? 1,
          week_plan_id: params.week_plan_id,
        })
        return result as CascadeCreateResponse
      } catch (v2Error) {
        console.warn("Cascade V2 create failed, falling back to V1:", v2Error)
      }

      // V1 fallback: FastAPI
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
