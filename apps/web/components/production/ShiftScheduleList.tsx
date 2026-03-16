"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar,
  Loader2,
  Package2,
  Play,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import {
  useShiftScheduleProgress,
  ScheduleProgressItem,
} from "@/hooks/use-shift-schedule-progress"

interface ShiftScheduleListProps {
  workCenterId: string
  activeShiftName: string
  shiftProductions: {
    id: string
    product_id: string
    total_good_units: number
    status: string | null
  }[]
  onStartProduction: (productId: string) => Promise<void>
}

const SHIFT_LABELS: Record<string, string> = {
  T1: "T1 (22:00-06:00)",
  T2: "T2 (06:00-14:00)",
  T3: "T3 (14:00-22:00)",
}

export function ShiftScheduleList({
  workCenterId,
  activeShiftName,
  shiftProductions,
  onStartProduction,
}: ShiftScheduleListProps) {
  const { items, loading } = useShiftScheduleProgress(
    workCenterId,
    activeShiftName,
    shiftProductions
  )

  const delayedItems = items.filter((i) => i.isDelay)
  const currentItems = items.filter((i) => !i.isDelay)

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm font-semibold text-blue-900">
            Programación del Turno{" "}
            {SHIFT_LABELS[activeShiftName] || activeShiftName}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <Package2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Sin producciones programadas para este turno
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Delayed items */}
            {delayedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-amber-700">
                    Retrasos
                  </h3>
                </div>
                {delayedItems.map((item) => (
                  <ScheduleItem
                    key={`delay-${item.scheduleId}`}
                    item={item}
                    onStart={onStartProduction}
                  />
                ))}
              </div>
            )}

            {/* Current shift items */}
            {currentItems.length > 0 && (
              <div className="space-y-2">
                {delayedItems.length > 0 && (
                  <h3 className="text-sm font-semibold text-gray-700">
                    Programadas
                  </h3>
                )}
                {currentItems.map((item) => (
                  <ScheduleItem
                    key={item.scheduleId}
                    item={item}
                    onStart={onStartProduction}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScheduleItem({
  item,
  onStart,
}: {
  item: ScheduleProgressItem
  onStart: (productId: string) => Promise<void>
}) {
  const progressPct =
    item.scheduledQuantity > 0
      ? Math.min(
          100,
          (item.producedQuantity / item.scheduledQuantity) * 100
        )
      : 0

  return (
    <div
      className={`rounded-lg border p-3 transition-shadow ${
        item.isDelay
          ? "border-amber-200 bg-amber-50"
          : item.status === "completed"
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-white hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {item.productName}
          </p>
          {item.isDelay && (
            <p className="text-xs text-amber-600">
              Retraso de {item.originalShiftLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.status === "completed" && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {item.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onStart(item.productId)}
            >
              <Play className="h-3 w-3 mr-1" />
              Iniciar
            </Button>
          )}
          {item.status === "in_progress" && (
            <Badge className="bg-green-600 text-xs">En curso</Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>
            {item.producedQuantity.toLocaleString()} /{" "}
            {item.scheduledQuantity.toLocaleString()} uni.
          </span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progressPct >= 100
                ? "bg-green-500"
                : item.isDelay
                ? "bg-amber-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
