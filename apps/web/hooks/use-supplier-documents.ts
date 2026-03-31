"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export type DocumentCategory =
  | "registro_sanitario"
  | "analisis_microbiologico"
  | "concepto_sanitario_vehiculo"
  | "carne_manipulador_alimentos"
  | "concepto_sanitario"
  | "rut"
  | "camara_comercio"
  | "certificacion_bancaria"

export type SupplierDocument = {
  id: string
  supplier_id: string
  category: DocumentCategory
  file_url: string
  file_name: string
  file_type?: string
  notes?: string
  created_at: string
  updated_at: string
}

export const DOCUMENT_CATEGORIES: {
  key: DocumentCategory
  label: string
  description: string
}[] = [
  {
    key: "registro_sanitario",
    label: "Registro / Notificación Sanitaria",
    description: "Notificación o registro sanitario del producto",
  },
  {
    key: "analisis_microbiologico",
    label: "Análisis Microbiológicos",
    description: "Análisis microbiológicos actualizados",
  },
  {
    key: "concepto_sanitario_vehiculo",
    label: "Concepto Sanitario del Vehículo",
    description: "Concepto sanitario del vehículo de transporte",
  },
  {
    key: "carne_manipulador_alimentos",
    label: "Carné de Manipulador de Alimentos",
    description: "Carné de manipulador de alimentos del transportador",
  },
  {
    key: "concepto_sanitario",
    label: "Concepto Sanitario",
    description: "Concepto sanitario del establecimiento",
  },
  {
    key: "rut",
    label: "RUT",
    description: "Registro Único Tributario actualizado",
  },
  {
    key: "camara_comercio",
    label: "Cámara de Comercio",
    description: "Certificado de existencia y representación legal",
  },
  {
    key: "certificacion_bancaria",
    label: "Certificación Bancaria",
    description: "Certificación bancaria vigente",
  },
]

const BUCKET = "supplier-portal-docs"

export function useSupplierDocuments(supplierId: string | null) {
  const [documents, setDocuments] = useState<SupplierDocument[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDocuments = useCallback(async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .schema("compras")
        .from("supplier_documents")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error("Error fetching supplier documents:", err)
    } finally {
      setLoading(false)
    }
  }, [supplierId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const getDocsByCategory = useCallback(
    (category: DocumentCategory) =>
      documents.filter((d) => d.category === category),
    [documents]
  )

  const hasDocumentInCategory = useCallback(
    (category: DocumentCategory) =>
      documents.some((d) => d.category === category),
    [documents]
  )

  const uploadDocument = async (
    category: DocumentCategory,
    file: File
  ): Promise<boolean> => {
    if (!supplierId) return false
    try {
      const timestamp = Date.now()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `${supplierId}/${category}/${timestamp}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { error: insertError } = await supabase
        .schema("compras")
        .from("supplier_documents")
        .insert({
          supplier_id: supplierId,
          category,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
        })

      if (insertError) throw insertError

      await fetchDocuments()
      return true
    } catch (err) {
      console.error("Error uploading document:", err)
      return false
    }
  }

  const deleteDocument = async (doc: SupplierDocument): Promise<boolean> => {
    try {
      // Extract storage path from URL
      const urlParts = doc.file_url.split(`${BUCKET}/`)
      if (urlParts[1]) {
        await supabase.storage.from(BUCKET).remove([urlParts[1]])
      }

      const { error } = await supabase
        .schema("compras")
        .from("supplier_documents")
        .delete()
        .eq("id", doc.id)

      if (error) throw error

      await fetchDocuments()
      return true
    } catch (err) {
      console.error("Error deleting document:", err)
      return false
    }
  }

  // Ficha técnica for material_suppliers
  const uploadFichaTecnica = async (
    materialSupplierId: string,
    file: File
  ): Promise<boolean> => {
    if (!supplierId) return false
    try {
      const timestamp = Date.now()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `${supplierId}/fichas_tecnicas/${materialSupplierId}/${timestamp}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { error: updateError } = await supabase
        .schema("compras")
        .from("material_suppliers")
        .update({
          ficha_tecnica_url: publicUrl,
          ficha_tecnica_file_name: file.name,
        })
        .eq("id", materialSupplierId)

      if (updateError) throw updateError

      return true
    } catch (err) {
      console.error("Error uploading ficha técnica:", err)
      return false
    }
  }

  const deleteFichaTecnica = async (
    materialSupplierId: string,
    currentUrl: string
  ): Promise<boolean> => {
    try {
      const urlParts = currentUrl.split(`${BUCKET}/`)
      if (urlParts[1]) {
        await supabase.storage.from(BUCKET).remove([urlParts[1]])
      }

      const { error } = await supabase
        .schema("compras")
        .from("material_suppliers")
        .update({
          ficha_tecnica_url: null,
          ficha_tecnica_file_name: null,
        })
        .eq("id", materialSupplierId)

      if (error) throw error
      return true
    } catch (err) {
      console.error("Error deleting ficha técnica:", err)
      return false
    }
  }

  return {
    documents,
    loading,
    getDocsByCategory,
    hasDocumentInCategory,
    uploadDocument,
    deleteDocument,
    uploadFichaTecnica,
    deleteFichaTecnica,
    refreshDocuments: fetchDocuments,
  }
}
