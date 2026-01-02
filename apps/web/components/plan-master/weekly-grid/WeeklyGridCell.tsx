"use client"

import { useState, useCallback } from "react"
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
  forecast: number
  balance: number
  isDeficit: boolean
  isToday?: boolean
  onAddProduction: (resourceId: string, dayIndex: number, shiftNumber: 1 | 2 | 3) => void
  onEditSchedule: (schedule: ShiftSchedule) => void
  onDeleteSchedule: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onViewDemandBreakdown: (dayIndex: number) => void
  cellWidth?: number
}

export function WeeklyGridCell({
  resourceId,
  dayIndex,
  shiftNumber,
  schedules,
  forecast,
  balance,
  isDeficit,
  isToday = false,
  onAddProduction,
  onEditSchedule,
  onDeleteSchedule,
  onUpdateQuantity,
  onViewDemandBreakdown,
  cellWidth = 100
}: WeeklyGridCellProps) {
  const [isHovered, setIsHovered] = useState(false)

  const totalProduction = schedules.reduce((sum, s) => sum + s.quantity, 0)
  const hasSchedules = schedules.length > 0

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAddProduction(resourceId, dayIndex, shiftNumber)
  }, [resourceId, dayIndex, shiftNumber, onAddProduction])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "relative border-r border-b border-[#2C2C2E] min-h-[80px] transition-colors",
            isHovered && "bg-[#2C2C2E]/50",
            isToday && "bg-[#0A84FF]/5",
            !hasSchedules && isHovered && "cursor-pointer"
          )}
          style={{ width: cellWidth }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={!hasSchedules ? handleAddClick : undefined}
        >
          {/* Forecast badge (top right) */}
          {forecast > 0 && (
            <div
              className={cn(
                "absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                "bg-[#FF9500]/20 text-[#FF9500] cursor-pointer hover:bg-[#FF9500]/30"
              )}
              onClick={(e) => {
                e.stopPropagation()
                onViewDemandBreakdown(dayIndex)
              }}
              title="Click para ver desglose de demanda"
            >
              {forecast.toLocaleString()}
            </div>
          )}

          {/* Production blocks */}
          <div className="p-1 pt-6 space-y-1">
            {schedules.map((schedule) => (
              <ShiftBlock
                key={schedule.id}
                schedule={schedule}
                onEdit={() => onEditSchedule(schedule)}
                onDelete={() => onDeleteSchedule(schedule.id)}
                onUpdateQuantity={(qty) => onUpdateQuantity(schedule.id, qty)}
              />
            ))}
          </div>

          {/* Add button (shown on hover when empty) */}
          {!hasSchedules && isHovered && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handleAddClick}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#0A84FF]/20 text-[#0A84FF] text-xs hover:bg-[#0A84FF]/30 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Agregar
              </button>
            </div>
          )}

          {/* Balance indicator (bottom) - ALWAYS SHOW */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center text-[9px] font-medium",
              isDeficit
                ? "bg-[#FF453A]/20 text-[#FF453A]"
                : "bg-[#30D158]/20 text-[#30D158]"
            )}
          >
            {balance >= 0 ? '+' : ''}{balance.toLocaleString()}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="bg-[#2C2C2E] border-[#3A3A3C] min-w-[180px]">
        <ContextMenuItem
          onClick={() => onAddProduction(resourceId, dayIndex, shiftNumber)}
          className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C] cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2 text-[#0A84FF]" />
          Agregar producción
        </ContextMenuItem>

        {forecast > 0 && (
          <>
            <ContextMenuSeparator className="bg-[#3A3A3C]" />
            <ContextMenuItem
              onClick={() => onViewDemandBreakdown(dayIndex)}
              className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C] cursor-pointer"
            >
              <Info className="h-4 w-4 mr-2 text-[#FF9500]" />
              Ver desglose de demanda
            </ContextMenuItem>
          </>
        )}

        {schedules.length > 0 && (
          <>
            <ContextMenuSeparator className="bg-[#3A3A3C]" />
            {schedules.map((schedule) => (
              <ContextMenuItem
                key={schedule.id}
                onClick={() => onEditSchedule(schedule)}
                className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C] cursor-pointer"
              >
                Editar {schedule.productName} ({schedule.quantity}u)
              </ContextMenuItem>
            ))}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
