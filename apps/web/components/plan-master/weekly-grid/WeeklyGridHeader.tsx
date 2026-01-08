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
const SHIFT_HOURS = ['22-6', '6-14', '14-22']

export function WeeklyGridHeader({ weekStartDate, cellWidth = 100 }: WeeklyGridHeaderProps) {
  const dayWidth = cellWidth * 3 // 3 shifts per day

  return (
    <div className="sticky top-0 z-[90] bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#2C2C2E]">
      {/* Day headers row */}
      <div className="flex">
        {/* Sidebar placeholder - STICKY (both vertical and horizontal) with solid background */}
        <div className="flex-shrink-0 w-[280px] bg-[#0D0D0D] border-r border-[#2C2C2E] px-4 sticky left-0 z-[100] flex items-center shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
          <span className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-[0.1em]">
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
                  "border-r border-[#2C2C2E] text-center transition-colors",
                  isToday ? "bg-[#0A84FF]/5" : "bg-transparent"
                )}
                style={{ width: dayWidth }}
              >
                {/* Day name and date */}
                <div className={cn(
                  "py-2.5 border-b border-[#2C2C2E] flex flex-col items-center justify-center gap-0.5",
                  isToday ? "text-[#0A84FF]" : "text-white"
                )}>
                  <div className="text-[11px] font-bold uppercase tracking-tight opacity-70">{dayName}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black tabular-nums">{dayNumber}</span>
                    <span className="text-[10px] font-medium text-[#8E8E93] uppercase">{monthName}</span>
                  </div>
                </div>

                {/* Shift headers */}
                <div className="flex h-10">
                  {SHIFT_LABELS.map((shift, shiftIndex) => (
                    <div
                      key={shiftIndex}
                      className="flex-1 flex flex-col items-center justify-center border-r border-[#2C2C2E]/50 last:border-r-0"
                      style={{ width: cellWidth }}
                    >
                      <div className="text-[10px] font-black text-[#8E8E93] leading-none mb-0.5">{shift}</div>
                      <div className="text-[9px] font-medium text-[#636366] leading-none tracking-tighter">{SHIFT_HOURS[shiftIndex]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Weekly total column header */}
          <div className="w-[80px] bg-[#0D0D0D] text-center border-r border-[#2C2C2E] flex flex-col items-center justify-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#8E8E93]">Total</div>
            <div className="text-[9px] font-bold text-[#48484A] uppercase tracking-tight">Semana</div>
          </div>
        </div>
      </div>
    </div>
  )
}
