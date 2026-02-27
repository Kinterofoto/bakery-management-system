"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, Wand2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useProducts } from "@/hooks/use-products"
import { useProductOperations } from "@/hooks/use-product-operations"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductWorkCenterMapping } from "@/hooks/use-product-work-center-mapping"
import { useProductionRoutes } from "@/hooks/use-production-routes"
import { supabase } from "@/lib/supabase"
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
  const { mappings, toggleMapping, getMappingsByProductAndOperation, loading: mappingsLoading, refetch: refetchMappings } = useProductWorkCenterMapping()
  const { routes, loading: routesLoading } = useProductionRoutes()

  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOperation, setSelectedOperation] = useState<string>("")
  const [savingProduct, setSavingProduct] = useState<string | null>(null)
  const [autoAssigning, setAutoAssigning] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const allProducts = await getAllProducts()
      const finishedProducts = allProducts.filter((p: any) => p.category === "PT" || p.category === "PP")
      setProducts(finishedProducts)
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Error al cargar productos")
    }
  }

  const getWorkCentersByOperation = (operationId: string) => {
    return workCenters.filter(wc => wc.is_active && wc.operation_id === operationId)
  }

  const getProductMappings = (productId: string, operationId: string) => {
    return mappings.filter(
      m => m.product_id === productId && m.operation_id === operationId
    )
  }

  const isWorkCenterAssigned = (productId: string, operationId: string, workCenterId: string) => {
    return mappings.some(
      m => m.product_id === productId &&
           m.operation_id === operationId &&
           m.work_center_id === workCenterId
    )
  }

  const handleWorkCenterToggle = async (
    productId: string,
    operationId: string,
    workCenterId: string
  ) => {
    setSavingProduct(productId)
    try {
      await toggleMapping(productId, operationId, workCenterId)
      // No mostrar toast, solo dejar que se vea en la tabla
    } catch (error) {
      console.error("Error toggling work center:", error)
      toast.error("Error al cambiar asignación de centro de trabajo")
    } finally {
      setSavingProduct(null)
    }
  }

  // Products whose route includes the selected operation
  const productsWithOperation = selectedOperation
    ? products.filter(product =>
        routes.some(r => r.product_id === product.id && (r.work_center as any)?.operation_id === selectedOperation)
      )
    : products

  const filteredProducts = productsWithOperation.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableWorkCenters = selectedOperation ? getWorkCentersByOperation(selectedOperation) : []

  const handleAutoAssign = async () => {
    setAutoAssigning(true)
    try {
      // Build map: product_id -> Set<operation_id> from production routes
      const productOperations = new Map<string, Set<string>>()
      for (const route of routes) {
        const opId = (route.work_center as any)?.operation_id
        if (!route.product_id || !opId) continue
        if (!productOperations.has(route.product_id)) {
          productOperations.set(route.product_id, new Set())
        }
        productOperations.get(route.product_id)!.add(opId)
      }

      // Build new mappings to create
      const newMappings: Array<{ product_id: string; operation_id: string; work_center_id: string }> = []
      for (const [productId, operationIds] of productOperations) {
        for (const operationId of operationIds) {
          const opWorkCenters = workCenters.filter(wc => wc.is_active && wc.operation_id === operationId)
          for (const wc of opWorkCenters) {
            const exists = mappings.some(
              m => m.product_id === productId && m.operation_id === operationId && m.work_center_id === wc.id
            )
            if (!exists) {
              newMappings.push({ product_id: productId, operation_id: operationId, work_center_id: wc.id })
            }
          }
        }
      }

      if (newMappings.length === 0) {
        toast.info("Todos los productos ya tienen sus centros asignados")
        return
      }

      // Bulk insert in batches of 500
      for (let i = 0; i < newMappings.length; i += 500) {
        const batch = newMappings.slice(i, i + 500)
        const { error } = await supabase
          .schema("produccion")
          .from("product_work_center_mapping")
          .insert(batch)
        if (error) throw error
      }

      await refetchMappings()
      toast.success(`${newMappings.length} asignaciones creadas automáticamente`)
    } catch (error) {
      console.error("Error auto-assigning:", error)
      toast.error("Error al auto-asignar centros de trabajo")
    } finally {
      setAutoAssigning(false)
    }
  }

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

      {/* Auto-assign + Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleAutoAssign}
          disabled={autoAssigning || routesLoading || mappingsLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
        >
          {autoAssigning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          {autoAssigning ? "Asignando..." : "Auto-asignar centros"}
        </Button>
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
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Centro de Trabajo</TableHead>
                  <TableHead className="w-[140px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => {
                  const productMappings = selectedOperation ? getProductMappings(product.id, selectedOperation) : []
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
                          availableWorkCenters.length > 0 ? (
                            <div className="flex gap-2 flex-wrap">
                              {availableWorkCenters.map(wc => {
                                const isAssigned = isWorkCenterAssigned(product.id, selectedOperation, wc.id)
                                return (
                                  <button
                                    key={wc.id}
                                    onClick={() =>
                                      handleWorkCenterToggle(product.id, selectedOperation, wc.id)
                                    }
                                    disabled={isSaving}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                      isAssigned
                                        ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    } disabled:opacity-50`}
                                  >
                                    {wc.name}
                                  </button>
                                )
                              })}
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
                        ) : productMappings.length > 0 ? (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            ✓ {productMappings.length} Centro{productMappings.length > 1 ? 's' : ''}
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
