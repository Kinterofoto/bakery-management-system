"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NucleoProduct } from "@/hooks/use-nucleo"
import { useProductMedia } from "@/hooks/use-product-media"
import { Upload, Trash2, Star, Loader2, Image as ImageIcon } from "lucide-react"

interface GeneralTabProps {
  product: NucleoProduct
}

export function GeneralTab({ product }: GeneralTabProps) {
  const { media, loading: loadingMedia, uploading, uploadImage, deleteImage, setPrimaryImage } = useProductMedia(product.product_id)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadImage(file)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const primaryImage = media.find(m => m.is_primary)
  const otherImages = media.filter(m => !m.is_primary)

  return (
    <div className="space-y-4">
      {/* Fotografías del Producto */}
      <Card>
        <CardHeader>
          <CardTitle>Fotografías del Producto</CardTitle>
          <CardDescription>Sube imágenes del producto (máximo 5MB por imagen)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botón de subida */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Imagen
                </>
              )}
            </Button>
          </div>

          {/* Galería de imágenes */}
          {loadingMedia ? (
            <div className="text-center py-8 text-gray-500">Cargando imágenes...</div>
          ) : media.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay imágenes del producto</p>
              <p className="text-sm text-gray-500 mt-1">Sube la primera imagen</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Imagen principal */}
              {primaryImage && (
                <div className="border-2 border-blue-500 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={primaryImage.file_url}
                      alt={primaryImage.file_name || 'Producto'}
                      className="w-48 h-48 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Principal
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{primaryImage.file_name}</p>
                      {primaryImage.file_size_kb && (
                        <p className="text-xs text-gray-500">{Math.round(primaryImage.file_size_kb)} KB</p>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-3"
                        onClick={() => deleteImage(primaryImage.id, primaryImage.file_url)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Otras imágenes */}
              {otherImages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Otras imágenes</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {otherImages.map((img) => (
                      <div key={img.id} className="border rounded-lg p-2">
                        <img
                          src={img.file_url}
                          alt={img.file_name || 'Producto'}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => setPrimaryImage(img.id)}
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteImage(img.id, img.file_url)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información Básica */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
          <CardDescription>Datos generales del producto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600">Nombre</label>
              <p className="text-lg">{product.name}</p>
            </div>

            {product.description && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Descripción</label>
                <p className="text-base mt-1">{product.description}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600">Unidad</label>
              <p className="text-base">{product.unit}</p>
            </div>

            {product.price && (
              <div>
                <label className="text-sm font-medium text-gray-600">Precio Base</label>
                <p className="text-lg font-semibold">${product.price.toLocaleString('es-CO')}</p>
              </div>
            )}

            {product.weight && (
              <div>
                <label className="text-sm font-medium text-gray-600">Peso</label>
                <p className="text-base">{product.weight}</p>
              </div>
            )}

            {product.codigo_wo && (
              <div>
                <label className="text-sm font-medium text-gray-600">Código WO</label>
                <p className="text-base font-mono">{product.codigo_wo}</p>
              </div>
            )}

            {product.nombre_wo && (
              <div>
                <label className="text-sm font-medium text-gray-600">Nombre WO</label>
                <p className="text-base">{product.nombre_wo}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600">Fecha de Creación</label>
              <p className="text-base">
                {new Date(product.created_at).toLocaleDateString('es-CO')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
