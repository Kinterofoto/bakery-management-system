"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useProducts } from "@/hooks/use-products"
import { ProductBOMFlow } from "./ProductBOMFlow"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export function BillOfMaterialsConfig() {
  const { getAllProducts } = useProducts()

  const [products, setProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<{ id: string, name: string, weight: string | null } | null>(null)
  const [productConfigs, setProductConfigs] = useState<Record<string, { hasBOM: boolean, hasRoute: boolean, hasProductivity: boolean }>>({})

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
      const allProducts = await getAllProducts()
      const finishedProducts = allProducts.filter(p => p.category === 'PT')
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
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (selectedProduct) {
    return (
      <ProductBOMFlow
        productId={selectedProduct.id}
        productName={selectedProduct.name}
        productWeight={selectedProduct.weight}
        onClose={() => setSelectedProduct(null)}
      />
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
      <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-xs font-medium text-gray-600">Estado:</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-xs text-gray-700">BOM</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-700">Ruta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
          <span className="text-xs text-gray-700">Productividad</span>
        </div>
      </div>

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

      {/* Products List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const config = productConfigs[product.id] || { hasBOM: false, hasRoute: false, hasProductivity: false }

          return (
            <Card
              key={product.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedProduct({ id: product.id, name: product.name, weight: product.weight })}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {product.name}{product.weight ? ` - ${product.weight}` : ''}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="text-xs">
                        {product.code}
                      </Badge>
                    </CardDescription>
                  </div>
                  {/* Status dots */}
                  <div className="flex gap-1.5 ml-2">
                    <div
                      className={`w-2 h-2 rounded-full ${config.hasBOM ? 'bg-blue-500' : 'bg-gray-300'}`}
                      title={config.hasBOM ? 'BOM configurado' : 'BOM no configurado'}
                    ></div>
                    <div
                      className={`w-2 h-2 rounded-full ${config.hasRoute ? 'bg-green-500' : 'bg-gray-300'}`}
                      title={config.hasRoute ? 'Ruta configurada' : 'Ruta no configurada'}
                    ></div>
                    <div
                      className={`w-2 h-2 rounded-full ${config.hasProductivity ? 'bg-purple-500' : 'bg-gray-300'}`}
                      title={config.hasProductivity ? 'Productividad configurada' : 'Productividad no configurada'}
                    ></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Click para configurar operaciones y materiales
                </p>
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
    </div>
  )
}
