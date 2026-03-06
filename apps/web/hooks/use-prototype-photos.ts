"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { compressImage, getFileSizeKB } from "@/lib/image-compression"

export interface PrototypePhoto {
  id: string
  prototype_id: string
  prototype_operation_id: string | null
  photo_url: string
  file_name: string | null
  file_size_kb: number | null
  photo_type: string | null
  caption: string | null
  display_order: number | null
}

export interface PrototypePhotoInsert {
  prototype_id: string
  prototype_operation_id?: string | null
  photo_url: string
  file_name?: string | null
  file_size_kb?: number | null
  photo_type?: string | null
  caption?: string | null
  display_order?: number | null
}

export function usePrototypePhotos() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPhotosByPrototype = useCallback(async (prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_photos")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("display_order", { ascending: true })

      if (fetchError) throw fetchError
      return (data as PrototypePhoto[]) || []
    } catch (err) {
      console.error("Error al obtener fotos:", err)
      setError(err instanceof Error ? err.message : "Error al obtener fotos")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getPhotosByOperation = useCallback(async (operationId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_photos")
        .select("*")
        .eq("prototype_operation_id", operationId)
        .order("display_order", { ascending: true })

      if (fetchError) throw fetchError
      return (data as PrototypePhoto[]) || []
    } catch (err) {
      console.error("Error al obtener fotos de operacion:", err)
      setError(err instanceof Error ? err.message : "Error al obtener fotos de operacion")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadPhoto = useCallback(async (
    file: File,
    prototypeId: string,
    operationId?: string | null,
    photoType?: string | null,
    caption?: string | null
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Comprimir imagen antes de subir
      const compressedFile = await compressImage(file)
      const fileSizeKB = getFileSizeKB(compressedFile)

      // Construir path de almacenamiento
      const folder = operationId || "general"
      const timestamp = Date.now()
      const storagePath = `${prototypeId}/${folder}/${timestamp}.jpg`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("prototype-photos")
        .upload(storagePath, compressedFile, {
          contentType: "image/jpeg",
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Obtener URL publica
      const { data: urlData } = supabase.storage
        .from("prototype-photos")
        .getPublicUrl(storagePath)

      const photoUrl = urlData.publicUrl

      // Insertar registro en la tabla prototype_photos
      const { data, error: insertError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_photos")
        .insert({
          prototype_id: prototypeId,
          prototype_operation_id: operationId || null,
          photo_url: photoUrl,
          file_name: compressedFile.name,
          file_size_kb: Math.round(fileSizeKB),
          photo_type: photoType || null,
          caption: caption || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      toast.success("Foto subida exitosamente")
      return data as PrototypePhoto
    } catch (err) {
      console.error("Error al subir foto:", err)
      setError(err instanceof Error ? err.message : "Error al subir foto")
      toast.error("Error al subir foto")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Obtener la foto para saber el path en storage
      const { data: photo, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_photos")
        .select("photo_url")
        .eq("id", photoId)
        .single()

      if (fetchError) throw fetchError

      // Extraer el path del storage de la URL
      if (photo?.photo_url) {
        const url = new URL(photo.photo_url)
        const pathParts = url.pathname.split("/prototype-photos/")
        if (pathParts.length > 1) {
          const storagePath = decodeURIComponent(pathParts[1])
          await supabase.storage
            .from("prototype-photos")
            .remove([storagePath])
        }
      }

      // Eliminar el registro de la base de datos
      const { error: deleteError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_photos")
        .delete()
        .eq("id", photoId)

      if (deleteError) throw deleteError

      toast.success("Foto eliminada exitosamente")
      return true
    } catch (err) {
      console.error("Error al eliminar foto:", err)
      setError(err instanceof Error ? err.message : "Error al eliminar foto")
      toast.error("Error al eliminar foto")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getPhotosByPrototype,
    getPhotosByOperation,
    uploadPhoto,
    deletePhoto,
  }
}
