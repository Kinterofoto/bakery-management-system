import type { Database } from "@/lib/database.types"

type ProductionShift = Database["produccion"]["Tables"]["production_shifts"]["Row"]
type ShiftProduction = Database["produccion"]["Tables"]["shift_productions"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]
type WorkCenter = Database["produccion"]["Tables"]["work_centers"]["Row"]

export type Granularity = "day" | "week" | "month" | "year"
export type DatePreset = "today" | "week" | "month" | "quarter" | "year" | "all"

export interface DashboardFilters {
  workCenter: string // "all" or work center id
  operation: string // "all" or operation id
  product: string // "all" or product id
  dateStart: string // ISO date string
  dateEnd: string // ISO date string
  preset: DatePreset
  granularity: Granularity
  tab: string
}

export interface TimeSeriesPoint {
  period: string
  label: string
  goodUnits: number
  badUnits: number
  totalKg: number
  shiftCount: number
  qualityPct: number
  totalMinutes: number
}

export interface ProductAggregate {
  productId: string
  productName: string
  goodUnits: number
  badUnits: number
  totalKg: number
  qualityPct: number
  shiftCount: number
}

export interface WorkCenterAggregate {
  workCenterId: string
  workCenterName: string
  goodUnits: number
  badUnits: number
  totalKg: number
  qualityPct: number
  shiftCount: number
  avgDurationMinutes: number
}

export interface ShiftTypeAggregate {
  shiftName: string
  goodUnits: number
  badUnits: number
  totalKg: number
  qualityPct: number
  shiftCount: number
  avgDurationMinutes: number
  avgUnitsPerHour: number
}

export interface PeriodComparison {
  current: {
    shifts: number
    goodUnits: number
    totalKg: number
    qualityPct: number
    totalMinutes: number
    unitsPerHour: number
  }
  previous: {
    shifts: number
    goodUnits: number
    totalKg: number
    qualityPct: number
    totalMinutes: number
    unitsPerHour: number
  }
  growth: {
    shifts: number | null
    goodUnits: number | null
    totalKg: number | null
    qualityPct: number | null
    totalMinutes: number | null
    unitsPerHour: number | null
  }
}

export interface ScatterPoint {
  shiftId: string
  shiftName: string
  workCenterId: string
  workCenterName: string
  durationMinutes: number
  goodUnits: number
  totalKg: number
}

// --- Helpers ---

export function toBogotaDate(dateString: string): Date {
  const utcString = dateString.endsWith("Z") ? dateString : dateString + "Z"
  const utcDate = new Date(utcString)
  return new Date(utcDate.getTime() - 5 * 60 * 60 * 1000)
}

export function formatBogotaDate(dateString: string): string {
  const d = toBogotaDate(dateString)
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year = d.getUTCFullYear()
  const hours = String(d.getUTCHours()).padStart(2, "0")
  const minutes = String(d.getUTCMinutes()).padStart(2, "0")
  return `${day}/${month}/${year}, ${hours}:${minutes}`
}

export function productNameWithWeight(product: Product | undefined): string {
  if (!product) return "Desconocido"
  const w = product.weight ? parseFloat(product.weight) : NaN
  if (isNaN(w) || w <= 0) return product.name
  return `${product.name} (${w}g)`
}

function getShiftDurationMinutes(shift: ProductionShift): number {
  if (!shift.ended_at) return 0
  const startUtc = shift.started_at.endsWith("Z") ? shift.started_at : shift.started_at + "Z"
  const endUtc = shift.ended_at.endsWith("Z") ? shift.ended_at : shift.ended_at + "Z"
  const ms = new Date(endUtc).getTime() - new Date(startUtc).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60)))
}

function calculateKg(goodUnits: number, product: Product | undefined): number {
  if (!product?.weight) return 0
  const weight = parseFloat(product.weight)
  if (isNaN(weight) || weight <= 0) return 0
  return (goodUnits * weight) / 1000
}

function calcGrowth(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

function getPeriodKey(date: Date, granularity: Granularity): string {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  const d = date.getUTCDate()
  switch (granularity) {
    case "day":
      return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    case "week": {
      // ISO week start (Monday)
      const dt = new Date(Date.UTC(y, m, d))
      const day = dt.getUTCDay() || 7
      dt.setUTCDate(dt.getUTCDate() - day + 1)
      const wy = dt.getUTCFullYear()
      const wm = String(dt.getUTCMonth() + 1).padStart(2, "0")
      const wd = String(dt.getUTCDate()).padStart(2, "0")
      return `${wy}-W${wm}-${wd}`
    }
    case "month":
      return `${y}-${String(m + 1).padStart(2, "0")}`
    case "year":
      return `${y}`
  }
}

function getPeriodLabel(key: string, granularity: Granularity): string {
  switch (granularity) {
    case "day": {
      const parts = key.split("-")
      return `${parts[2]}/${parts[1]}`
    }
    case "week":
      return `Sem ${key.split("-W")[1]?.replace("-", "/") || key}`
    case "month": {
      const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
      const parts = key.split("-")
      return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`
    }
    case "year":
      return key
  }
}

function getProductMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>()
  for (const p of products) map.set(p.id, p)
  return map
}

function getShiftProductionsMap(productions: ShiftProduction[]): Map<string, ShiftProduction[]> {
  const map = new Map<string, ShiftProduction[]>()
  for (const p of productions) {
    const key = p.shift_id || ""
    const arr = map.get(key) || []
    arr.push(p)
    map.set(key, arr)
  }
  return map
}

// --- Filtering ---

export function filterShiftsAndProductions(
  shifts: ProductionShift[],
  productions: ShiftProduction[],
  filters: DashboardFilters,
  workCenters?: WorkCenter[]
): { filteredShifts: ProductionShift[]; filteredProductions: ShiftProduction[] } {
  let filteredShifts = shifts.filter((s) => s.status === "completed")

  // Operation filter: resolve to work center IDs that belong to the operation
  if (filters.operation !== "all" && workCenters) {
    const wcIdsForOp = new Set(
      workCenters.filter((wc) => wc.operation_id === filters.operation).map((wc) => wc.id)
    )
    filteredShifts = filteredShifts.filter((s) => s.work_center_id && wcIdsForOp.has(s.work_center_id))
  }

  if (filters.workCenter !== "all") {
    filteredShifts = filteredShifts.filter((s) => s.work_center_id === filters.workCenter)
  }

  // Date filtering
  if (filters.dateStart) {
    const start = new Date(filters.dateStart).getTime()
    filteredShifts = filteredShifts.filter((s) => {
      const utc = s.started_at.endsWith("Z") ? s.started_at : s.started_at + "Z"
      return new Date(utc).getTime() >= start
    })
  }
  if (filters.dateEnd) {
    const end = new Date(filters.dateEnd).getTime() + 24 * 60 * 60 * 1000 // inclusive end
    filteredShifts = filteredShifts.filter((s) => {
      const utc = s.started_at.endsWith("Z") ? s.started_at : s.started_at + "Z"
      return new Date(utc).getTime() < end
    })
  }

  const shiftIds = new Set(filteredShifts.map((s) => s.id))
  let filteredProductions = productions.filter((p) => p.shift_id && shiftIds.has(p.shift_id))

  if (filters.product !== "all") {
    filteredProductions = filteredProductions.filter((p) => p.product_id === filters.product)
  }

  return { filteredShifts, filteredProductions }
}

// --- Aggregations ---

export function groupByTimePeriod(
  shifts: ProductionShift[],
  productions: ShiftProduction[],
  products: Product[],
  granularity: Granularity
): TimeSeriesPoint[] {
  const productMap = getProductMap(products)
  const prodMap = getShiftProductionsMap(productions)
  const groups = new Map<string, { goodUnits: number; badUnits: number; totalKg: number; shiftCount: number; totalMinutes: number }>()

  for (const shift of shifts) {
    const bogota = toBogotaDate(shift.started_at)
    const key = getPeriodKey(bogota, granularity)
    const group = groups.get(key) || { goodUnits: 0, badUnits: 0, totalKg: 0, shiftCount: 0, totalMinutes: 0 }

    group.shiftCount++
    group.totalMinutes += getShiftDurationMinutes(shift)

    const shiftProds = prodMap.get(shift.id) || []
    for (const sp of shiftProds) {
      const good = sp.total_good_units || 0
      const bad = sp.total_bad_units || 0
      group.goodUnits += good
      group.badUnits += bad
      group.totalKg += calculateKg(good, productMap.get(sp.product_id || ""))
    }

    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const total = data.goodUnits + data.badUnits
      return {
        period: key,
        label: getPeriodLabel(key, granularity),
        goodUnits: data.goodUnits,
        badUnits: data.badUnits,
        totalKg: Math.round(data.totalKg * 100) / 100,
        shiftCount: data.shiftCount,
        qualityPct: total > 0 ? Math.round((data.goodUnits / total) * 1000) / 10 : 0,
        totalMinutes: data.totalMinutes,
      }
    })
}

export function aggregateByProduct(
  shifts: ProductionShift[],
  productions: ShiftProduction[],
  products: Product[]
): ProductAggregate[] {
  const productMap = getProductMap(products)
  const shiftIds = new Set(shifts.map((s) => s.id))
  const groups = new Map<string, { goodUnits: number; badUnits: number; totalKg: number; shiftIds: Set<string> }>()

  for (const p of productions) {
    if (!p.shift_id || !shiftIds.has(p.shift_id)) continue
    const productId = p.product_id || "unknown"
    const group = groups.get(productId) || { goodUnits: 0, badUnits: 0, totalKg: 0, shiftIds: new Set() }
    const good = p.total_good_units || 0
    const bad = p.total_bad_units || 0
    group.goodUnits += good
    group.badUnits += bad
    group.totalKg += calculateKg(good, productMap.get(productId))
    group.shiftIds.add(p.shift_id)
    groups.set(productId, group)
  }

  return Array.from(groups.entries())
    .map(([productId, data]) => {
      const total = data.goodUnits + data.badUnits
      return {
        productId,
        productName: productNameWithWeight(productMap.get(productId)),
        goodUnits: data.goodUnits,
        badUnits: data.badUnits,
        totalKg: Math.round(data.totalKg * 100) / 100,
        qualityPct: total > 0 ? Math.round((data.goodUnits / total) * 1000) / 10 : 0,
        shiftCount: data.shiftIds.size,
      }
    })
    .sort((a, b) => b.goodUnits - a.goodUnits)
}

export function aggregateByWorkCenter(
  shifts: ProductionShift[],
  productions: ShiftProduction[],
  products: Product[],
  workCenters: WorkCenter[]
): WorkCenterAggregate[] {
  const productMap = getProductMap(products)
  const prodMap = getShiftProductionsMap(productions)
  const wcMap = new Map<string, WorkCenter>()
  for (const wc of workCenters) wcMap.set(wc.id, wc)

  const groups = new Map<string, { goodUnits: number; badUnits: number; totalKg: number; shiftCount: number; totalMinutes: number }>()

  for (const shift of shifts) {
    const wcId = shift.work_center_id || "unknown"
    const group = groups.get(wcId) || { goodUnits: 0, badUnits: 0, totalKg: 0, shiftCount: 0, totalMinutes: 0 }
    group.shiftCount++
    group.totalMinutes += getShiftDurationMinutes(shift)

    const shiftProds = prodMap.get(shift.id) || []
    for (const sp of shiftProds) {
      const good = sp.total_good_units || 0
      const bad = sp.total_bad_units || 0
      group.goodUnits += good
      group.badUnits += bad
      group.totalKg += calculateKg(good, productMap.get(sp.product_id || ""))
    }

    groups.set(wcId, group)
  }

  return Array.from(groups.entries())
    .map(([wcId, data]) => {
      const total = data.goodUnits + data.badUnits
      return {
        workCenterId: wcId,
        workCenterName: wcMap.get(wcId)?.name || "Desconocido",
        goodUnits: data.goodUnits,
        badUnits: data.badUnits,
        totalKg: Math.round(data.totalKg * 100) / 100,
        qualityPct: total > 0 ? Math.round((data.goodUnits / total) * 1000) / 10 : 0,
        shiftCount: data.shiftCount,
        avgDurationMinutes: data.shiftCount > 0 ? Math.round(data.totalMinutes / data.shiftCount) : 0,
      }
    })
    .sort((a, b) => b.goodUnits - a.goodUnits)
}

export function aggregateByShiftName(
  shifts: ProductionShift[],
  productions: ShiftProduction[],
  products: Product[]
): ShiftTypeAggregate[] {
  const productMap = getProductMap(products)
  const prodMap = getShiftProductionsMap(productions)
  const groups = new Map<string, { goodUnits: number; badUnits: number; totalKg: number; shiftCount: number; totalMinutes: number }>()

  for (const shift of shifts) {
    const name = shift.shift_name || "Sin nombre"
    const group = groups.get(name) || { goodUnits: 0, badUnits: 0, totalKg: 0, shiftCount: 0, totalMinutes: 0 }
    group.shiftCount++
    group.totalMinutes += getShiftDurationMinutes(shift)

    const shiftProds = prodMap.get(shift.id) || []
    for (const sp of shiftProds) {
      const good = sp.total_good_units || 0
      const bad = sp.total_bad_units || 0
      group.goodUnits += good
      group.badUnits += bad
      group.totalKg += calculateKg(good, productMap.get(sp.product_id || ""))
    }

    groups.set(name, group)
  }

  return Array.from(groups.entries())
    .map(([name, data]) => {
      const total = data.goodUnits + data.badUnits
      const hours = data.totalMinutes / 60
      return {
        shiftName: name,
        goodUnits: data.goodUnits,
        badUnits: data.badUnits,
        totalKg: Math.round(data.totalKg * 100) / 100,
        qualityPct: total > 0 ? Math.round((data.goodUnits / total) * 1000) / 10 : 0,
        shiftCount: data.shiftCount,
        avgDurationMinutes: data.shiftCount > 0 ? Math.round(data.totalMinutes / data.shiftCount) : 0,
        avgUnitsPerHour: hours > 0 ? Math.round(data.goodUnits / hours) : 0,
      }
    })
    .sort((a, b) => b.goodUnits - a.goodUnits)
}

export function calculatePeriodComparison(
  shifts: ProductionShift[],
  productions: ShiftProduction[],
  products: Product[],
  filters: DashboardFilters
): PeriodComparison {
  const productMap = getProductMap(products)
  const prodMap = getShiftProductionsMap(productions)

  // Calculate the period length based on date range
  const startDate = new Date(filters.dateStart)
  const endDate = new Date(filters.dateEnd)
  const periodMs = endDate.getTime() - startDate.getTime() + 24 * 60 * 60 * 1000
  const prevStart = new Date(startDate.getTime() - periodMs)
  const prevEnd = new Date(startDate.getTime() - 1)

  const completedShifts = shifts.filter((s) => s.status === "completed")

  function aggregatePeriod(pStart: Date, pEnd: Date) {
    const ps = completedShifts.filter((s) => {
      const utc = s.started_at.endsWith("Z") ? s.started_at : s.started_at + "Z"
      const t = new Date(utc).getTime()
      return t >= pStart.getTime() && t <= pEnd.getTime() + 24 * 60 * 60 * 1000
    })

    let goodUnits = 0
    let badUnits = 0
    let totalKg = 0
    let totalMinutes = 0

    const shiftIds = new Set(ps.map((s) => s.id))

    for (const s of ps) {
      totalMinutes += getShiftDurationMinutes(s)
    }

    let filteredProds = productions.filter((p) => p.shift_id && shiftIds.has(p.shift_id))
    if (filters.product !== "all") {
      filteredProds = filteredProds.filter((p) => p.product_id === filters.product)
    }
    if (filters.workCenter !== "all") {
      // Already filtered by shifts above if wc filter applied at shift level
    }

    for (const p of filteredProds) {
      const good = p.total_good_units || 0
      const bad = p.total_bad_units || 0
      goodUnits += good
      badUnits += bad
      totalKg += calculateKg(good, productMap.get(p.product_id || ""))
    }

    const total = goodUnits + badUnits
    const hours = totalMinutes / 60
    return {
      shifts: ps.length,
      goodUnits,
      totalKg: Math.round(totalKg * 100) / 100,
      qualityPct: total > 0 ? Math.round((goodUnits / total) * 1000) / 10 : 0,
      totalMinutes,
      unitsPerHour: hours > 0 ? Math.round(goodUnits / hours) : 0,
    }
  }

  // Filter shifts by work center if needed
  let relevantShifts = completedShifts
  if (filters.workCenter !== "all") {
    relevantShifts = relevantShifts.filter((s) => s.work_center_id === filters.workCenter)
  }

  // Override completedShifts for the aggregation
  const current = aggregatePeriod(startDate, endDate)
  const previous = aggregatePeriod(prevStart, prevEnd)

  return {
    current,
    previous,
    growth: {
      shifts: calcGrowth(current.shifts, previous.shifts),
      goodUnits: calcGrowth(current.goodUnits, previous.goodUnits),
      totalKg: calcGrowth(current.totalKg, previous.totalKg),
      qualityPct: calcGrowth(current.qualityPct, previous.qualityPct),
      totalMinutes: calcGrowth(current.totalMinutes, previous.totalMinutes),
      unitsPerHour: calcGrowth(current.unitsPerHour, previous.unitsPerHour),
    },
  }
}

export function getShiftScatterData(
  shifts: ProductionShift[],
  productions: ShiftProduction[],
  products: Product[],
  workCenters: WorkCenter[]
): ScatterPoint[] {
  const productMap = getProductMap(products)
  const prodMap = getShiftProductionsMap(productions)
  const wcMap = new Map<string, WorkCenter>()
  for (const wc of workCenters) wcMap.set(wc.id, wc)

  return shifts
    .filter((s) => s.ended_at)
    .map((shift) => {
      const dur = getShiftDurationMinutes(shift)
      const prods = prodMap.get(shift.id) || []
      let goodUnits = 0
      let totalKg = 0
      for (const p of prods) {
        const good = p.total_good_units || 0
        goodUnits += good
        totalKg += calculateKg(good, productMap.get(p.product_id || ""))
      }
      return {
        shiftId: shift.id,
        shiftName: shift.shift_name,
        workCenterId: shift.work_center_id || "",
        workCenterName: wcMap.get(shift.work_center_id || "")?.name || "Desconocido",
        durationMinutes: dur,
        goodUnits,
        totalKg: Math.round(totalKg * 100) / 100,
      }
    })
    .filter((p) => p.durationMinutes > 0)
}

export function getDateRangeFromPreset(preset: DatePreset): { dateStart: string; dateEnd: string } {
  const now = new Date()
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const todayStr = today.toISOString().split("T")[0]

  switch (preset) {
    case "today":
      return { dateStart: todayStr, dateEnd: todayStr }
    case "week": {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { dateStart: weekAgo.toISOString().split("T")[0], dateEnd: todayStr }
    }
    case "month": {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { dateStart: monthAgo.toISOString().split("T")[0], dateEnd: todayStr }
    }
    case "quarter": {
      const quarterAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { dateStart: quarterAgo.toISOString().split("T")[0], dateEnd: todayStr }
    }
    case "year": {
      const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
      return { dateStart: yearAgo.toISOString().split("T")[0], dateEnd: todayStr }
    }
    case "all":
      return { dateStart: "2020-01-01", dateEnd: todayStr }
  }
}

export function getGranularityLabel(granularity: Granularity): string {
  switch (granularity) {
    case "day": return "día anterior"
    case "week": return "semana anterior"
    case "month": return "mes anterior"
    case "year": return "año anterior"
  }
}
