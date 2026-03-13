"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface Attachment {
  id: string
  entity_type: "equipment" | "work_order" | "life_record" | "daily_log" | "infrastructure"
  entity_id: string
  file_url: string
  file_name: string
  file_type: string | null
  uploaded_by: string | null
  created_at: string
}

export function useMaintenanceAttachments() {
  const [loading, setLoading] = useState(false)

  const getAttachments = useCallback(async (entityType: string, entityId: string) => {
    try {
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("attachments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data as unknown as Attachment[]) || []
    } catch (err) {
      return []
    }
  }, [])

  const uploadAttachment = useCallback(async (entityType: string, entityId: string, file: File) => {
    try {
      setLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${entityType}/${entityId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('mantenimiento-attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('mantenimiento-attachments')
        .getPublicUrl(fileName)

      const { data: userData } = await supabase.auth.getUser()

      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("attachments")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          uploaded_by: userData?.user?.id || null,
        })
        .select()
        .single()

      if (error) throw error
      toast.success("Archivo adjuntado")
      return data as unknown as Attachment
    } catch (err) {
      toast.error("Error al subir archivo")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteAttachment = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error } = await (supabase.schema("mantenimiento" as any))
        .from("attachments")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Archivo eliminado")
      return true
    } catch (err) {
      toast.error("Error al eliminar archivo")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, getAttachments, uploadAttachment, deleteAttachment }
}
