"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Square, Clock, CheckCircle2, XCircle, Package } from "lucide-react"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useProducts } from "@/hooks/use-products"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"

type ShiftProduction = Database["produccion"]["Tables"]["shift_productions"]["Row"]

interface Props {
  production: ShiftProduction
  onUpdate: () => void
}

export function ProductionCard({ production, onUpdate }: Props) {
  const { user } = useAuth()
  const { endProduction, addProductionRecord } = useShiftProductions()
  const { getProductById } = useProducts()
  const [loading, setLoading] = useState(false)
  const [showAddUnitsDialog, setShowAddUnitsDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [unitsForm, setUnitsForm] = useState({
    goodUnits: "",
    badUnits: "",
    notes: ""
  })

  const product = getProductById(production.product_id)
  
  // Calcular duración
  const startTime = new Date(production.started_at)
  const endTime = production.ended_at ? new Date(production.ended_at) : new Date()
  const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
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
              </CardTitle>
              <CardDescription className="text-sm">
                Iniciado {startTime.toLocaleTimeString('es-ES')}
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
          {/* Duration */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {durationHours > 0 ? `${durationHours}h ` : ""}{remainingMinutes}min
            </span>
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
                Finalizada {production.ended_at && new Date(production.ended_at).toLocaleTimeString('es-ES')}
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
          
          <div className="py-4">
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
          </div>
          
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
        </DialogContent>
      </Dialog>
    </>
  )
}