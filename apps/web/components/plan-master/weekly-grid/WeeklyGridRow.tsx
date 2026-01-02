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
  currentStock: number
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
  const [isExpanded, setIsExpanded] = useState(true)

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
        {/* Sidebar */}
        <div
          className="flex-shrink-0 w-[280px] bg-[#1C1C1E] border-r border-[#2C2C2E] px-3 py-2 cursor-pointer hover:bg-[#2C2C2E] transition-colors"
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

      {/* Expanded product rows */}
      {isExpanded && products.map((product) => {
        const productSchedules = schedules.filter(s => s.productId === product.id)
        const productForecasts = dailyForecasts.get(product.id) || []
        const productBalances = dailyBalances.get(product.id) || []
        const productWeeklyTotal = productSchedules.reduce((sum, s) => sum + s.quantity, 0)

        return (
          <div key={product.id} className="flex bg-black">
            {/* Product sidebar */}
            <div className="flex-shrink-0 w-[280px] bg-black border-r border-[#2C2C2E] px-3 py-2 pl-10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0A84FF]" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">{product.name}</div>
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
                const dayBalance = productBalances.find(b => b.dayIndex === dayIndex)

                return (
                  <div key={dayIndex} className="flex">
                    {[1, 2, 3].map((shiftNumber) => {
                      const cellSchedules = productSchedules.filter(
                        s => s.dayIndex === dayIndex && s.shiftNumber === shiftNumber
                      )

                      // Only show forecast in first shift of the day
                      const showForecast = shiftNumber === 1 && dayForecast
                      const forecast = showForecast ? dayForecast.forecast : 0

                      // Only show balance in last shift of the day
                      const showBalance = shiftNumber === 3 && dayBalance
                      const balance = showBalance ? dayBalance.closingBalance : 0
                      const isDeficit = showBalance ? dayBalance.isDeficit : false

                      return (
                        <WeeklyGridCell
                          key={shiftNumber}
                          resourceId={resourceId}
                          dayIndex={dayIndex}
                          shiftNumber={shiftNumber as 1 | 2 | 3}
                          schedules={cellSchedules}
                          forecast={forecast}
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

              {/* Product weekly total */}
              <div className="w-[80px] bg-[#1C1C1E]/50 flex items-center justify-center border-r border-[#2C2C2E]">
                <span className="text-xs font-semibold text-white">
                  {productWeeklyTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
