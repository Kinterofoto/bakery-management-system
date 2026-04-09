"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export type PqrsType = "peticion" | "queja" | "reclamo" | "sugerencia"
export type PqrsStatus = "recibida" | "en_revision" | "en_progreso" | "resuelta" | "cerrada"

export interface Pqrs {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  pqrs_type: PqrsType
  description: string
  product_id: string | null
  product_name: string | null
  product_lot: string | null
  expiry_date: string | null
  purchase_date: string | null
  purchase_location: string | null
  status: PqrsStatus
  resolution_notes: string | null
  resolution_method: string | null
  action_plan: string | null
  resolved_by: string | null
  resolution_date: string | null
  resolution_email_sent: boolean
  resolution_email_sent_at: string | null
  created_at: string
  updated_at: string
  pqrs_attachments?: PqrsAttachment[]
}

export interface PqrsAttachment {
  id: string
  pqrs_id: string
  file_url: string
  file_name: string
  file_type: string | null
  is_resolution: boolean
  uploaded_by: string | null
  created_at: string
}

export interface PqrsInsert {
  client_name: string
  client_email: string
  client_phone?: string
  pqrs_type: PqrsType
  description: string
  product_id?: string | null
  product_name?: string | null
  product_lot?: string
  expiry_date?: string | null
  purchase_date?: string | null
  purchase_location?: string
}

export interface PqrsUpdate {
  status?: PqrsStatus
  resolution_notes?: string | null
  resolution_method?: string | null
  action_plan?: string | null
  resolved_by?: string | null
  resolution_date?: string | null
  resolution_email_sent?: boolean
  resolution_email_sent_at?: string | null
}

export function useQMSPqrs() {
  const [loading, setLoading] = useState(false)

  const getPqrsList = useCallback(async (filters?: { status?: PqrsStatus; type?: PqrsType }) => {
    setLoading(true)
    try {
      let query = supabase
        .from("pqrs")
        .select("*, pqrs_attachments(*)")
        .schema("qms" as any)
        .order("created_at", { ascending: false })

      if (filters?.status) query = query.eq("status", filters.status)
      if (filters?.type) query = query.eq("pqrs_type", filters.type)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as unknown as Pqrs[]
    } catch (err: any) {
      console.error("Error fetching PQRS:", err)
      toast.error("Error al cargar PQRS")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getPqrsById = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("pqrs")
        .select("*, pqrs_attachments(*)")
        .schema("qms" as any)
        .eq("id", id)
        .single()
      if (error) throw error
      return data as unknown as Pqrs
    } catch (err: any) {
      console.error("Error fetching PQRS:", err)
      return null
    }
  }, [])

  const createPqrs = useCallback(async (data: PqrsInsert) => {
    try {
      const { data: result, error } = await supabase
        .from("pqrs")
        .insert(data)
        .schema("qms" as any)
        .select()
        .single()
      if (error) throw error
      return result as unknown as Pqrs
    } catch (err: any) {
      console.error("Error creating PQRS:", err)
      throw err
    }
  }, [])

  const updatePqrs = useCallback(async (id: string, updates: PqrsUpdate) => {
    try {
      const { data, error } = await supabase
        .from("pqrs")
        .update(updates)
        .schema("qms" as any)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      toast.success("PQRS actualizada")
      return data as unknown as Pqrs
    } catch (err: any) {
      console.error("Error updating PQRS:", err)
      toast.error("Error al actualizar PQRS")
      return null
    }
  }, [])

  const uploadAttachment = useCallback(async (
    pqrsId: string,
    file: File,
    isResolution: boolean = false,
    userId?: string
  ) => {
    try {
      const ext = file.name.split(".").pop()
      const path = `${pqrsId}/${Date.now()}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("qms-pqrs")
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("qms-pqrs")
        .getPublicUrl(path)

      const { data, error } = await supabase
        .from("pqrs_attachments")
        .insert({
          pqrs_id: pqrsId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type || ext,
          is_resolution: isResolution,
          uploaded_by: userId || null,
        })
        .schema("qms" as any)
        .select()
        .single()

      if (error) throw error
      return data as unknown as PqrsAttachment
    } catch (err: any) {
      console.error("Error uploading attachment:", err)
      toast.error("Error al subir archivo")
      return null
    }
  }, [])

  const deleteAttachment = useCallback(async (attachmentId: string, fileUrl: string) => {
    try {
      // Extract path from URL
      const urlParts = fileUrl.split("/qms-pqrs/")
      if (urlParts[1]) {
        await supabase.storage.from("qms-pqrs").remove([urlParts[1]])
      }

      const { error } = await supabase
        .from("pqrs_attachments")
        .delete()
        .schema("qms" as any)
        .eq("id", attachmentId)

      if (error) throw error
      toast.success("Archivo eliminado")
      return true
    } catch (err: any) {
      console.error("Error deleting attachment:", err)
      toast.error("Error al eliminar archivo")
      return false
    }
  }, [])

  const finalizePqrs = useCallback(async (id: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from("pqrs")
        .update({
          status: "resuelta" as PqrsStatus,
          resolved_by: userId,
          resolution_date: new Date().toISOString(),
        })
        .schema("qms" as any)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as unknown as Pqrs
    } catch (err: any) {
      console.error("Error finalizing PQRS:", err)
      toast.error("Error al finalizar PQRS")
      return null
    }
  }, [])

  return {
    loading,
    getPqrsList,
    getPqrsById,
    createPqrs,
    updatePqrs,
    uploadAttachment,
    deleteAttachment,
    finalizePqrs,
  }
}
