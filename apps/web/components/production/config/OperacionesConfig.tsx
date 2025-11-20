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
    return workCenters.filter(wc => wc.is_active && wc.operation_id === operationId)
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
      // No mostrar toast, solo dejar que se vea en la tabla
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
      {/* Operations Filter Carousel */}
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
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-2 min-w-min">
            {operations.map(operation => (
              <button
                key={operation.id}
                onClick={() => setSelectedOperation(operation.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 ${
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
                            <button
                              onClick={() =>
                                handleWorkCenterSelect(product.id, selectedOperation, availableWorkCenters[0].id)
                              }
                              disabled={isSaving}
                              className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                              {availableWorkCenters[0].name}
                            </button>
                          ) : availableWorkCenters.length > 1 ? (
                            <div className="flex gap-2 flex-wrap">
                              {availableWorkCenters.map(wc => (
                                <button
                                  key={wc.id}
                                  onClick={() =>
                                    handleWorkCenterSelect(product.id, selectedOperation, wc.id)
                                  }
                                  disabled={isSaving}
                                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                    mapping?.work_center_id === wc.id
                                      ? "bg-blue-600 text-white shadow-md"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  } disabled:opacity-50`}
                                >
                                  {wc.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-red-700">No hay centros</p>
                          )
                        ) : (
                          <p className="text-xs text-gray-400">-</p>
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
