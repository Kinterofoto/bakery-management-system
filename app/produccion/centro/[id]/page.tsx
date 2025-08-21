"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Square, Pause, Plus, Package, Clock, TrendingUp, AlertCircle } from "lucide-react"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useProductionAnalytics } from "@/hooks/use-production-analytics"
import { CreateProductionDialog } from "@/components/production/CreateProductionDialog"
import { ProductionCard } from "@/components/production/ProductionCard"
import { ShiftAnalyticsCard } from "@/components/production/ShiftAnalyticsCard"
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
    pauseShift, 
    resumeShift 
  } = useProductionShifts()
  const { 
    productions, 
    getActiveProductions, 
    getTotalUnitsProduced, 
    getTotalBadUnits 
  } = useShiftProductions()
  
  const [showCreateProductionDialog, setShowCreateProductionDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const workCenter = getWorkCenterById(workCenterId)
  const activeShift = getActiveShiftForWorkCenter(workCenterId)
  const activeProductions = getActiveProductions()
  const shiftProductions = activeShift ? productions.filter(p => p.shift_id === activeShift.id) : []

  // Calcular estadísticas del turno
  const totalUnitsProduced = getTotalUnitsProduced()
  const totalBadUnits = getTotalBadUnits()
  const totalGoodUnits = totalUnitsProduced - totalBadUnits
  const qualityPercentage = totalUnitsProduced > 0 
    ? ((totalGoodUnits / totalUnitsProduced) * 100).toFixed(1) 
    : "0"

  // Calcular duración del turno
  const shiftDuration = activeShift 
    ? Math.floor((Date.now() - new Date(activeShift.started_at).getTime()) / (1000 * 60))
    : 0

  const handleEndShift = async () => {
    if (!activeShift) return
    
    try {
      setLoading(true)
      await endShift(activeShift.id)
      toast.success("Turno finalizado exitosamente")
      router.push("/produccion")
    } catch (error) {
      toast.error("Error al finalizar el turno")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePauseShift = async () => {
    if (!activeShift) return
    
    try {
      setLoading(true)
      await pauseShift(activeShift.id)
      toast.success("Turno pausado")
    } catch (error) {
      toast.error("Error al pausar el turno")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleResumeShift = async () => {
    if (!activeShift) return
    
    try {
      setLoading(true)
      await resumeShift(activeShift.id)
      toast.success("Turno reanudado")
    } catch (error) {
      toast.error("Error al reanudar el turno")
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
            <div className="flex items-center gap-2">
              <p className="text-gray-600">{workCenter.code}</p>
              <Badge 
                variant={activeShift.status === "active" ? "default" : "secondary"}
                className={activeShift.status === "active" ? "bg-green-600" : ""}
              >
                {activeShift.status === "active" ? "Activo" : 
                 activeShift.status === "paused" ? "Pausado" : "Completado"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {activeShift.status === "active" && (
            <>
              <Button
                variant="outline"
                onClick={handlePauseShift}
                disabled={loading}
                size="sm"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pausar
              </Button>
              <Button
                onClick={() => setShowCreateProductionDialog(true)}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Producción
              </Button>
            </>
          )}
          
          {activeShift.status === "paused" && (
            <Button
              onClick={handleResumeShift}
              disabled={loading}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Reanudar
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

      {/* Shift Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Clock className="w-5 h-5" />
            {activeShift.shift_name}
          </CardTitle>
          <CardDescription className="text-blue-600">
            Iniciado el {new Date(activeShift.started_at).toLocaleString()} • 
            Duración: {Math.floor(shiftDuration / 60)}h {shiftDuration % 60}min
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalGoodUnits}</div>
              <div className="text-sm text-gray-600">Unidades Buenas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalBadUnits}</div>
              <div className="text-sm text-gray-600">Unidades Malas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{qualityPercentage}%</div>
              <div className="text-sm text-gray-600">Calidad</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{activeProductions.length}</div>
              <div className="text-sm text-gray-600">Prod. Activas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Card */}
      {activeShift && <ShiftAnalyticsCard shiftId={activeShift.id} />}

      {/* Productions Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Producciones del Turno</h2>
          <Badge variant="secondary">
            {shiftProductions.length} producciones
          </Badge>
        </div>

        {shiftProductions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftProductions.map((production) => (
              <ProductionCard
                key={production.id}
                production={production}
                onUpdate={() => {
                  // Refetch will be handled by the hooks
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
      />
    </div>
  )
}