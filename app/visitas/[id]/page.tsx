"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, User, Phone, Star, Package, Camera, MessageSquare, Thermometer, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStoreVisits } from "@/hooks/use-store-visits"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"
import Link from "next/link"
import { pdf } from "@react-pdf/renderer"
import { VisitPDFDocument } from "@/lib/pdf-visit-detail"

interface VisitDetailPageProps {
  params: {
    id: string
  }
}

export default function VisitDetailPage({ params }: VisitDetailPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { getVisitDetails, getProductsSoldToClientBranch } = useStoreVisits()

  const [loading, setLoading] = useState(true)
  const [visit, setVisit] = useState<any>(null)
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [totalClientProducts, setTotalClientProducts] = useState(0)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    loadVisitDetails()
  }, [params.id, user])

  const loadVisitDetails = async () => {
    try {
      setLoading(true)
      const data = await getVisitDetails(params.id)
      setVisit(data.visit)
      setEvaluations(data.evaluations)
      setPhotos(data.photos)

      // Get total products sold to this client/branch
      const clientProducts = await getProductsSoldToClientBranch(
        data.visit.client_id,
        data.visit.branch_id
      )
      setTotalClientProducts(clientProducts.length)
    } catch (error) {
      console.error("Error loading visit details:", error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-800"
    if (score >= 4) return "bg-green-100 text-green-800"
    if (score >= 3) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getScoreLabel = (score?: number) => {
    if (!score) return "N/A"
    return score.toFixed(1)
  }

  const generalPhotos = photos.filter(p => p.photo_type === 'general')
  const productPhotos = photos.filter(p => p.photo_type === 'product')

  // Calculate product statistics based on total client products
  const productsWithStock = evaluations.filter(e => e.has_stock).length
  const productsDisplayed = evaluations.filter(e => e.has_stock && e.is_displayed).length
  const stockPercentage = totalClientProducts > 0 ? (productsWithStock / totalClientProducts) * 100 : 0
  const displayPercentage = totalClientProducts > 0 ? (productsDisplayed / totalClientProducts) * 100 : 0

  const handleGeneratePDF = async () => {
    try {
      const doc = <VisitPDFDocument
        visit={visit}
        evaluations={evaluations}
        photos={photos}
        totalClientProducts={totalClientProducts}
      />

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const branchName = visit.branch?.name || visit.branch_name_custom || 'sin-sucursal'
      link.download = `visita-${branchName.toLowerCase().replace(/\s+/g, '-')}-${new Date(visit.visit_date).toISOString().split('T')[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error al generar el PDF")
    }
  }

  if (loading || !visit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  const branchName = visit.branch?.name || visit.branch_name_custom || "Sin especificar"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/visitas")}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Detalle de Visita</h1>
              <p className="text-sm text-gray-600">{visit.client?.name}</p>
            </div>
            <Button
              onClick={handleGeneratePDF}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <FileText className="h-5 w-5 mr-2" />
              Generar PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Visit Info Card */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Información General</CardTitle>
              {visit.average_score && (
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold text-gray-900">
                    {visit.average_score.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-600">/5.0</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-semibold text-gray-900">{visit.client?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <MapPin className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-600">Sucursal</p>
                  <p className="font-semibold text-gray-900">{branchName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-600">Fecha de Visita</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(visit.visit_date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {visit.operator_name && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm text-gray-600">Operador de Tienda</p>
                    <p className="font-semibold text-gray-900">{visit.operator_name}</p>
                    {visit.operator_phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        {visit.operator_phone}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {visit.general_comments && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      Comentarios Generales
                    </p>
                    <p className="text-gray-700">{visit.general_comments}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Statistics */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="text-xl">Estadísticas de Productos</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {totalClientProducts}
                </div>
                <div className="text-sm text-gray-600">Productos del Cliente</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="text-3xl font-bold text-green-700">
                    {stockPercentage.toFixed(0)}%
                  </div>
                </div>
                <div className="text-sm text-green-900 font-medium mb-1">
                  Con Existencias
                </div>
                <div className="text-xs text-gray-600">
                  {productsWithStock} de {totalClientProducts} productos
                </div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="text-3xl font-bold text-blue-700">
                    {displayPercentage.toFixed(0)}%
                  </div>
                </div>
                <div className="text-sm text-blue-900 font-medium mb-1">
                  Exhibidos
                </div>
                <div className="text-xs text-gray-600">
                  {productsDisplayed} de {totalClientProducts} productos
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Evaluations */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6 text-teal-600" />
              Evaluación de Productos ({evaluations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {evaluations.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay productos evaluados</p>
              </div>
            ) : (
              <div className="space-y-6">
                {evaluations.map((evaluation) => (
                  <Card key={evaluation.id} className="border-2 border-gray-100 hover:border-teal-200 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {evaluation.product?.name}
                          </h3>
                          {evaluation.product?.weight && (
                            <p className="text-sm text-gray-600">{evaluation.product.weight}g</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge
                            className={evaluation.has_stock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                          >
                            {evaluation.has_stock ? "Con Existencias" : "Sin Existencias"}
                          </Badge>
                          {evaluation.has_stock && evaluation.is_displayed !== undefined && (
                            <Badge
                              className={evaluation.is_displayed ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}
                            >
                              {evaluation.is_displayed ? "Exhibido" : "No Exhibido"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {evaluation.has_stock && (
                        <>
                          {/* Scores Grid - Solo mostrar si está exhibido */}
                          {evaluation.is_displayed && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-2">Horneado</p>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <Badge className={getScoreColor(evaluation.score_baking)}>
                                  {getScoreLabel(evaluation.score_baking)}
                                </Badge>
                              </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-2">Exhibición</p>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <Badge className={getScoreColor(evaluation.score_display)}>
                                  {getScoreLabel(evaluation.score_display)}
                                </Badge>
                              </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-2">Presentación</p>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <Badge className={getScoreColor(evaluation.score_presentation)}>
                                  {getScoreLabel(evaluation.score_presentation)}
                                </Badge>
                              </div>
                            </div>

                            {evaluation.score_taste && (
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-2">Sabor</p>
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <Badge className={getScoreColor(evaluation.score_taste)}>
                                    {getScoreLabel(evaluation.score_taste)}
                                  </Badge>
                                </div>
                              </div>
                            )}

                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-2">Capacitación</p>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <Badge className={getScoreColor(evaluation.score_staff_training)}>
                                  {getScoreLabel(evaluation.score_staff_training)}
                                </Badge>
                              </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-2">Parámetros Horneo</p>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <Badge className={getScoreColor(evaluation.score_baking_params)}>
                                  {getScoreLabel(evaluation.score_baking_params)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          )}

                          {/* Temperature */}
                          {evaluation.storage_temperature && (
                            <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
                              <Thermometer className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-sm text-blue-900 font-medium">
                                  Temperatura de Almacenamiento
                                </p>
                                <p className="text-lg font-bold text-blue-700">
                                  {evaluation.storage_temperature}°C
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Comments */}
                          {evaluation.comments && (
                            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                              <p className="text-sm font-semibold text-yellow-900 mb-1">
                                Comentarios
                              </p>
                              <p className="text-gray-700">{evaluation.comments}</p>
                            </div>
                          )}

                          {/* Product Photos */}
                          {productPhotos.filter(p => p.product_evaluation_id === evaluation.id).length > 0 && (
                            <div className="mt-6">
                              <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Camera className="h-4 w-4" />
                                Fotos del Producto
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {productPhotos
                                  .filter(p => p.product_evaluation_id === evaluation.id)
                                  .map((photo) => (
                                    <div
                                      key={photo.id}
                                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-teal-400 cursor-pointer transition-all"
                                      onClick={() => setSelectedPhoto(photo.photo_url)}
                                    >
                                      <Image
                                        src={photo.photo_url}
                                        alt="Foto del producto"
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* General Photos */}
        {generalPhotos.length > 0 && (
          <Card className="border-2 border-gray-200">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-6 w-6 text-teal-600" />
                Fotos Generales ({generalPhotos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {generalPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-teal-400 cursor-pointer transition-all hover:scale-105"
                    onClick={() => setSelectedPhoto(photo.photo_url)}
                  >
                    <Image
                      src={photo.photo_url}
                      alt="Foto general de la visita"
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full">
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-white"
              onClick={() => setSelectedPhoto(null)}
            >
              Cerrar
            </Button>
            <div className="relative w-full h-full">
              <Image
                src={selectedPhoto}
                alt="Foto ampliada"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
