"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft } from "lucide-react"
import { useProducts } from "@/hooks/use-products"
import { ProductBOMFlow } from "./ProductBOMFlow"
import { PTProportionsMatrix } from "./PTProportionsMatrix"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export function BillOfMaterialsConfig() {
  const { getAllProducts } = useProducts()

  const [products, setProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "PP" | "PT">("all")
  const [selectedProduct, setSelectedProduct] = useState<{ id: string, name: string, weight: string | null, lote_minimo: number | null } | null>(null)
  const [productConfigs, setProductConfigs] = useState<Record<string, { hasBOM: boolean, hasRoute: boolean, hasProductivity: boolean }>>({})
  const [showMatrix, setShowMatrix] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (products.length > 0) {
      loadProductConfigurations()
    }
  }, [products])

  const loadProducts = async () => {
    try {
      const allProducts = await getAllProducts() as any[]
      const finishedProducts = allProducts.filter(p => p.category === 'PT' || p.category === 'PP')
      setProducts(finishedProducts)
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Error al cargar productos")
    }
  }

  const loadProductConfigurations = async () => {
    try {
      const productIds = products.map(p => p.id)

      // Fetch all data in parallel
      const [bomData, routeData, productivityData] = await Promise.all([
        supabase
          .schema("produccion")
          .from("bill_of_materials")
          .select("product_id")
          .in("product_id", productIds),
        supabase
          .schema("produccion")
          .from("production_routes")
          .select("product_id")
          .in("product_id", productIds),
        supabase
          .schema("produccion")
          .from("production_productivity")
          .select("product_id")
          .in("product_id", productIds)
      ])

      // Create sets for fast lookup
      const bomSet = new Set(bomData.data?.map(b => b.product_id) || [])
      const routeSet = new Set(routeData.data?.map(r => r.product_id) || [])
      const productivitySet = new Set(productivityData.data?.map(p => p.product_id) || [])

      // Build configs object
      const configs: Record<string, { hasBOM: boolean, hasRoute: boolean, hasProductivity: boolean }> = {}

      products.forEach(product => {
        configs[product.id] = {
          hasBOM: bomSet.has(product.id),
          hasRoute: routeSet.has(product.id),
          hasProductivity: productivitySet.has(product.id)
        }
      })

      setProductConfigs(configs)
    } catch (error) {
      console.error("Error loading product configurations:", error)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === "all" || product.category === categoryFilter)
  )

  if (selectedProduct) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        <div className="h-full p-4">
          <ProductBOMFlow
            productId={selectedProduct.id}
            productName={selectedProduct.name}
            productWeight={selectedProduct.weight}
            productLoteMinimo={selectedProduct.lote_minimo}
            onClose={() => setSelectedProduct(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Configuración de BOM por Producto</h3>
        <p className="text-sm text-gray-600">
          Selecciona un producto para configurar su secuencia de operaciones y materiales
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-600 w-full sm:w-auto">Estado:</span>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></div>
          <span className="text-xs text-gray-700">BOM</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div>
          <span className="text-xs text-gray-700">Ruta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm"></div>
          <span className="text-xs text-gray-700">Productividad</span>
        </div>
      </div>

      {/* Search */}
      {!showMatrix && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 sm:h-10"
          />
        </div>
      )}

      {/* Category Filter + Matrix toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Filtrar:</span>
        {(["all", "PT", "PP"] as const).map((cat) => (
          <Button
            key={cat}
            variant={categoryFilter === cat && !showMatrix ? "default" : "outline"}
            size="sm"
            onClick={() => { setCategoryFilter(cat); setShowMatrix(false) }}
            className="h-7 px-3 text-xs"
          >
            {cat === "all" ? "Todos" : cat}
          </Button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <Button
          variant={showMatrix ? "default" : "outline"}
          size="sm"
          onClick={() => setShowMatrix(!showMatrix)}
          className="h-7 px-3 text-xs"
        >
          Proporciones PT
        </Button>
      </div>

      {showMatrix ? (
        <div className="fixed inset-0 z-50 bg-white overflow-auto sm:static sm:inset-auto sm:z-auto sm:overflow-visible">
          <div className="sticky top-0 z-10 flex items-center gap-3 p-3 bg-white border-b sm:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMatrix(false)}
              className="h-8 w-8 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h3 className="font-semibold text-sm">Proporciones PT</h3>
          </div>
          <div className="p-3 sm:p-0">
            <PTProportionsMatrix />
          </div>
        </div>
      ) : (
        <>
          {/* Products List */}
          <div className="border rounded-lg divide-y">
            {filteredProducts.map((product) => {
              const config = productConfigs[product.id] || { hasBOM: false, hasRoute: false, hasProductivity: false }

              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
                  onClick={() => setSelectedProduct({ id: product.id, name: product.name, weight: product.weight, lote_minimo: product.lote_minimo || null })}
                >
                  <div className="flex gap-1 shrink-0">
                    <div
                      className={`w-2 h-2 rounded-full ${config.hasBOM ? 'bg-blue-500' : 'bg-gray-200'}`}
                      title={config.hasBOM ? 'BOM configurado' : 'BOM no configurado'}
                    />
                    <div
                      className={`w-2 h-2 rounded-full ${config.hasRoute ? 'bg-green-500' : 'bg-gray-200'}`}
                      title={config.hasRoute ? 'Ruta configurada' : 'Ruta no configurada'}
                    />
                    <div
                      className={`w-2 h-2 rounded-full ${config.hasProductivity ? 'bg-purple-500' : 'bg-gray-200'}`}
                      title={config.hasProductivity ? 'Productividad configurada' : 'Productividad no configurada'}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate flex-1">
                    {product.name}{product.weight ? ` - ${product.weight}` : ''}
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 h-5 leading-none shrink-0">
                    {product.code}
                  </Badge>
                </div>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
            </div>
          )}
        </>
      )}
    </div>
  )
}
