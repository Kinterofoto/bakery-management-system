"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
  clearable?: boolean
  fromDate?: Date
  toDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  disabled = false,
  className,
  buttonClassName,
  clearable = true,
  fromDate,
  toDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Convert string to Date if needed
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    // Handle ISO string format (YYYY-MM-DD)
    const parsed = new Date(value + 'T00:00:00')
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    // Only close when a date is actually selected (not on month/year navigation)
    if (date) {
      setOpen(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateValue && "text-muted-foreground",
              buttonClassName
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? (
              <span className="flex-1">
                {format(dateValue, "dd/MM/yyyy", { locale: es })}
              </span>
            ) : (
              <span className="flex-1">{placeholder}</span>
            )}
            {clearable && dateValue && (
              <span
                role="button"
                onClick={handleClear}
                className="ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1 -mr-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          onInteractOutside={(e) => {
            // Prevent closing when clicking inside the calendar navigation
            e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            // Allow closing only when clicking outside the popover content
            const target = e.target as HTMLElement
            if (!target.closest('[data-radix-popper-content-wrapper]')) {
              setOpen(false)
            }
          }}
        >
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            locale={es}
            fromDate={fromDate}
            toDate={toDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
