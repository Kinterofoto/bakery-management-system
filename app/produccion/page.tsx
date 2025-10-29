"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Settings, Play, TrendingUp, ArrowRight } from "lucide-react"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useRouter } from "next/navigation"
import { CreateShiftDialog } from "@/components/production/CreateShiftDialog"

export default function ProductionPage() {
  const router = useRouter()
  const { workCenters, loading: loadingCenters } = useWorkCenters()
  const { shifts, hasActiveShift } = useProductionShifts()

  const [showCreateShiftDialog, setShowCreateShiftDialog] = useState(false)
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<string | null>(null)

  const activeWorkCenters = workCenters.filter(wc => wc.is_active)

  const handleStartShift = (workCenterId: string) => {
    setSelectedWorkCenter(workCenterId)
    setShowCreateShiftDialog(true)
  }

  const handleViewCenter = (workCenterId: string) => {
    router.push(`/produccion/centro/${workCenterId}`)
  }

  const getActiveTime = (workCenterId: string) => {
    const activeShift = shifts.find(
      shift => shift.work_center_id === workCenterId && shift.status === "active"
    )

    if (!activeShift) return null

    const startedAtUtc = activeShift.started_at.endsWith('Z')
      ? activeShift.started_at
      : activeShift.started_at + 'Z'
    const startTime = new Date(startedAtUtc).getTime()
    const now = new Date().getTime()
    const diffMs = now - startTime
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    if (hours > 0) {
      return `${hours}h ${minutes}min activo`
    } else {
      return `${minutes}min activo`
    }
  }

  if (loadingCenters) {
    return (
      <RouteGuard>
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Módulo de Producción</h1>
          <p className="text-gray-600">Gestiona turnos, producciones y seguimiento en tiempo real</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/produccion/historial')}
            className="flex-1 sm:flex-none"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Ver Historial
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/produccion/configuracion')}
            className="flex-1 sm:flex-none"
          >
            <Settings className="w-4 h-4 mr-2" />
            Config.
          </Button>
        </div>
      </div>

      {/* Work Centers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeWorkCenters.map((workCenter) => {
          const hasActive = hasActiveShift(workCenter.id)
          
          return (
            <Card 
              key={workCenter.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                hasActive 
                  ? 'border-green-500 bg-green-50 shadow-md' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{workCenter.name}</CardTitle>
                    <p className="text-sm text-gray-500">
                      {hasActive ? getActiveTime(workCenter.id) : 'Inactivo'}
                    </p>
                  </div>
                  {hasActive && (
                    <Badge variant="default" className="bg-green-600">
                      <Play className="w-3 h-3 mr-1" />
                      Activo
                    </Badge>
                  )}
                </div>
                {workCenter.description && (
                  <CardDescription className="text-sm">
                    {workCenter.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                {hasActive ? (
                  <Button
                    onClick={() => handleViewCenter(workCenter.id)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Continuar Producción
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleStartShift(workCenter.id)}
                    className="w-full"
                    variant="default"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Turno
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {activeWorkCenters.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay centros de trabajo
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Configura centros de trabajo desde el botón de configuración
            </p>
            <Button onClick={() => router.push('/produccion/configuracion')}>
              <Settings className="w-4 h-4 mr-2" />
              Ir a Configuración
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateShiftDialog
        open={showCreateShiftDialog}
        onOpenChange={setShowCreateShiftDialog}
        workCenterId={selectedWorkCenter}
      />
    </div>
    </RouteGuard>
  )
}