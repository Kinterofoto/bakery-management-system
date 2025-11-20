"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
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
  const { operations } = useProductOperations()
  const { workCenters } = useWorkCenters()
  const { mappings, upsertMapping, loading: mappingsLoading } = useProductWorkCenterMapping()

  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOperation, setSelectedOperation] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)

  const CAROUSEL_VISIBLE = 5

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
    return workCenters.filter(wc => {
      // Aquí necesitas una relación entre work_centers y operations
      // Por ahora devolveremos todos los centros
      return wc.is_active
    })
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
    if (!operationId) {
      toast.error("Selecciona una operación primero")
      return
    }

    setSaving(true)
    try {
      await upsertMapping(productId, operationId, workCenterId)
      toast.success("Centro de trabajo asignado correctamente")
    } catch (error) {
      console.error("Error assigning work center:", error)
      toast.error("Error al asignar centro de trabajo")
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const visibleOperations = operations.slice(carouselIndex, carouselIndex + CAROUSEL_VISIBLE)
  const canScrollLeft = carouselIndex > 0
  const canScrollRight = carouselIndex + CAROUSEL_VISIBLE < operations.length

  const handleCarouselPrev = () => {
    if (canScrollLeft) {
      setCarouselIndex(Math.max(0, carouselIndex - 1))
    }
  }

  const handleCarouselNext = () => {
    if (canScrollRight) {
      setCarouselIndex(Math.min(operations.length - CAROUSEL_VISIBLE, carouselIndex + 1))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Asignación de Operaciones a Productos</h3>
        <p className="text-sm text-gray-600">
          Selecciona una operación y asigna los centros de trabajo a cada producto
        </p>
      </div>

      {/* Operations Carousel Filter */}
      {operations.length > 0 ? (
        <div className="space-y-3">
          <label className="text-sm font-medium">Filtrar por Operación</label>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCarouselPrev}
              disabled={!canScrollLeft}
              className="flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex gap-2 flex-1 overflow-hidden">
              {visibleOperations.map(operation => (
                <button
                  key={operation.id}
                  onClick={() => setSelectedOperation(operation.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedOperation === operation.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {operation.name}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCarouselNext}
              disabled={!canScrollRight}
              className="flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-sm text-amber-700">
              No hay operaciones disponibles. Crea operaciones primero.
            </p>
          </CardContent>
        </Card>
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

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => {
          const mapping = selectedOperation ? getProductMapping(product.id, selectedOperation) : null
          const availableWorkCenters = selectedOperation ? getWorkCentersByOperation(selectedOperation) : []

          return (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {product.name}
                      {product.weight ? ` - ${product.weight}` : ""}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {product.code}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedOperation ? (
                  <>
                    <div className="text-sm">
                      <label className="font-medium text-gray-700">
                        Centro de Trabajo
                      </label>
                      {availableWorkCenters.length === 1 ? (
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                          <p className="text-sm font-medium text-gray-900">
                            {availableWorkCenters[0].name}
                          </p>
                          <p className="text-xs text-gray-600">
                            Auto-seleccionado (único disponible)
                          </p>
                        </div>
                      ) : availableWorkCenters.length > 1 ? (
                        <Select
                          value={mapping?.work_center_id || ""}
                          onValueChange={(value) =>
                            handleWorkCenterSelect(product.id, selectedOperation, value)
                          }
                          disabled={saving}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecciona un centro..." />
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
                        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                          <p className="text-xs text-red-700">
                            No hay centros de trabajo disponibles para esta operación
                          </p>
                        </div>
                      )}
                    </div>

                    {mapping && (
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs font-medium text-green-700">
                          ✓ Centro asignado: {workCenters.find(w => w.id === mapping.work_center_id)?.name}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs text-gray-600">
                      Selecciona una operación arriba para ver los centros de trabajo disponibles
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 text-center">
              {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
            </p>
          </CardContent>
        </Card>
      )}

      {mappingsLoading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <p className="text-sm text-blue-700">Cargando asignaciones...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
