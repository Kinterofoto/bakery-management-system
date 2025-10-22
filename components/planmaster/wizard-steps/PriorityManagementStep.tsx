"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PriorityManagementStepProps {
  planData: any
  onDataChange: (data: any) => void
}

const mockOrders = [
  { id: '1', client: 'Hotel Plaza', product: 'Pan Tajado', quantity: 500, date: '2025-10-22', priority: 1 },
  { id: '2', client: 'Café Central', product: 'Croissant', quantity: 300, date: '2025-10-22', priority: 2 },
  { id: '3', client: 'Universidad', product: 'Palitos', quantity: 800, date: '2025-10-23', priority: 3 },
]

export function PriorityManagementStep({ planData, onDataChange }: PriorityManagementStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Priorización de Pedidos</h3>
        <p className="text-sm text-gray-500 mt-1">
          Define el orden de producción según importancia del cliente o urgencia
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orden de Prioridad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 p-3 border rounded hover:bg-gray-50">
                <Badge className="bg-blue-600">{order.priority}</Badge>
                <div className="flex-1">
                  <p className="font-semibold">{order.client}</p>
                  <p className="text-sm text-gray-600">{order.product} - {order.quantity} und</p>
                </div>
                <span className="text-sm text-gray-500">{order.date}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">💡 Arrastra para reordenar (próximamente)</p>
        </CardContent>
      </Card>
    </div>
  )
}
