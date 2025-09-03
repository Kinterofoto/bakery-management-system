"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Clock
} from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useBranches } from "@/hooks/use-branches"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
import { useReceivingExceptions } from "@/hooks/use-receiving-exceptions"
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
  
  // Future: could add bulk selection features
  // const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  // const [selectedCells, setSelectedCells] = useState<string[]>([])
  
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
  const { toast } = useToast()

  // Constants
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  // Use branches only, with client information for display
  const currentEntities = branches

  // Loading state
  const isLoading = clientsLoading || branchesLoading || schedulesLoading

  // Drag sensors with delay to distinguish clicks from drags
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      delay: 200, // 200ms delay before drag starts
      tolerance: 5, // 5px movement tolerance
    },
  })

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  })

  const sensors = useSensors(mouseSensor, touchSensor)

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎯 Drag Start:', event.active.id)
    setIsDragMode(true)
    const { active } = event
    const parts = active.id.toString().split('_')
    const entityId = parts[0]
    const dayOfWeek = parseInt(parts[1])
    
    console.log('🔍 Looking for branch:', entityId, 'day:', dayOfWeek)
    console.log('📊 Total schedules in state:', schedules.length)
    console.log('🎯 Current entities:', currentEntities.map(e => e.id))
    
    const entity = currentEntities.find(e => e.id === entityId)
    console.log('👤 Entity found:', entity?.name)
    
    const entitySchedules = getEntitySchedule(entityId, dayOfWeek)
    console.log('📅 Entity schedules found:', entitySchedules.length, entitySchedules)
    
    // Debug: Let's see all schedules for this branch
    const allEntitySchedules = schedules.filter(schedule => 
      schedule.branch_id === entityId
    )
    console.log('🗓️ All schedules for this entity:', allEntitySchedules.length, allEntitySchedules)
    
    if (entity) {
      setDraggedCell({
        entityId,
        entityName: entity.name,
        dayOfWeek,
        schedules: entitySchedules // Can be empty array for "clearing" action
      })
      const actionType = entitySchedules.length > 0 ? "copiar" : "limpiar"
      console.log(`✅ Dragged cell set (${actionType}):`, entity.name, dayNames[dayOfWeek])
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🏁 Drag End:', event.over?.id, 'draggedCell:', !!draggedCell)
    const { over } = event
    
    if (!over || !draggedCell) {
      console.log('❌ No over or draggedCell, aborting')
      setDraggedCell(null)
      setIsDragMode(false)
      return
    }

    const targetParts = over.id.toString().split('_')
    const targetEntityId = targetParts[0]
    const targetDayOfWeek = parseInt(targetParts[1])
    
    console.log('🎯 Target:', targetEntityId, dayNames[targetDayOfWeek])
    
    // Don't copy to the same cell
    if (targetEntityId === draggedCell.entityId && targetDayOfWeek === draggedCell.dayOfWeek) {
      console.log('⚠️ Same cell, skipping')
      setDraggedCell(null)
      setIsDragMode(false)
      return
    }

    try {
      const isClearing = draggedCell.schedules.length === 0
      const actionType = isClearing ? "limpiar" : "copiar"
      
      console.log(`🔄 Starting ${actionType} process...`)
      
      // Always delete existing schedules for target cell first
      const existingSchedules = getEntitySchedule(targetEntityId, targetDayOfWeek)
      console.log('🗑️ Deleting existing schedules:', existingSchedules.length)
      for (const schedule of existingSchedules) {
        await deleteSchedule(schedule.id)
      }

      // If copying (not clearing), copy schedules from source to target
      if (!isClearing) {
        console.log('📋 Copying schedules:', draggedCell.schedules.length)
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
          console.log('➕ Creating schedule:', newSchedule)
          
          // Direct database insert to bypass overlap checks during copy
          const { data, error } = await supabase
            .from("receiving_schedules")
            .insert([newSchedule])
            .select()
            .single()

          if (error) {
            console.error("❌ Error creating schedule:", error)
            throw error
          }
          
          console.log('✅ Schedule created:', data.id)
        }
      }

      // Refresh schedules data
      await refetchSchedules()
      
      // Show success message
      const targetEntity = currentEntities.find(e => e.id === targetEntityId)
      console.log(`✅ ${actionType} complete!`)
      
      toast({
        title: isClearing ? "Horarios eliminados" : "Horarios copiados",
        description: isClearing 
          ? `Horarios eliminados de ${targetEntity?.name} - ${dayNames[targetDayOfWeek]}`
          : `Horarios copiados de ${draggedCell.entityName} a ${targetEntity?.name} - ${dayNames[targetDayOfWeek]}`
      })
      
    } catch (error: any) {
      console.error("Error copying schedules:", error)
      toast({
        title: "Error",
        description: error?.message || "No se pudieron copiar los horarios",
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

  // Draggable Cell Component
  const DraggableCell = ({ entityId, dayOfWeek, date, children }: {
    entityId: string
    dayOfWeek: number
    date?: Date
    children: React.ReactNode
  }) => {
    const cellId = `${entityId}_${dayOfWeek}`
    const hasSchedules = getEntitySchedule(entityId, dayOfWeek).length > 0
    const cellStatus = getCellStatus(entityId, dayOfWeek, date)

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
    
    const {
      attributes,
      listeners,
      setNodeRef: setDragRef,
      transform,
      isDragging,
    } = useDraggable({
      id: cellId,
      disabled: false, // Allow drag for all cells (with or without schedules)
    })

    const {
      setNodeRef: setDropRef,
      isOver,
    } = useDroppable({
      id: cellId,
    })

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined

    // Combine refs
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
          relative min-h-16 p-2 border-2 rounded-lg transition-all
          cursor-grab active:cursor-grabbing
          ${isDragging ? 'opacity-50 z-50' : ''}
          ${isOver && !isDragging ? 'ring-2 ring-blue-500 bg-blue-50' : getStatusColor()}
          hover:shadow-md hover:scale-[1.02]
        `}
        onClick={handleClick}
        title={hasSchedules ? "Mantén presionado para arrastrar (copiar), clic rápido para editar" : "Mantén presionado para arrastrar (limpiar), clic rápido para editar"}
      >
        {children}
      </div>
    )
  }

  // Render cell content based on view mode
  const renderCell = (entityId: string, dayOfWeek: number, date?: Date) => {
    const cellStatus = getCellStatus(entityId, dayOfWeek, date)
    const cellKey = `${entityId}_${dayOfWeek}${date ? `_${date.toISOString().split('T')[0]}` : ''}`

    return (
      <DraggableCell 
        key={cellKey} 
        entityId={entityId} 
        dayOfWeek={dayOfWeek} 
        date={date}
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
      </DraggableCell>
    )
  }

  // Render matrix header
  const renderMatrixHeader = () => (
    <div className="grid grid-cols-8 gap-2 mb-4">
      <div className="font-semibold text-sm text-gray-700">
        Sucursal
      </div>
      {dayNames.map((day, idx) => (
        <div key={idx} className="font-semibold text-sm text-gray-700 text-center">
          {day}
        </div>
      ))}
    </div>
  )

  // Render entity row - entity is a branch
  const renderEntityRow = (branch: any) => {
    // Find the client for this branch
    const client = clients.find(c => c.id === branch.client_id)
    const displayName = client ? `${client.name} - ${branch.name}` : branch.name
    
    return (
      <div key={branch.id} className="grid grid-cols-8 gap-2 mb-2">
        {/* Branch name with client */}
        <div className="flex items-center p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium truncate" title={displayName}>
            {displayName}
          </div>
        </div>
      
        {/* Day cells */}
        {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => (
          <div key={`${branch.id}_${dayOfWeek}`}>
            {renderCell(branch.id, dayOfWeek)}
          </div>
        ))}
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

      {/* Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Matriz de Horarios de Sucursales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentEntities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay sucursales
              </h3>
              <p className="text-gray-600">
                Crea algunas sucursales para configurar sus horarios.
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

      {/* Time Slot Editor Dialog */}
      {editingCell && (
        <TimeSlotEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false)
            setEditingCell(null)
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