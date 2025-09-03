"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { 
  Plus, 
  Trash2, 
  Clock,
  Calendar,
  AlertTriangle,
  Save,
  X
} from "lucide-react"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
import { useReceivingExceptions } from "@/hooks/use-receiving-exceptions"
import { useToast } from "@/hooks/use-toast"

interface TimeSlot {
  id?: string
  start_time: string
  end_time: string
  status: "available" | "unavailable"
  metadata?: Record<string, any>
}

interface TimeSlotEditorProps {
  isOpen: boolean
  onClose: () => void
  entityId: string
  entityType: "client" | "branch"
  entityName: string
  dayOfWeek: number
  selectedDate?: Date
}

export function TimeSlotEditor({
  isOpen,
  onClose,
  entityId,
  entityType,
  entityName,
  dayOfWeek,
  selectedDate
}: TimeSlotEditorProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isException, setIsException] = useState(false)
  const [exceptionType, setExceptionType] = useState<"blocked" | "open_extra" | "special_hours">("special_hours")
  const [exceptionNote, setExceptionNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()
  const { 
    schedules, 
    createSchedule, 
    updateSchedule, 
    deleteSchedule,
    checkTimeOverlap 
  } = useReceivingSchedules()
  const { 
    createException, 
    updateException, 
    deleteException,
    getExceptionForDate 
  } = useReceivingExceptions()

  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

  // Load existing schedules/exceptions when dialog opens
  useEffect(() => {
    if (!isOpen) return

    if (selectedDate) {
      // Load exception for specific date
      const dateStr = selectedDate.toISOString().split('T')[0]
      const exception = getExceptionForDate(
        dateStr,
        entityType === "client" ? entityId : undefined,
        entityType === "branch" ? entityId : undefined
      )
      
      if (exception) {
        setIsException(true)
        setExceptionType(exception.type)
        setExceptionNote(exception.note || "")
        
        if (exception.type !== "blocked") {
          setTimeSlots([{
            start_time: exception.start_time || "08:00",
            end_time: exception.end_time || "17:00",
            status: "available"
          }])
        } else {
          setTimeSlots([])
        }
      } else {
        // Load regular schedules for this day
        loadRegularSchedules()
      }
    } else {
      // Load regular schedules
      loadRegularSchedules()
    }
  }, [isOpen, entityId, dayOfWeek, selectedDate])

  const loadRegularSchedules = () => {
    const entitySchedules = schedules.filter(schedule => 
      (entityType === "client" ? schedule.client_id === entityId : schedule.branch_id === entityId) &&
      schedule.day_of_week === dayOfWeek
    )

    if (entitySchedules.length > 0) {
      setTimeSlots(entitySchedules.map(schedule => ({
        id: schedule.id,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        status: schedule.status,
        metadata: schedule.metadata || undefined
      })))
    } else {
      // Start with default slot
      setTimeSlots([{
        start_time: "08:00",
        end_time: "17:00",
        status: "available"
      }])
    }
    
    setIsException(false)
    setExceptionType("special_hours")
    setExceptionNote("")
  }

  // Add new time slot
  const addTimeSlot = () => {
    const lastSlot = timeSlots[timeSlots.length - 1]
    const newStartTime = lastSlot ? addHours(lastSlot.end_time, 1) : "08:00"
    const newEndTime = addHours(newStartTime, 1)

    setTimeSlots([...timeSlots, {
      start_time: newStartTime,
      end_time: newEndTime,
      status: "available"
    }])
  }

  // Remove time slot
  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index))
  }

  // Update time slot
  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: any) => {
    const updated = [...timeSlots]
    updated[index] = { ...updated[index], [field]: value }
    setTimeSlots(updated)
  }

  // Helper function to add hours to time string
  const addHours = (timeStr: string, hours: number): string => {
    const [h, m] = timeStr.split(':').map(Number)
    const newHours = (h + hours) % 24
    return `${String(newHours).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // Validate time slots
  const validateTimeSlots = (): string[] => {
    const errors: string[] = []

    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i]
      
      // Check time format and validity
      if (slot.start_time >= slot.end_time) {
        errors.push(`Slot ${i + 1}: La hora de inicio debe ser menor que la hora de fin`)
      }

      // Check for overlaps with other slots
      for (let j = i + 1; j < timeSlots.length; j++) {
        const otherSlot = timeSlots[j]
        if (
          (slot.start_time <= otherSlot.start_time && slot.end_time > otherSlot.start_time) ||
          (slot.start_time < otherSlot.end_time && slot.end_time >= otherSlot.end_time) ||
          (slot.start_time >= otherSlot.start_time && slot.end_time <= otherSlot.end_time)
        ) {
          errors.push(`Slots ${i + 1} y ${j + 1}: Los horarios se superponen`)
        }
      }
    }

    return errors
  }

  // Save changes
  const handleSave = async () => {
    if (isException && exceptionType === "blocked") {
      // Save blocked exception
      await saveException()
    } else if (isException) {
      // Save timed exception
      if (timeSlots.length !== 1) {
        toast({
          title: "Error",
          description: "Las excepciones solo pueden tener un horario",
          variant: "destructive"
        })
        return
      }
      await saveException()
    } else {
      // Save regular schedules
      await saveRegularSchedules()
    }
  }

  const saveException = async () => {
    if (!selectedDate) return

    setIsSubmitting(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const existingException = getExceptionForDate(
        dateStr,
        entityType === "client" ? entityId : undefined,
        entityType === "branch" ? entityId : undefined
      )

      const exceptionData = {
        [entityType === "client" ? "client_id" : "branch_id"]: entityId,
        exception_date: dateStr,
        type: exceptionType,
        start_time: exceptionType === "blocked" ? null : timeSlots[0]?.start_time || null,
        end_time: exceptionType === "blocked" ? null : timeSlots[0]?.end_time || null,
        note: exceptionNote || null,
        source: "user" as const
      }

      if (existingException) {
        await updateException(existingException.id, exceptionData)
      } else {
        await createException(exceptionData)
      }

      toast({
        title: "Éxito",
        description: "Excepción guardada correctamente"
      })
      
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo guardar la excepción",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveRegularSchedules = async () => {
    const errors = validateTimeSlots()
    if (errors.length > 0) {
      toast({
        title: "Errores de validación",
        description: errors.join(", "),
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Delete existing schedules for this day
      const existingSchedules = schedules.filter(schedule => 
        (entityType === "client" ? schedule.client_id === entityId : schedule.branch_id === entityId) &&
        schedule.day_of_week === dayOfWeek
      )

      for (const schedule of existingSchedules) {
        await deleteSchedule(schedule.id)
      }

      // Create new schedules
      for (const slot of timeSlots) {
        await createSchedule({
          [entityType === "client" ? "client_id" : "branch_id"]: entityId,
          day_of_week: dayOfWeek,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: slot.status,
          metadata: slot.metadata || {}
        })
      }

      toast({
        title: "Éxito",
        description: "Horarios guardados correctamente"
      })
      
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudieron guardar los horarios",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Editar Horarios - {entityName}
          </DialogTitle>
          <div className="text-sm text-gray-600">
            {selectedDate ? (
              <>
                <Calendar className="h-4 w-4 inline mr-1" />
                {selectedDate.toLocaleDateString('es-CO', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 inline mr-1" />
                {dayNames[dayOfWeek]} (recurrente)
              </>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Exception toggle (only for specific dates) */}
          {selectedDate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is-exception">Configurar como excepción</Label>
                <Switch 
                  id="is-exception"
                  checked={isException} 
                  onCheckedChange={setIsException} 
                />
              </div>

              {isException && (
                <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <Label htmlFor="exception-type">Tipo de excepción</Label>
                    <Select value={exceptionType} onValueChange={(value: any) => setExceptionType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blocked">Bloqueado (sin recepción)</SelectItem>
                        <SelectItem value="special_hours">Horario especial</SelectItem>
                        <SelectItem value="open_extra">Apertura extra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="exception-note">Nota</Label>
                    <Textarea
                      id="exception-note"
                      value={exceptionNote}
                      onChange={(e) => setExceptionNote(e.target.value)}
                      placeholder="Ej: Día festivo, mantenimiento, etc."
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time slots (if not blocked exception) */}
          {(!isException || exceptionType !== "blocked") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Horarios de recepción</Label>
                <Button variant="outline" size="sm" onClick={addTimeSlot}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Horario
                </Button>
              </div>

              <div className="space-y-3">
                {timeSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      <div>
                        <Label className="text-xs">Inicio</Label>
                        <Input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => updateTimeSlot(index, "start_time", e.target.value)}
                          className="w-24"
                        />
                      </div>
                      
                      <span className="text-gray-500 mt-5">→</span>
                      
                      <div>
                        <Label className="text-xs">Fin</Label>
                        <Input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => updateTimeSlot(index, "end_time", e.target.value)}
                          className="w-24"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Estado</Label>
                        <Select 
                          value={slot.status} 
                          onValueChange={(value: any) => updateTimeSlot(index, "status", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Disponible</SelectItem>
                            <SelectItem value="unavailable">No disponible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => removeTimeSlot(index)}
                      disabled={timeSlots.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Validation errors */}
              {validateTimeSlots().length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Errores de validación
                  </div>
                  <ul className="text-red-700 text-sm space-y-1">
                    {validateTimeSlots().map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}