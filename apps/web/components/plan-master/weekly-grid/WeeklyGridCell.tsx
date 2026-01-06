"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Plus, Info } from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { ShiftBlock } from "./ShiftBlock"
import type { ShiftSchedule } from "@/hooks/use-shift-schedules"

interface WeeklyGridCellProps {
  resourceId: string
  dayIndex: number
  shiftNumber: 1 | 2 | 3
  schedules: ShiftSchedule[]
  demand: number
  hasRealOrders: boolean
  balance: number
  isDeficit: boolean
  isToday?: boolean
  onAddProduction: (resourceId: string, dayIndex: number, shiftNumber: 1 | 2 | 3) => void
  onEditSchedule: (schedule: ShiftSchedule) => void
  onDeleteSchedule: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onViewDemandBreakdown: (dayIndex: number) => void
  onUpdateTimes?: (id: string, startDate: Date, durationHours: number) => void
  cellWidth?: number
  isProductionView?: boolean
}

const SHIFT_CONFIG = [
  { startHour: 6 },
  { startHour: 14 },
  { startHour: 22 }
]


export function WeeklyGridCell({
  resourceId,
  dayIndex,
  shiftNumber,
  schedules,
  demand,
  hasRealOrders,
  balance,
  isDeficit,
  isToday = false,
  onAddProduction,
  onEditSchedule,
  onDeleteSchedule,
  onUpdateQuantity,
  onViewDemandBreakdown,
  onUpdateTimes,
  cellWidth = 100,
  isProductionView = false
}: WeeklyGridCellProps) {
  const [isHovered, setIsHovered] = useState(false)

  const hasSchedules = schedules.length > 0

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAddProduction(resourceId, dayIndex, shiftNumber)
  }, [resourceId, dayIndex, shiftNumber, onAddProduction])

  const handleDemandClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (hasRealOrders) {
      onViewDemandBreakdown(dayIndex)
    }
  }, [dayIndex, onViewDemandBreakdown, hasRealOrders])

  // Mini-Gantt Calculations
  const shiftStartHour = SHIFT_CONFIG[shiftNumber - 1].startHour

  const getRelativeHours = (date: Date) => {
    let h = date.getHours() + (date.getMinutes() / 60)
    // Handle shift 3 crossing midnight
    if (shiftStartHour === 22 && h < 6) h += 24
    return Math.max(0, h - shiftStartHour)
  }

  // Sort by start date for the staircase
  const sortedSchedules = [...schedules].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  return (
    <div
      className={cn(
        "relative border-r border-b border-[#2C2C2E] min-h-[72px] transition-colors flex flex-col group/cell",
        isHovered && "bg-[#2C2C2E]/20",
        isToday && "bg-[#0A84FF]/5"
      )}
      style={{
        width: cellWidth,
        height: schedules.length > 1 ? (32 + (schedules.length * 24) + 16) : undefined
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 8-hour Grid Background */}
      <div className="absolute inset-0 pointer-events-none flex opacity-[0.03]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 border-r border-white last:border-r-0" />
        ))}
      </div>

      {/* Demand pill (Top) - Hidden in Production View */}
      {demand > 0 && !isProductionView && (
        <div className="absolute top-1 left-1 right-1 z-[20]">
          <button
            type="button"
            className={cn(
              "w-full px-1.5 py-0.5 text-[10px] font-black rounded transition-all flex items-center justify-center gap-1.5",
              hasRealOrders
                ? "text-[#FF9500] border border-[#FF9500]/40 bg-[#FF9500]/5 hover:bg-[#FF9500]/15"
                : "text-[#FF9500]/60 cursor-default border border-transparent",
            )}
            onClick={hasRealOrders ? handleDemandClick : undefined}
          >
            {hasRealOrders && <div className="w-1 h-1 rounded-full bg-[#FF9500] animate-pulse shadow-[0_0_4px_#FF9500]" />}
            {demand.toLocaleString()}
          </button>
        </div>
      )}

      {/* Production Area (Mini-Gantt Staircase) */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex-1 relative px-1 py-0.5",
              !isProductionView ? "mt-[26px] mb-6" : "mt-1 mb-1",
              !hasSchedules && isHovered && "cursor-pointer"
            )}
            onClick={!hasSchedules ? handleAddClick : undefined}
          >
            {sortedSchedules.map((schedule, index) => {
              const relStart = getRelativeHours(new Date(schedule.startDate))
              const left = (relStart / 8) * 100
              const width = (schedule.durationHours / 8) * 100

              return (
                <div
                  key={schedule.id}
                  style={{
                    top: index * 24, // Matches h-6 (24px)
                    height: 24,
                    width: '100%',
                    position: 'absolute',
                    left: 0,
                    pointerEvents: 'none'
                  }}
                >
                  <div className="relative h-full w-full pointer-events-auto">
                    <ShiftBlock
                      schedule={schedule}
                      left={`${left}%`}
                      width={`${width}%`}
                      shiftStartHour={shiftStartHour}
                      onEdit={() => onEditSchedule(schedule)}
                      onDelete={() => onDeleteSchedule(schedule.id)}
                      onUpdateQuantity={(q) => onUpdateQuantity(schedule.id, q)}
                      onUpdateTimes={(start, dur) => onUpdateTimes?.(schedule.id, start, dur)}
                    />
                  </div>
                </div>
              )
            })}

            {/* Empty state visual */}
            {!hasSchedules && isHovered && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="text-[8px] font-black text-[#0A84FF] flex items-center gap-1 uppercase">
                  <Plus className="h-2.5 w-2.5" /> Agregar
                </div>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-[#1C1C1E] border-[#2C2C2E] text-white">
          <ContextMenuItem onClick={handleAddClick} className="flex items-center gap-2 focus:bg-[#2C2C2E]">
            <Plus className="h-4 w-4" /> Agregar Producción
          </ContextMenuItem>
          {hasRealOrders && (
            <ContextMenuItem onClick={() => onViewDemandBreakdown(dayIndex)} className="flex items-center gap-2 focus:bg-[#2C2C2E]">
              <Info className="h-4 w-4" /> Ver Detalles de Demanda
            </ContextMenuItem>
          )}
          {schedules.length > 0 && (
            <>
              <ContextMenuSeparator className="bg-[#2C2C2E]" />
              {schedules.map((s) => (
                <ContextMenuItem key={s.id} onClick={() => onEditSchedule(s)} className="text-[11px] opacity-80 focus:bg-[#2C2C2E]">
                  Editar {s.productName} ({s.quantity}u)
                </ContextMenuItem>
              ))}
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Balance Indicator (Bottom) - Hidden in Production View */}
      {!isProductionView && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-4 px-1.5 flex items-center justify-center text-[10px] font-black z-[10] tracking-tight tabular-nums",
            isDeficit
              ? "bg-[#FF453A]/10 text-[#FF453A] border-t border-[#FF453A]/20"
              : "bg-[#30D158]/10 text-[#30D158] border-t border-[#30D158]/20"
          )}
        >
          {balance >= 0 ? '+' : ''}{balance.toLocaleString()}
        </div>
      )}
    </div>
  )
}
