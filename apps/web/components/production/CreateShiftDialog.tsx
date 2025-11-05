"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Clock, User, Calendar } from "lucide-react"
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

  const handleSubmit = async () => {
    if (!workCenterId || !user) {
      toast.error("Faltan datos requeridos")
      return
    }

    try {
      setLoading(true)
      await createShift({
        work_center_id: workCenterId,
        shift_name: generateShiftName(),
        created_by: user.id,
        notes: null,
        status: "active"
      })

      toast.success("Turno iniciado exitosamente")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Iniciar Nuevo Turno</DialogTitle>
          <DialogDescription>
            {workCenter ?
              `¿Iniciar turno en ${workCenter.name}?` :
              "Configurar nuevo turno de producción"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Fecha</p>
              <p className="text-sm text-gray-600">{new Date().toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Hora de inicio</p>
              <p className="text-sm text-gray-600">{new Date().toLocaleTimeString('es-ES')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Operador</p>
              <p className="text-sm text-gray-600">{user?.email || "Usuario"}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Nombre del turno:</strong> {generateShiftName()}
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
            onClick={handleSubmit}
            disabled={loading || !workCenterId}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Iniciando..." : "Iniciar Turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
