"use client"

import { useMaterials } from "@/hooks/use-materials"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

export function MaterialsConfig() {
  const { materials } = useMaterials()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Materiales</h3>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Material
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Unidad Base</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((material) => (
            <TableRow key={material.id}>
              <TableCell className="font-medium">{material.name}</TableCell>
              <TableCell className="text-sm text-gray-600">
                {material.description || "-"}
              </TableCell>
              <TableCell>{material.base_unit}</TableCell>
              <TableCell>
                <Badge variant={material.is_active ? "default" : "secondary"}>
                  {material.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {materials.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay materiales configurados. Se cargarán automáticamente desde la base de datos.
        </div>
      )}
    </div>
  )
}