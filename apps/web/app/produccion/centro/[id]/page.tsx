"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Square, Plus, Package, AlertCircle, Clock } from "lucide-react"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useTransferNotifications } from "@/hooks/use-transfer-notifications"
import { CreateProductionDialog } from "@/components/production/CreateProductionDialog"
import { ProductionCard } from "@/components/production/ProductionCard"
import { InventoryManagementDialog } from "@/components/production/InventoryManagementDialog"
import { toast } from "sonner"

interface Props {
  params: {
    id: string
  }
}

export default function WorkCenterDetailPage({ params }: Props) {
  const router = useRouter()
  const workCenterId = params.id
  
  const { getWorkCenterById } = useWorkCenters()
  const {
    getActiveShiftForWorkCenter,
    endShift,
    refetch: refetchShifts
  } = useProductionShifts()
  const {
    productions,
    refetch: refetchProductions
  } = useShiftProductions()
  const { pendingTransfersCount, fetchPendingTransfersCount } = useTransferNotifications()

  const [showCreateProductionDialog, setShowCreateProductionDialog] = useState(false)
  const [showInventoryDialog, setShowInventoryDialog] = useState(false)
  const [inventoryDialogTab, setInventoryDialogTab] = useState<"inventory" | "transfers" | "returns">("inventory")
  const [loading, setLoading] = useState(false)

  const workCenter = getWorkCenterById(workCenterId)
  const activeShift = getActiveShiftForWorkCenter(workCenterId)

  // Load pending transfers count
  useEffect(() => {
    fetchPendingTransfersCount(workCenterId)
  }, [workCenterId, fetchPendingTransfersCount])

  // Auto-refetch para mantener datos actualizados
  useEffect(() => {
    if (activeShift) {
      const interval = setInterval(() => {
        refetchProductions()
        fetchPendingTransfersCount(workCenterId)
      }, 10000) // Refetch cada 10 segundos

      return () => clearInterval(interval)
    }
  }, [activeShift, refetchProductions, workCenterId, fetchPendingTransfersCount])

  // Refetch cuando la página vuelve a tener focus
  useEffect(() => {
    const handleFocus = () => {
      refetchProductions()
      refetchShifts()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchProductions, refetchShifts])

  const shiftProductions = activeShift ? productions.filter(p => p.shift_id === activeShift.id) : []

  const handleEndShift = async () => {
    if (!activeShift) return
    
    try {
      setLoading(true)
      await endShift(activeShift.id)
      await refetchShifts()
      await refetchProductions()
      toast.success("Turno finalizado exitosamente")
      router.push("/produccion")
    } catch (error) {
      toast.error("Error al finalizar el turno")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }


  if (!workCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            Centro de trabajo no encontrado
          </h2>
          <Button onClick={() => router.push("/produccion")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  if (!activeShift) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/produccion")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{workCenter.name}</h1>
            <p className="text-gray-600">{workCenter.code}</p>
          </div>
        </div>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="w-16 h-16 text-orange-500 mb-4" />
            <h3 className="text-xl font-semibold text-orange-800 mb-2">
              No hay turno activo
            </h3>
            <p className="text-orange-600 text-center mb-6 max-w-md">
              Este centro de trabajo no tiene un turno activo en este momento. 
              Inicia un nuevo turno para comenzar la producción.
            </p>
            <Button onClick={() => router.push("/produccion")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/produccion")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{workCenter.name}</h1>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto items-center">
          {/* Inventory Button with Badge */}
          <div className="relative flex-1 sm:flex-none">
            <Button
              onClick={() => {
                setInventoryDialogTab("inventory")
                setShowInventoryDialog(true)
              }}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <Package className="w-4 h-4 mr-2" />
              Inventario
            </Button>
            {pendingTransfersCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setInventoryDialogTab("transfers")
                  setShowInventoryDialog(true)
                }}
                className="
                  absolute -top-2 -right-2
                  bg-red-500
                  text-white
                  text-xs
                  font-bold
                  rounded-full
                  w-5 h-5
                  flex items-center justify-center
                  hover:bg-red-600
                  active:scale-95
                  transition-all
                  shadow-lg
                  cursor-pointer
                "
                title="Ir a materiales por recibir"
                aria-label="Materiales por recibir"
              >
                {pendingTransfersCount}
              </button>
            )}
          </div>

          {activeShift.status === "active" && (
            <Button
              onClick={() => setShowCreateProductionDialog(true)}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Producción
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={handleEndShift}
            disabled={loading}
            size="sm"
          >
            <Square className="w-4 h-4 mr-2" />
            Finalizar Turno
          </Button>
        </div>
      </div>

      {/* Productions Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Producciones del Turno</h2>

        {shiftProductions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftProductions.map((production) => (
              <ProductionCard
                key={production.id}
                production={production}
                onUpdate={() => {
                  refetchProductions()
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No hay producciones iniciadas
              </h3>
              <p className="text-gray-500 text-center mb-4 max-w-md">
                Inicia la primera producción para comenzar a registrar unidades
              </p>
              <Button onClick={() => setShowCreateProductionDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Iniciar Producción
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Production Dialog */}
      <CreateProductionDialog
        open={showCreateProductionDialog}
        onOpenChange={setShowCreateProductionDialog}
        shiftId={activeShift.id}
        onSuccess={() => {
          refetchProductions()
        }}
      />

      {/* Inventory Management Dialog */}
      <InventoryManagementDialog
        workCenterId={workCenterId}
        open={showInventoryDialog}
        onOpenChange={setShowInventoryDialog}
        initialTab={inventoryDialogTab}
      />
    </div>
  )
}