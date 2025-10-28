"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTechnicalSpecs } from "@/hooks/use-nucleo-product"
import { AlertCircle } from "lucide-react"

interface TechnicalSpecsTabProps {
  productId: string
}

export function TechnicalSpecsTab({ productId }: TechnicalSpecsTabProps) {
  const { specs, loading } = useTechnicalSpecs(productId)

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>
  }

  if (!specs) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay especificaciones técnicas configuradas</p>
          <p className="text-sm text-gray-500 mt-2">
            Las especificaciones técnicas estarán disponibles próximamente
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Especificaciones Técnicas</CardTitle>
          <CardDescription>Características técnicas del producto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specs.shelf_life_days && (
              <div>
                <label className="text-sm font-medium text-gray-600">Vida útil (días)</label>
                <p className="text-base">{specs.shelf_life_days}</p>
              </div>
            )}

            {specs.storage_conditions && (
              <div>
                <label className="text-sm font-medium text-gray-600">Condiciones de almacenamiento</label>
                <p className="text-base">{specs.storage_conditions}</p>
              </div>
            )}

            {specs.packaging_type && (
              <div>
                <label className="text-sm font-medium text-gray-600">Tipo de empaque</label>
                <p className="text-base">{specs.packaging_type}</p>
              </div>
            )}

            {specs.net_weight && (
              <div>
                <label className="text-sm font-medium text-gray-600">Peso neto (kg)</label>
                <p className="text-base">{specs.net_weight}</p>
              </div>
            )}

            {specs.gross_weight && (
              <div>
                <label className="text-sm font-medium text-gray-600">Peso bruto (kg)</label>
                <p className="text-base">{specs.gross_weight}</p>
              </div>
            )}

            {specs.allergens && specs.allergens.length > 0 && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Alérgenos</label>
                <p className="text-base">{specs.allergens.join(', ')}</p>
              </div>
            )}

            {specs.certifications && specs.certifications.length > 0 && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Certificaciones</label>
                <p className="text-base">{specs.certifications.join(', ')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
