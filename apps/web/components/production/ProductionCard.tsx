"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Square, Clock, CheckCircle2, XCircle, Package, Beaker, AlertCircle } from "lucide-react"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useProducts } from "@/hooks/use-products"
import { useBillOfMaterials } from "@/hooks/use-bill-of-materials"
import { useAuth } from "@/contexts/AuthContext"
import { MaterialConsumptionDialog } from "./MaterialConsumptionDialog"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"

/**
 * Get next shift number and calculate its start/end dates.
 * T1: 22:00-06:00, T2: 06:00-14:00, T3: 14:00-22:00
 */
function getNextShiftInfo(currentShiftStartedAt: string) {
  const utc = currentShiftStartedAt.endsWith("Z") ? currentShiftStartedAt : currentShiftStartedAt + "Z"
  const date = new Date(utc)
  const bogotaHour = (date.getUTCHours() - 5 + 24) % 24

  let currentShift: number
  if (bogotaHour >= 22 || bogotaHour < 6) currentShift = 1
  else if (bogotaHour >= 6 && bogotaHour < 14) currentShift = 2
  else currentShift = 3

  // Next shift mapping and Bogotá hours
  const nextMap: Record<number, { shift: number; startHour: number; endHour: number; dayOffset: number }> = {
    1: { shift: 2, startHour: 6, endHour: 14, dayOffset: 0 },    // T1→T2 same morning
    2: { shift: 3, startHour: 14, endHour: 22, dayOffset: 0 },   // T2→T3 same day
    3: { shift: 1, startHour: 22, endHour: 6, dayOffset: 0 },    // T3→T1 same night
  }

  const next = nextMap[currentShift]

  // Calculate dates in UTC (Bogotá + 5h)
  const today = new Date(date)
  today.setUTCHours(next.startHour + 5, 0, 0, 0)

  // If the next shift start is before or equal to now, it's the next occurrence
  if (today.getTime() <= date.getTime()) {
    today.setUTCDate(today.getUTCDate() + 1)
  }

  const endDate = new Date(today)
  if (next.endHour < next.startHour) {
    // Overnight shift (T1: 22→06)
    endDate.setUTCDate(endDate.getUTCDate() + 1)
    endDate.setUTCHours(next.endHour + 5, 0, 0, 0)
  } else {
    endDate.setUTCHours(next.endHour + 5, 0, 0, 0)
  }

  return {
    shiftNumber: next.shift,
    startDate: today.toISOString(),
    endDate: endDate.toISOString(),
  }
}

async function createCarryoverSchedule(
  workCenterId: string,
  productId: string,
  remainingQuantity: number,
  currentShiftStartedAt: string
) {
  const next = getNextShiftInfo(currentShiftStartedAt)

  const { error } = await (supabase as any)
    .schema("produccion")
    .from("production_schedules")
    .insert({
      resource_id: workCenterId,
      product_id: productId,
      quantity: remainingQuantity,
      shift_number: next.shiftNumber,
      start_date: next.startDate,
      end_date: next.endDate,
      status: "scheduled",
    })

  if (error) throw error
}

type ShiftProduction = Database["produccion"]["Tables"]["shift_productions"]["Row"]

interface Props {
  production: ShiftProduction
  scheduledQuantity?: number
  workCenterId: string
  activeShiftStartedAt: string
  onUpdate: () => void
}

export function ProductionCard({ production, scheduledQuantity, workCenterId, activeShiftStartedAt, onUpdate }: Props) {
  const { user } = useAuth()
  const { endProduction, addProductionRecord } = useShiftProductions()
  const { getProductById } = useProducts()
  const { checkProductHasBOM } = useBillOfMaterials()
  const [loading, setLoading] = useState(false)
  const [showAddUnitsDialog, setShowAddUnitsDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [showMaterialDialog, setShowMaterialDialog] = useState(false)
  const [hasBOM, setHasBOM] = useState(true)
  const [, setTick] = useState(0) // Force re-render every minute
  const [unitsForm, setUnitsForm] = useState({
    goodUnits: "",
    badUnits: "",
    notes: ""
  })

  const product = getProductById(production.product_id)

  // Verificar si el producto tiene BOM configurado
  useEffect(() => {
    const checkBOM = async () => {
      const result = await checkProductHasBOM(production.product_id)
      setHasBOM(result)
    }
    checkBOM()
  }, [production.product_id, checkProductHasBOM])

  // Actualizar cada minuto para refrescar el tiempo
  useEffect(() => {
    if (production.status === "active") {
      const interval = setInterval(() => {
        setTick(prev => prev + 1)
      }, 60000) // Cada minuto

      return () => clearInterval(interval)
    }
  }, [production.status])

  // Calcular duración (similar a WorkCenter page que funciona bien)
  const startedAtUtc = production.started_at.endsWith('Z')
    ? production.started_at
    : production.started_at + 'Z'
  const startTime = new Date(startedAtUtc).getTime()

  const endedAtUtc = production.ended_at
    ? (production.ended_at.endsWith('Z') ? production.ended_at : production.ended_at + 'Z')
    : null
  const endTime = endedAtUtc ? new Date(endedAtUtc).getTime() : new Date().getTime()

  const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60))
  const durationHours = Math.floor(durationMinutes / 60)
  const remainingMinutes = durationMinutes % 60

  const handleAddUnits = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const goodUnits = parseInt(unitsForm.goodUnits) || 0
    const badUnits = parseInt(unitsForm.badUnits) || 0
    
    if (goodUnits === 0 && badUnits === 0) {
      toast.error("Debes registrar al menos una unidad")
      return
    }

    try {
      setLoading(true)
      await addProductionRecord({
        shift_production_id: production.id,
        good_units: goodUnits,
        bad_units: badUnits,
        recorded_by: user?.id || null,
        notes: unitsForm.notes.trim() || null
      })
      
      toast.success("Unidades registradas exitosamente")
      setUnitsForm({ goodUnits: "", badUnits: "", notes: "" })
      setShowAddUnitsDialog(false)
      onUpdate()
    } catch (error) {
      toast.error("Error al registrar unidades")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEndProduction = async () => {
    try {
      setLoading(true)
      await endProduction(production.id)
      toast.success("Producción finalizada")
      setShowEndDialog(false)
      onUpdate()
    } catch (error) {
      toast.error("Error al finalizar producción")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const qualityPercentage = production.total_good_units + production.total_bad_units > 0
    ? ((production.total_good_units / (production.total_good_units + production.total_bad_units)) * 100).toFixed(1)
    : "0"

  // Formatear hora de inicio en Bogotá (UTC-5)
  const formatBogotaTime = (timestamp: number) => {
    const utcDate = new Date(timestamp)
    const bogotaTime = new Date(utcDate.getTime() - (5 * 60 * 60 * 1000))
    const hours = String(bogotaTime.getUTCHours()).padStart(2, '0')
    const minutes = String(bogotaTime.getUTCMinutes()).padStart(2, '0')
    const seconds = String(bogotaTime.getUTCSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  return (
    <>
      <Card className={`transition-all duration-200 ${
        production.status === "active" 
          ? "border-green-500 bg-green-50 shadow-md" 
          : "border-gray-200"
      }`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {product?.name || "Producto no encontrado"}
                {(product as any)?.weight && ` - ${(product as any).weight}`}
              </CardTitle>
              <CardDescription className="text-sm">
                Iniciado {formatBogotaTime(startTime)}
              </CardDescription>
            </div>
            <Badge 
              variant={production.status === "active" ? "default" : "secondary"}
              className={production.status === "active" ? "bg-green-600" : ""}
            >
              {production.status === "active" ? "Activa" : 
               production.status === "paused" ? "Pausada" : "Finalizada"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Duration + Schedule Progress */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {durationHours > 0 ? `${durationHours}h ` : ""}{remainingMinutes}min
              </span>
            </div>
            {scheduledQuantity != null && scheduledQuantity > 0 && (() => {
              const pct = Math.min(100, (production.total_good_units / scheduledQuantity) * 100)
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Avance programación</span>
                    <span className="font-medium">
                      {production.total_good_units} / {scheduledQuantity.toLocaleString()} uni.
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Production Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white p-2 rounded border">
              <div className="text-lg font-bold text-green-600">
                {production.total_good_units}
              </div>
              <div className="text-xs text-gray-500">Buenas</div>
            </div>
            <div className="bg-white p-2 rounded border">
              <div className="text-lg font-bold text-red-600">
                {production.total_bad_units}
              </div>
              <div className="text-xs text-gray-500">Malas</div>
            </div>
            <div className="bg-white p-2 rounded border">
              <div className="text-lg font-bold text-blue-600">
                {qualityPercentage}%
              </div>
              <div className="text-xs text-gray-500">Calidad</div>
            </div>
          </div>

          {/* Production Notes */}
          {production.notes && (
            <div className="text-xs text-gray-600 bg-white p-2 rounded border">
              <strong>Notas:</strong> {production.notes}
            </div>
          )}

          {/* BOM Warning */}
          {!hasBOM && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 flex items-center justify-center gap-2">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>Sin BOM configurado</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {production.status === "active" && (
              <>
                <Button
                  onClick={() => setShowAddUnitsDialog(true)}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Unidades
                </Button>
                {hasBOM && (
                  <Button
                    onClick={() => setShowMaterialDialog(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Beaker className="w-4 h-4 mr-2" />
                    Registrar Materiales
                  </Button>
                )}
                <Button
                  onClick={() => setShowEndDialog(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Finalizar
                </Button>
              </>
            )}
            
            {production.status === "completed" && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Finalizada {endTime && formatBogotaTime(endTime)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Units Dialog */}
      <Dialog open={showAddUnitsDialog} onOpenChange={setShowAddUnitsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddUnits}>
            <DialogHeader>
              <DialogTitle>Registrar Unidades</DialogTitle>
              <DialogDescription>
                {product?.name} - Registra las unidades producidas
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goodUnits">Unidades Buenas</Label>
                  <Input
                    id="goodUnits"
                    type="number"
                    min="0"
                    value={unitsForm.goodUnits}
                    onChange={(e) => setUnitsForm(prev => ({ ...prev, goodUnits: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badUnits">Unidades Malas</Label>
                  <Input
                    id="badUnits"
                    type="number"
                    min="0"
                    value={unitsForm.badUnits}
                    onChange={(e) => setUnitsForm(prev => ({ ...prev, badUnits: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Input
                  id="notes"
                  value={unitsForm.notes}
                  onChange={(e) => setUnitsForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas sobre este registro..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddUnitsDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* End Production Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Finalizar Producción</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres finalizar la producción de {product?.name}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Resumen de Producción:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Unidades buenas:</span>
                  <div className="font-bold text-green-600">{production.total_good_units}</div>
                </div>
                <div>
                  <span className="text-gray-600">Unidades malas:</span>
                  <div className="font-bold text-red-600">{production.total_bad_units}</div>
                </div>
                <div>
                  <span className="text-gray-600">Calidad:</span>
                  <div className="font-bold text-blue-600">{qualityPercentage}%</div>
                </div>
                <div>
                  <span className="text-gray-600">Duración:</span>
                  <div className="font-bold">{durationHours}h {remainingMinutes}min</div>
                </div>
              </div>
            </div>

            {/* Remaining units warning */}
            {scheduledQuantity != null && scheduledQuantity > 0 && production.total_good_units < scheduledQuantity && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Faltan {(scheduledQuantity - production.total_good_units).toLocaleString()} unidades por producir
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Se programaron {scheduledQuantity.toLocaleString()} y se produjeron {production.total_good_units.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {scheduledQuantity != null && scheduledQuantity > 0 && production.total_good_units < scheduledQuantity ? (
            <div className="flex flex-col gap-2">
              <Button
                onClick={async () => {
                  try {
                    setLoading(true)
                    const remaining = scheduledQuantity - production.total_good_units
                    // Create carryover schedule for next shift
                    await createCarryoverSchedule(
                      workCenterId,
                      production.product_id,
                      remaining,
                      activeShiftStartedAt
                    )
                    await endProduction(production.id)
                    toast.success(`Producción finalizada. ${remaining} unidades pendientes para el siguiente turno.`)
                    setShowEndDialog(false)
                    onUpdate()
                  } catch (error) {
                    toast.error("Error al finalizar producción")
                    console.error(error)
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Procesando..." : `Dejar ${(scheduledQuantity - production.total_good_units).toLocaleString()} pendientes para siguiente turno`}
              </Button>
              <Button
                onClick={handleEndProduction}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? "Finalizando..." : "Cerrar completamente"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEndDialog(false)}
                disabled={loading}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEndDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEndProduction}
                disabled={loading}
                variant="destructive"
              >
                {loading ? "Finalizando..." : "Finalizar Producción"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Material Consumption Dialog */}
      <MaterialConsumptionDialog
        open={showMaterialDialog}
        onOpenChange={setShowMaterialDialog}
        production={production}
        productName={product?.name || "Producto"}
        onSuccess={() => {
          setShowMaterialDialog(false)
          onUpdate()
        }}
      />
    </>
  )
}