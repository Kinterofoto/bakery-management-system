"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function BillOfMaterialsConfig() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bill of Materials</h3>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Configuración
        </Button>
      </div>

      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="max-w-md mx-auto">
          <h4 className="font-medium text-gray-700 mb-2">Configuración de BOM</h4>
          <p className="text-sm">
            Esta funcionalidad permite configurar las listas de materiales necesarios para cada producto.
            La implementación completa estará disponible en una próxima actualización.
          </p>
        </div>
      </div>
    </div>
  )
}