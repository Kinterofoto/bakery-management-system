"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X, GripVertical } from "lucide-react"
import { format, addHours } from "date-fns"
import type { ShiftSchedule } from "@/hooks/use-shift-schedules"

interface ShiftBlockProps {
  schedule: ShiftSchedule
  onEdit: () => void
  onDelete: () => void
  onUpdateQuantity: (quantity: number) => void
  onUpdateTimes?: (startDate: Date, durationHours: number) => void
  onMoveAcrossCells?: (id: string, newDayIndex: number, newShiftNumber: 1 | 2 | 3, newResourceId?: string, newStartHour?: number) => void
  compact?: boolean
  left: string // Percentage
  width: string // Percentage
  shiftStartHour: number
  isConflict?: boolean
  isNew?: boolean
}

export function ShiftBlock({
  schedule,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onUpdateTimes,
  onMoveAcrossCells,
  compact = false,
  left,
  width,
  shiftStartHour,
  isConflict = false,
  isNew = false
}: ShiftBlockProps) {
  const [isEditing, setIsEditing] = useState(isNew)
  const [editValue, setEditValue] = useState(schedule.quantity.toString())
  const [isHovered, setIsHovered] = useState(false)
  const [isResizing, setIsResizing] = useState<"left" | "right" | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [localTimes, setLocalTimes] = useState<{ left: number; width: number } | null>(null)
  const [optimisticStart, setOptimisticStart] = useState<Date>(schedule.startDate)
  const [optimisticDuration, setOptimisticDuration] = useState<number>(schedule.durationHours)
  const isEditingQuantity = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)

  // Auto-edit on mount if new
  useEffect(() => {
    if (isNew) {
      setIsEditing(true)
      setEditValue("") // Start empty if new, or keep at 0
    }
  }, [isNew])

  // Sync optimistic state with props
  useEffect(() => {
    if (!isDragging && !isResizing) {
      setLocalTimes(null)
      setOptimisticStart(schedule.startDate)
      setOptimisticDuration(schedule.durationHours)
    }
  }, [schedule.startDate, schedule.durationHours, isDragging, isResizing])

  // Mouse up cleanup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing) {
        setIsDragging(false)
        setIsResizing(null)
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging, isResizing])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Mouse handlers for move/resize
  const handleMouseDown = useCallback((e: React.MouseEvent, type: "drag" | "left" | "right") => {
    e.stopPropagation()
    if (isEditing) return

    const startX = e.clientX
    const initialStart = new Date(schedule.startDate)
    const initialDuration = schedule.durationHours
    const parent = blockRef.current?.parentElement
    if (!parent) return

    const cellWidth = parent.getBoundingClientRect().width
    const hourWidth = cellWidth / 8

    // Parse current percentage values
    const currentLeft = parseFloat(left)
    const currentWidth = parseFloat(width)

    let currentOptimisticStart = initialStart
    let currentOptimisticDuration = initialDuration
    let didAction = false

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()
      const deltaX = moveEvent.clientX - startX
      const deltaHours = deltaX / hourWidth

      if (Math.abs(deltaHours) < 0.05) return // Tiny movement threshold
      didAction = true

      if (type === "drag") {
        setIsDragging(true)
        // Snap to 15 min (0.25h)
        const snapDelta = Math.round(deltaHours / 0.25) * 0.25
        const newHoursFromStart = (currentLeft / 100 * 8) + snapDelta
        const clampedHours = Math.max(-24, Math.min(168, newHoursFromStart)) // Loose clamping
        const actualDelta = clampedHours - (currentLeft / 100 * 8)

        setLocalTimes({
          left: (clampedHours / 8) * 100,
          width: currentWidth
        })

        const newStart = new Date(initialStart.getTime() + actualDelta * 60 * 60 * 1000)
        currentOptimisticStart = newStart
        currentOptimisticDuration = initialDuration
        setOptimisticStart(currentOptimisticStart)
        setOptimisticDuration(currentOptimisticDuration)
      } else if (type === "right") {
        setIsResizing("right")
        const snapDelta = Math.round(deltaHours / 0.25) * 0.25
        const newDuration = Math.max(0.25, initialDuration + snapDelta)

        setLocalTimes({
          left: currentLeft,
          width: (newDuration / 8) * 100
        })

        currentOptimisticStart = initialStart
        currentOptimisticDuration = newDuration
        setOptimisticStart(currentOptimisticStart)
        setOptimisticDuration(currentOptimisticDuration)
      } else if (type === "left") {
        setIsResizing("left")
        const snapDelta = Math.round(deltaHours / 0.25) * 0.25
        const currentStartHours = (currentLeft / 100 * 8)
        const newStartHours = currentStartHours + snapDelta
        const actualDelta = newStartHours - currentStartHours
        const newDuration = Math.max(0.25, initialDuration - actualDelta)

        setLocalTimes({
          left: (newStartHours / 8) * 100,
          width: (newDuration / 8) * 100
        })

        currentOptimisticStart = new Date(initialStart.getTime() + actualDelta * 60 * 60 * 1000)
        currentOptimisticDuration = newDuration
        setOptimisticStart(currentOptimisticStart)
        setOptimisticDuration(currentOptimisticDuration)
      }
    }

    const handleMouseUp = (moveUpEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)

      if (didAction) {
        // Find target cell under mouse
        const elements = document.elementsFromPoint(moveUpEvent.clientX, moveUpEvent.clientY)
        const targetCell = elements.find(el => el instanceof HTMLElement && el.dataset.resourceId) as HTMLElement | undefined

        if (targetCell && type === "drag") {
          const resId = targetCell.dataset.resourceId!
          const dIdx = parseInt(targetCell.dataset.dayIndex!, 10)
          const sNum = parseInt(targetCell.dataset.shiftNumber!, 10) as 1 | 2 | 3

          // Actualizado para el nuevo orden de turnos: T1=22:00, T2=6:00, T3=14:00
          const destShiftStart = sNum === 1 ? 22 : sNum === 2 ? 6 : 14
          let h = currentOptimisticStart.getHours() + (currentOptimisticStart.getMinutes() / 60)

          // Handle T1 (22:00-06:00) crossing midnight
          if (sNum === 1 && h < 6) h += 24
          const relStartHour = Math.max(0, h - destShiftStart)

          onMoveAcrossCells?.(schedule.id, dIdx, sNum, resId, relStartHour)
        } else {
          onUpdateTimes?.(currentOptimisticStart, currentOptimisticDuration)
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }, [schedule.startDate, schedule.durationHours, left, width, onUpdateTimes, onMoveAcrossCells, isEditing, isDragging, isResizing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditValue(schedule.quantity.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(schedule.quantity.toString())
    }
  }

  const handleSave = () => {
    const newQuantity = parseInt(editValue, 10)
    if (!isNaN(newQuantity) && newQuantity > 0 && newQuantity !== schedule.quantity) {
      onUpdateQuantity(newQuantity)
    }
    setIsEditing(false)
  }

  const handleBlur = () => {
    handleSave()
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  // Use local times if dragging/resizing, otherwise use props
  const displayLeft = localTimes ? `${localTimes.left}%` : left
  const displayWidth = localTimes ? `${localTimes.width}%` : width

  // Truncate product name
  const displayName = schedule.productName
    ? schedule.productName.length > 10
      ? schedule.productName.substring(0, 8) + '...'
      : schedule.productName
    : 'Producto'

  return (
    <div
      ref={blockRef}
      style={{
        left: displayLeft,
        width: displayWidth,
        position: 'absolute',
      }}
      className={cn(
        "group relative h-6 rounded transition-all cursor-move border border-white/20 select-none shadow-sm",
        "bg-[#0A84FF] hover:bg-[#0A84FF]/90 hover:shadow-md z-10",
        isDragging && "opacity-80 scale-[1.02] z-[1000] shadow-2xl ring-2 ring-white/30 border-transparent",
        isResizing && "z-[999] ring-2 ring-white/20 shadow-xl",
        isEditing && "ring-2 ring-white/50 z-[1001] scale-110 shadow-2xl"
      )}
      onMouseDown={(e) => handleMouseDown(e, "drag")}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Resize handles */}
      {!isEditing && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l transition-colors z-20"
            onMouseDown={(e) => handleMouseDown(e, "left")}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r transition-colors z-20"
            onMouseDown={(e) => handleMouseDown(e, "right")}
          />
        </>
      )}

      {/* Content */}
      <div className="flex items-center justify-center h-full px-1.5 gap-1 min-w-0">
        {/* Quantity (editable on double-click) */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-12 px-1 py-0.5 bg-white text-black rounded shadow-inner text-right text-[11px] font-black",
              "focus:outline-none focus:ring-2 focus:ring-[#0A84FF]",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
            min={1}
          />
        ) : (
          <div className={cn(
            "font-black text-white/95 tabular-nums text-[10px] drop-shadow-sm",
            isDragging && "opacity-50"
          )}>
            {schedule.quantity}
          </div>
        )}
      </div>

      {/* Delete button (hidden while dragging/resizing) */}
      {!isDragging && !isResizing && isHovered && (
        <button
          onClick={handleDeleteClick}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            "absolute -top-2 -right-2 w-4 h-4 rounded-full border border-white/40",
            "bg-[#FF453A] text-white flex items-center justify-center shadow-lg",
            "hover:scale-110 active:scale-95 transition-transform z-30"
          )}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      {/* Duration tooltip (only when small or hovered while resizing) */}
      {(isHovered || isDragging || isResizing) && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] px-2 py-1 rounded bg-black/90 backdrop-blur-md text-[9px] font-black text-white border border-white/20 whitespace-nowrap z-[120] shadow-2xl pointer-events-none animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-1.5">
            <span className="text-[#0A84FF]">{localTimes ? optimisticDuration : schedule.durationHours}h</span>
            <span className="opacity-40">|</span>
            <span>{format(localTimes ? optimisticStart : schedule.startDate, 'HH:mm')} - {format(localTimes ? addHours(optimisticStart, optimisticDuration) : schedule.endDate, 'HH:mm')}</span>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-black/90" />
        </div>
      )}
    </div>
  )
}
