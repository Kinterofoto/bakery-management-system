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
    const dailyDemand = dayForecast?.forecast || 0
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
    const dailyDemand = dayForecast?.forecast || 0
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
  cellWidth?: number
  isToday?: (dayIndex: number) => boolean
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
  cellWidth = 100,
  isToday = () => false
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

  // Get aggregated forecast for a day (sum across all products)
  const getForecastForDay = (dayIndex: number) => {
    let total = 0
    dailyForecasts.forEach((forecasts) => {
      const dayForecast = forecasts.find(f => f.dayIndex === dayIndex)
      if (dayForecast) total += dayForecast.forecast
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
      <div className="flex bg-[#1C1C1E]">
        {/* Sidebar - STICKY with solid background */}
        <div
          className="flex-shrink-0 w-[280px] bg-[#1C1C1E] border-r border-[#2C2C2E] px-3 py-2 cursor-pointer hover:bg-[#2C2C2E] transition-colors sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.3)]"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <button className="text-[#8E8E93]">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm truncate">
                {resourceName}
              </div>
              <div className="text-[10px] text-[#8E8E93]">
                {products.length} producto{products.length !== 1 ? 's' : ''} asignado{products.length !== 1 ? 's' : ''}
              </div>
            </div>
            <Settings className="h-4 w-4 text-[#636366] opacity-0 group-hover:opacity-100" />
          </div>
        </div>

        {/* Day cells (aggregated view) */}
        <div className="flex">
          {Array.from({ length: 7 }).map((_, dayIndex) => {
            const dayForecast = getForecastForDay(dayIndex)
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
                        "border-r border-[#2C2C2E] flex items-center justify-center",
                        "min-h-[40px]",
                        isToday(dayIndex) && "bg-[#0A84FF]/5",
                        cellSchedules.length > 0 && "bg-[#0A84FF]/10"
                      )}
                      style={{ width: cellWidth }}
                    >
                      {cellProduction > 0 && (
                        <span className="text-[10px] font-medium text-[#0A84FF]">
                          {cellProduction.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Weekly total */}
          <div className="w-[80px] bg-[#1C1C1E] flex items-center justify-center border-r border-[#2C2C2E]">
            <span className="text-sm font-bold text-[#FF9500]">
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
          <div key={product.id} className="flex">
            {/* Product sidebar - STICKY with solid background */}
            <div className="flex-shrink-0 w-[280px] bg-[#0D0D0D] border-r border-[#2C2C2E] px-3 py-2 pl-10 sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0A84FF]" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">
                    {product.name} {product.weight && <span className="text-[#8E8E93]">{product.weight}</span>}
                  </div>
                  <div className="text-[10px] text-[#8E8E93]">
                    Stock: {product.currentStock.toLocaleString()}
                  </div>
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
                      const demand = showDemand ? dayForecast.forecast : 0
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
                          onAddProduction={onAddProduction}
                          onEditSchedule={onEditSchedule}
                          onDeleteSchedule={onDeleteSchedule}
                          onUpdateQuantity={onUpdateQuantity}
                          onViewDemandBreakdown={() => onViewDemandBreakdown(product.id, dayIndex)}
                          cellWidth={cellWidth}
                        />
                      )
                    })}
                  </div>
                )
              })}

              {/* Product weekly totals - Demand (orange) + Production (blue) + Balance (green/red) */}
              <div className="w-[80px] bg-[#1C1C1E]/50 flex flex-col items-center justify-center border-r border-[#2C2C2E] gap-2 py-1">
                {/* Demand total (orange) */}
                <div className="w-full px-1">
                  <div className="bg-[#FF9500]/20 text-[#FF9500] text-[10px] font-semibold text-center py-0.5">
                    {productForecasts.reduce((sum, f) => sum + f.forecast, 0).toLocaleString()}
                  </div>
                </div>
                {/* Production total (blue) */}
                <div className="w-full px-1">
                  <div className="bg-[#0A84FF]/20 text-[#0A84FF] text-[10px] font-semibold text-center py-0.5">
                    {productWeeklyTotal.toLocaleString()}
                  </div>
                </div>
                {/* Balance total (green if positive, red if negative) */}
                <div className="w-full px-1">
                  <div className={cn(
                    "text-[10px] font-semibold text-center py-0.5",
                    shiftBalances.get("6-3")?.closingBalance ?? 0 >= 0
                      ? "bg-[#34C759]/20 text-[#34C759]"
                      : "bg-[#FF453A]/20 text-[#FF453A]"
                  )}>
                    {(shiftBalances.get("6-3")?.closingBalance ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
