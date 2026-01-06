"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X, GripVertical } from "lucide-react"
import { format } from "date-fns"
import type { ShiftSchedule } from "@/hooks/use-shift-schedules"

interface ShiftBlockProps {
  schedule: ShiftSchedule
  onEdit: () => void
  onDelete: () => void
  onUpdateQuantity: (quantity: number) => void
  onUpdateTimes?: (startDate: Date, durationHours: number) => void
  compact?: boolean
  left: string // Percentage
  width: string // Percentage
  shiftStartHour: number
}

export function ShiftBlock({
  schedule,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onUpdateTimes,
  compact = false,
  left,
  width,
  shiftStartHour
}: ShiftBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(schedule.quantity.toString())
  const [isHovered, setIsHovered] = useState(false)
  const [isResizing, setIsResizing] = useState<"left" | "right" | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)

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

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const cellWidth = blockRef.current?.parentElement?.getBoundingClientRect().width || 1
      const hourWidth = cellWidth / 8
      const deltaHours = deltaX / hourWidth

      if (type === "drag") {
        setIsDragging(true)
        // Snap to 15 min (0.25h)
        const snapDelta = Math.round(deltaHours / 0.25) * 0.25
        const newStart = new Date(initialStart.getTime() + snapDelta * 60 * 60 * 1000)
        onUpdateTimes?.(newStart, initialDuration)
      } else if (type === "right") {
        setIsResizing("right")
        const snapDelta = Math.round(deltaHours / 0.25) * 0.25
        const newDuration = Math.max(0.5, initialDuration + snapDelta)
        onUpdateTimes?.(initialStart, newDuration)
      } else if (type === "left") {
        setIsResizing("left")
        const snapDelta = Math.round(deltaHours / 0.25) * 0.25
        const newDuration = Math.max(0.5, initialDuration - snapDelta)
        const newStart = new Date(initialStart.getTime() + snapDelta * 60 * 60 * 1000)
        onUpdateTimes?.(newStart, newDuration)
      }
    }

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      setIsDragging(false)
      setIsResizing(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }, [schedule.startDate, schedule.durationHours, onUpdateTimes, isEditing])

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
        left,
        width,
        position: 'absolute',
      }}
      className={cn(
        "group relative h-6 rounded transition-shadow cursor-move border border-white/20 select-none",
        "bg-[#0A84FF] hover:shadow-lg z-10",
        isDragging && "opacity-80 scale-[1.02] z-50 transition-none",
        isResizing && "transition-none",
        isEditing && "ring-2 ring-white/50 z-[100] scale-110 shadow-2xl"
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
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-l"
            onMouseDown={(e) => handleMouseDown(e, "left")}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-r"
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
            "font-black text-white/90 tabular-nums text-[9px]",
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
            "absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-white/20",
            "bg-[#FF453A] text-white flex items-center justify-center shadow-lg",
            "hover:scale-110 active:scale-95 transition-transform"
          )}
        >
          <X className="h-2 w-2" />
        </button>
      )}

      {/* Duration tooltip (only when small or hovered while resizing) */}
      {(isHovered || isDragging || isResizing) && (
        <div className="absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[8px] font-black text-white border border-white/10 whitespace-nowrap z-50 shadow-xl pointer-events-none">
          {schedule.durationHours}h ({format(schedule.startDate, 'HH:mm')} - {format(schedule.endDate, 'HH:mm')})
        </div>
      )}
    </div>
  )
}
