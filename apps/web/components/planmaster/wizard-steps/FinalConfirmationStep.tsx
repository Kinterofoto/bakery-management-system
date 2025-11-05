"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Lock, AlertTriangle } from "lucide-react"

interface FinalConfirmationStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function FinalConfirmationStep({ planData, onDataChange }: FinalConfirmationStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Confirmación Final</h3>
        <p className="text-sm text-gray-500 mt-1">
          Revisa el resumen antes de dejar el plan en firme
        </p>
      </div>

      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Al confirmar, el plan quedará bloqueado y se enviará a producción. No podrá modificarse sin autorización.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm text-gray-600">Período</p>
              <p className="text-lg font-semibold">Semana 42 - 2025</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-sm text-gray-600">Total OPs</p>
              <p className="text-lg font-semibold">15 órdenes</p>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <p className="text-sm text-gray-600">Demanda Total</p>
              <p className="text-lg font-semibold">6,480 unidades</p>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <p className="text-sm text-gray-600">Utilización</p>
              <p className="text-lg font-semibold">85%</p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Todas las validaciones pasaron</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Materiales confirmados</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Capacidad optimizada</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
