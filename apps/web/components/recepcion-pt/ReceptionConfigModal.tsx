"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Settings, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface ReceptionConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  enabled: boolean
  loading: boolean
  updating: boolean
  onChange: (next: boolean) => Promise<void>
}

export function ReceptionConfigModal({
  open,
  onOpenChange,
  enabled,
  loading,
  updating,
  onChange,
}: ReceptionConfigModalProps) {
  const handleToggle = async (next: boolean) => {
    try {
      await onChange(next)
      toast.success(
        next
          ? "Módulo de recepción PT activado"
          : "Módulo de recepción PT desactivado. Las producciones se recibirán automáticamente al empacarse."
      )
    } catch {
      toast.error("No se pudo actualizar la configuración")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-white/90 dark:bg-black/85 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <div className="bg-teal-500/15 backdrop-blur-sm rounded-xl p-2">
              <Settings className="w-6 h-6 text-teal-600" />
            </div>
            Configuración de Recepción PT
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-400">
            Controla si las producciones terminadas requieren recepción manual o entran directo al inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40">
            <div className="space-y-1">
              <Label htmlFor="pt-reception-toggle" className="text-base font-semibold text-gray-900 dark:text-white">
                Módulo de Recepción PT
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {enabled
                  ? "Activo: cada producción finalizada espera revisión y aprobación manual antes de entrar al inventario."
                  : "Desactivado: al empacar una producción se crea el movimiento de inventario automáticamente y no pasa por revisión."}
              </p>
            </div>
            <Switch
              id="pt-reception-toggle"
              checked={enabled}
              disabled={loading || updating}
              onCheckedChange={handleToggle}
            />
          </div>

          {enabled ? (
            <div className="flex gap-3 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                <p className="font-semibold">Comportamiento actual</p>
                <p>
                  Las producciones de centros de última operación quedan en cola en este módulo y un operador debe revisarlas y recibirlas a inventario.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                <p className="font-semibold">Recepción automática activa</p>
                <p>
                  Al finalizar una producción en un centro de última operación, las unidades buenas entran a <span className="font-mono">WH3-GENERAL</span> y las defectuosas a <span className="font-mono">WH3-DEFECTS</span> sin intervención manual.
                </p>
                <p>Esta cola dejará de poblarse mientras el módulo esté desactivado.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
