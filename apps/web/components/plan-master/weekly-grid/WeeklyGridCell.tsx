"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
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
import { OrderBar } from "./OrderBar"
import { getOrderColor } from "./order-colors"
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
  onAddProduction: (resourceId: string, dayIndex: number, shiftNumber: 1 | 2 | 3, productId?: string, startHour?: number, durationHours?: number) => void
  onEditSchedule: (schedule: ShiftSchedule) => void
  onDeleteSchedule: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onViewDemandBreakdown: (dayIndex: number) => void
  onUpdateTimes?: (id: string, startDate: Date, durationHours: number) => void
  onMoveAcrossCells?: (id: string, newDayIndex: number, newShiftNumber: 1 | 2 | 3, newResourceId?: string, newStartHour?: number) => void
  cellWidth?: number
  isProductionView?: boolean
  isBlocked?: boolean
  productId?: string
  latestCreatedScheduleId?: string | null
}

const SHIFT_CONFIG = [
  { startHour: 22 }, // T1: 22:00 (día anterior) - 06:00 (día actual)
  { startHour: 6 },  // T2: 06:00 - 14:00
  { startHour: 14 }  // T3: 14:00 - 22:00
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
  onMoveAcrossCells,
  cellWidth = 100,
  isProductionView = false,
  isBlocked = false,
  productId,
  latestCreatedScheduleId
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
  const cellRef = useRef<HTMLDivElement>(null)

  // Drag-to-Create (Paint) state
  const [paintingBlock, setPaintingBlock] = useState<{ startHour: number; currentHour: number } | null>(null)
  const paintingRef = useRef<{ startHour: number; currentHour: number } | null>(null)

  const updatePainting = (next: { startHour: number; currentHour: number } | null) => {
    paintingRef.current = next
    setPaintingBlock(next)
  }

  const getRelativeHoursFromClientX = (clientX: number) => {
    if (!cellRef.current) return 0
    const rect = cellRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    // Snap to 0.25h (15 min)
    return Math.round((percentage * 8) / 0.25) * 0.25
  }

  const getRelativeHoursFromEvent = (e: React.MouseEvent | MouseEvent) => {
    return getRelativeHoursFromClientX(e.clientX)
  }

  const finalizePainting = () => {
    const finalPainting = paintingRef.current
    if (finalPainting) {
      const duration = Math.abs(finalPainting.currentHour - finalPainting.startHour)
      if (duration >= 0.25) {
        const startHourValue = Math.min(finalPainting.startHour, finalPainting.currentHour)
        const endHourValue = startHourValue + duration

        // Local overlap check
        const hasLocalConflict = sortedSchedules.some(s => {
          const sStart = getRelativeHours(s.startDate)
          const sDuration = (s.endDate.getTime() - s.startDate.getTime()) / (1000 * 60 * 60)
          const sEnd = sStart + sDuration
          return startHourValue < sEnd - 0.01 && endHourValue > sStart + 0.01
        })

        if (!hasLocalConflict) {
          onAddProduction(resourceId, dayIndex, shiftNumber, productId, startHourValue, duration)
        }
      }
    }
    updatePainting(null)
  }

  const handleCellMouseDown = (e: React.MouseEvent) => {
    // Blocked cells don't allow drag-to-create
    if (isBlocked) return
    // Only if clicking on the empty area (not on an existing block)
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('production-area')) return
    if (e.button !== 0) return // Left click only

    const hour = getRelativeHoursFromEvent(e)
    updatePainting({ startHour: hour, currentHour: hour })

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentHour = getRelativeHoursFromClientX(moveEvent.clientX)
      updatePainting(paintingRef.current ? { ...paintingRef.current, currentHour } : null)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      finalizePainting()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Touch support for mobile
  const touchStartRef = useRef<{ x: number; y: number; hour: number } | null>(null)

  const handleCellTouchStart = (e: React.TouchEvent) => {
    if (isBlocked) return
    const target = e.target as HTMLElement
    if (target !== e.currentTarget && !target.classList.contains('production-area')) return

    const touch = e.touches[0]
    const hour = getRelativeHoursFromClientX(touch.clientX)
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, hour }
    updatePainting({ startHour: hour, currentHour: hour })
  }

  const handleCellTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !paintingRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartRef.current.x)
    // Only start painting if moved horizontally enough (10px threshold)
    if (dx > 10) {
      e.preventDefault() // Prevent scroll when dragging horizontally
      const currentHour = getRelativeHoursFromClientX(touch.clientX)
      updatePainting({ ...paintingRef.current, currentHour })
    }
  }, [])

  const handleCellTouchEnd = useCallback(() => {
    finalizePainting()
    touchStartRef.current = null
  }, [])

  const getRelativeHours = (date: Date) => {
    let h = date.getHours() + (date.getMinutes() / 60)
    // Handle T1 (22:00-06:00) crossing midnight
    if (shiftStartHour === 22 && h < 6) h += 24
    return Math.max(0, h - shiftStartHour)
  }

  // Sort by start date for the staircase
  const sortedSchedules = [...schedules].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  // Group schedules by production order
  const orderGroups = useMemo(() => {
    const groups = new Map<number | 'none', ShiftSchedule[]>()
    sortedSchedules.forEach(schedule => {
      const key = schedule.producedForOrderNumber
        ?? schedule.productionOrderNumber
        ?? 'none'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(schedule)
    })
    return Array.from(groups.entries())
  }, [sortedSchedules])

  // Count visual rows: each order group = 1 row, each ungrouped schedule = 1 row
  const visualRowCount = orderGroups.reduce((count, [key, batches]) => {
    return count + (key === 'none' ? batches.length : 1)
  }, 0)

  return (
    <div
      ref={cellRef}
      className={cn(
        "relative border-r border-b border-[#2C2C2E] min-h-[72px] transition-colors flex flex-col group/cell",
        isHovered && "bg-[#2C2C2E]/20",
        isToday && "bg-[#0A84FF]/5"
      )}
      data-resource-id={resourceId}
      data-day-index={dayIndex}
      data-shift-number={shiftNumber}
      style={{
        width: cellWidth,
        height: visualRowCount > 1 ? (Math.max(72, 32 + (visualRowCount * 18) + 16)) : undefined
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleCellMouseDown}
      onTouchStart={handleCellTouchStart}
      onTouchMove={handleCellTouchMove}
      onTouchEnd={handleCellTouchEnd}
    >
      {/* 8-hour Grid Background */}
      <div className="absolute inset-0 pointer-events-none flex opacity-[0.05]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 border-r border-white/20 last:border-r-0" />
        ))}
      </div>

      {/* Blocked shift overlay */}
      {isBlocked && (
        <div
          className="absolute inset-0 pointer-events-none z-[15]"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,69,58,0.12) 4px, rgba(255,69,58,0.12) 6px)",
          }}
        />
      )}

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
              "flex-1 relative px-1 py-0.5 production-area overflow-visible",
              !isProductionView ? "mt-[26px] mb-6" : "mt-1 mb-1",
              !hasSchedules && isHovered && !isBlocked && "cursor-pointer",
              isBlocked && "cursor-not-allowed"
            )}
          >
            {(() => {
              let rowIndex = 0
              return orderGroups.map(([key, batches]) => {
                if (key !== 'none') {
                  // Render condensed OrderBar for grouped schedules
                  const orderNum = key as number
                  const color = getOrderColor(orderNum) || '#0A84FF'
                  const currentTop = rowIndex * 18
                  rowIndex++
                  return (
                    <OrderBar
                      key={`order-${orderNum}`}
                      orderNumber={orderNum}
                      batches={batches}
                      color={color}
                      shiftStartHour={shiftStartHour}
                      top={currentTop}
                      onEdit={onEditSchedule}
                      onDelete={onDeleteSchedule}
                      onUpdateQuantity={(id, q) => onUpdateQuantity(id, q)}
                      onUpdateTimes={onUpdateTimes ? (id, start, dur) => onUpdateTimes(id, start, dur) : undefined}
                      onMoveAcrossCells={onMoveAcrossCells}
                      latestCreatedScheduleId={latestCreatedScheduleId}
                    />
                  )
                } else {
                  // Render legacy ShiftBlock for ungrouped schedules
                  return batches.map((schedule) => {
                    const relStart = getRelativeHours(new Date(schedule.startDate))
                    const left = (relStart / 8) * 100
                    const width = (schedule.durationHours / 8) * 100
                    const currentTop = rowIndex * 18
                    rowIndex++

                    const isConflict = sortedSchedules.some(other => {
                      if (other.id === schedule.id) return false
                      const otherStart = getRelativeHours(new Date(other.startDate))
                      const otherEnd = otherStart + other.durationHours
                      const thisStart = relStart
                      const thisEnd = relStart + schedule.durationHours
                      return thisStart < otherEnd - 0.01 && thisEnd > otherStart + 0.01
                    })

                    return (
                      <div
                        key={schedule.id}
                        style={{
                          top: currentTop,
                          height: 18,
                          width: '100%',
                          position: 'absolute',
                          left: 0,
                          pointerEvents: 'none',
                          zIndex: (schedule.id === latestCreatedScheduleId) ? 50 : 10
                        }}
                      >
                        <div className="relative h-full w-full pointer-events-auto">
                          <ShiftBlock
                            schedule={schedule}
                            left={`${left}%`}
                            width={`${width}%`}
                            shiftStartHour={shiftStartHour}
                            isConflict={isConflict}
                            onEdit={() => onEditSchedule(schedule)}
                            onDelete={() => onDeleteSchedule(schedule.id)}
                            onUpdateQuantity={(q) => onUpdateQuantity(schedule.id, q)}
                            onUpdateTimes={(start, dur) => onUpdateTimes?.(schedule.id, start, dur)}
                            onMoveAcrossCells={onMoveAcrossCells}
                            isNew={schedule.id === latestCreatedScheduleId}
                            color={getOrderColor(schedule.producedForOrderNumber ?? schedule.productionOrderNumber)}
                            compact
                          />
                        </div>
                      </div>
                    )
                  })
                }
              })
            })()}

            {paintingBlock && (() => {
              const start = Math.min(paintingBlock.startHour, paintingBlock.currentHour)
              const dur = Math.abs(paintingBlock.currentHour - paintingBlock.startHour)
              const end = start + dur
              const hasLocalConflict = sortedSchedules.some(s => {
                const sStart = getRelativeHours(s.startDate)
                const sDuration = (s.endDate.getTime() - s.startDate.getTime()) / (1000 * 60 * 60)
                const sEnd = sStart + sDuration
                return start < sEnd - 0.01 && end > sStart + 0.01
              })

              return (
                <div
                  style={{
                    left: `${(start / 8) * 100}%`,
                    width: `${(dur / 8) * 100}%`,
                    top: visualRowCount * 18,
                    height: 18,
                    position: 'absolute'
                  }}
                  className={cn(
                    "border border-dashed rounded pointer-events-none z-30 flex items-center justify-center transition-colors",
                    hasLocalConflict
                      ? "bg-[#FF453A]/40 border-[#FF453A]"
                      : "bg-[#0A84FF]/40 border-[#0A84FF]"
                  )}
                >
                  <div className="text-[9px] font-black text-white/80">
                    {dur}h {hasLocalConflict && "⚠️"}
                  </div>
                </div>
              )
            })()}

            {/* Empty state visual */}
            {!hasSchedules && !paintingBlock && !isBlocked && (
              <div className={cn(
                "absolute inset-0 flex items-center justify-center pointer-events-none",
                isHovered ? "opacity-40" : "opacity-0 md:opacity-0"
              )}>
                <div className="text-[8px] font-black text-[#0A84FF] flex items-center gap-1 uppercase">
                  <Plus className="h-2.5 w-2.5" />
                  <span className="hidden md:inline">Arrastrar para programar</span>
                  <span className="md:hidden">Toca</span>
                </div>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-[#1C1C1E] border-[#2C2C2E] text-white">
          {isBlocked ? (
            <ContextMenuItem disabled className="flex items-center gap-2 text-[#FF453A]/60">
              Turno bloqueado
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={handleAddClick} className="flex items-center gap-2 focus:bg-[#2C2C2E]">
              <Plus className="h-4 w-4" /> Agregar Producción
            </ContextMenuItem>
          )}
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
