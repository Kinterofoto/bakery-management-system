"use client"

import { ChevronLeft, ChevronRight, Calendar, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWeeklyPlan, WeekInfo } from "@/hooks/use-weekly-plan"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface WeekSelectorProps {
  weekInfo: WeekInfo
  onPreviousWeek: () => void
  onNextWeek: () => void
  onGoToCurrentWeek: () => void
  onSelectWeek: (date: Date) => void
  weeksList: WeekInfo[]
}

export function WeekSelector({
  weekInfo,
  onPreviousWeek,
  onNextWeek,
  onGoToCurrentWeek,
  onSelectWeek,
  weeksList
}: WeekSelectorProps) {
  return (
    <div className="flex items-center gap-3 bg-[#1C1C1E] rounded-lg p-2 shrink-0">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPreviousWeek}
          className="h-8 w-8 text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onGoToCurrentWeek}
          className={cn(
            "h-8 w-8 hover:bg-[#2C2C2E]",
            weekInfo.isCurrentWeek
              ? "text-[#0A84FF]"
              : "text-[#8E8E93] hover:text-white"
          )}
          title="Ir a semana actual"
        >
          <Home className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNextWeek}
          className="h-8 w-8 text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week selector dropdown */}
      <Select
        value={format(weekInfo.weekStartDate, 'yyyy-MM-dd')}
        onValueChange={(value) => {
          const [y, m, d] = value.split('-').map(Number)
          onSelectWeek(new Date(y, m - 1, d))
        }}
      >
        <SelectTrigger className="w-[240px] bg-[#2C2C2E] border-none text-white">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#8E8E93]" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
          {weeksList.map((week) => (
            <SelectItem
              key={format(week.weekStartDate, 'yyyy-MM-dd')}
              value={format(week.weekStartDate, 'yyyy-MM-dd')}
              className={cn(
                "text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]",
                week.isCurrentWeek && "text-[#0A84FF] font-semibold"
              )}
            >
              <div className="flex items-center gap-2">
                {week.isCurrentWeek && (
                  <span className="w-2 h-2 rounded-full bg-[#0A84FF]" />
                )}
                <span>{week.label}</span>
                {week.isPast && (
                  <span className="text-[10px] text-[#636366] ml-1">pasada</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status badge */}
      <div className={cn(
        "px-3 py-1 rounded-full text-xs font-medium",
        weekInfo.isCurrentWeek && "bg-[#0A84FF]/20 text-[#0A84FF]",
        weekInfo.isPast && "bg-[#636366]/20 text-[#636366]",
        weekInfo.isFuture && "bg-[#30D158]/20 text-[#30D158]"
      )}>
        {weekInfo.isCurrentWeek ? "Semana Actual" : weekInfo.isPast ? "Pasada" : "Futura"}
      </div>
    </div>
  )
}
