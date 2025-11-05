"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockMaterials } from "@/lib/mock-data/planmaster-mock"

interface MaterialExplosionStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function MaterialExplosionStep({ planData, onDataChange }: MaterialExplosionStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Explosión de Materiales (MRP)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Cálculo automático de requerimientos de materia prima
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requerimientos de Materiales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Material</th>
                  <th className="text-right p-3">Requerido</th>
                  <th className="text-right p-3">Inventario</th>
                  <th className="text-right p-3">Faltante</th>
                  <th className="text-center p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {mockMaterials.map((mat) => (
                  <tr key={mat.id} className="border-b">
                    <td className="p-3 font-medium">{mat.name}</td>
                    <td className="p-3 text-right">{mat.total_required_grams}g</td>
                    <td className="p-3 text-right">{mat.current_inventory_grams}g</td>
                    <td className={`p-3 text-right font-semibold ${
                      mat.net_requirement_grams > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {mat.net_requirement_grams}g
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={
                        mat.status === 'critical' ? 'bg-red-100 text-red-800' :
                        mat.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {mat.status === 'critical' ? 'Crítico' :
                         mat.status === 'warning' ? 'Advertencia' : 'OK'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
