"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, GripVertical } from "lucide-react"
import type { ShiftSchedule } from "@/hooks/use-shift-schedules"

interface ShiftBlockProps {
  schedule: ShiftSchedule
  onEdit: () => void
  onDelete: () => void
  onUpdateQuantity: (quantity: number) => void
  compact?: boolean
}

export function ShiftBlock({
  schedule,
  onEdit,
  onDelete,
  onUpdateQuantity,
  compact = false
}: ShiftBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(schedule.quantity.toString())
  const [isHovered, setIsHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

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
    ? schedule.productName.length > 12
      ? schedule.productName.substring(0, 10) + '...'
      : schedule.productName
    : 'Producto'

  return (
    <div
      className={cn(
        "group relative rounded-md transition-all cursor-pointer",
        "bg-[#0A84FF] hover:bg-[#0A84FF]/90",
        compact ? "px-1 py-0.5" : "px-2 py-1",
        isEditing && "ring-2 ring-white/50"
      )}
      onClick={onEdit}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center",
        "opacity-0 group-hover:opacity-50 transition-opacity cursor-grab",
        compact && "hidden"
      )}>
        <GripVertical className="h-3 w-3 text-white" />
      </div>

      {/* Content */}
      <div className={cn("flex items-center justify-between gap-1", !compact && "pl-3")}>
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-medium text-white truncate",
            compact ? "text-[9px]" : "text-[11px]"
          )}>
            {displayName}
          </div>
        </div>

        {/* Quantity (editable on double-click) */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-14 px-1 py-0 bg-white/20 border-none rounded text-white text-right",
              "focus:outline-none focus:ring-1 focus:ring-white/50",
              compact ? "text-[9px]" : "text-[10px]"
            )}
            min={1}
          />
        ) : (
          <div className={cn(
            "font-bold text-white/90",
            compact ? "text-[9px]" : "text-[11px]"
          )}>
            {schedule.quantity.toLocaleString()}u
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={handleDeleteClick}
        className={cn(
          "absolute -top-1 -right-1 w-4 h-4 rounded-full",
          "bg-[#FF453A] text-white flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-[#FF453A]/80"
        )}
      >
        <X className="h-2.5 w-2.5" />
      </button>

      {/* Duration indicator (if spans multiple hours) */}
      {schedule.durationHours > 8 && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 py-0 rounded-full bg-[#FF9500] text-[8px] text-white">
          {schedule.durationHours}h
        </div>
      )}
    </div>
  )
}
