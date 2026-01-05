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
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
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
  const { checkProductHasBOM } = useBillOfMaterials()
  const [loading, setLoading] = useState(false)
  const [showAddUnitsDialog, setShowAddUnitsDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [showMaterialDialog, setShowMaterialDialog] = useState(false)
  const [hasBOM, setHasBOM] = useState(true)
  const [productWeight, setProductWeight] = useState<number | null>(null)
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

  // Cargar peso del producto desde especificaciones técnicas
  useEffect(() => {
    const fetchProductWeight = async () => {
      const { data } = await supabase
        .from("product_technical_specs")
        .select("net_weight")
        .eq("product_id", production.product_id)
        .single()

      if (data?.net_weight) {
        setProductWeight(data.net_weight)
      }
    }
    fetchProductWeight()
  }, [production.product_id])

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
                {productWeight && ` - ${productWeight}g`}
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