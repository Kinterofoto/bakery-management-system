"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface ProductionProgressEntry {
  produced: number
  isActive: boolean
}

/** Key: "productId_resourceId_shiftNumber_dayIndex" */
export type ProductionProgressMap = Map<string, ProductionProgressEntry>

export function makeProgressKey(
  productId: string,
  resourceId: string,
  shiftNumber: number,
  dayIndex: number
): string {
  return `${productId}_${resourceId}_${shiftNumber}_${dayIndex}`
}

function getShiftNumberFromUtc(utcHour: number): number {
  // Convert to Bogotá (UTC-5)
  const bogotaHour = (utcHour - 5 + 24) % 24
  if (bogotaHour >= 22 || bogotaHour < 6) return 1
  if (bogotaHour >= 6 && bogotaHour < 14) return 2
  return 3
}

export function useProductionProgress(weekStart: Date) {
  const [progress, setProgress] = useState<ProductionProgressMap>(new Map())

  const fetchProgress = useCallback(async () => {
    try {
      // Week window: Sunday 22:00 UTC-5 (T1 Mon) to next Sunday 22:00 UTC-5
      // In UTC: Monday 03:00 to next Monday 03:00
      const start = new Date(weekStart)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)

      const end = new Date(weekStart)
      end.setDate(end.getDate() + 8)
      end.setHours(0, 0, 0, 0)

      // Fetch all shifts in the week
      const { data: shifts, error: shiftsErr } = await (supabase as any)
        .schema("produccion")
        .from("production_shifts")
        .select("id, work_center_id, started_at, status")
        .gte("started_at", start.toISOString())
        .lt("started_at", end.toISOString())

      if (shiftsErr || !shifts || shifts.length === 0) {
        setProgress(new Map())
        return
      }

      const shiftIds = shifts.map((s: any) => s.id)

      // Fetch all productions for those shifts
      const { data: productions, error: prodsErr } = await (supabase as any)
        .schema("produccion")
        .from("shift_productions")
        .select("product_id, shift_id, total_good_units, status")
        .in("shift_id", shiftIds)

      if (prodsErr || !productions) {
        setProgress(new Map())
        return
      }

      // Build shift lookup
      const shiftMap = new Map(shifts.map((s: any) => [s.id, s]))

      // Build progress map
      const map: ProductionProgressMap = new Map()

      for (const prod of productions) {
        const shift = shiftMap.get(prod.shift_id)
        if (!shift) continue

        const utcTs = shift.started_at.endsWith("Z")
          ? shift.started_at
          : shift.started_at + "Z"
        const shiftDate = new Date(utcTs)
        const shiftNum = getShiftNumberFromUtc(shiftDate.getUTCHours())

        // Calculate Bogotá date
        const bogotaMs = shiftDate.getTime() - 5 * 60 * 60 * 1000
        const bogotaDate = new Date(bogotaMs)

        // For T1 (22:00-06:00), the operational "day" is the next calendar day
        let effectiveDate = new Date(bogotaDate)
        if (shiftNum === 1 && bogotaDate.getUTCHours() >= 17) {
          // bogotaDate hours ≥ 22 in Bogotá → belongs to next day
          effectiveDate = new Date(bogotaMs + 86400000)
        }

        // dayIndex = difference in days from weekStart (local dates)
        const wsYear = weekStart.getFullYear()
        const wsMonth = weekStart.getMonth()
        const wsDay = weekStart.getDate()
        const edYear = effectiveDate.getUTCFullYear()
        const edMonth = effectiveDate.getUTCMonth()
        const edDay = effectiveDate.getUTCDate()

        const ws = new Date(wsYear, wsMonth, wsDay).getTime()
        const ed = new Date(edYear, edMonth, edDay).getTime()
        const dayIndex = Math.round((ed - ws) / 86400000)

        if (dayIndex < 0 || dayIndex > 6) continue

        const key = makeProgressKey(
          prod.product_id,
          shift.work_center_id,
          shiftNum,
          dayIndex
        )
        const existing = map.get(key) || { produced: 0, isActive: false }
        existing.produced += prod.total_good_units || 0
        if (prod.status === "active") existing.isActive = true
        map.set(key, existing)
      }

      setProgress(map)
    } catch (err) {
      console.error("Error fetching production progress:", err)
    }
  }, [weekStart.getTime()])

  useEffect(() => {
    fetchProgress()
    const interval = setInterval(fetchProgress, 30000)
    return () => clearInterval(interval)
  }, [fetchProgress])

  return { progress, refetch: fetchProgress }
}
