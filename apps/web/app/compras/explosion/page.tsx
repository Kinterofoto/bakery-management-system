"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RouteGuard } from "@/components/auth/RouteGuard"
import {
  Calculator,
  Package,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Save
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useProducts } from "@/hooks/use-products"
import { useMaterialExplosion } from "@/hooks/use-material-explosion"
import { useToast } from "@/components/ui/use-toast"

type ExplosionResultItem = {
  material_id: string
  material_name: string
  material_unit: string
  quantity_per_unit: number
  total_quantity_needed: number
  suggested_supplier_id?: string | null
  suggested_supplier_name?: string
  unit_price?: number
  packaging_unit?: number
  adjusted_quantity?: number
  estimated_cost?: number
}

type ExplosionResult = {
  product_id: string
  product_name: string
  quantity_requested: number
  items: ExplosionResultItem[]
  total_estimated_cost: number
}

export default function MaterialExplosionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { getFinishedProducts } = useProducts()
  const { calculateMaterialExplosion, saveExplosionHistory, loading, error } = useMaterialExplosion()

  const [finishedProducts, setFinishedProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [explosionResult, setExplosionResult] = useState<ExplosionResult | null>(null)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    loadFinishedProducts()
  }, [])

  const loadFinishedProducts = async () => {
    setLoadingProducts(true)
    const products = await getFinishedProducts()
    setFinishedProducts(products)
    setLoadingProducts(false)
  }

  const handleCalculate = async () => {
    if (!selectedProductId || !quantity || parseFloat(quantity) <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Por favor selecciona un producto y una cantidad válida",
        variant: "destructive"
      })
      return
    }

    setCalculating(true)
    const result = await calculateMaterialExplosion(selectedProductId, parseFloat(quantity))

    if (result) {
      setExplosionResult(result)
      toast({
        title: "Cálculo completado",
        description: `Se calcularon ${result.items.length} materiales necesarios`,
      })
    } else {
      toast({
        title: "Error en el cálculo",
        description: error || "No se pudo calcular la explosión de materiales",
        variant: "destructive"
      })
    }

    setCalculating(false)
  }

  const handleSaveCalculation = async () => {
    if (!explosionResult) return

    const savedId = await saveExplosionHistory(
      explosionResult.product_id,
      explosionResult.quantity_requested,
      explosionResult.items
    )

    if (savedId) {
      toast({
        title: "Cálculo guardado",
        description: "El cálculo ha sido guardado en el historial",
      })
    } else {
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el cálculo",
        variant: "destructive"
      })
    }
  }

  const handleCreatePurchaseOrders = () => {
    if (!explosionResult) return

    // Group materials by supplier
    const materialsBySupplier = new Map<string, ExplosionResultItem[]>()

    explosionResult.items.forEach(item => {
      if (item.suggested_supplier_id && item.suggested_supplier_name) {
        const supplierId = item.suggested_supplier_id
        if (!materialsBySupplier.has(supplierId)) {
          materialsBySupplier.set(supplierId, [])
        }
        materialsBySupplier.get(supplierId)?.push(item)
      }
    })

    if (materialsBySupplier.size === 0) {
      toast({
        title: "Sin proveedores",
        description: "No hay proveedores asignados para los materiales",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Próximamente",
      description: `Se crearían ${materialsBySupplier.size} órdenes de compra`,
    })

    // TODO: Navigate to purchase orders page with pre-filled data
    // router.push('/compras/ordenes?from_explosion=true')
  }

  const handleReset = () => {
    setExplosionResult(null)
    setSelectedProductId("")
    setQuantity("")
  }

  if (loadingProducts) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/compras')}
                className="
                  bg-white/20 dark:bg-black/20
                  backdrop-blur-md
                  border border-white/30 dark:border-white/20
                  rounded-xl
                  hover:bg-white/30 dark:hover:bg-black/30
                "
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                  Explosión de Materiales
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                  Calcula las necesidades de materia prima basado en el BOM
                </p>
              </div>
            </div>
          </div>

          {/* Input Section */}
          {!explosionResult && (
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
            ">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-500/15 backdrop-blur-md border border-purple-500/20 rounded-xl p-3">
                  <Calculator className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Calcular Materiales
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Selecciona un producto terminado y la cantidad a producir
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="product" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Producto Terminado *
                  </Label>
                  <Select
                    value={selectedProductId}
                    onValueChange={setSelectedProductId}
                  >
                    <SelectTrigger className="
                      bg-white/50 dark:bg-black/30
                      backdrop-blur-md
                      border-gray-200/50 dark:border-white/10
                      rounded-xl
                    ">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cantidad a Producir *
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="
                      bg-white/50 dark:bg-black/30
                      backdrop-blur-md
                      border-gray-200/50 dark:border-white/10
                      rounded-xl
                      focus:ring-2 focus:ring-purple-500/50
                      focus:border-purple-500/50
                    "
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleCalculate}
                  disabled={calculating || !selectedProductId || !quantity}
                  className="
                    bg-purple-500
                    text-white
                    font-semibold
                    px-8
                    rounded-xl
                    shadow-md shadow-purple-500/30
                    hover:bg-purple-600
                    hover:shadow-lg hover:shadow-purple-500/40
                    active:scale-95
                    transition-all duration-150
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {calculating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-5 h-5 mr-2" />
                      Calcular Materiales
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Results Section */}
          {explosionResult && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="
                bg-white/70 dark:bg-black/50
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                rounded-2xl
                shadow-lg shadow-black/5
                p-6
              ">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/15 backdrop-blur-md border border-green-500/20 rounded-xl p-3">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Resultado del Cálculo
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {explosionResult.product_name} - {explosionResult.quantity_requested} unidades
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="
                      bg-white/20 dark:bg-black/20
                      backdrop-blur-md
                      border border-white/30 dark:border-white/20
                      rounded-xl
                      hover:bg-white/30 dark:hover:bg-black/30
                    "
                  >
                    Nuevo Cálculo
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border border-white/30 dark:border-white/15
                    rounded-xl
                    p-4
                  ">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Materiales Necesarios
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                      {explosionResult.items.length}
                    </p>
                  </div>

                  <div className="
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border border-white/30 dark:border-white/15
                    rounded-xl
                    p-4
                  ">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Costo Total Estimado
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                      ${explosionResult.total_estimated_cost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </p>
                  </div>

                  <div className="
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border border-white/30 dark:border-white/15
                    rounded-xl
                    p-4
                  ">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Proveedores Identificados
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                      {new Set(explosionResult.items.map(item => item.suggested_supplier_id).filter(Boolean)).size}
                    </p>
                  </div>
                </div>
              </div>

              {/* Materials Table */}
              <div className="
                bg-white/70 dark:bg-black/50
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                rounded-2xl
                shadow-lg shadow-black/5
                overflow-hidden
              ">
                <div className="p-6 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/15 backdrop-blur-md border border-blue-500/20 rounded-xl p-3">
                      <Package className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Detalle de Materiales
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Cantidades necesarias y proveedores sugeridos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 dark:bg-white/5">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Material
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cantidad/Unidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cantidad Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Proveedor Sugerido
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Embalaje
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cant. Ajustada
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Costo Est.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50 dark:divide-white/10">
                      {explosionResult.items.map((item, index) => (
                        <tr key={index} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.material_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {item.quantity_per_unit.toLocaleString('es-CO')} {item.material_unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {item.total_quantity_needed.toLocaleString('es-CO')} {item.material_unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.suggested_supplier_name ? (
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {item.suggested_supplier_name}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                                <AlertCircle className="w-4 h-4" />
                                Sin asignar
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {item.unit_price ? `$${item.unit_price.toLocaleString('es-CO')}` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {item.packaging_unit || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.adjusted_quantity ? item.adjusted_quantity.toLocaleString('es-CO') : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {item.estimated_cost ? `$${item.estimated_cost.toLocaleString('es-CO')}` : '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="
                bg-white/70 dark:bg-black/50
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                rounded-2xl
                shadow-lg shadow-black/5
                p-6
              ">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    onClick={handleSaveCalculation}
                    disabled={loading}
                    className="
                      bg-white/20 dark:bg-black/20
                      backdrop-blur-md
                      border border-white/30 dark:border-white/20
                      rounded-xl
                      hover:bg-white/30 dark:hover:bg-black/30
                      text-gray-900 dark:text-white
                    "
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Cálculo
                  </Button>
                  <Button
                    onClick={handleCreatePurchaseOrders}
                    disabled={loading}
                    className="
                      bg-green-500
                      text-white
                      font-semibold
                      px-6
                      rounded-xl
                      shadow-md shadow-green-500/30
                      hover:bg-green-600
                      hover:shadow-lg hover:shadow-green-500/40
                      active:scale-95
                      transition-all duration-150
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Crear Órdenes de Compra
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </RouteGuard>
  )
}
