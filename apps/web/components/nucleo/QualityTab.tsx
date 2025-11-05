"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQualitySpecs } from "@/hooks/use-nucleo-product"
import { AlertCircle } from "lucide-react"

interface QualityTabProps {
  productId: string
}

export function QualityTab({ productId }: QualityTabProps) {
  const { specs, loading } = useQualitySpecs(productId)

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>
  }

  if (!specs) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay especificaciones de calidad configuradas</p>
          <p className="text-sm text-gray-500 mt-2">
            Las especificaciones de calidad estarán disponibles próximamente
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Especificaciones de Calidad</CardTitle>
          <CardDescription>Parámetros y controles de calidad</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {specs.control_frequency && (
              <div>
                <label className="text-sm font-medium text-gray-600">Frecuencia de control</label>
                <p className="text-base">{specs.control_frequency}</p>
              </div>
            )}

            {specs.inspection_points && specs.inspection_points.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Puntos de inspección</label>
                <p className="text-base">{specs.inspection_points.join(', ')}</p>
              </div>
            )}

            {specs.rejection_criteria && (
              <div>
                <label className="text-sm font-medium text-gray-600">Criterios de rechazo</label>
                <p className="text-base">{specs.rejection_criteria}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
