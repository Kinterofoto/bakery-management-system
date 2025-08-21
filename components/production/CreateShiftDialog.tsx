"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: string | null
}

export function CreateShiftDialog({ open, onOpenChange, workCenterId }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { createShift } = useProductionShifts()
  const { getWorkCenterById } = useWorkCenters()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    shiftName: "",
    notes: ""
  })

  const workCenter = workCenterId ? getWorkCenterById(workCenterId) : null

  const generateShiftName = () => {
    const now = new Date()
    const date = now.toLocaleDateString('es-ES')
    const time = now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    return `${workCenter?.name} - ${date} ${time}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!workCenterId || !user) {
      toast.error("Faltan datos requeridos")
      return
    }

    const shiftName = formData.shiftName.trim() || generateShiftName()

    try {
      setLoading(true)
      const shift = await createShift({
        work_center_id: workCenterId,
        shift_name: shiftName,
        created_by: user.id,
        notes: formData.notes.trim() || null,
        status: "active"
      })
      
      toast.success("Turno iniciado exitosamente")
      setFormData({ shiftName: "", notes: "" })
      onOpenChange(false)
      
      // Redirigir al centro de trabajo
      router.push(`/produccion/centro/${workCenterId}`)
    } catch (error) {
      toast.error("Error al iniciar el turno")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Iniciar Nuevo Turno</DialogTitle>
            <DialogDescription>
              {workCenter ? 
                `Configurar turno para el centro: ${workCenter.name}` :
                "Configurar nuevo turno de producción"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shiftName">Nombre del Turno</Label>
              <Input
                id="shiftName"
                placeholder={generateShiftName()}
                value={formData.shiftName}
                onChange={handleChange("shiftName")}
              />
              <p className="text-xs text-gray-500">
                Déjalo vacío para usar el nombre automático
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones Iniciales</Label>
              <Textarea
                id="notes"
                placeholder="Notas sobre este turno..."
                value={formData.notes}
                onChange={handleChange("notes")}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-1">Información del Turno</h4>
              <p className="text-sm text-blue-600">
                • Centro: {workCenter?.name || "No seleccionado"}<br/>
                • Fecha: {new Date().toLocaleDateString('es-ES')}<br/>
                • Hora de inicio: {new Date().toLocaleTimeString('es-ES')}<br/>
                • Operador: {user?.name || "Usuario"}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !workCenterId}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Iniciando..." : "Iniciar Turno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}