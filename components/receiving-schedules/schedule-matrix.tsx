"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Plus, 
  Minus, 
  Copy, 
  Trash2, 
  Calendar,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  Download,
  Upload
} from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useBranches } from "@/hooks/use-branches"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
import { useReceivingExceptions } from "@/hooks/use-receiving-exceptions"
import { useReceivingTemplates } from "@/hooks/use-receiving-templates"

interface ScheduleMatrixProps {
  className?: string
}

type ViewMode = "weekly" | "monthly"
type EntityType = "client" | "branch"

export function ScheduleMatrix({ className }: ScheduleMatrixProps) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("weekly")
  const [entityType, setEntityType] = useState<EntityType>("client")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  // Selection state
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  
  // Data hooks
  const { clients, loading: clientsLoading } = useClients()
  const { branches, loading: branchesLoading, getBranchesByClient } = useBranches()
  const { 
    schedules, 
    loading: schedulesLoading,
    createSchedule,
    deleteSchedule,
    copySchedules 
  } = useReceivingSchedules()
  const { 
    exceptions, 
    getExceptionForDate 
  } = useReceivingExceptions()
  const { templates } = useReceivingTemplates()

  // Constants
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const dayNamesLong = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

  // Get current entities based on type
  const currentEntities = entityType === "client" ? clients : branches

  // Loading state
  const isLoading = clientsLoading || branchesLoading || schedulesLoading

  // Get schedule for a specific entity and day
  const getEntitySchedule = (entityId: string, dayOfWeek: number) => {
    const entitySchedules = schedules.filter(schedule => 
      entityType === "client" 
        ? schedule.client_id === entityId
        : schedule.branch_id === entityId
    )
    
    return entitySchedules.filter(schedule => schedule.day_of_week === dayOfWeek)
  }

  // Get effective status for a cell (considering exceptions)
  const getCellStatus = (entityId: string, dayOfWeek: number, date?: Date) => {
    // If we have a specific date, check for exceptions first
    if (date) {
      const dateStr = date.toISOString().split('T')[0]
      const exception = getExceptionForDate(
        dateStr,
        entityType === "client" ? entityId : undefined,
        entityType === "branch" ? entityId : undefined
      )
      
      if (exception) {
        return {
          type: "exception" as const,
          status: exception.type === "blocked" ? "unavailable" : "available",
          note: exception.note,
          exception
        }
      }
    }

    // Check regular schedules
    const schedules = getEntitySchedule(entityId, dayOfWeek)
    
    if (schedules.length === 0) {
      return {
        type: "default" as const,
        status: "unavailable" as const,
        note: "Sin configurar"
      }
    }

    // If we have schedules, determine overall status
    const hasAvailable = schedules.some(s => s.status === "available")
    const hasUnavailable = schedules.some(s => s.status === "unavailable")

    return {
      type: "regular" as const,
      status: hasAvailable && !hasUnavailable ? "available" : 
              hasUnavailable && !hasAvailable ? "unavailable" : "mixed",
      schedules,
      note: `${schedules.length} horario(s)`
    }
  }

  // Render cell content based on view mode
  const renderCell = (entityId: string, dayOfWeek: number, date?: Date) => {
    const cellStatus = getCellStatus(entityId, dayOfWeek, date)
    const cellKey = `${entityId}-${dayOfWeek}${date ? `-${date.toISOString().split('T')[0]}` : ''}`
    const isSelected = selectedCells.includes(cellKey)

    // Color classes based on status
    const getStatusColor = () => {
      switch (cellStatus.status) {
        case "available":
          return "bg-green-100 border-green-300 text-green-800"
        case "unavailable":
          return "bg-red-100 border-red-300 text-red-800"
        case "mixed":
          return "bg-yellow-100 border-yellow-300 text-yellow-800"
        default:
          return "bg-gray-100 border-gray-300 text-gray-600"
      }
    }

    const handleCellClick = () => {
      if (isSelected) {
        setSelectedCells(prev => prev.filter(key => key !== cellKey))
      } else {
        setSelectedCells(prev => [...prev, cellKey])
      }
    }

    return (
      <div
        key={cellKey}
        className={`
          relative min-h-16 p-2 border-2 rounded-lg cursor-pointer transition-all
          hover:shadow-md
          ${getStatusColor()}
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
        `}
        onClick={handleCellClick}
      >
        {/* Exception indicator */}
        {cellStatus.type === "exception" && (
          <div className="absolute top-1 right-1">
            <Calendar className="h-3 w-3" />
          </div>
        )}

        {viewMode === "weekly" ? (
          // Weekly view - show time slots
          <div className="space-y-1">
            {cellStatus.type === "regular" && cellStatus.schedules ? (
              cellStatus.schedules.map((schedule, idx) => (
                <div key={idx} className="text-xs">
                  <Badge variant="outline" className="text-xs">
                    {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-xs text-center">
                {cellStatus.status === "available" ? "Abierto" :
                 cellStatus.status === "unavailable" ? "Cerrado" :
                 "Mixto"}
              </div>
            )}
          </div>
        ) : (
          // Monthly view - show day status
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-center">
              {cellStatus.status === "available" ? "✓" :
               cellStatus.status === "unavailable" ? "✗" :
               cellStatus.status === "mixed" ? "~" : "-"}
            </div>
          </div>
        )}

        {/* Tooltip content */}
        <div className="sr-only">
          {cellStatus.note}
        </div>
      </div>
    )
  }

  // Render matrix header
  const renderMatrixHeader = () => (
    <div className="grid grid-cols-8 gap-2 mb-4">
      <div className="font-semibold text-sm text-gray-700">
        {entityType === "client" ? "Cliente" : "Sucursal"}
      </div>
      {dayNames.map((day, idx) => (
        <div key={idx} className="font-semibold text-sm text-gray-700 text-center">
          {day}
        </div>
      ))}
    </div>
  )

  // Render entity row
  const renderEntityRow = (entity: any) => (
    <div key={entity.id} className="grid grid-cols-8 gap-2 mb-2">
      {/* Entity name */}
      <div className="flex items-center p-2 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium truncate" title={entity.name}>
          {entity.name}
        </div>
      </div>
      
      {/* Day cells */}
      {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => (
        <div key={`${entity.id}-${dayOfWeek}`}>
          {renderCell(entity.id, dayOfWeek)}
        </div>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando matriz de horarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left controls */}
            <div className="flex items-center gap-4">
              <Select value={entityType} onValueChange={(value: EntityType) => setEntityType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Clientes</SelectItem>
                  <SelectItem value="branch">Sucursales</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button 
                  variant={viewMode === "weekly" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setViewMode("weekly")}
                >
                  <ZoomIn className="h-4 w-4 mr-2" />
                  Semanal
                </Button>
                <Button 
                  variant={viewMode === "monthly" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setViewMode("monthly")}
                >
                  <ZoomOut className="h-4 w-4 mr-2" />
                  Mensual
                </Button>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Plantillas
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Selection actions */}
          {selectedCells.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  {selectedCells.length} celda(s) seleccionada(s)
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCells([])}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Matriz de Horarios - Vista {viewMode === "weekly" ? "Semanal" : "Mensual"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentEntities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay {entityType === "client" ? "clientes" : "sucursales"}
              </h3>
              <p className="text-gray-600">
                Crea algunos {entityType === "client" ? "clientes" : "sucursales"} para configurar sus horarios.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {renderMatrixHeader()}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentEntities.map(entity => renderEntityRow(entity))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>No disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Mixto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Sin configurar</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}