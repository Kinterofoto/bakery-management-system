"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RouteGuard } from "@/components/auth/RouteGuard"
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
  Settings,
  Loader2
} from "lucide-react"
import { useNucleo } from "@/hooks/use-nucleo"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { PhotoGalleryView } from "@/components/nucleo/PhotoGalleryView"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function NucleoPage() {
  const router = useRouter()
  const { products, loading, refetch } = useNucleo()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState<"grid" | "photos" | "prices" | "config">("grid")
  const [categoryFilter, setCategoryFilter] = useState<"PT" | "PP">("PT")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: 'PT',
    unit: '',
    price: 0,
    subcategory: ''
  })

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = product.category === categoryFilter
    return matchesSearch && matchesCategory
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

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.unit) {
      toast.error('Por favor completa los campos obligatorios')
      return
    }

    try {
      setCreating(true)

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: newProduct.name,
          description: newProduct.description || null,
          category: newProduct.category,
          unit: newProduct.unit,
          price: newProduct.price || 0,
          subcategory: newProduct.subcategory || null,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Producto creado exitosamente')
      setShowCreateModal(false)
      setNewProduct({
        name: '',
        description: '',
        category: 'PT',
        unit: '',
        price: 0,
        subcategory: ''
      })

      // Navigate to the new product detail page
      router.push(`/nucleo/${data.id}`)
    } catch (error: any) {
      console.error('Error creating product:', error)
      toast.error('Error al crear producto')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <RouteGuard>
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Núcleo de Productos</h1>
          <p className="text-gray-600">Centro de información completa de productos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button
              variant={categoryFilter === "PT" ? "default" : "outline"}
              onClick={() => setCategoryFilter("PT")}
              className={categoryFilter === "PT" ? "bg-gray-900 hover:bg-gray-800" : ""}
            >
              Productos Terminados
            </Button>
            <Button
              variant={categoryFilter === "PP" ? "default" : "outline"}
              onClick={() => setCategoryFilter("PP")}
              className={categoryFilter === "PP" ? "bg-gray-900 hover:bg-gray-800" : ""}
            >
              Productos en Proceso
            </Button>
          </div>
          <Button
            onClick={() => {
              setNewProduct({ ...newProduct, category: categoryFilter })
              setShowCreateModal(true)
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total {categoryFilter === 'PT' ? 'Productos Terminados' : 'Productos en Proceso'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Info Completa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredProducts.filter(p => (p.completeness_percentage || 0) >= 80).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredProducts.filter(p => {
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
                placeholder={`Buscar ${categoryFilter === 'PT' ? 'productos terminados' : 'productos en proceso'}...`}
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

      {/* Modal de Creación de Producto */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Producto</DialogTitle>
            <DialogDescription>
              Ingresa la información básica del producto. Podrás completar los detalles después.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Ej: Pan Integral"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Descripción breve del producto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={newProduct.category}
                  onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PT">Producto Terminado</SelectItem>
                    <SelectItem value="PP">Producto en Proceso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit">Unidad de Medida *</Label>
                <Input
                  id="unit"
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                  placeholder="Ej: unidad, kg, litro"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subcategory">Subcategoría</Label>
                <Input
                  id="subcategory"
                  value={newProduct.subcategory}
                  onChange={(e) => setNewProduct({ ...newProduct, subcategory: e.target.value })}
                  placeholder="Ej: Panadería, Repostería"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">Precio Base (COP)</Label>
                <Input
                  id="price"
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  step="100"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateProduct}
              disabled={creating || !newProduct.name || !newProduct.unit}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Producto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RouteGuard>
  )
}
