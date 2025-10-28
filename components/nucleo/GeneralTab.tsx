"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { NucleoProduct } from "@/hooks/use-nucleo"
import { useProductMedia } from "@/hooks/use-product-media"
import { Upload, Trash2, Star, Loader2, Image as ImageIcon, Edit2, Save, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface GeneralTabProps {
  product: NucleoProduct
}

export function GeneralTab({ product }: GeneralTabProps) {
  const { media, loading: loadingMedia, uploading, uploadImage, deleteImage, setPrimaryImage } = useProductMedia(product.product_id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: product.name || '',
    description: product.description || '',
    unit: product.unit || '',
    price: product.price || 0,
    weight: product.weight || '',
    codigo_wo: product.codigo_wo || '',
    nombre_wo: product.nombre_wo || '',
    tax_rate: product.tax_rate || 0,
    subcategory: product.subcategory || '',
    units_per_package: (product.product_config && product.product_config[0]?.units_per_package) || 1,
  })

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

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Update product info
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description || null,
          unit: formData.unit,
          price: formData.price,
          weight: formData.weight || null,
          codigo_wo: formData.codigo_wo || null,
          nombre_wo: formData.nombre_wo || null,
          tax_rate: formData.tax_rate || null,
          subcategory: formData.subcategory || null,
        })
        .eq('id', product.product_id || product.id)

      if (productError) throw productError

      // Update or create product_config
      const configToSave = {
        product_id: product.product_id || product.id,
        units_per_package: formData.units_per_package || 1,
      }

      if (product.product_config && product.product_config.length > 0) {
        // Update existing config
        const { error: configError } = await supabase
          .from('product_config')
          .update(configToSave)
          .eq('id', product.product_config[0].id)

        if (configError) throw configError
      } else {
        // Create new config
        const { error: configError } = await supabase
          .from('product_config')
          .insert(configToSave)

        if (configError) throw configError
      }

      toast.success('Producto actualizado exitosamente')
      setIsEditing(false)
      
      // Reload page to get updated data
      window.location.reload()
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast.error('Error al actualizar producto')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: product.name || '',
      description: product.description || '',
      unit: product.unit || '',
      price: product.price || 0,
      weight: product.weight || '',
      codigo_wo: product.codigo_wo || '',
      nombre_wo: product.nombre_wo || '',
      tax_rate: product.tax_rate || 0,
      subcategory: product.subcategory || '',
      units_per_package: (product.product_config && product.product_config[0]?.units_per_package) || 1,
    })
    setIsEditing(false)
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

      {/* Información Básica del Producto */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>Datos generales del producto</CardDescription>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ID del producto */}
            <div>
              <label className="text-sm font-medium text-gray-600">ID del Producto</label>
              <p className="text-sm font-mono text-gray-800">{product.product_id || product.id}</p>
            </div>

            {/* Nombre */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Nombre *</Label>
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                  required
                />
              ) : (
                <p className="text-base font-semibold mt-1">{product.name}</p>
              )}
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <Label className="text-sm font-medium text-gray-600">Descripción</Label>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              ) : (
                <p className="text-base mt-1">{product.description || '-'}</p>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className="text-sm font-medium text-gray-600">Categoría</label>
              <p className="text-base">
                <Badge variant="default">
                  {product.category === 'PT'
                    ? 'Producto Terminado'
                    : product.category === 'PP'
                    ? 'Producto en Proceso'
                    : 'Materia Prima'}
                </Badge>
              </p>
            </div>

            {/* Subcategoría */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Subcategoría</Label>
              {isEditing ? (
                <Input
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="text-base mt-1">{product.subcategory || '-'}</p>
              )}
            </div>

            {/* Unidad */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Unidad de Medida *</Label>
              {isEditing ? (
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="mt-1"
                  required
                />
              ) : (
                <p className="text-base mt-1">{product.unit}</p>
              )}
            </div>

            {/* Precio Base */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Precio Base (COP)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-semibold text-green-600 mt-1">
                  ${(product.price || 0).toLocaleString('es-CO')}
                </p>
              )}
            </div>

            {/* Unidades por Paquete */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Unidades por Paquete</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.units_per_package}
                  onChange={(e) => setFormData({ ...formData, units_per_package: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                  min="1"
                />
              ) : (
                <p className="text-base font-semibold mt-1">
                  {formData.units_per_package} unidades
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Cantidad de unidades en cada paquete/empaque
              </p>
            </div>

            {/* Peso */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Peso</Label>
              {isEditing ? (
                <Input
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="mt-1"
                  placeholder="Ej: 500g, 1kg"
                />
              ) : (
                <p className="text-base mt-1">{product.weight || '-'}</p>
              )}
            </div>

            {/* Código WO */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Código World Office</Label>
              {isEditing ? (
                <Input
                  value={formData.codigo_wo}
                  onChange={(e) => setFormData({ ...formData, codigo_wo: e.target.value })}
                  className="mt-1 font-mono"
                />
              ) : (
                <p className="text-base font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                  {product.codigo_wo || '-'}
                </p>
              )}
            </div>

            {/* Nombre WO */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Nombre World Office</Label>
              {isEditing ? (
                <Input
                  value={formData.nombre_wo}
                  onChange={(e) => setFormData({ ...formData, nombre_wo: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="text-base mt-1">{product.nombre_wo || '-'}</p>
              )}
            </div>

            {/* Tax Rate */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Tasa de Impuesto (%)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                  step="0.01"
                />
              ) : (
                <p className="text-base mt-1">{product.tax_rate || 0}%</p>
              )}
            </div>

            {/* Fecha de Creación */}
            <div>
              <label className="text-sm font-medium text-gray-600">Fecha de Creación</label>
              <p className="text-base">
                {new Date(product.created_at).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
