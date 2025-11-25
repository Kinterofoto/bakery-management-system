"use client"

import { ProductionSchedule } from "@/hooks/use-production-schedules"
import { differenceInHours, differenceInDays, addHours } from "date-fns"
import { X } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"

interface ScheduleBlockProps {
    schedule: ProductionSchedule
    resourceId: string
    productIndex: number
    startDate: Date
    endDate: Date
    totalUnits: number
    viewMode: 'day' | 'week' | 'month' | 'year' | 'hour'
    onDelete: (id: string) => void
    onUpdateDates: (id: string, startDate: Date, endDate: Date) => void
    productName?: string
}

export function ScheduleBlock({
    schedule,
    resourceId,
    productIndex,
    startDate,
    endDate,
    totalUnits,
    viewMode,
    onDelete,
    onUpdateDates,
    productName
}: ScheduleBlockProps) {
    const [displayDuration, setDisplayDuration] = useState("")
    const blockRef = useRef<HTMLDivElement>(null)
    const dragStateRef = useRef<{ isDragging: boolean; isResizing: 'left' | 'right' | null }>({
        isDragging: false,
        isResizing: null
    })

    if (resourceId !== schedule.resource_id) return null

    const scheduleStart = new Date(schedule.start_date)
    const scheduleEnd = new Date(schedule.end_date)
    const duration = differenceInHours(scheduleEnd, scheduleStart)
    const durationDays = Math.floor(duration / 24)
    const durationHours = duration % 24

    const durationLabel = durationDays > 0
        ? `${durationDays}d ${durationHours}h`
        : `${durationHours}h`

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
    } else if (viewMode === 'hour') {
        // Vista de horas: 24 horas en el rango
        const hoursDiff = differenceInHours(scheduleStart, startDate)
        const scheduleHours = differenceInHours(scheduleEnd, scheduleStart)
        leftPercent = (hoursDiff / totalUnits) * 100
        widthPercent = (scheduleHours / totalUnits) * 100
    }

    useEffect(() => {
        setDisplayDuration(durationLabel)
    }, [durationLabel])

    const pixelsPerPercent = useCallback(() => {
        if (!blockRef.current?.parentElement) return 0
        const parentWidth = blockRef.current.parentElement.clientWidth
        return parentWidth / 100
    }, [])

    const formatDuration = (start: Date, end: Date) => {
        const hrs = differenceInHours(end, start)
        const days = Math.floor(hrs / 24)
        const hours = hrs % 24
        return days > 0 ? `${days}d ${hours}h` : `${hours}h`
    }

    const handleMouseDown = useCallback((e: React.MouseEvent, resizeDirection?: 'left' | 'right') => {
        e.preventDefault()
        const startX = e.clientX
        const originalStart = scheduleStart
        const originalEnd = scheduleEnd

        dragStateRef.current.isDragging = !resizeDirection
        dragStateRef.current.isResizing = resizeDirection || null

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX
            const pxPerPercent = pixelsPerPercent()
            const deltaPercent = pxPerPercent > 0 ? delta / pxPerPercent : 0

            let hoursToAdd = 0
            if (viewMode === 'hour') {
                hoursToAdd = Math.round((deltaPercent / 100) * totalUnits)
            } else {
                hoursToAdd = Math.round((deltaPercent / 100) * totalUnits * 24)
            }

            if (resizeDirection === 'right') {
                const newEnd = addHours(originalEnd, hoursToAdd)
                if (newEnd > originalStart) {
                    setDisplayDuration(formatDuration(originalStart, newEnd))
                }
            } else if (resizeDirection === 'left') {
                const newStart = addHours(originalStart, hoursToAdd)
                if (newStart < originalEnd) {
                    setDisplayDuration(formatDuration(newStart, originalEnd))
                }
            } else if (dragStateRef.current.isDragging) {
                const newStart = addHours(originalStart, hoursToAdd)
                const newEnd = addHours(originalEnd, hoursToAdd)
                setDisplayDuration(formatDuration(newStart, newEnd))
            }
        }

        const handleMouseUp = (upEvent: MouseEvent) => {
            const delta = upEvent.clientX - startX
            const pxPerPercent = pixelsPerPercent()
            const deltaPercent = pxPerPercent > 0 ? delta / pxPerPercent : 0

            let hoursToAdd = 0
            if (viewMode === 'hour') {
                hoursToAdd = Math.round((deltaPercent / 100) * totalUnits)
            } else {
                hoursToAdd = Math.round((deltaPercent / 100) * totalUnits * 24)
            }

            if (resizeDirection === 'right') {
                const newEnd = addHours(originalEnd, hoursToAdd)
                if (newEnd > originalStart) {
                    onUpdateDates(schedule.id, originalStart, newEnd)
                }
            } else if (resizeDirection === 'left') {
                const newStart = addHours(originalStart, hoursToAdd)
                if (newStart < originalEnd) {
                    onUpdateDates(schedule.id, newStart, originalEnd)
                }
            } else if (dragStateRef.current.isDragging) {
                const newStart = addHours(originalStart, hoursToAdd)
                const newEnd = addHours(originalEnd, hoursToAdd)
                onUpdateDates(schedule.id, newStart, newEnd)
            }

            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            dragStateRef.current.isDragging = false
            dragStateRef.current.isResizing = null
            setDisplayDuration(durationLabel)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [scheduleStart, scheduleEnd, totalUnits, pixelsPerPercent, durationLabel, onUpdateDates, schedule.id, formatDuration, viewMode])

    return (
        <div
            ref={blockRef}
            className="absolute h-8 rounded-md bg-[#0A84FF] text-white flex items-center px-2 text-xs overflow-visible whitespace-nowrap transition-colors hover:bg-[#0A84FF]/90 hover:z-10 group cursor-move"
            style={{
                left: `${leftPercent}%`,
                width: `${Math.max(5, widthPercent)}%`,
                minWidth: '60px',
                top: `${productIndex * 36}px`
            }}
            onMouseDown={(e) => handleMouseDown(e)}
            title={`${productName || 'Sin nombre'} - ${schedule.quantity} unidades - ${displayDuration}`}
        >
            <div className="flex-1 truncate text-[11px]">
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
