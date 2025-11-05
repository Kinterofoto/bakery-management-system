"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function ProductivityConfig() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Parámetros de Productividad</h3>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Parámetro
        </Button>
      </div>

      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="max-w-md mx-auto">
          <h4 className="font-medium text-gray-700 mb-2">Configuración de Productividad</h4>
          <p className="text-sm">
            Aquí podrás configurar los parámetros teóricos de producción (unidades por hora) 
            por cada combinación de producto y centro de trabajo para realizar análisis precisos 
            de eficiencia.
          </p>
        </div>
      </div>
    </div>
  )
}