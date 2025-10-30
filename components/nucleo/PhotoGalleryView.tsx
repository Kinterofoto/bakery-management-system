"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Image as ImageIcon, Camera, AlertCircle, ExternalLink, Upload, Loader2 } from "lucide-react"
import { NucleoProduct } from "@/hooks/use-nucleo"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { compressImage, formatFileSize } from "@/lib/image-compression"
import { OptimizedImage } from "@/components/ecommerce/OptimizedImage"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PhotoGalleryViewProps {
  products: NucleoProduct[]
}

interface ProductWithPhoto extends NucleoProduct {
  primary_photo_url?: string | null
  photo_count?: number
}

// Helper para obtener product_id de NucleoProduct
function getProductId(product: NucleoProduct): string {
  return (product as any).product_id || product.id
}

export function PhotoGalleryView({ products }: PhotoGalleryViewProps) {
  const router = useRouter()
  const [productsWithPhotos, setProductsWithPhotos] = useState<ProductWithPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [filterView, setFilterView] = useState<"all" | "with_photo" | "without_photo">("all")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithPhoto | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProductPhotos()
  }, [products])

  const fetchProductPhotos = async () => {
    try {
      setLoading(true)

      const productIds = products.map(p => getProductId(p))

      // Si hay demasiados productos, usar estrategia diferente
      if (productIds.length > 50) {
        // Estrategia: Obtener TODAS las fotos de tipo image sin filtrar por product_id
        // y luego filtrar en el cliente (más eficiente que URL gigante)
        const { data: allPhotos, error } = await supabase
          .from('product_media')
          .select('product_id, file_url, is_primary')
          .eq('media_type', 'image')

        if (error) throw error

        // Filtrar solo las fotos de los productos actuales
        const photos = allPhotos?.filter(photo =>
          productIds.includes(photo.product_id)
        ) || []

        // Crear mapa
        const photoMap = new Map<string, { url: string | null, count: number }>()

        products.forEach(p => {
          photoMap.set(getProductId(p), { url: null, count: 0 })
        })

        photos.forEach(photo => {
          const current = photoMap.get(photo.product_id)
          if (current) {
            current.count++
            if (photo.is_primary) {
              current.url = photo.file_url
            }
          }
        })

        // Combinar productos con su info de fotos
        const enrichedProducts = products.map(product => ({
          ...product,
          primary_photo_url: photoMap.get(product.product_id)?.url || null,
          photo_count: photoMap.get(product.product_id)?.count || 0
        }))

        setProductsWithPhotos(enrichedProducts)
      } else {
        // Para pocos productos, usar la query normal
        const { data: photos, error } = await supabase
          .from('product_media')
          .select('product_id, file_url, is_primary')
          .in('product_id', productIds)
          .eq('media_type', 'image')

        if (error) throw error

        // Crear mapa
        const photoMap = new Map<string, { url: string | null, count: number }>()

        products.forEach(p => {
          photoMap.set(getProductId(p), { url: null, count: 0 })
        })

        photos?.forEach(photo => {
          const current = photoMap.get(photo.product_id)
          if (current) {
            current.count++
            if (photo.is_primary) {
              current.url = photo.file_url
            }
          }
        })

        // Combinar productos con su info de fotos
        const enrichedProducts = products.map(product => ({
          ...product,
          primary_photo_url: photoMap.get(getProductId(product))?.url || null,
          photo_count: photoMap.get(getProductId(product))?.count || 0
        }))

        setProductsWithPhotos(enrichedProducts)
      }
    } catch (error) {
      console.error('Error fetching photos:', error)
      toast.error('Error al cargar fotos')
    } finally {
      setLoading(false)
    }
  }

  const filteredProductsByPhoto = productsWithPhotos.filter(product => {
    if (filterView === "with_photo") return product.photo_count && product.photo_count > 0
    if (filterView === "without_photo") return !product.photo_count || product.photo_count === 0
    return true
  })

  const withPhotos = productsWithPhotos.filter(p => p.photo_count && p.photo_count > 0).length
  const withoutPhotos = productsWithPhotos.filter(p => !p.photo_count || p.photo_count === 0).length

  const handleUploadClick = (product: ProductWithPhoto, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProduct(product)
    setUploadDialogOpen(true)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedProduct) return

    try {
      setUploading(true)

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('El archivo debe ser una imagen')
        return
      }

      const originalSizeKB = file.size / 1024
      toast.info(`Comprimiendo imagen (${formatFileSize(file.size)})...`)

      // Comprimir imagen automáticamente a JPG máximo 50KB
      const compressedFile = await compressImage(file, {
        maxSizeKB: 50,
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: 'jpeg'
      })

      const compressedSizeKB = compressedFile.size / 1024
      const reductionPercent = Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100)

      // Generar nombre único con extensión .jpg
      const fileName = `${getProductId(selectedProduct)}/${Date.now()}.jpg`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('Fotos_producto')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('Fotos_producto')
        .getPublicUrl(fileName)

      const publicUrl = publicUrlData.publicUrl

      // Guardar referencia en la base de datos
      const { error: dbError } = await supabase
        .from('product_media')
        .insert({
          product_id: getProductId(selectedProduct),
          media_type: 'image',
          media_category: 'product_photo',
          file_url: publicUrl,
          file_name: compressedFile.name,
          file_size_kb: Math.round(compressedSizeKB),
          display_order: selectedProduct.photo_count || 0,
          is_primary: !selectedProduct.photo_count || selectedProduct.photo_count === 0
        })

      if (dbError) throw dbError

      toast.success(`Imagen subida (${formatFileSize(compressedFile.size)}, ${reductionPercent}% más pequeña)`)

      // Recargar fotos
      await fetchProductPhotos()

      // Cerrar diálogo
      setUploadDialogOpen(false)
      setSelectedProduct(null)

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error('Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Cargando fotos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats y Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterView === "all" ? "default" : "outline"}
            onClick={() => setFilterView("all")}
            size="sm"
          >
            Todos ({productsWithPhotos.length})
          </Button>
          <Button
            variant={filterView === "with_photo" ? "default" : "outline"}
            onClick={() => setFilterView("with_photo")}
            size="sm"
            className="text-green-600 border-green-600"
          >
            Con Foto ({withPhotos})
          </Button>
          <Button
            variant={filterView === "without_photo" ? "default" : "outline"}
            onClick={() => setFilterView("without_photo")}
            size="sm"
            className="text-red-600 border-red-600"
          >
            Sin Foto ({withoutPhotos})
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-semibold text-green-600">{withPhotos}</span> con foto • 
          <span className="font-semibold text-red-600 ml-1">{withoutPhotos}</span> sin foto
        </div>
      </div>

      {/* Galería */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredProductsByPhoto.map((product) => (
          <Card
            key={getProductId(product)}
            className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
            onClick={() => router.push(`/nucleo/${getProductId(product)}`)}
          >
            <div className="aspect-square relative">
              <OptimizedImage
                src={product.primary_photo_url || null}
                alt={product.name}
                className="w-full h-full"
              />

              {/* Badge de cantidad de fotos */}
              {product.photo_count && product.photo_count > 0 ? (
                <Badge 
                  variant="default" 
                  className="absolute top-2 right-2 bg-green-600"
                >
                  <Camera className="h-3 w-3 mr-1" />
                  {product.photo_count}
                </Badge>
              ) : (
                <Badge 
                  variant="destructive" 
                  className="absolute top-2 right-2"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Sin foto
                </Badge>
              )}
            </div>

            <CardContent className="p-3">
              <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</h3>
              {product.codigo_wo && (
                <p className="text-xs text-gray-500 font-mono">{product.codigo_wo}</p>
              )}
              {product.photo_count && product.photo_count > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/nucleo/${getProductId(product)}`)
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver fotos
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs"
                  onClick={(e) => handleUploadClick(product, e)}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Subir foto
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProductsByPhoto.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay productos en esta vista</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de subida rápida */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Foto de Producto</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              {uploading ? (
                <div>
                  <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Subiendo imagen...</p>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar Imagen
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    Máximo 5MB • JPG, PNG, GIF
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
