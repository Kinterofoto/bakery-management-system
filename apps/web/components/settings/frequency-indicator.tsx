"use client"

import { useState, useMemo } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, Loader2 } from "lucide-react"
import { FREQUENCY_DAYS } from "@/lib/constants/frequency-days"

interface FrequencyIndicatorProps {
  branchId: string
  frequencies: any[] // We accept the raw frequency objects
  onToggle: (branchId: string, day: number) => Promise<any>
  isLoading?: boolean
}

export function FrequencyIndicator({ branchId, frequencies, onToggle, isLoading }: FrequencyIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [togglingDay, setTogglingDay] = useState<number | null>(null)

  // Get active days for this branch
  const activeDays = useMemo(() => {
    return frequencies
      .filter(f => f.branch_id === branchId && f.is_active)
      .map(f => f.day_of_week)
      .sort((a, b) => a - b)
  }, [frequencies, branchId])

  // Calculate conic gradient
  const backgroundStyle = useMemo(() => {
    if (activeDays.length === 0) return { background: "#e5e7eb" } // Gray-200 if no days

    if (activeDays.length === 1) {
      const day = FREQUENCY_DAYS.find(d => d.id === activeDays[0])
      return { background: day?.color || "#e5e7eb" }
    }

    // Create segments for conic gradient
    const segmentSize = 360 / activeDays.length
    let gradientParts = []
    
    for (let i = 0; i < activeDays.length; i++) {
      const dayId = activeDays[i]
      const day = FREQUENCY_DAYS.find(d => d.id === dayId)
      const color = day?.color || "#e5e7eb"
      const start = i * segmentSize
      const end = (i + 1) * segmentSize
      gradientParts.push(`${color} ${start}deg ${end}deg`)
    }

    return { background: `conic-gradient(${gradientParts.join(", ")})` }
  }, [activeDays])

  const handleToggle = async (dayId: number) => {
    setTogglingDay(dayId)
    try {
      await onToggle(branchId, dayId)
    } finally {
      setTogglingDay(null)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-6 h-6 rounded-full shadow-sm ring-1 ring-white transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
            activeDays.length === 0 && "opacity-50 hover:opacity-100"
          )}
          style={backgroundStyle}
          title={`${activeDays.length} días de frecuencia`}
        >
          <span className="sr-only">Editar frecuencia</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Días de Frecuencia</h4>
            <p className="text-xs text-muted-foreground">
              Selecciona los días de visita para este cliente.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {FREQUENCY_DAYS.map((day) => {
              const isActive = activeDays.includes(day.id)
              const isToggling = togglingDay === day.id
              
              return (
                <button
                  key={day.id}
                  onClick={() => handleToggle(day.id)}
                  disabled={isToggling || isLoading}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border",
                    isActive 
                      ? "text-white border-transparent" 
                      : "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100",
                    isToggling && "opacity-70 cursor-wait"
                  )}
                  style={isActive ? { backgroundColor: day.color } : {}}
                  title={day.fullLabel}
                >
                  {isToggling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    day.label
                  )}
                </button>
              )
            })}
          </div>
          {activeDays.length > 0 && (
            <div className="text-xs text-center text-muted-foreground pt-1 border-t">
              {activeDays.map(d => FREQUENCY_DAYS.find(day => day.id === d)?.fullLabel).join(", ")}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
