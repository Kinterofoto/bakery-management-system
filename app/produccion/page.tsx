"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings, Play, Square, Clock, Package, TrendingUp } from "lucide-react"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useRouter } from "next/navigation"
import { CreateWorkCenterDialog } from "@/components/production/CreateWorkCenterDialog"
import { CreateShiftDialog } from "@/components/production/CreateShiftDialog"
import { ProductionOverviewCards } from "@/components/production/ProductionOverviewCards"

export default function ProductionPage() {
  const router = useRouter()
  const { workCenters, loading: loadingCenters } = useWorkCenters()
  const { shifts, hasActiveShift } = useProductionShifts()
  
  const [showCreateCenterDialog, setShowCreateCenterDialog] = useState(false)
  const [showCreateShiftDialog, setShowCreateShiftDialog] = useState(false)
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<string | null>(null)

  const activeWorkCenters = workCenters.filter(wc => wc.is_active)
  const activeShifts = shifts.filter(shift => shift.status === "active")

  const handleStartShift = (workCenterId: string) => {
    setSelectedWorkCenter(workCenterId)
    setShowCreateShiftDialog(true)
  }

  const handleViewCenter = (workCenterId: string) => {
    router.push(`/produccion/centro/${workCenterId}`)
  }

  if (loadingCenters) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
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
            onClick={() => setShowCreateCenterDialog(true)}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Centro
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

      {/* Overview Cards */}
      <ProductionOverviewCards />

      {/* Active Shifts Summary */}
      {activeShifts.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Turnos Activos ({activeShifts.length})
            </CardTitle>
            <CardDescription className="text-green-600">
              Centros de trabajo en producción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeShifts.map((shift) => {
                const workCenter = workCenters.find(wc => wc.id === shift.work_center_id)
                const startTime = new Date(shift.started_at)
                const duration = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60))
                
                return (
                  <Card key={shift.id} className="bg-white border-green-300">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{workCenter?.name}</h4>
                        <Badge variant="default" className="bg-green-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {duration}min
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{shift.shift_name}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCenter(shift.work_center_id)}
                        className="w-full"
                      >
                        Ver Detalles
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <p className="text-sm text-gray-500">{workCenter.code}</p>
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
              
              <CardContent className="space-y-3">
                {hasActive ? (
                  <Button
                    onClick={() => handleViewCenter(workCenter.id)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Ver Producción
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
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/produccion/centro/${workCenter.id}/historial`)}
                  className="w-full"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ver Historial
                </Button>
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
              Crea tu primer centro de trabajo para comenzar a gestionar la producción
            </p>
            <Button onClick={() => setShowCreateCenterDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Centro de Trabajo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateWorkCenterDialog
        open={showCreateCenterDialog}
        onOpenChange={setShowCreateCenterDialog}
      />
      
      <CreateShiftDialog
        open={showCreateShiftDialog}
        onOpenChange={setShowCreateShiftDialog}
        workCenterId={selectedWorkCenter}
      />
    </div>
  )
}