"use client"

import { ProductionSchedule } from "@/hooks/use-production-schedules"
import { differenceInHours, differenceInDays, addHours, addDays } from "date-fns"
import { X } from "lucide-react"
import { useState, useRef, useEffect } from "react"

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
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null)
    const [displayDuration, setDisplayDuration] = useState("")
    const blockRef = useRef<HTMLDivElement>(null)

    if (resourceId !== schedule.resource_id) return null

    const scheduleStart = new Date(schedule.start_date)
    const scheduleEnd = new Date(schedule.end_date)
    const duration = differenceInHours(scheduleEnd, scheduleStart)
    const durationDays = Math.floor(duration / 24)
    const durationHours = duration % 24

    const durationLabel = durationDays > 0
        ? `${durationDays}d ${durationHours}h`
        : `${durationHours}h`

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

    useEffect(() => {
        setDisplayDuration(durationLabel)
    }, [durationLabel])

    const pixelsPerPercent = () => {
        if (!blockRef.current?.parentElement) return 0
        const parentWidth = blockRef.current.parentElement.clientWidth
        return parentWidth / 100
    }

    const handleMouseDown = (e: React.MouseEvent, resizeDirection?: 'left' | 'right') => {
        e.preventDefault()
        const startX = e.clientX
        const originalStart = scheduleStart
        const originalEnd = scheduleEnd

        if (resizeDirection) {
            setIsResizing(resizeDirection)
        } else {
            setIsDragging(true)
        }

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX
            const pxPerPercent = pixelsPerPercent()
            const deltaPercent = delta / pxPerPercent

            if (resizeDirection === 'right') {
                // Resize right edge
                const hoursToAdd = (deltaPercent / 100) * totalUnits * 24
                const newEnd = addHours(originalEnd, hoursToAdd)
                if (newEnd > originalStart) {
                    setDisplayDuration(formatDuration(originalStart, newEnd))
                }
            } else if (resizeDirection === 'left') {
                // Resize left edge
                const hoursToAdd = (deltaPercent / 100) * totalUnits * 24
                const newStart = addHours(originalStart, hoursToAdd)
                if (newStart < originalEnd) {
                    setDisplayDuration(formatDuration(newStart, originalEnd))
                }
            } else if (isDragging) {
                // Drag (move)
                const hoursToAdd = (deltaPercent / 100) * totalUnits * 24
                const newStart = addHours(originalStart, hoursToAdd)
                const newEnd = addHours(originalEnd, hoursToAdd)
                setDisplayDuration(durationLabel)
            }
        }

        const handleMouseUp = () => {
            const delta = event?.clientX ? event.clientX - startX : 0
            const pxPerPercent = pixelsPerPercent()
            const deltaPercent = delta / pxPerPercent

            if (resizeDirection === 'right') {
                const hoursToAdd = (deltaPercent / 100) * totalUnits * 24
                const newEnd = addHours(originalEnd, hoursToAdd)
                if (newEnd > originalStart) {
                    onUpdateDates(schedule.id, originalStart, newEnd)
                }
            } else if (resizeDirection === 'left') {
                const hoursToAdd = (deltaPercent / 100) * totalUnits * 24
                const newStart = addHours(originalStart, hoursToAdd)
                if (newStart < originalEnd) {
                    onUpdateDates(schedule.id, newStart, originalEnd)
                }
            } else if (isDragging) {
                const hoursToAdd = (deltaPercent / 100) * totalUnits * 24
                const newStart = addHours(originalStart, hoursToAdd)
                const newEnd = addHours(originalEnd, hoursToAdd)
                onUpdateDates(schedule.id, newStart, newEnd)
            }

            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            setIsDragging(false)
            setIsResizing(null)
            setDisplayDuration(durationLabel)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    const formatDuration = (start: Date, end: Date) => {
        const hrs = differenceInHours(end, start)
        const days = Math.floor(hrs / 24)
        const hours = hrs % 24
        return days > 0 ? `${days}d ${hours}h` : `${hours}h`
    }

    return (
        <div
            ref={blockRef}
            className="absolute h-8 rounded-md bg-[#0A84FF] text-white flex items-center px-2 text-xs overflow-visible whitespace-nowrap transition-colors hover:bg-[#0A84FF]/90 hover:z-10 group cursor-move"
            style={{
                left: `${leftPercent}%`,
                width: `${Math.max(5, widthPercent)}%`,
                minWidth: '60px'
            }}
            onMouseDown={(e) => handleMouseDown(e)}
            title={`${productName || 'Sin nombre'} - ${schedule.quantity} unidades - ${displayDuration}`}
        >
            <div className="flex-1 truncate text-[11px]">
                {productName} ({schedule.quantity}u) {displayDuration !== durationLabel && `${displayDuration}`}
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
                onMouseDown={(e) => handleMouseDown(e, 'left')}
                className="absolute left-0 top-0 bottom-0 w-1 bg-[#0A84FF]/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-col-resize hover:bg-white hover:w-2"
            />
            <div
                onMouseDown={(e) => handleMouseDown(e, 'right')}
                className="absolute right-0 top-0 bottom-0 w-1 bg-[#0A84FF]/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-col-resize hover:bg-white hover:w-2"
            />
        </div>
    )
}
