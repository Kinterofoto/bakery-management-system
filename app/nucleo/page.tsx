"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Package, 
  Search, 
  Filter, 
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Image as ImageIcon,
  Grid3x3,
  DollarSign,
  Settings
} from "lucide-react"
import { useNucleo } from "@/hooks/use-nucleo"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { PhotoGalleryView } from "@/components/nucleo/PhotoGalleryView"

export default function NucleoPage() {
  const router = useRouter()
  const { products, loading } = useNucleo()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState<"grid" | "photos" | "prices" | "config">("grid")

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getCompletenessLabel = (percentage: number) => {
    if (percentage >= 80) return "Completo"
    if (percentage >= 50) return "En progreso"
    return "Incompleto"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Núcleo de Productos</h1>
          <p className="text-gray-600">Centro de información completa de productos</p>
        </div>
        <Button 
          onClick={() => router.push("/nucleo/nuevo")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Productos Terminados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{products.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Info Completa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {products.filter(p => (p.completeness_percentage || 0) >= 80).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {products.filter(p => {
                const pct = p.completeness_percentage || 0
                return pct >= 30 && pct < 80
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar productos terminados..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Selector Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            <span className="hidden sm:inline">Vista General</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Fotos</span>
          </TabsTrigger>
          <TabsTrigger value="prices" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Precios</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuración</span>
          </TabsTrigger>
        </TabsList>

        {/* Vista General - Products Grid */}
        <TabsContent value="grid" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
          const completeness = product.completeness_percentage || 0
          
          return (
            <Card 
              key={product.product_id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/nucleo/${product.product_id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className={`flex items-center gap-1 ${getCompletenessColor(completeness)}`}>
                    {completeness >= 80 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-xs font-medium">
                      {Math.round(completeness)}%
                    </span>
                  </div>
                </div>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                {product.description && (
                  <CardDescription className="line-clamp-2">
                    {product.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Completeness Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Información</span>
                    <span className={`font-semibold ${getCompletenessColor(completeness)}`}>
                      {Math.round(completeness)}%
                    </span>
                  </div>
                  <Progress value={completeness} className="h-2" />
                  <p className={`text-xs ${getCompletenessColor(completeness)}`}>
                    {getCompletenessLabel(completeness)}
                  </p>
                </div>

                {/* Quick Info */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  {product.has_technical_specs && (
                    <Badge variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Especif. Téc.
                    </Badge>
                  )}
                  {product.has_quality_specs && (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Calidad
                    </Badge>
                  )}
                  {product.has_bill_of_materials && (
                    <Badge variant="outline" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      BOM
                    </Badge>
                  )}
                  {product.has_costs && (
                    <Badge variant="outline" className="text-xs">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Costos
                    </Badge>
                  )}
                </div>

                {/* Price */}
                {product.price && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">Precio base</p>
                    <p className="text-lg font-semibold">
                      ${product.price.toLocaleString('es-CO')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron productos</p>
            </CardContent>
          </Card>
        )}
          </div>
        </TabsContent>

        {/* Vista de Fotos */}
        <TabsContent value="photos" className="mt-6">
          <PhotoGalleryView products={filteredProducts} />
        </TabsContent>

        {/* Vista de Precios - Placeholder */}
        <TabsContent value="prices" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Vista de configuración masiva de precios</p>
              <p className="text-sm text-gray-500 mt-2">Próximamente</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vista de Configuración - Placeholder */}
        <TabsContent value="config" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Vista de configuración masiva</p>
              <p className="text-sm text-gray-500 mt-2">Próximamente</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
