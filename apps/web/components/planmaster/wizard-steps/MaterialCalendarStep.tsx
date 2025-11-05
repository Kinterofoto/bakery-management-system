"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"

interface MaterialCalendarStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function MaterialCalendarStep({ planData, onDataChange }: MaterialCalendarStepProps) {
  const arrivals = [
    { date: '2025-10-21', material: 'Mantequilla', quantity: '7000g', status: 'urgent' },
    { date: '2025-10-22', material: 'Queso Campesino', quantity: '7000g', status: 'warning' },
    { date: '2025-10-23', material: 'Azúcar', quantity: '2000g', status: 'ok' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Calendario de Llegadas de MP</h3>
        <p className="text-sm text-gray-500 mt-1">
          Fechas programadas para recepción de materia prima
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Llegadas Programadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {arrivals.map((arrival, idx) => (
              <div key={idx} className={`p-4 border-l-4 rounded ${
                arrival.status === 'urgent' ? 'border-l-red-500 bg-red-50' :
                arrival.status === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                'border-l-green-500 bg-green-50'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{arrival.material}</p>
                    <p className="text-sm text-gray-600">{arrival.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{arrival.date}</p>
                    <Badge variant="outline" className={
                      arrival.status === 'urgent' ? 'bg-red-100 text-red-800' :
                      arrival.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {arrival.status === 'urgent' ? 'Urgente' : arrival.status === 'warning' ? 'Pendiente' : 'OK'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
