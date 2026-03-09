"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface Project {
  id: string
  name: string
  description: string | null
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectInsert {
  name: string
  description?: string | null
  status?: string
}

export function useProjects() {
  const [loading, setLoading] = useState(false)

  const getProjects = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await (supabase
        .schema("investigacion" as any))
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data as Project[]) || []
    } catch (err) {
      console.error("Error al obtener proyectos:", err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getProjectById = useCallback(async (id: string) => {
    try {
      const { data, error } = await (supabase
        .schema("investigacion" as any))
        .from("projects")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as Project
    } catch (err) {
      console.error("Error al obtener proyecto:", err)
      return null
    }
  }, [])

  const createProject = useCallback(async (projectData: ProjectInsert) => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id || null

      const { data, error } = await (supabase
        .schema("investigacion" as any))
        .from("projects")
        .insert({
          ...projectData,
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      toast.success("Proyecto creado exitosamente")
      return data as Project
    } catch (err) {
      console.error("Error al crear proyecto:", err)
      toast.error("Error al crear proyecto")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<ProjectInsert>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase
        .schema("investigacion" as any))
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      toast.success("Proyecto actualizado")
      return data as Project
    } catch (err) {
      console.error("Error al actualizar proyecto:", err)
      toast.error("Error al actualizar proyecto")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error } = await (supabase
        .schema("investigacion" as any))
        .from("projects")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Proyecto eliminado")
      return true
    } catch (err) {
      console.error("Error al eliminar proyecto:", err)
      toast.error("Error al eliminar proyecto")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
  }
}
