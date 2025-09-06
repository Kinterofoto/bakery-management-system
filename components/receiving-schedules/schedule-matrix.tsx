"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Calendar,
  Clock,
  Search
} from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useBranches } from "@/hooks/use-branches"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
import { useReceivingExceptions } from "@/hooks/use-receiving-exceptions"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useToast } from "@/hooks/use-toast"
import { TimeSlotEditor } from "./time-slot-editor"
import { supabase } from "@/lib/supabase"
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  useDraggable,
  useDroppable,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"

interface ScheduleMatrixProps {
  className?: string
}


export function ScheduleMatrix({ className }: ScheduleMatrixProps) {
  // View state
  const [viewMode] = useState("weekly")
  const [searchTerm, setSearchTerm] = useState("")
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingCell, setEditingCell] = useState<{
    entityId: string
    entityName: string
    dayOfWeek: number
    selectedDate?: Date
  } | null>(null)
  
  // Drag & Drop state
  const [draggedCell, setDraggedCell] = useState<{
    entityId: string
    entityName: string
    dayOfWeek: number
    schedules: any[]
  } | null>(null)
  
  // Drag detection
  const [isDragMode, setIsDragMode] = useState(false)
  
  // Data hooks
  const { clients, loading: clientsLoading } = useClients()
  const { branches, loading: branchesLoading } = useBranches()
  const { 
    schedules, 
    loading: schedulesLoading,
    createSchedule,
    deleteSchedule,
    refetch: refetchSchedules
  } = useReceivingSchedules()
  const { 
    getExceptionForDate 
  } = useReceivingExceptions()
  const {
    hasFrequencyForDay,
    toggleFrequency,
    loading: frequenciesLoading
  } = useClientFrequencies()
  const { toast } = useToast()

  // Constants
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  // Filter branches based on search term
  const filteredBranches = branches.filter(branch => {
    if (!searchTerm) return true
    
    const client = clients.find(c => c.id === branch.client_id)
    const clientName = client?.name || ""
    const branchName = branch.name || ""
    const searchLower = searchTerm.toLowerCase()
    
    return (
      clientName.toLowerCase().includes(searchLower) ||
      branchName.toLowerCase().includes(searchLower) ||
      branch.address?.toLowerCase().includes(searchLower) ||
      branch.phone?.toLowerCase().includes(searchLower) ||
      branch.email?.toLowerCase().includes(searchLower)
    )
  })
  
  const currentEntities = filteredBranches

  // Loading state
  const isLoading = clientsLoading || branchesLoading || schedulesLoading || frequenciesLoading

  // Sensors configured to allow clicks while still enabling drag
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      delay: 150, // Shorter delay for faster drag activation
      tolerance: 5, // Small tolerance to prevent accidental drags
    },
  })

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  })

  const sensors = useSensors(mouseSensor, touchSensor)

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎯 Drag Start:', event.active.id)
    setIsDragMode(true)
    
    const { active } = event
    const activeData = active.data.current
    
    if (!activeData || activeData.type !== 'schedule-cell') {
      console.error('Invalid active data:', activeData)
      return
    }
    
    const entityId = activeData.entityId
    const dayOfWeek = activeData.dayOfWeek
    
    console.log('🔍 Looking for branch:', entityId, 'day:', dayOfWeek)
    
    const entity = currentEntities.find(e => e.id === entityId)
    console.log('👤 Entity found:', entity?.name)
    
    const entitySchedules = getEntitySchedule(entityId, dayOfWeek)
    console.log('📅 Entity schedules found:', entitySchedules.length)
    
    if (entity) {
      setDraggedCell({
        entityId,
        entityName: entity.name,
        dayOfWeek,
        schedules: entitySchedules // Can be empty array for "clearing" action
      })
      const actionType = entitySchedules.length > 0 ? "copiar" : "limpiar"
      console.log(`✅ Dragged cell set (${actionType}):`, entity.name, dayNames[dayOfWeek])
    } else {
      console.log('❌ No entity found!')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🏁 Drag End Event:', {
      over: event.over?.id,
      active: event.active?.id,
      draggedCell: !!draggedCell
    })
    
    const { over, active } = event
    
    if (!over || !draggedCell) {
      console.log('❌ Missing over or draggedCell')
      setDraggedCell(null)
      setIsDragMode(false)
      return
    }

    // Get data directly from the drag/drop events
    const activeData = active.data.current
    const overData = over.data.current
    
    console.log('🔍 Event data check:', {
      activeData,
      overData,
      activeType: activeData?.type,
      overType: overData?.type
    })
    
    if (!activeData || !overData || activeData.type !== 'schedule-cell' || overData.type !== 'schedule-cell') {
      console.error('❌ Invalid event data:', { activeData, overData })
      setDraggedCell(null)
      setIsDragMode(false)
      return
    }
    
    const sourceEntityId = activeData.entityId
    const sourceDayOfWeek = activeData.dayOfWeek
    const targetEntityId = overData.entityId
    const targetDayOfWeek = overData.dayOfWeek
    
    console.log('🎯 Direct data:', {
      source: { entityId: sourceEntityId, day: sourceDayOfWeek, dayName: dayNames[sourceDayOfWeek] },
      target: { entityId: targetEntityId, day: targetDayOfWeek, dayName: dayNames[targetDayOfWeek] }
    })
    
    // Don't process same cell
    if (sourceEntityId === targetEntityId && sourceDayOfWeek === targetDayOfWeek) {
      console.log('⚠️ Same cell detected, skipping')
      setDraggedCell(null)
      setIsDragMode(false)
      return
    }

    try {
      // Find entities
      const sourceEntity = currentEntities.find(e => e.id === sourceEntityId)
      const targetEntity = currentEntities.find(e => e.id === targetEntityId)
      
      if (!sourceEntity || !targetEntity) {
        console.log('❌ Entity not found:', { sourceEntity: !!sourceEntity, targetEntity: !!targetEntity })
        return
      }
      
      console.log('👥 Entities:', { 
        source: sourceEntity.name, 
        target: targetEntity.name 
      })
      
      const isClearing = draggedCell.schedules.length === 0
      const actionType = isClearing ? "limpiar" : "copiar"
      
      console.log(`🔄 ${actionType} from ${sourceEntity.name} to ${targetEntity.name}`)
      
      // Delete existing schedules from target
      const existingSchedules = getEntitySchedule(targetEntityId, targetDayOfWeek)
      console.log(`🗑️ Deleting ${existingSchedules.length} existing schedules`)
      
      for (const schedule of existingSchedules) {
        await deleteSchedule(schedule.id)
      }

      // Copy schedules if not clearing
      if (!isClearing) {
        console.log(`📋 Copying ${draggedCell.schedules.length} schedules`)
        
        for (const schedule of draggedCell.schedules) {
          const newSchedule = {
            branch_id: targetEntityId,
            client_id: null,
            day_of_week: targetDayOfWeek,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            status: schedule.status,
            metadata: schedule.metadata || {}
          }
          
          // Use the hook method to ensure state updates
          const createdSchedule = await createSchedule(newSchedule)
          console.log('✅ Created schedule:', createdSchedule.id)
        }
      }

      console.log(`✅ ${actionType} completed successfully`)
      // No need to refetch - the data is already updated through createSchedule/deleteSchedule
      // await refetchSchedules()
      
      toast({
        title: isClearing ? "Horarios eliminados" : "Horarios copiados",
        description: isClearing 
          ? `Eliminado de ${targetEntity.name} - ${dayNames[targetDayOfWeek]}`
          : `Copiado de ${sourceEntity.name} a ${targetEntity.name} - ${dayNames[targetDayOfWeek]}`,
        duration: 2000 // Shorter toast duration
      })
      
    } catch (error: any) {
      console.error("❌ Error in drag end:", error)
      toast({
        title: "Error",
        description: error?.message || "Error en la operación",
        variant: "destructive"
      })
    } finally {
      setDraggedCell(null)
      setIsDragMode(false)
    }
  }

  // Get schedule for a specific branch and day
  const getEntitySchedule = (branchId: string, dayOfWeek: number) => {
    const branchSchedules = schedules.filter(schedule => 
      schedule.branch_id === branchId
    )
    
    return branchSchedules.filter(schedule => schedule.day_of_week === dayOfWeek)
  }

  // Get effective status for a cell (considering exceptions)
  const getCellStatus = (entityId: string, dayOfWeek: number, date?: Date) => {
    // If we have a specific date, check for exceptions first
    if (date) {
      const dateStr = date.toISOString().split('T')[0]
      const exception = getExceptionForDate(
        dateStr,
        undefined, // client_id
        entityId   // branch_id
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
        status: "unconfigured" as const,
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

  // Draggable Cell Component
  const DraggableCell = ({ entityId, dayOfWeek, date, children, viewMode = 'desktop' }: {
    entityId: string
    dayOfWeek: number
    date?: Date
    children: React.ReactNode
    viewMode?: 'desktop' | 'mobile'
  }) => {
    // Create stable unique ID that includes viewMode to prevent conflicts
    const cellId = useMemo(() => `cell-${viewMode}-${entityId}-day${dayOfWeek}`, [entityId, dayOfWeek, viewMode])
    const hasSchedules = getEntitySchedule(entityId, dayOfWeek).length > 0
    const cellStatus = getCellStatus(entityId, dayOfWeek, date)

    // Color classes based on status (no borders)
    const getStatusColor = () => {
      switch (cellStatus.status) {
        case "available":
          return "bg-green-100 text-green-800"
        case "unavailable":
          return "bg-red-100 text-red-800"
        case "mixed":
          return "bg-yellow-100 text-yellow-800"
        case "unconfigured":
        default:
          return "bg-gray-50 text-gray-500"
      }
    }
    
    const {
      attributes,
      listeners,
      setNodeRef: setDragRef,
      transform,
      isDragging,
    } = useDraggable({
      id: cellId,
      data: {
        entityId,
        dayOfWeek,
        type: 'schedule-cell'
      },
      disabled: false, // Allow drag for all cells (with or without schedules)
    })

    const {
      setNodeRef: setDropRef,
      isOver,
    } = useDroppable({
      id: cellId,
      data: {
        entityId,
        dayOfWeek,
        type: 'schedule-cell'
      }
    })

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined

    // Combine refs like the original working version
    const setNodeRef = (node: HTMLElement | null) => {
      setDragRef(node)
      setDropRef(node)
    }

    const handleClick = () => {
      // Only handle clicks if not in drag mode
      if (!isDragMode && !isDragging) {
        const entity = currentEntities.find(e => e.id === entityId)
        if (entity) {
          setEditingCell({
            entityId,
            entityName: entity.name,
            dayOfWeek,
            selectedDate: date
          })
          setIsEditorOpen(true)
        }
      }
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          relative min-h-16 p-3 rounded-lg transition-colors
          cursor-grab active:cursor-grabbing
          ${isDragging ? 'opacity-50 z-50' : ''}
          ${isOver && !isDragging ? 'ring-2 ring-blue-500 bg-blue-50' : getStatusColor()}
          hover:shadow-md
        `}
        onClick={handleClick}
        title={hasSchedules ? "Mantén presionado para arrastrar (copiar), clic rápido para editar" : "Mantén presionado para arrastrar (limpiar), clic rápido para editar"}
      >
        {children}
      </div>
    )
  }

  // Handle frequency checkbox click
  const handleFrequencyToggle = async (entityId: string, dayOfWeek: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent cell click from firing
    try {
      await toggleFrequency(entityId, dayOfWeek)
    } catch (error) {
      console.error('Error toggling frequency:', error)
    }
  }

  // Render cell content based on view mode
  const renderCell = (entityId: string, dayOfWeek: number, date?: Date, viewMode: 'desktop' | 'mobile' = 'desktop') => {
    const cellStatus = getCellStatus(entityId, dayOfWeek, date)
    const cellKey = `${entityId}_${dayOfWeek}${date ? `_${date.toISOString().split('T')[0]}` : ''}`
    const hasFrequency = hasFrequencyForDay(entityId, dayOfWeek)

    return (
      <DraggableCell 
        key={cellKey} 
        entityId={entityId} 
        dayOfWeek={dayOfWeek} 
        date={date}
        viewMode={viewMode}
      >
        {/* Frequency Checkbox - Top Left Corner */}
        <div className="absolute -top-2 -left-2 z-10">
          <button
            onClick={(e) => handleFrequencyToggle(entityId, dayOfWeek, e)}
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold
              transition-all duration-200 shadow-sm hover:shadow-md
              ${
                hasFrequency
                  ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600'
              }
            `}
            title={`${hasFrequency ? 'Desactivar' : 'Activar'} frecuencia para este día`}
          >
            {hasFrequency && '✓'}
          </button>
        </div>

        {/* Exception indicator */}
        {cellStatus.type === "exception" && (
          <div className="absolute top-1 right-1">
            <Calendar className="h-3 w-3" />
          </div>
        )}

        {true ? (
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
                 cellStatus.status === "mixed" ? "Mixto" :
                 cellStatus.status === "unconfigured" ? "Sin configurar" : "Sin configurar"}
              </div>
            )}
          </div>
        ) : (
          // Monthly view - show day status
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-center">
              {cellStatus.status === "available" ? "✓" :
               cellStatus.status === "unavailable" ? "✗" :
               cellStatus.status === "mixed" ? "~" :
               cellStatus.status === "unconfigured" ? "-" : "-"}
            </div>
          </div>
        )}

        {/* Tooltip content */}
        <div className="sr-only">
          {cellStatus.note}
          {hasFrequency && ' • Tiene frecuencia'}
        </div>
      </DraggableCell>
    )
  }

  // Render matrix header
  const renderMatrixHeader = () => (
    <>
      {/* Desktop Header */}
      <div className="hidden md:grid grid-cols-8 gap-2 mb-4">
        <div className="font-semibold text-sm text-gray-700">
          Sucursal
        </div>
        {dayNames.map((day, idx) => (
          <div key={idx} className="font-semibold text-sm text-gray-700 text-center">
            {day}
          </div>
        ))}
      </div>
      
      {/* Mobile Header */}
      <div className="md:hidden mb-4">
        <div className="font-semibold text-sm text-gray-700 mb-2">
          Horarios por Sucursal
        </div>
      </div>
    </>
  )

  // Render entity row - entity is a branch
  const renderEntityRow = (branch: any) => {
    // Find the client for this branch
    const client = clients.find(c => c.id === branch.client_id)
    const displayName = client ? `${client.name} - ${branch.name}` : branch.name
    
    return (
      <div key={branch.id}>
        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-8 gap-2 mb-2">
          {/* Branch name with client */}
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium truncate" title={displayName}>
              {displayName}
            </div>
          </div>
        
          {/* Day cells */}
          {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => (
            <div key={`${branch.id}_${dayOfWeek}`}>
              {renderCell(branch.id, dayOfWeek, undefined, 'desktop')}
            </div>
          ))}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden mb-4 bg-white border border-gray-100 rounded-lg overflow-hidden">
          {/* Branch Header */}
          <div className="bg-gray-50 p-4 border-b border-gray-100">
            <div className="font-medium text-gray-900 text-base" title={displayName}>
              {displayName}
            </div>
          </div>
          
          {/* Days Grid - 2 columns on mobile */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => (
                <div key={`${branch.id}_${dayOfWeek}`} className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {dayNames[dayOfWeek]}
                  </div>
                  {renderCell(branch.id, dayOfWeek, undefined, 'mobile')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`space-y-6 ${className}`}>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              className="flex-1"
              placeholder="Buscar por cliente, sucursal, dirección, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Matriz de Horarios de Sucursales
            {searchTerm && (
              <Badge variant="secondary" className="ml-2">
                {currentEntities.length} resultado{currentEntities.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentEntities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {searchTerm ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron sucursales
                  </h3>
                  <p className="text-gray-600">
                    No hay sucursales que coincidan con "{searchTerm}"
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay sucursales
                  </h3>
                  <p className="text-gray-600">
                    Crea algunas sucursales para configurar sus horarios.
                  </p>
                </>
              )}
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
        <CardContent className="p-4 space-y-4">
          {/* Schedule Status Legend */}
          <div>
            <p className="font-medium text-sm text-gray-900 mb-2">Estado de Horarios</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 rounded"></div>
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 rounded"></div>
                <span>No disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 rounded"></div>
                <span>Mixto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-50 rounded"></div>
                <span>Sin configurar</span>
              </div>
            </div>
          </div>

          {/* Frequency Legend */}
          <div className="border-t pt-4">
            <p className="font-medium text-sm text-gray-900 mb-2">Frecuencias de Entrega</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 border-2 border-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <span>Cliente tiene frecuencia este día</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-white border-2 border-gray-300 rounded"></div>
                <span>Cliente sin frecuencia este día</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Haz clic en el checkbox (esquina superior izquierda) para activar/desactivar frecuencias
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Time Slot Editor Dialog */}
      {editingCell && (
        <TimeSlotEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false)
            setEditingCell(null)
            refetchSchedules()
          }}
          entityId={editingCell.entityId}
          entityType="branch"
          entityName={editingCell.entityName}
          dayOfWeek={editingCell.dayOfWeek}
          selectedDate={editingCell.selectedDate}
        />
      )}
    </div>
    </DndContext>
  )
}