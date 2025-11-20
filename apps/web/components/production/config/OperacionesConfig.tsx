"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useProducts } from "@/hooks/use-products"
import { useProductOperations } from "@/hooks/use-product-operations"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductWorkCenterMapping } from "@/hooks/use-product-work-center-mapping"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  code: string
  weight?: string
}

export function OperacionesConfig() {
  const { getAllProducts } = useProducts()
  const { operations, loading: operationsLoading } = useProductOperations()
  const { workCenters } = useWorkCenters()
  const { mappings, upsertMapping, loading: mappingsLoading } = useProductWorkCenterMapping()

  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOperation, setSelectedOperation] = useState<string>("")
  const [savingProduct, setSavingProduct] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const allProducts = await getAllProducts()
      const finishedProducts = allProducts.filter((p: any) => p.category === "PT")
      setProducts(finishedProducts)
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Error al cargar productos")
    }
  }

  const getWorkCentersByOperation = (operationId: string) => {
    return workCenters.filter(wc => wc.is_active)
  }

  const getProductMapping = (productId: string, operationId: string) => {
    return mappings.find(
      m => m.product_id === productId && m.operation_id === operationId
    )
  }

  const handleWorkCenterSelect = async (
    productId: string,
    operationId: string,
    workCenterId: string
  ) => {
    setSavingProduct(productId)
    try {
      await upsertMapping(productId, operationId, workCenterId)
      toast.success("Centro de trabajo asignado correctamente")
    } catch (error) {
      console.error("Error assigning work center:", error)
      toast.error("Error al asignar centro de trabajo")
    } finally {
      setSavingProduct(null)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableWorkCenters = selectedOperation ? getWorkCentersByOperation(selectedOperation) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Asignación de Centros de Trabajo por Operación</h3>
        <p className="text-sm text-gray-600">
          Selecciona una operación y asigna centros de trabajo a cada producto
        </p>
      </div>

      {/* Operations Filter */}
      {operationsLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Cargando operaciones...</span>
          </CardContent>
        </Card>
      ) : operations.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-sm text-amber-700">
              No hay operaciones disponibles. Crea operaciones en la pestaña "Operaciones" primero.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <label className="text-sm font-medium">Filtrar por Operación</label>
          <div className="flex flex-wrap gap-2">
            {operations.map(operation => (
              <button
                key={operation.id}
                onClick={() => setSelectedOperation(operation.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  selectedOperation === operation.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {operation.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Productos ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {mappingsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando asignaciones...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Producto</TableHead>
                  <TableHead className="w-[150px]">Código</TableHead>
                  <TableHead>Centro de Trabajo</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => {
                  const mapping = selectedOperation ? getProductMapping(product.id, selectedOperation) : null
                  const isSaving = savingProduct === product.id

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.weight && (
                            <div className="text-xs text-gray-500">{product.weight}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {product.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {selectedOperation ? (
                          availableWorkCenters.length === 1 ? (
                            <div className="text-sm">
                              <p className="font-medium">{availableWorkCenters[0].name}</p>
                              <p className="text-xs text-gray-500">Auto-seleccionado</p>
                            </div>
                          ) : availableWorkCenters.length > 1 ? (
                            <Select
                              value={mapping?.work_center_id || ""}
                              onValueChange={(value) =>
                                handleWorkCenterSelect(product.id, selectedOperation, value)
                              }
                              disabled={isSaving}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableWorkCenters.map(wc => (
                                  <SelectItem key={wc.id} value={wc.id}>
                                    {wc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-xs text-red-700">No hay centros disponibles</p>
                          )
                        ) : (
                          <p className="text-xs text-gray-500">Selecciona operación</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {isSaving ? (
                          <div className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs text-gray-500">...</span>
                          </div>
                        ) : mapping ? (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            ✓ Asignado
                          </Badge>
                        ) : selectedOperation ? (
                          <Badge variant="outline" className="text-xs">
                            Sin asignar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-400">
                            -
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
