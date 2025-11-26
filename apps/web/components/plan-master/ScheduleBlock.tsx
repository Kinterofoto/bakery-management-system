"use client"

import { ProductionSchedule } from "@/hooks/use-production-schedules"
import { differenceInHours, differenceInDays, addHours } from "date-fns"
import { X, Edit2 } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    onUpdateQuantity?: (id: string, quantity: number) => void
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
    onUpdateQuantity,
    productName
}: ScheduleBlockProps) {
    const [displayDuration, setDisplayDuration] = useState("")
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const [editQuantity, setEditQuantity] = useState(schedule.quantity)
    const [isEditingQuantity, setIsEditingQuantity] = useState(false)
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
        // Vista de horas: cada unidad es 1 hora
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

    const handleSaveQuantity = () => {
        if (onUpdateQuantity && editQuantity !== schedule.quantity) {
            onUpdateQuantity(schedule.id, editQuantity)
        }
        setIsEditingQuantity(false)
        setIsPopoverOpen(false)
    }

    const handleCancelEdit = () => {
        setEditQuantity(schedule.quantity)
        setIsEditingQuantity(false)
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
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <div
                    ref={blockRef}
                    className={`
                        absolute h-[44px] rounded-lg bg-[#0A84FF] text-white
                        flex items-center px-2 text-xs overflow-visible whitespace-nowrap
                        group cursor-move
                        transition-all duration-200 ease-out
                        hover:bg-[#0A84FF]/90
                        hover:shadow-lg hover:shadow-[#0A84FF]/40
                        hover:scale-[1.02]
                        hover:z-20
                        active:scale-[0.98]
                        active:shadow-xl active:shadow-[#0A84FF]/50
                        ${dragStateRef.current.isDragging ? 'scale-105 shadow-2xl shadow-[#0A84FF]/60 z-30' : ''}
                    `}
                    style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        minWidth: '60px',
                        top: '0px'
                    }}
                    onMouseDown={(e) => {
                        // Prevenir apertura del popover cuando se arrastra
                        if (!dragStateRef.current.isDragging) {
                            handleMouseDown(e)
                        }
                    }}
                >
                    <div className="flex-1 truncate text-[11px]">
                        {productName} ({schedule.quantity}u)
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(schedule.id)
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0 hover:scale-110 active:scale-95 hover:bg-white/20 rounded p-0.5"
                        data-delete
                    >
                        <X className="w-3 h-3" />
                    </button>

                    {/* Resize handles - Enhanced visual feedback */}
                    <div
                        onMouseDown={(e) => handleMouseDown(e, 'left')}
                        className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-col-resize hover:bg-white hover:w-2 hover:shadow-lg"
                    />
                    <div
                        onMouseDown={(e) => handleMouseDown(e, 'right')}
                        className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-col-resize hover:bg-white hover:w-2 hover:shadow-lg"
                    />
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 text-white p-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-semibold text-sm">{productName || 'Sin nombre'}</h3>
                            <p className="text-xs text-[#8E8E93] mt-0.5">Duración: {displayDuration}</p>
                        </div>
                        <button
                            onClick={() => setIsPopoverOpen(false)}
                            className="text-[#8E8E93] hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Quantity Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-[#8E8E93]">Cantidad a Producir</Label>
                            {!isEditingQuantity && onUpdateQuantity && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditingQuantity(true)}
                                    className="h-6 px-2 text-xs text-[#0A84FF] hover:text-[#0A84FF]/80"
                                >
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    Editar
                                </Button>
                            )}
                        </div>

                        {isEditingQuantity ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={1}
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                                    className="flex-1 bg-[#2C2C2E] border-white/10 text-white h-8 text-sm"
                                    autoFocus
                                />
                                <span className="text-xs text-[#8E8E93]">uds</span>
                            </div>
                        ) : (
                            <div className="text-2xl font-bold text-white">
                                {schedule.quantity} <span className="text-sm text-[#8E8E93] font-normal">unidades</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {isEditingQuantity && (
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="flex-1 h-8 border-white/10 bg-white/5 text-white hover:bg-white/10"
                            >
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveQuantity}
                                className="flex-1 h-8 bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white"
                            >
                                Guardar
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
