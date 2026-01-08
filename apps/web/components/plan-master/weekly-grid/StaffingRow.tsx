"use client"

import { Users, Link2, Link2Off, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo, useCallback } from "react"
import { addDays, format } from "date-fns"
import { useWorkCenterStaffing } from "@/hooks/use-work-center-staffing"

interface StaffingRowProps {
    resourceId: string
    weekStartDate: Date
    cellWidth?: number
    isToday?: (dayIndex: number) => boolean
}

export function StaffingRow({
    resourceId,
    weekStartDate,
    cellWidth = 100,
    isToday = () => false
}: StaffingRowProps) {
    const { staffings, loading, upsertStaffing, upsertMultipleStaffing, getStaffing } = useWorkCenterStaffing(weekStartDate)
    const [isSyncActive, setIsSyncActive] = useState(false)
    const [savingCells, setSavingCells] = useState<Set<string>>(new Set())

    // Build a local map for fast lookups
    const staffingMap = useMemo(() => {
        const map = new Map<string, number>()
        staffings.forEach(s => {
            const key = `${s.work_center_id}-${s.date}-${s.shift_number}`
            map.set(key, s.staff_count)
        })
        return map
    }, [staffings])

    // Get staff count for a specific day/shift
    const getStaffCount = useCallback((dayIndex: number, shiftNumber: number): number => {
        const date = addDays(weekStartDate, dayIndex)
        const dateStr = format(date, "yyyy-MM-dd")
        const key = `${resourceId}-${dateStr}-${shiftNumber}`
        return staffingMap.get(key) || 0
    }, [weekStartDate, resourceId, staffingMap])

    const handleUpdateStaff = async (dayIndex: number, shiftNumber: number, value: string) => {
        const numValue = parseInt(value) || 0

        if (isSyncActive) {
            // Update all 7 days for this specific shift
            const inputs = Array.from({ length: 7 }, (_, d) => ({
                work_center_id: resourceId,
                date: addDays(weekStartDate, d),
                shift_number: shiftNumber as 1 | 2 | 3,
                staff_count: numValue
            }))

            // Mark all cells as saving
            const cellKeys = inputs.map(i => `${i.date.toISOString()}-${i.shift_number}`)
            setSavingCells(prev => new Set([...prev, ...cellKeys]))

            await upsertMultipleStaffing(inputs)

            // Clear saving state
            setSavingCells(prev => {
                const newSet = new Set(prev)
                cellKeys.forEach(k => newSet.delete(k))
                return newSet
            })
        } else {
            // Update only this specific cell
            const date = addDays(weekStartDate, dayIndex)
            const cellKey = `${date.toISOString()}-${shiftNumber}`

            setSavingCells(prev => new Set(prev).add(cellKey))

            await upsertStaffing({
                work_center_id: resourceId,
                date,
                shift_number: shiftNumber as 1 | 2 | 3,
                staff_count: numValue
            })

            setSavingCells(prev => {
                const newSet = new Set(prev)
                newSet.delete(cellKey)
                return newSet
            })
        }
    }

    return (
        <div className="flex border-b border-[#2C2C2E]/50 bg-[#141414]/40 backdrop-blur-sm group/staffing hover:bg-[#1C1C1E]/60 transition-colors">
            {/* Sidebar - Staffing Label */}
            <div className="flex-shrink-0 w-[280px] border-r border-[#2C2C2E] px-4 sticky left-0 z-[80] flex items-center bg-[#0D0D0D] shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 w-full py-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-[#8E8E93]/10 text-[#8E8E93]">
                        <Users className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                        <div className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
                            Personas por turno
                        </div>
                        <button
                            onClick={() => setIsSyncActive(!isSyncActive)}
                            className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full transition-all border",
                                isSyncActive
                                    ? "bg-[#0A84FF]/10 text-[#0A84FF] border-[#0A84FF]/30"
                                    : "bg-white/5 text-[#636366] border-transparent hover:bg-white/10"
                            )}
                            title={isSyncActive ? "Sincronización semanal activa" : "Activar sincronización semanal"}
                        >
                            {isSyncActive ? (
                                <>
                                    <Link2 className="h-3 w-3" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Sync</span>
                                </>
                            ) : (
                                <Link2Off className="h-3 w-3 opacity-50" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Staffing Cells */}
            <div className="flex">
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <div key={dayIndex} className="flex">
                        {[1, 2, 3].map((shiftNumber) => {
                            const value = getStaffCount(dayIndex, shiftNumber)
                            const date = addDays(weekStartDate, dayIndex)
                            const cellKey = `${date.toISOString()}-${shiftNumber}`
                            const isSaving = savingCells.has(cellKey)

                            return (
                                <div
                                    key={shiftNumber}
                                    className={cn(
                                        "border-r border-[#2C2C2E]/40 flex items-center justify-center group/cell transition-all relative",
                                        isToday(dayIndex) && "bg-[#0A84FF]/5",
                                        isSaving && "opacity-60"
                                    )}
                                    style={{ width: cellWidth }}
                                >
                                    <div className="relative flex items-center justify-center w-full h-full py-1.5">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={value || ""}
                                            onChange={(e) => handleUpdateStaff(dayIndex, shiftNumber, e.target.value)}
                                            placeholder="-"
                                            disabled={isSaving}
                                            className={cn(
                                                "w-10 h-7 bg-transparent text-center text-[13px] font-black tabular-nums transition-all focus:outline-none focus:ring-1 focus:ring-[#0A84FF]/50 rounded-md",
                                                value > 0 ? "text-[#8E8E93]" : "text-[#48484A]",
                                                isSaving && "cursor-wait"
                                            )}
                                        />
                                        {/* Subtle indicator of interactivity on hover */}
                                        <div className="absolute inset-0 border border-transparent group-hover/cell:border-[#0A84FF]/10 pointer-events-none transition-colors" />
                                        {/* Saving indicator */}
                                        {isSaving && (
                                            <div className="absolute top-0.5 right-0.5">
                                                <Loader2 className="h-2.5 w-2.5 text-[#0A84FF] animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}

                {/* Weekly average or total could go here, but keeping it empty for now to match grid */}
                <div className="w-[80px] bg-[#0D0D0D]/30 border-r border-[#2C2C2E]/40" />
            </div>
        </div>
    )
}
