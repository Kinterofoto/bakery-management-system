import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface ProductMedia {
  id: string
  product_id: string
  media_type: string
  media_category: string | null
  file_url: string
  file_name: string | null
  file_size_kb: number | null
  thumbnail_url: string | null
  display_order: number
  is_primary: boolean
  caption: string | null
  created_at: string
}

export function useProductMedia(productId: string) {
  const [media, setMedia] = useState<ProductMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetchMedia = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('product_media')
        .select('*')
        .eq('product_id', productId)
        .order('display_order')

      if (error) throw error
      setMedia(data || [])
    } catch (error: any) {
      console.error('Error fetching media:', error)
      toast.error('Error al cargar medios')
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File) => {
    try {
      setUploading(true)

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('El archivo debe ser una imagen')
        return null
      }

      // Validar tamaño (máximo 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        toast.error('La imagen no puede superar los 5MB')
        return null
      }

      // Generar nombre único
      const fileExt = file.name.split('.').pop()
      const fileName = `${productId}/${Date.now()}.${fileExt}`

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Fotos_producto')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('Fotos_producto')
        .getPublicUrl(fileName)

      const publicUrl = publicUrlData.publicUrl

      // Guardar referencia en la base de datos
      const { data: mediaData, error: dbError } = await supabase
        .from('product_media')
        .insert({
          product_id: productId,
          media_type: 'image',
          media_category: 'product_photo',
          file_url: publicUrl,
          file_name: file.name,
          file_size_kb: Math.round(file.size / 1024),
          display_order: media.length,
          is_primary: media.length === 0 // Primera imagen es primaria
        })
        .select()
        .single()

      if (dbError) throw dbError

      toast.success('Imagen subida exitosamente')
      await fetchMedia()
      return mediaData
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error('Error al subir imagen')
      return null
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (mediaId: string, fileUrl: string) => {
    try {
      // Extraer el path del archivo de la URL
      const urlParts = fileUrl.split('/Fotos_producto/')
      const filePath = urlParts[1]

      // Eliminar de Storage
      const { error: storageError } = await supabase.storage
        .from('Fotos_producto')
        .remove([filePath])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
        // Continuar aunque falle el borrado del storage
      }

      // Eliminar de la base de datos
      const { error: dbError } = await supabase
        .from('product_media')
        .delete()
        .eq('id', mediaId)

      if (dbError) throw dbError

      toast.success('Imagen eliminada')
      await fetchMedia()
    } catch (error: any) {
      console.error('Error deleting image:', error)
      toast.error('Error al eliminar imagen')
    }
  }

  const setPrimaryImage = async (mediaId: string) => {
    try {
      // Remover todas las primarias
      await supabase
        .from('product_media')
        .update({ is_primary: false })
        .eq('product_id', productId)

      // Establecer la nueva primaria
      const { error } = await supabase
        .from('product_media')
        .update({ is_primary: true })
        .eq('id', mediaId)

      if (error) throw error

      toast.success('Imagen principal actualizada')
      await fetchMedia()
    } catch (error: any) {
      console.error('Error setting primary image:', error)
      toast.error('Error al establecer imagen principal')
    }
  }

  useEffect(() => {
    if (productId) {
      fetchMedia()
    }
  }, [productId])

  return {
    media,
    loading,
    uploading,
    uploadImage,
    deleteImage,
    setPrimaryImage,
    refetch: fetchMedia
  }
}
