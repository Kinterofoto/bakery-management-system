"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface ProgramSupplier {
  id: string
  program_id: string
  name: string
  category: string | null
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  nit: string | null
  address: string | null
  notes: string | null
  status: "activo" | "inactivo"
  created_at: string
  updated_at: string
  supplier_documents?: SupplierDocument[]
}

export interface SupplierDocument {
  id: string
  supplier_id: string
  document_name: string
  document_type: string | null
  file_url: string
  file_name: string
  file_type: string | null
  expiry_date: string | null
  uploaded_by: string | null
  created_at: string
}

export interface SupplierInsert {
  program_id: string
  name: string
  category?: string | null
  contact_person?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  nit?: string | null
  address?: string | null
  notes?: string | null
}

export function useQMSSuppliers() {
  const [loading, setLoading] = useState(false)

  const getSuppliers = useCallback(async (programId: string) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("qms" as any))
        .from("program_suppliers")
        .select(`*, supplier_documents(*)`)
        .eq("program_id", programId)
        .eq("status", "activo")
        .order("created_at", { ascending: true })

      if (error) throw error
      return (data as unknown as ProgramSupplier[]) || []
    } catch (err) {
      toast.error("Error al obtener proveedores")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createSupplier = useCallback(async (supplier: SupplierInsert) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("qms" as any))
        .from("program_suppliers")
        .insert(supplier)
        .select(`*, supplier_documents(*)`)
        .single()

      if (error) throw error
      toast.success("Proveedor registrado")
      return data as unknown as ProgramSupplier
    } catch (err) {
      toast.error("Error al registrar proveedor")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSupplier = useCallback(async (id: string, updates: Partial<SupplierInsert>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("qms" as any))
        .from("program_suppliers")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(`*, supplier_documents(*)`)
        .single()

      if (error) throw error
      toast.success("Proveedor actualizado")
      return data as unknown as ProgramSupplier
    } catch (err) {
      toast.error("Error al actualizar proveedor")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error } = await (supabase.schema("qms" as any))
        .from("program_suppliers")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Proveedor eliminado")
      return true
    } catch (err) {
      toast.error("Error al eliminar proveedor")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadDocument = useCallback(async (
    supplierId: string,
    file: File,
    documentName: string,
    documentType?: string,
    expiryDate?: string,
  ) => {
    try {
      setLoading(true)
      const fileExt = file.name.split(".").pop()
      const fileName = `${supplierId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("qms-supplier-docs")
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from("qms-supplier-docs")
        .getPublicUrl(fileName)

      const { data: userData } = await supabase.auth.getUser()

      const { data, error } = await (supabase.schema("qms" as any))
        .from("supplier_documents")
        .insert({
          supplier_id: supplierId,
          document_name: documentName,
          document_type: documentType || null,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          expiry_date: expiryDate || null,
          uploaded_by: userData?.user?.id || null,
        })
        .select()
        .single()

      if (error) throw error
      toast.success("Documento adjuntado")
      return data as unknown as SupplierDocument
    } catch (err) {
      toast.error("Error al subir documento")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteDocument = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error } = await (supabase.schema("qms" as any))
        .from("supplier_documents")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Documento eliminado")
      return true
    } catch (err) {
      toast.error("Error al eliminar documento")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    uploadDocument,
    deleteDocument,
  }
}
