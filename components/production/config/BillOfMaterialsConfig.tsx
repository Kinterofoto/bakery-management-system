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

export function BillOfMaterialsConfig() {
  const { getAllProducts } = useProducts()

  const [products, setProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (selectedProduct) {
    return (
      <ProductBOMFlow
        productId={selectedProduct.id}
        productName={selectedProduct.name}
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
        {filteredProducts.map((product) => (
          <Card
            key={product.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedProduct({ id: product.id, name: product.name })}
          >
            <CardHeader>
              <CardTitle className="text-base">{product.name}</CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="text-xs">
                  {product.code}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Click para configurar operaciones y materiales
              </p>
            </CardContent>
          </Card>
        ))}
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
