"use client"

import { ProductionSchedule } from "@/hooks/use-production-schedules"
import { format, differenceInHours, differenceInDays } from "date-fns"
import { X } from "lucide-react"
import { useState } from "react"

interface ScheduleBlockProps {
    schedule: ProductionSchedule
    resourceId: string
    startDate: Date
    endDate: Date
    totalUnits: number
    viewMode: 'day' | 'week' | 'month' | 'year'
    onDelete: (id: string) => void
    onUpdateDates: (id: string, startDate: Date, endDate: Date) => void
    productName?: string
}

export function ScheduleBlock({
    schedule,
    resourceId,
    startDate,
    endDate,
    totalUnits,
    viewMode,
    onDelete,
    onUpdateDates,
    productName
}: ScheduleBlockProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [dragStart, setDragStart] = useState(0)
    const [resizeStart, setResizeStart] = useState(0)

    if (resourceId !== schedule.resource_id) return null

    const scheduleStart = new Date(schedule.start_date)
    const scheduleEnd = new Date(schedule.end_date)

    // Calculate position and width based on viewMode
    let leftPercent = 0
    let widthPercent = 0

    if (viewMode === 'day') {
        const daysDiff = differenceInDays(scheduleStart, startDate)
        const hoursDiff = differenceInHours(scheduleEnd, scheduleStart)
        leftPercent = (daysDiff / totalUnits) * 100
        widthPercent = (hoursDiff / (totalUnits * 24)) * 100
    } else if (viewMode === 'week') {
        const daysDiff = differenceInDays(scheduleStart, startDate)
        const scheduleHours = differenceInHours(scheduleEnd, scheduleStart)
        leftPercent = (daysDiff / (totalUnits * 7)) * 100
        widthPercent = (scheduleHours / (totalUnits * 7 * 24)) * 100
    } else if (viewMode === 'month' || viewMode === 'year') {
        const daysInRange = differenceInDays(endDate, startDate)
        const scheduleHours = differenceInHours(scheduleEnd, scheduleStart)
        const daysDiff = differenceInDays(scheduleStart, startDate)
        leftPercent = (daysDiff / daysInRange) * 100
        widthPercent = (scheduleHours / (daysInRange * 24)) * 100
    }

    const duration = differenceInHours(scheduleEnd, scheduleStart)
    const durationDays = Math.floor(duration / 24)
    const durationHours = duration % 24

    const durationLabel = durationDays > 0
        ? `${durationDays}d ${durationHours}h`
        : `${durationHours}h`

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-resize]')) {
            setIsResizing(true)
            setResizeStart(e.clientX)
        } else {
            setIsDragging(true)
            setDragStart(e.clientX)
        }
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            const delta = e.clientX - dragStart
            // Move logic here - simplified for now
            setDragStart(e.clientX)
        }
        if (isResizing) {
            const delta = e.clientX - resizeStart
            // Resize logic here - simplified for now
            setResizeStart(e.clientX)
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
        setIsResizing(false)
    }

    return (
        <div
            className="absolute h-8 rounded-md bg-[#0A84FF] text-white flex items-center px-2 text-xs overflow-hidden whitespace-nowrap transition-all hover:scale-[1.02] hover:z-10 group cursor-move"
            style={{
                left: `${leftPercent}%`,
                width: `${Math.max(5, widthPercent)}%`,
                minWidth: '60px'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            title={`${productName || 'Sin nombre'} - ${schedule.quantity} unidades - ${durationLabel}`}
        >
            <div className="flex-1 truncate">
                {productName} ({schedule.quantity}u)
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete(schedule.id)
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                data-delete
            >
                <X className="w-3 h-3" />
            </button>

            {/* Resize handles */}
            <div
                data-resize="left"
                className="absolute left-0 top-0 bottom-0 w-1 bg-[#0A84FF]/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-col-resize hover:bg-[#0A84FF]"
            />
            <div
                data-resize="right"
                className="absolute right-0 top-0 bottom-0 w-1 bg-[#0A84FF]/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-col-resize hover:bg-[#0A84FF]"
            />
        </div>
    )
}
