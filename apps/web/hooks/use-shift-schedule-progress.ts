"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { startOfDay, addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns"

export interface ScheduleProgressItem {
  scheduleId: string
  productId: string
  productName: string
  scheduledQuantity: number
  producedQuantity: number
  shiftNumber: number
  isDelay: boolean
  originalShiftLabel: string
  status: "pending" | "in_progress" | "completed"
  shiftProductionId?: string
}

function setTo14Hours(date: Date): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, 14), 0), 0), 0)
}

function getShiftNumberFromName(shiftName: string): number {
  const match = shiftName.match(/T(\d)/)
  return match ? parseInt(match[1]) : 0
}

// Operational day goes T3 (14:00) → T1 (22:00) → T2 (06:00-14:00)
const SHIFT_ORDER_IN_DAY = [3, 1, 2]

const SHIFT_LABELS: Record<number, string> = {
  1: "T1 (22:00-06:00)",
  2: "T2 (06:00-14:00)",
  3: "T3 (14:00-22:00)",
}

function getOperationalDayWindow(): { start: Date; end: Date } {
  const now = new Date()
  const hour = now.getHours()

  let start: Date
  if (hour >= 14) {
    start = setTo14Hours(startOfDay(now))
  } else {
    start = setTo14Hours(addDays(startOfDay(now), -1))
  }

  const end = setTo14Hours(addDays(start, 1))
  return { start, end }
}

export function useShiftScheduleProgress(
  workCenterId: string,
  activeShiftName: string,
  currentShiftProductions: { id: string; product_id: string; total_good_units: number; status: string | null }[]
) {
  const [items, setItems] = useState<ScheduleProgressItem[]>([])
  const [loading, setLoading] = useState(true)

  const currentShiftNumber = useMemo(
    () => getShiftNumberFromName(activeShiftName),
    [activeShiftName]
  )

  // Stable key to avoid unnecessary refetches
  const productionsKey = useMemo(
    () =>
      currentShiftProductions
        .map((p) => `${p.id}:${p.product_id}:${p.total_good_units}:${p.status}`)
        .join("|"),
    [currentShiftProductions]
  )

  const fetchProgress = useCallback(async () => {
    if (!workCenterId || !currentShiftNumber) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { start: windowStart, end: windowEnd } = getOperationalDayWindow()

      // 1. Fetch all schedules for the operational day
      const { data: schedules, error: schedErr } = await (supabase as any)
        .schema("produccion")
        .from("production_schedules")
        .select("*")
        .eq("resource_id", workCenterId)
        .gte("start_date", windowStart.toISOString())
        .lt("start_date", windowEnd.toISOString())
        .order("shift_number", { ascending: true })
        .order("production_order_number", { ascending: true })

      if (schedErr) throw schedErr
      if (!schedules || schedules.length === 0) {
        setItems([])
        return
      }

      // 2. Get product names
      const productIds = [
        ...new Set(schedules.map((s: any) => s.product_id)),
      ] as string[]
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds)
      const productMap = new Map(
        products?.map((p) => [p.id, p.name]) || []
      )

      // 3. Get ALL shift_productions for this work center in the operational day
      const { data: dayShifts } = await (supabase as any)
        .schema("produccion")
        .from("production_shifts")
        .select("id, shift_name, status")
        .eq("work_center_id", workCenterId)
        .gte("started_at", windowStart.toISOString())
        .lt("started_at", windowEnd.toISOString())

      const dayShiftIds = (dayShifts || []).map((s: any) => s.id)

      let allDayProductions: any[] = []
      if (dayShiftIds.length > 0) {
        const { data: prods } = await (supabase as any)
          .schema("produccion")
          .from("shift_productions")
          .select("*")
          .in("shift_id", dayShiftIds)
        allDayProductions = prods || []
      }

      // 4. Build schedule items
      const currentShiftIndex = SHIFT_ORDER_IN_DAY.indexOf(currentShiftNumber)
      const previousShifts = SHIFT_ORDER_IN_DAY.slice(0, currentShiftIndex)

      const result: ScheduleProgressItem[] = []

      // Current shift schedules
      const currentSchedules = schedules.filter(
        (s: any) => s.shift_number === currentShiftNumber
      )
      for (const sched of currentSchedules) {
        const prod = currentShiftProductions.find(
          (p) => p.product_id === sched.product_id
        )
        result.push({
          scheduleId: sched.id,
          productId: sched.product_id,
          productName: productMap.get(sched.product_id) || "Producto",
          scheduledQuantity: sched.quantity,
          producedQuantity: prod?.total_good_units || 0,
          shiftNumber: sched.shift_number,
          isDelay: false,
          originalShiftLabel:
            SHIFT_LABELS[sched.shift_number] || `T${sched.shift_number}`,
          status: prod
            ? prod.status === "completed"
              ? "completed"
              : "in_progress"
            : "pending",
          shiftProductionId: prod?.id,
        })
      }

      // Delayed schedules from previous shifts
      for (const prevShift of previousShifts) {
        const prevSchedules = schedules.filter(
          (s: any) => s.shift_number === prevShift
        )
        for (const sched of prevSchedules) {
          // Check if fulfilled across all shifts of the day
          const allProdsForProduct = allDayProductions.filter(
            (p: any) => p.product_id === sched.product_id
          )
          const totalProduced = allProdsForProduct.reduce(
            (sum: number, p: any) => sum + (p.total_good_units || 0),
            0
          )

          if (totalProduced < sched.quantity) {
            const currentProd = currentShiftProductions.find(
              (p) => p.product_id === sched.product_id
            )
            result.push({
              scheduleId: sched.id,
              productId: sched.product_id,
              productName: productMap.get(sched.product_id) || "Producto",
              scheduledQuantity: sched.quantity,
              producedQuantity: totalProduced,
              shiftNumber: currentShiftNumber,
              isDelay: true,
              originalShiftLabel:
                SHIFT_LABELS[prevShift] || `T${prevShift}`,
              status: currentProd
                ? currentProd.status === "completed"
                  ? "completed"
                  : "in_progress"
                : "pending",
              shiftProductionId: currentProd?.id,
            })
          }
        }
      }

      setItems(result)
    } catch (err) {
      console.error("Error fetching schedule progress:", err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [workCenterId, currentShiftNumber, productionsKey])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return { items, loading, refetch: fetchProgress }
}
