"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Package } from "lucide-react"

interface ProductionTabProps {
  productId: string
}

export function ProductionTab({ productId }: ProductionTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Información de producción y BOM</p>
          <p className="text-sm text-gray-500 mt-2">
            Esta sección integrará datos de producción.bill_of_materials y procesos productivos
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
