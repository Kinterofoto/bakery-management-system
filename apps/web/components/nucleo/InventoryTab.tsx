"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useInventoryConfig } from "@/hooks/use-nucleo-product"
import { AlertCircle, Warehouse } from "lucide-react"

interface InventoryTabProps {
  productId: string
}

export function InventoryTab({ productId }: InventoryTabProps) {
  const { config, loading } = useInventoryConfig(productId)

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay configuración de inventario</p>
          <p className="text-sm text-gray-500 mt-2">
            La configuración de inventario estará disponible próximamente
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Inventario</CardTitle>
          <CardDescription>Parámetros de control de stock</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Niveles de Stock</h3>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Punto de reorden</span>
                <span className="font-semibold">{config.reorder_point} unidades</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Stock de seguridad</span>
                <span className="font-semibold">{config.safety_stock} unidades</span>
              </div>

              {config.max_stock_level && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Stock máximo</span>
                  <span className="font-semibold">{config.max_stock_level} unidades</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Tiempo de entrega</span>
                <span className="font-semibold">{config.lead_time_days} días</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Clasificación y Ubicación</h3>

              {config.abc_classification && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Clasificación ABC</span>
                  <Badge variant={
                    config.abc_classification === 'A' ? 'default' :
                    config.abc_classification === 'B' ? 'secondary' : 
                    'outline'
                  }>
                    Clase {config.abc_classification}
                  </Badge>
                </div>
              )}

              {config.rotation_classification && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Rotación</span>
                  <Badge variant="outline">{config.rotation_classification}</Badge>
                </div>
              )}

              {config.storage_location && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Ubicación</span>
                  <span className="font-semibold">{config.storage_location}</span>
                </div>
              )}

              <div className="pt-4 space-y-2">
                {config.requires_cold_chain && (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Cadena de frío requerida</Badge>
                  </div>
                )}
                {config.is_perishable && (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Producto perecedero</Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
