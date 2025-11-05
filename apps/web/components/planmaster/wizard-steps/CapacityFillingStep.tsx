"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface CapacityFillingStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function CapacityFillingStep({ planData, onDataChange }: CapacityFillingStepProps) {
  const capacityUsage = [
    { center: 'Horno Principal', capacity: 85, available: 15 },
    { center: 'Línea Empaque', capacity: 62, available: 38 },
    { center: 'Mesa Trabajo 1', capacity: 50, available: 50 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Optimización de Capacidad</h3>
        <p className="text-sm text-gray-500 mt-1">
          Uso de capacidad por centro de trabajo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacidad Disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {capacityUsage.map((item) => (
              <div key={item.center}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{item.center}</span>
                  <span className="text-sm text-gray-600">{item.capacity}% utilizado</span>
                </div>
                <Progress value={item.capacity} />
                <p className="text-xs text-gray-500 mt-1">{item.available}% disponible para producción adicional</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
