"use client"

import { useState, useMemo } from "react"
import { ChevronDown, ChevronRight, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { WeeklyGridCell } from "./WeeklyGridCell"
import type { ShiftSchedule } from "@/hooks/use-shift-schedules"
import type { DailyForecast } from "@/hooks/use-weekly-forecast"
import type { DailyBalance } from "@/hooks/use-weekly-balance"

interface ProductInfo {
  id: string
  name: string
  weight?: string | null
  currentStock: number
}

// Balance calculated per shift (running balance throughout the week)
interface ShiftBalance {
  dayIndex: number
  shiftNumber: 1 | 2 | 3
  openingBalance: number
  production: number
  demandThisShift: number // Forecast divided by 3 shifts
  closingBalance: number
  isDeficit: boolean
}

// Find the first day when a product reaches stock out
function getFirstStockOutDay(
  initialStock: number,
  dailyForecasts: DailyForecast[],
  productSchedules: ShiftSchedule[]
): number {
  let runningBalance = initialStock
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayForecast = dailyForecasts.find(f => f.dayIndex === dayIndex)
    const dailyDemand = dayForecast?.demand || 0 // Use demand (MAX of forecast and actual orders)
    const dayProduction = productSchedules
      .filter(s => s.dayIndex === dayIndex)
      .reduce((sum, s) => sum + s.quantity, 0)
    runningBalance = runningBalance + dayProduction - dailyDemand
    if (runningBalance < 0) return dayIndex
  }
  return 7
}

// Calculate running balance per shift for a product
function calculateShiftBalances(
  initialStock: number,
  dailyForecasts: DailyForecast[],
  productSchedules: ShiftSchedule[]
): Map<string, ShiftBalance> {
  const balanceMap = new Map<string, ShiftBalance>()
  let runningBalance = initialStock

  // Process all 7 days x 3 shifts = 21 shifts in order
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayForecast = dailyForecasts.find(f => f.dayIndex === dayIndex)
    const dailyDemand = dayForecast?.demand || 0 // Use demand (MAX of forecast and actual orders)
    // Split daily demand evenly across 3 shifts
    const demandPerShift = Math.ceil(dailyDemand / 3)

    for (const shiftNumber of [1, 2, 3] as const) {
      const key = `${dayIndex}-${shiftNumber}`
      const openingBalance = runningBalance

      // Get production scheduled for this specific shift
      const shiftProduction = productSchedules
        .filter(s => s.dayIndex === dayIndex && s.shiftNumber === shiftNumber)
        .reduce((sum, s) => sum + s.quantity, 0)

      // Only apply demand in last shift of day for cleaner visualization
      // But always show running balance
      const demandThisShift = shiftNumber === 3 ? dailyDemand : 0
      const closingBalance = openingBalance + shiftProduction - demandThisShift

      balanceMap.set(key, {
        dayIndex,
        shiftNumber,
        openingBalance,
        production: shiftProduction,
        demandThisShift,
        closingBalance,
        isDeficit: closingBalance < 0
      })

      runningBalance = closingBalance
    }
  }

  return balanceMap
}

interface WeeklyGridRowProps {
  resourceId: string
  resourceName: string
  products: ProductInfo[]
  schedules: ShiftSchedule[]
  dailyForecasts: Map<string, DailyForecast[]> // productId -> forecasts
  dailyBalances: Map<string, DailyBalance[]> // productId -> balances
  onAddProduction: (resourceId: string, dayIndex: number, shiftNumber: 1 | 2 | 3) => void
  onEditSchedule: (schedule: ShiftSchedule) => void
  onDeleteSchedule: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onViewDemandBreakdown: (productId: string, dayIndex: number) => void
  onUpdateTimes?: (id: string, startDate: Date, durationHours: number) => void
  cellWidth?: number
  isToday?: (dayIndex: number) => boolean
  isProductionView?: boolean
}

export function WeeklyGridRow({
  resourceId,
  resourceName,
  products,
  schedules,
  dailyForecasts,
  dailyBalances,
  onAddProduction,
  onEditSchedule,
  onDeleteSchedule,
  onUpdateQuantity,
  onViewDemandBreakdown,
  onUpdateTimes,
  cellWidth = 100,
  isToday = () => false,
  isProductionView = false
}: WeeklyGridRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate weekly totals for this resource
  const weeklyTotal = useMemo(() => {
    return schedules.reduce((sum, s) => sum + s.quantity, 0)
  }, [schedules])

  // Get schedules for a specific cell
  const getSchedulesForCell = (dayIndex: number, shiftNumber: 1 | 2 | 3) => {
    return schedules.filter(s => s.dayIndex === dayIndex && s.shiftNumber === shiftNumber)
  }

  // Get aggregated demand for a day (sum across all products)
  const getDemandForDay = (dayIndex: number) => {
    let total = 0
    dailyForecasts.forEach((forecasts) => {
      const dayForecast = forecasts.find(f => f.dayIndex === dayIndex)
      if (dayForecast) total += dayForecast.demand // Use demand (MAX of forecast and actual orders)
    })
    return total
  }

  // Get aggregated balance for a day
  const getBalanceForDay = (dayIndex: number) => {
    let total = 0
    let hasDeficit = false
    dailyBalances.forEach((balances) => {
      const dayBalance = balances.find(b => b.dayIndex === dayIndex)
      if (dayBalance) {
        total += dayBalance.closingBalance
        if (dayBalance.isDeficit) hasDeficit = true
      }
    })
    return { balance: total, isDeficit: hasDeficit }
  }

  return (
    <div className="border-b border-[#2C2C2E]">
      {/* Resource header row */}
      <div className="flex bg-[#1C1C1E] h-12">
        <div
          className="flex-shrink-0 w-[280px] bg-[#1C1C1E] border-r border-[#2C2C2E] px-4 py-2 cursor-pointer hover:bg-[#2C2C2E] transition-all sticky left-0 z-[80] shadow-[4px_0_12px_rgba(0,0,0,0.5)] flex items-center group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3 w-full">
            <div className={cn(
              "w-5 h-5 rounded flex items-center justify-center transition-colors",
              isExpanded ? "bg-[#0A84FF]/20 text-[#0A84FF]" : "bg-[#2C2C2E] text-[#8E8E93]"
            )}>
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-[13px] tracking-tight truncate leading-tight">
                {resourceName}
              </div>
              <div className="text-[10px] font-medium text-[#8E8E93] uppercase tracking-wider mt-0.5">
                {products.length} {products.length === 1 ? 'Producto' : 'Productos'}
              </div>
            </div>
            <Settings className="h-4 w-4 text-[#636366] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Day cells (aggregated view) */}
        <div className="flex">
          {Array.from({ length: 7 }).map((_, dayIndex) => {
            const dayDemand = getDemandForDay(dayIndex)
            const { balance, isDeficit } = getBalanceForDay(dayIndex)

            return (
              <div
                key={dayIndex}
                className="flex"
              >
                {[1, 2, 3].map((shiftNumber) => {
                  const cellSchedules = getSchedulesForCell(dayIndex, shiftNumber as 1 | 2 | 3)
                  const cellProduction = cellSchedules.reduce((sum, s) => sum + s.quantity, 0)

                  return (
                    <div
                      key={shiftNumber}
                      className={cn(
                        "border-r border-[#2C2C2E] flex items-center justify-center transition-colors",
                        isToday(dayIndex) && "bg-[#0A84FF]/5",
                        cellSchedules.length > 0 && "bg-[#0A84FF]/10"
                      )}
                      style={{ width: cellWidth }}
                    >
                      {cellProduction > 0 && (
                        <div className="bg-[#0A84FF]/10 text-[#0A84FF] border border-[#0A84FF]/30 text-[10px] font-black px-2 py-0.5 rounded shadow-sm tabular-nums">
                          {cellProduction.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Weekly total */}
          <div className="w-[80px] bg-[#1C1C1E] flex items-center justify-center border-r border-[#2C2C2E] shadow-[-4px_0_12px_rgba(0,0,0,0.2)]">
            <span className="text-[13px] font-black text-[#FF9500] tabular-nums">
              {weeklyTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded product rows - sorted by stock out priority */}
      {isExpanded && products.sort((a, b) => {
        const aStockOutDay = getFirstStockOutDay(
          a.currentStock,
          dailyForecasts.get(a.id) || [],
          schedules.filter(s => s.productId === a.id)
        )
        const bStockOutDay = getFirstStockOutDay(
          b.currentStock,
          dailyForecasts.get(b.id) || [],
          schedules.filter(s => s.productId === b.id)
        )
        return aStockOutDay - bStockOutDay
      }).map((product) => {
        const productSchedules = schedules.filter(s => s.productId === product.id)
        const productForecasts = dailyForecasts.get(product.id) || []
        const productWeeklyTotal = productSchedules.reduce((sum, s) => sum + s.quantity, 0)

        // Calculate running balance for each shift
        const shiftBalances = calculateShiftBalances(
          product.currentStock,
          productForecasts,
          productSchedules
        )

        return (
          <div key={product.id} className="flex border-b border-[#2C2C2E]/30 last:border-b-0 hover:bg-white/[0.02] transition-colors group/row">
            {/* Product sidebar - STICKY with solid background */}
            <div className="flex-shrink-0 w-[280px] bg-[#0D0D0D] border-r border-[#2C2C2E] px-4 sticky left-0 z-[80] flex items-center shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3 w-full">
                <div className="w-1.5 h-6 rounded-full bg-[#0A84FF]/40 group-hover/row:bg-[#0A84FF] transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-[12px] font-semibold text-white truncate leading-tight",
                    isProductionView && "text-[13px] font-black"
                  )}>
                    {product.name}
                  </div>
                  {(product.weight || !isProductionView) && (
                    <div className="flex items-center gap-2 mt-1">
                      {product.weight && (
                        <span className="text-[9px] font-bold text-[#8E8E93] bg-[#1C1C1E] px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          {product.weight}
                        </span>
                      )}
                      {!isProductionView && (
                        <span className="text-[10px] font-medium text-[#8E8E93]">
                          Stock: <span className="text-white font-bold tabular-nums">{product.currentStock.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product cells */}
            <div className="flex">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const dayForecast = productForecasts.find(f => f.dayIndex === dayIndex)

                return (
                  <div key={dayIndex} className="flex">
                    {[1, 2, 3].map((shiftNumber) => {
                      const cellSchedules = productSchedules.filter(
                        s => s.dayIndex === dayIndex && s.shiftNumber === shiftNumber
                      )

                      // Only show demand in first shift of the day
                      const showDemand = shiftNumber === 1 && dayForecast
                      const demand = showDemand ? dayForecast.demand : 0 // Use demand (MAX of forecast and actual orders)
                      const hasRealOrders = showDemand ? dayForecast.hasRealOrders : false

                      // Get the running balance for THIS specific shift
                      const shiftKey = `${dayIndex}-${shiftNumber}`
                      const shiftBalance = shiftBalances.get(shiftKey)
                      const balance = shiftBalance?.closingBalance ?? 0
                      const isDeficit = shiftBalance?.isDeficit ?? false

                      return (
                        <WeeklyGridCell
                          key={shiftNumber}
                          resourceId={resourceId}
                          dayIndex={dayIndex}
                          shiftNumber={shiftNumber as 1 | 2 | 3}
                          schedules={cellSchedules}
                          demand={demand}
                          hasRealOrders={hasRealOrders}
                          balance={balance}
                          isDeficit={isDeficit}
                          isToday={isToday(dayIndex)}
                          isProductionView={isProductionView}
                          onAddProduction={onAddProduction}
                          onEditSchedule={onEditSchedule}
                          onDeleteSchedule={onDeleteSchedule}
                          onUpdateQuantity={onUpdateQuantity}
                          onUpdateTimes={onUpdateTimes}
                          onViewDemandBreakdown={() => onViewDemandBreakdown(product.id, dayIndex)}
                          cellWidth={cellWidth}
                        />
                      )
                    })}
                  </div>
                )
              })}

              {/* Product weekly totals - Simplified for Production View */}
              <div
                className="w-[80px] bg-[#0D0D0D] relative border-r border-[#2C2C2E] shadow-[-4px_0_12px_rgba(0,0,0,0.2)] flex flex-col"
              >
                {!isProductionView && (
                  <>
                    {/* Demand total (orange) - Matches top-1 alignment */}
                    <div className="absolute top-1 left-0 right-0 z-[20] flex items-center justify-center">
                      <div className="text-[10px] font-black text-[#FF9500] px-1.5 py-0.5">
                        {productForecasts.reduce((sum, f) => sum + f.demand, 0).toLocaleString()}
                      </div>
                    </div>
                  </>
                )}

                {/* Production total (blue) - Matches centered production area */}
                <div className={cn(
                  "flex-1 relative flex items-center justify-center",
                  !isProductionView ? "mt-[26px] mb-6" : "mt-0 mb-0"
                )}>
                  <div className={cn(
                    "font-black text-[#0A84FF] tabular-nums",
                    isProductionView ? "text-[14px]" : "text-[10px]"
                  )}>
                    {productWeeklyTotal.toLocaleString()}
                  </div>
                </div>

                {!isProductionView && (
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center text-[10px] font-black tracking-tight tabular-nums",
                    "border-t border-b border-l",
                    (shiftBalances.get("6-3")?.closingBalance ?? 0) >= 0
                      ? "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/30"
                      : "bg-[#FF453A]/10 text-[#FF453A] border-[#FF453A]/30"
                  )}>
                    {(shiftBalances.get("6-3")?.closingBalance ?? 0).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
