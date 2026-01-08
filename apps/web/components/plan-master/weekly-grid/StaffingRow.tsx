"use client"

import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface StaffingRowProps {
    resourceId: string
    cellWidth?: number
    isToday?: (dayIndex: number) => boolean
}

export function StaffingRow({
    resourceId,
    cellWidth = 100,
    isToday = () => false
}: StaffingRowProps) {
    // Local state for staffing (7 days x 3 shifts)
    // In a real app, this would come from a hook or prop
    const [staffing, setStaffing] = useState<Record<string, number>>({})

    // Initialize with some mock data if empty
    useEffect(() => {
        const mockStaffing: Record<string, number> = {}
        for (let d = 0; d < 7; d++) {
            for (let s = 1; s <= 3; s++) {
                mockStaffing[`${d}-${s}`] = Math.floor(Math.random() * 5) + 2
            }
        }
        setStaffing(mockStaffing)
    }, [resourceId])

    const handleUpdateStaff = (dayIndex: number, shiftNumber: number, value: string) => {
        const numValue = parseInt(value) || 0
        setStaffing(prev => ({
            ...prev,
            [`${dayIndex}-${shiftNumber}`]: numValue
        }))
    }

    return (
        <div className="flex border-b border-[#2C2C2E]/50 bg-[#141414]/40 backdrop-blur-sm group/staffing hover:bg-[#1C1C1E]/60 transition-colors">
            {/* Sidebar - Staffing Label */}
            <div className="flex-shrink-0 w-[280px] border-r border-[#2C2C2E] px-4 sticky left-0 z-[80] flex items-center bg-[#0D0D0D] shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 w-full py-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-[#8E8E93]/10 text-[#8E8E93]">
                        <Users className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
                            Personas por turno
                        </div>
                    </div>
                </div>
            </div>

            {/* Staffing Cells */}
            <div className="flex">
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <div key={dayIndex} className="flex">
                        {[1, 2, 3].map((shiftNumber) => {
                            const key = `${dayIndex}-${shiftNumber}`
                            const value = staffing[key] || 0

                            return (
                                <div
                                    key={shiftNumber}
                                    className={cn(
                                        "border-r border-[#2C2C2E]/40 flex items-center justify-center group/cell transition-all",
                                        isToday(dayIndex) && "bg-[#0A84FF]/5"
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
                                            className={cn(
                                                "w-10 h-7 bg-transparent text-center text-[13px] font-black tabular-nums transition-all focus:outline-none focus:ring-1 focus:ring-[#0A84FF]/50 rounded-md",
                                                value > 0 ? "text-[#8E8E93]" : "text-[#48484A]"
                                            )}
                                        />
                                        {/* Subtle indicator of interactivity on hover */}
                                        <div className="absolute inset-0 border border-transparent group-hover/cell:border-[#0A84FF]/10 pointer-events-none transition-colors" />
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
