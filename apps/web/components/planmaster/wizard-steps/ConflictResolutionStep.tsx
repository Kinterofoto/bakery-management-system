"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockConflicts } from "@/lib/mock-data/planmaster-mock"
import { CheckCircle, X } from "lucide-react"

interface ConflictResolutionStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function ConflictResolutionStep({ planData, onDataChange }: ConflictResolutionStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Resolución de Conflictos</h3>
        <p className="text-sm text-gray-500 mt-1">
          Aplica las soluciones sugeridas o define alternativas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Soluciones Propuestas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockConflicts.map((conflict) => (
              <div key={conflict.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold mb-1">{conflict.resource_name}</p>
                    <p className="text-sm text-gray-600 mb-3">{conflict.description}</p>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-800 mb-1">💡 Solución sugerida:</p>
                      <p className="text-sm text-blue-700">{conflict.suggested_solution}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aplicar
                    </Button>
                    <Button size="sm" variant="outline">
                      <X className="w-4 h-4 mr-1" />
                      Ignorar
                    </Button>
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
