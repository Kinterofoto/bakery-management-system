"use client"

import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface WeeklyGridHeaderProps {
  weekStartDate: Date
  cellWidth?: number
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const SHIFT_LABELS = ['T1', 'T2', 'T3']
const SHIFT_HOURS = ['6-14', '14-22', '22-6']

export function WeeklyGridHeader({ weekStartDate, cellWidth = 100 }: WeeklyGridHeaderProps) {
  const dayWidth = cellWidth * 3 // 3 shifts per day

  return (
    <div className="sticky top-0 z-30 bg-[#0D0D0D] border-b border-[#2C2C2E]">
      {/* Day headers row */}
      <div className="flex bg-[#0D0D0D]">
        {/* Sidebar placeholder - STICKY (both vertical and horizontal) with solid background */}
        <div className="flex-shrink-0 w-[280px] bg-[#0D0D0D] border-r border-[#2C2C2E] px-4 sticky left-0 z-30 flex items-center shadow-[2px_0_4px_rgba(0,0,0,0.5)]">
          <span className="text-[#8E8E93] text-xs font-medium uppercase tracking-wider">
            Centro de Trabajo
          </span>
        </div>

        {/* Days */}
        <div className="flex">
          {Array.from({ length: 7 }).map((_, dayIndex) => {
            const date = addDays(weekStartDate, dayIndex)
            const dayName = DAY_NAMES[dayIndex]
            const dayNumber = format(date, 'd')
            const monthName = format(date, 'MMM', { locale: es })
            const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')

            return (
              <div
                key={dayIndex}
                className={cn(
                  "border-r border-[#2C2C2E] text-center",
                  isToday ? "bg-[#0A84FF]/10" : "bg-[#0D0D0D]"
                )}
                style={{ width: dayWidth }}
              >
                {/* Day name and date */}
                <div className={cn(
                  "py-2 border-b border-[#2C2C2E]",
                  isToday ? "text-[#0A84FF]" : "text-white"
                )}>
                  <div className="text-sm font-semibold">{dayName}</div>
                  <div className="text-xs text-[#8E8E93]">
                    {dayNumber} {monthName}
                  </div>
                </div>

                {/* Shift headers */}
                <div className="flex">
                  {SHIFT_LABELS.map((shift, shiftIndex) => (
                    <div
                      key={shiftIndex}
                      className="flex-1 py-1 border-r border-[#2C2C2E] last:border-r-0"
                      style={{ width: cellWidth }}
                    >
                      <div className="text-[10px] font-medium text-[#8E8E93]">{shift}</div>
                      <div className="text-[9px] text-[#636366]">{SHIFT_HOURS[shiftIndex]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Weekly total column */}
          <div className="w-[80px] bg-[#1C1C1E] text-center border-r border-[#2C2C2E]">
            <div className="py-2 border-b border-[#2C2C2E]">
              <div className="text-sm font-semibold text-[#FF9500]">Total</div>
              <div className="text-xs text-[#8E8E93]">Semana</div>
            </div>
            <div className="py-1">
              <div className="text-[10px] font-medium text-[#8E8E93]">Unid.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
