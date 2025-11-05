"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockProductionOrders } from "@/lib/mock-data/planmaster-mock"

interface ProductionOrdersStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function ProductionOrdersStep({ planData, onDataChange }: ProductionOrdersStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Generación de Órdenes de Producción</h3>
        <p className="text-sm text-gray-500 mt-1">
          Preview de OPs generadas automáticamente según la demanda y capacidad
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{mockProductionOrders.length} Órdenes Generadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockProductionOrders.slice(0, 8).map((op) => (
              <div key={op.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{op.order_number}</p>
                  <p className="text-xs text-gray-600">{op.product_name} - {op.work_center_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{op.quantity_planned} und</p>
                  <p className="text-xs text-gray-500 capitalize">{op.scheduled_date} - {op.scheduled_shift}</p>
                </div>
                <Badge variant="outline" className="ml-3 capitalize">{op.source}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
