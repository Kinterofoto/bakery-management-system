"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, CheckCircle } from "lucide-react"

interface DeliveryAnalysisStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function DeliveryAnalysisStep({ planData, onDataChange }: DeliveryAnalysisStepProps) {
  // Mock delivery dates analysis
  const deliveries = [
    { date: '2025-10-22', orders: 8, risk: 'low', products: ['Pan Tajado', 'Croissant'] },
    { date: '2025-10-23', orders: 12, risk: 'medium', products: ['Palitos de Queso', 'Almojábanas', 'Pandebono'] },
    { date: '2025-10-24', orders: 15, risk: 'high', products: ['Pan Tajado', 'Croissant', 'Palitos'] },
    { date: '2025-10-25', orders: 10, risk: 'low', products: ['Almojábanas'] },
    { date: '2025-10-26', orders: 6, risk: 'low', products: ['Pandebono', 'Pan Tajado'] },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Análisis de Fechas de Entrega</h3>
        <p className="text-sm text-gray-500 mt-1">
          Revisión de compromisos de entrega y detección de posibles quiebras de stock
        </p>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendario de Entregas Programadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <div
                key={delivery.date}
                className={`p-4 border-l-4 rounded-lg ${
                  delivery.risk === 'high' ? 'border-l-red-500 bg-red-50' :
                  delivery.risk === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-green-500 bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-gray-900">
                        {new Date(delivery.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long'
                        })}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          delivery.risk === 'high' ? 'bg-red-100 text-red-800 border-red-300' :
                          delivery.risk === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          'bg-green-100 text-green-800 border-green-300'
                        }
                      >
                        {delivery.risk === 'high' ? (
                          <><AlertTriangle className="w-3 h-3 mr-1" /> Alto Riesgo</>
                        ) : delivery.risk === 'medium' ? (
                          <><AlertTriangle className="w-3 h-3 mr-1" /> Riesgo Medio</>
                        ) : (
                          <><CheckCircle className="w-3 h-3 mr-1" /> OK</>
                        )}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="text-gray-600">{delivery.orders} pedidos programados</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">{delivery.products.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Projection */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-orange-700">Proyección de Quiebres de Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900">Palitos de Queso - 24/10</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Stock proyectado insuficiente. Se requieren 150 unidades adicionales para cumplir entregas.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Otros productos sin riesgo</p>
                  <p className="text-sm text-green-700 mt-1">
                    El resto de productos tiene stock proyectado suficiente para cumplir entregas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
