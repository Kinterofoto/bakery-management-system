"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface SavePlanStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function SavePlanStep({ planData, onDataChange }: SavePlanStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Guardar Plan</h3>
        <p className="text-sm text-gray-500 mt-1">
          Define los detalles del plan antes de guardarlo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="planName">Nombre del Plan</Label>
            <Input id="planName" placeholder="Plan Semana 42 - 2025" defaultValue="Plan Semana 42 - 2025" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weekNumber">Número de Semana</Label>
              <Input id="weekNumber" type="number" defaultValue="42" />
            </div>
            <div>
              <Label htmlFor="year">Año</Label>
              <Input id="year" type="number" defaultValue="2025" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" placeholder="Observaciones adicionales..." rows={4} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
