"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
  BarChart3,
  DollarSign,
  Image as ImageIcon,
  Settings,
  Warehouse,
  Award,
  Factory
} from "lucide-react"
import { useNucleoProduct } from "@/hooks/use-nucleo-product"
import { Progress } from "@/components/ui/progress"
import { GeneralTab } from "@/components/nucleo/GeneralTab"
import { TechnicalSpecsTab } from "@/components/nucleo/TechnicalSpecsTab"
import { QualityTab } from "@/components/nucleo/QualityTab"
import { ProductionTab } from "@/components/nucleo/ProductionTab"
import { CostsTab } from "@/components/nucleo/CostsTab"
import { CommercialTab } from "@/components/nucleo/CommercialTab"
import { InventoryTab } from "@/components/nucleo/InventoryTab"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  
  const { product, loading } = useNucleoProduct(productId)
  const [activeTab, setActiveTab] = useState("general")

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getSectionStatus = (hasData: boolean) => {
    return hasData ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-400" />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Handle new product creation
  const isNewProduct = productId === 'nuevo'

  if (!product && !isNewProduct) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-600">Producto no encontrado</p>
            <Button
              onClick={() => router.push("/nucleo")}
              className="mt-4"
              variant="outline"
            >
              Volver al Núcleo
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completeness = product?.completeness_percentage || 0

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/nucleo")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isNewProduct ? "Nuevo Producto" : product?.name}
            </h1>
            {!isNewProduct && product?.description && (
              <p className="text-gray-600">{product.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Completeness Card - Only show for existing products */}
      {!isNewProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Información completa</span>
                <span className={`text-lg font-bold ${getCompletenessColor(completeness)}`}>
                  {Math.round(completeness)}%
                </span>
              </div>
              <Progress value={completeness} className="h-3" />
            </div>

            {/* Section Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                {getSectionStatus(product?.basic_info_complete)}
                <span className="text-gray-600">Info Básica</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getSectionStatus(product?.has_technical_specs)}
                <span className="text-gray-600">Técnicas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getSectionStatus(product?.has_quality_specs)}
                <span className="text-gray-600">Calidad</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getSectionStatus(product?.has_production_process)}
                <span className="text-gray-600">Producción</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getSectionStatus(product?.has_bill_of_materials)}
                <span className="text-gray-600">BOM</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getSectionStatus(product?.has_costs)}
                <span className="text-gray-600">Costos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getSectionStatus(product?.has_price_lists)}
                <span className="text-gray-600">Precios</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getSectionStatus(product?.has_commercial_info)}
                <span className="text-gray-600">Comercial</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="technical" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Técnicas</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Calidad</span>
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            <span className="hidden sm:inline">Producción</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Costos</span>
          </TabsTrigger>
          <TabsTrigger value="commercial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Comercial</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            <span className="hidden sm:inline">Inventario</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab product={product} />
        </TabsContent>

        <TabsContent value="technical">
          <TechnicalSpecsTab productId={productId} />
        </TabsContent>

        <TabsContent value="quality">
          <QualityTab productId={productId} />
        </TabsContent>

        <TabsContent value="production">
          <ProductionTab productId={productId} />
        </TabsContent>

        <TabsContent value="costs">
          <CostsTab productId={productId} />
        </TabsContent>

        <TabsContent value="commercial">
          <CommercialTab productId={productId} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryTab productId={productId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
