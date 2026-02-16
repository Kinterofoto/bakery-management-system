"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { format, addHours } from "date-fns"
import type { ShiftSchedule } from "@/hooks/use-shift-schedules"

interface OrderBarProps {
  orderNumber: number
  batches: ShiftSchedule[]
  color: string
  shiftStartHour: number
  top: number
  onEdit: (schedule: ShiftSchedule) => void
  onDelete: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onUpdateTimes?: (id: string, startDate: Date, durationHours: number) => void
  onMoveAcrossCells?: (id: string, newDayIndex: number, newShiftNumber: 1 | 2 | 3, newResourceId?: string, newStartHour?: number) => void
  latestCreatedScheduleId?: string | null
}

export function OrderBar({
  orderNumber,
  batches,
  color,
  shiftStartHour,
  top,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onUpdateTimes,
  onMoveAcrossCells,
  latestCreatedScheduleId,
}: OrderBarProps) {
  const [hoveredBatchId, setHoveredBatchId] = useState<string | null>(null)
  const [isBarHovered, setIsBarHovered] = useState(false)
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [draggingBatchId, setDraggingBatchId] = useState<string | null>(null)
  const [localTimes, setLocalTimes] = useState<{ left: number; width: number } | null>(null)
  const [optimisticStart, setOptimisticStart] = useState<Date | null>(null)
  const [optimisticDuration, setOptimisticDuration] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const getRelativeHours = (date: Date) => {
    let h = date.getHours() + (date.getMinutes() / 60)
    if (shiftStartHour === 22 && h < 6) h += 24
    return Math.max(0, h - shiftStartHour)
  }

  // Auto-focus input for latest created schedule
  useEffect(() => {
    if (latestCreatedScheduleId && batches.some(b => b.id === latestCreatedScheduleId)) {
      setEditingBatchId(latestCreatedScheduleId)
      const batch = batches.find(b => b.id === latestCreatedScheduleId)
      setEditValue(batch ? "" : "")
    }
  }, [latestCreatedScheduleId, batches])

  useEffect(() => {
    if (editingBatchId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingBatchId])

  // Calculate order-level span
  const sortedBatches = [...batches].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  const orderStart = getRelativeHours(sortedBatches[0].startDate)
  const orderEnd = Math.max(...sortedBatches.map(b => getRelativeHours(b.startDate) + b.durationHours))
  const orderDuration = orderEnd - orderStart

  const barLeft = (orderStart / 8) * 100
  const barWidth = (orderDuration / 8) * 100

  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0)

  // Inline editing handlers
  const handleDoubleClick = (e: React.MouseEvent, batch: ShiftSchedule) => {
    e.stopPropagation()
    setEditingBatchId(batch.id)
    setEditValue(batch.quantity.toString())
  }

  const handleSave = () => {
    if (!editingBatchId) return
    const newQuantity = parseInt(editValue, 10)
    if (!isNaN(newQuantity) && newQuantity > 0) {
      const batch = batches.find(b => b.id === editingBatchId)
      if (batch && newQuantity !== batch.quantity) {
        onUpdateQuantity(editingBatchId, newQuantity)
      }
    }
    setEditingBatchId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    else if (e.key === 'Escape') setEditingBatchId(null)
  }

  // Delete order — upstream handleDeleteSchedule already cascade-deletes the entire order
  const handleDeleteOrder = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(batches[0].id)
  }

  // Drag handler per batch segment
  const handleSegmentMouseDown = useCallback((e: React.MouseEvent, batch: ShiftSchedule) => {
    e.stopPropagation()
    if (editingBatchId) return

    const startX = e.clientX
    const initialStart = new Date(batch.startDate)
    const initialDuration = batch.durationHours
    const parent = barRef.current?.closest('[data-resource-id]') as HTMLElement | null
    if (!parent) return

    const cellWidth = parent.getBoundingClientRect().width
    const hourWidth = cellWidth / 8

    let currentOptimisticStart = initialStart
    let currentOptimisticDuration = initialDuration
    let didAction = false

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()
      const deltaX = moveEvent.clientX - startX
      const deltaHours = deltaX / hourWidth

      if (Math.abs(deltaHours) < 0.05) return
      didAction = true
      setIsDragging(true)
      setDraggingBatchId(batch.id)

      const snapDelta = Math.round(deltaHours / 0.25) * 0.25
      const batchRelStart = getRelativeHours(initialStart)
      const newStartHours = batchRelStart + snapDelta
      const clampedHours = Math.max(0, Math.min(8 - initialDuration, newStartHours))

      setLocalTimes({
        left: (clampedHours / 8) * 100,
        width: (initialDuration / 8) * 100
      })

      const actualDelta = clampedHours - batchRelStart
      currentOptimisticStart = new Date(initialStart.getTime() + actualDelta * 60 * 60 * 1000)
      currentOptimisticDuration = initialDuration
      setOptimisticStart(currentOptimisticStart)
      setOptimisticDuration(currentOptimisticDuration)
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)

      if (didAction) {
        const elements = document.elementsFromPoint(upEvent.clientX, upEvent.clientY)
        const targetCell = elements.find(el => el instanceof HTMLElement && el.dataset.resourceId) as HTMLElement | undefined

        if (targetCell) {
          const resId = targetCell.dataset.resourceId!
          const dIdx = parseInt(targetCell.dataset.dayIndex!, 10)
          const sNum = parseInt(targetCell.dataset.shiftNumber!, 10) as 1 | 2 | 3
          const destShiftStart = sNum === 1 ? 22 : sNum === 2 ? 6 : 14
          let h = currentOptimisticStart.getHours() + (currentOptimisticStart.getMinutes() / 60)
          if (sNum === 1 && h < 6) h += 24
          const relStartHour = Math.max(0, h - destShiftStart)

          onMoveAcrossCells?.(batch.id, dIdx, sNum, resId, relStartHour)
        } else {
          onUpdateTimes?.(batch.id, currentOptimisticStart, currentOptimisticDuration)
        }
      }

      setIsDragging(false)
      setDraggingBatchId(null)
      setLocalTimes(null)
      setOptimisticStart(null)
      setOptimisticDuration(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }, [editingBatchId, shiftStartHour, onMoveAcrossCells, onUpdateTimes])

  return (
    <div
      ref={barRef}
      style={{
        top,
        height: 18,
        width: '100%',
        position: 'absolute',
        left: 0,
        zIndex: 10,
      }}
      onMouseEnter={() => setIsBarHovered(true)}
      onMouseLeave={() => setIsBarHovered(false)}
    >
      {/* Background bar spanning the full order duration */}
      <div
        style={{
          position: 'absolute',
          left: `${barLeft}%`,
          width: `${barWidth}%`,
          top: 0,
          bottom: 0,
          backgroundColor: `${color}1F`, // 12% opacity
          border: `1px solid ${color}40`, // 25% opacity
          borderRadius: 4,
        }}
      />

      {/* Individual batch segments */}
      {sortedBatches.map((batch, idx) => {
        const batchStart = getRelativeHours(batch.startDate)
        const batchDuration = batch.durationHours
        const segLeft = (batchStart / 8) * 100
        const segWidth = (batchDuration / 8) * 100

        // Use local position for the dragging batch
        const isBeingDragged = draggingBatchId === batch.id && localTimes
        const displayLeft = isBeingDragged ? `${localTimes!.left}%` : `${segLeft}%`
        const displayWidth = isBeingDragged ? `${localTimes!.width}%` : `${segWidth}%`

        const isHovered = hoveredBatchId === batch.id
        const isEditing = editingBatchId === batch.id

        return (
          <div
            key={batch.id}
            style={{
              position: 'absolute',
              left: displayLeft,
              width: displayWidth,
              top: 1,
              bottom: 1,
              backgroundColor: isHovered ? `${color}CC` : `${color}A6`, // 80% or 65% opacity
              borderRadius: 3,
              cursor: isEditing ? 'text' : 'move',
              zIndex: isBeingDragged ? 1000 : isEditing ? 1001 : isHovered ? 20 : 10,
              transition: isBeingDragged ? 'none' : 'background-color 0.15s',
            }}
            className={cn(
              "flex items-center justify-center select-none",
              isBeingDragged && "opacity-80 shadow-lg ring-1 ring-white/30",
              isEditing && "ring-2 ring-white/50 shadow-2xl"
            )}
            onMouseEnter={() => setHoveredBatchId(batch.id)}
            onMouseLeave={() => setHoveredBatchId(null)}
            onMouseDown={(e) => handleSegmentMouseDown(e, batch)}
            onDoubleClick={(e) => handleDoubleClick(e, batch)}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-10 px-0.5 bg-white text-black rounded shadow-inner text-right text-[9px] font-black focus:outline-none focus:ring-1 focus:ring-white/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={1}
              />
            ) : (
              <span className="text-[8px] font-black text-white/95 tabular-nums drop-shadow-sm truncate px-0.5">
                {batch.batchSize ?? batch.quantity}
              </span>
            )}

            {/* Tooltip on hover */}
            {isHovered && !isEditing && !isDragging && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] px-2 py-1 rounded bg-black/90 backdrop-blur-md text-[9px] font-black text-white border border-white/20 whitespace-nowrap z-[120] shadow-2xl pointer-events-none animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-1.5">
                  <span style={{ color }}>
                    Lote {batch.batchNumber ?? (idx + 1)}/{batch.totalBatches ?? batches.length}
                  </span>
                  <span className="opacity-40">|</span>
                  <span>{batch.batchSize ?? batch.quantity}kg</span>
                  <span className="opacity-40">|</span>
                  <span>{format(batch.startDate, 'HH:mm')}-{format(batch.endDate, 'HH:mm')}</span>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-black/90" />
              </div>
            )}
          </div>
        )
      })}

      {/* Order-level tooltip on background area */}
      {isBarHovered && !hoveredBatchId && !isDragging && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] px-2 py-1 rounded bg-black/90 backdrop-blur-md text-[9px] font-black text-white border border-white/20 whitespace-nowrap z-[120] shadow-2xl pointer-events-none animate-in fade-in zoom-in duration-200"
        >
          <div className="flex items-center gap-1.5">
            <span style={{ color }}>OP #{orderNumber}</span>
            <span className="opacity-40">|</span>
            <span>{totalQuantity.toLocaleString()}kg total</span>
            <span className="opacity-40">|</span>
            <span>{batches.length} lotes</span>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-black/90" />
        </div>
      )}

      {/* Delete order button */}
      {isBarHovered && !isDragging && (
        <button
          onClick={handleDeleteOrder}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ right: `${100 - (barLeft + barWidth)}%` }}
          className={cn(
            "absolute -top-2 w-4 h-4 rounded-full border border-white/40",
            "bg-[#FF453A] text-white flex items-center justify-center shadow-lg",
            "hover:scale-110 active:scale-95 transition-transform z-30"
          )}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}
