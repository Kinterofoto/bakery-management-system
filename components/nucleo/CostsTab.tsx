"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProductCosts } from "@/hooks/use-nucleo-product"
import { AlertCircle, DollarSign } from "lucide-react"

interface CostsTabProps {
  productId: string
}

export function CostsTab({ productId }: CostsTabProps) {
  const { costs, loading } = useProductCosts(productId)

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>
  }

  if (!costs) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay información de costos configurada</p>
          <p className="text-sm text-gray-500 mt-2">
            Los costos y análisis financiero estarán disponibles próximamente
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Estructura de Costos</CardTitle>
          <CardDescription>Desglose de costos de producción</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Costos Directos</h3>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Materiales</span>
                <span className="font-semibold">${costs.material_cost.toLocaleString('es-CO')}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Mano de obra</span>
                <span className="font-semibold">${costs.labor_cost.toLocaleString('es-CO')}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Empaque</span>
                <span className="font-semibold">${costs.packaging_cost.toLocaleString('es-CO')}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Gastos generales</span>
                <span className="font-semibold">${costs.overhead_cost.toLocaleString('es-CO')}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-t-2 border-gray-900">
                <span className="font-bold text-gray-900">Costo Total Producción</span>
                <span className="font-bold text-lg">${costs.total_production_cost.toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Análisis Financiero</h3>

              {costs.base_selling_price && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Precio venta base</span>
                  <span className="font-semibold text-green-600">
                    ${costs.base_selling_price.toLocaleString('es-CO')}
                  </span>
                </div>
              )}

              {costs.profit_margin_percentage && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Margen de utilidad</span>
                  <span className="font-semibold text-green-600">
                    {costs.profit_margin_percentage}%
                  </span>
                </div>
              )}

              {costs.break_even_units && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Punto de equilibrio</span>
                  <span className="font-semibold">{costs.break_even_units} unidades</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Fecha de cálculo</span>
                <span className="text-sm">
                  {new Date(costs.cost_calculation_date).toLocaleDateString('es-CO')}
                </span>
              </div>

              {costs.notes && (
                <div className="pt-4">
                  <label className="text-sm font-medium text-gray-600">Notas</label>
                  <p className="text-sm text-gray-700 mt-1">{costs.notes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
