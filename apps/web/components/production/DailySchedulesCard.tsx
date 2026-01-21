"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Loader2, Package2 } from "lucide-react"
import { useDailySchedules } from "@/hooks/use-daily-schedules"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DailySchedulesCardProps {
  workCenterId: string
  date?: Date
}

const SHIFT_NAMES = {
  1: "T1 (22:00-06:00)",
  2: "T2 (06:00-14:00)",
  3: "T3 (14:00-22:00)"
}

const SHIFT_COLORS = {
  1: "bg-purple-100 text-purple-800 border-purple-300",
  2: "bg-blue-100 text-blue-800 border-blue-300",
  3: "bg-orange-100 text-orange-800 border-orange-300"
}

export function DailySchedulesCard({ workCenterId, date = new Date() }: DailySchedulesCardProps) {
  const { schedules, loading } = useDailySchedules(workCenterId, date)

  const totalQuantity = schedules.reduce((sum, s) => sum + s.quantity, 0)

  return (
    <Card className="h-full border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm font-semibold text-blue-900">
            Producciones Programadas
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-blue-700">
          {format(date, "EEEE, d 'de' MMMM", { locale: es })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-6">
            <Package2 className="h-8 w-8 text-blue-300 mx-auto mb-2" />
            <p className="text-xs text-blue-600">Sin producciones programadas</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-blue-100 rounded-lg p-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">Total programado:</span>
                <span className="text-sm font-bold text-blue-900">{totalQuantity.toLocaleString()} unidades</span>
              </div>
            </div>

            {/* Schedule list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-white rounded-lg border border-blue-200 p-2.5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {schedule.productName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0.5 shrink-0 ${
                        SHIFT_COLORS[schedule.shiftNumber as keyof typeof SHIFT_COLORS] || "bg-gray-100"
                      }`}
                    >
                      {SHIFT_NAMES[schedule.shiftNumber as keyof typeof SHIFT_NAMES] || `T${schedule.shiftNumber}`}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(schedule.startDate, "HH:mm")} - {format(schedule.endDate, "HH:mm")}
                      </span>
                    </div>
                    <div className="font-semibold text-blue-700">
                      {schedule.quantity.toLocaleString()} uni.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
