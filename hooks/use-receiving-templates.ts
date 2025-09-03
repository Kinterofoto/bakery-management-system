"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ReceivingTemplate = Database["public"]["Tables"]["receiving_templates"]["Row"]
type ReceivingTemplateInsert = Database["public"]["Tables"]["receiving_templates"]["Insert"]
type ReceivingTemplateUpdate = Database["public"]["Tables"]["receiving_templates"]["Update"]

export interface TemplateSlot {
  start: string
  end: string
  status: "available" | "unavailable"
  metadata?: Record<string, any>
}

export interface TemplateDaySchedule {
  day: number // 0=Sunday, 6=Saturday
  slots: TemplateSlot[]
}

export type TemplatePayload = TemplateDaySchedule[]

export function useReceivingTemplates() {
  const [templates, setTemplates] = useState<ReceivingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("receiving_templates")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching receiving templates:", error)
        setError(error.message)
        return
      }

      setTemplates(data || [])
    } catch (err: any) {
      console.error("Error fetching receiving templates:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async (templateData: ReceivingTemplateInsert): Promise<ReceivingTemplate> => {
    try {
      const { data, error } = await supabase
        .from("receiving_templates")
        .insert([templateData])
        .select()
        .single()

      if (error) {
        console.error("Error creating receiving template:", error)
        throw error
      }

      setTemplates(prev => [data, ...prev])
      return data
    } catch (err: any) {
      console.error("Error creating receiving template:", err)
      throw err
    }
  }

  const updateTemplate = async (
    templateId: string, 
    templateData: ReceivingTemplateUpdate
  ): Promise<ReceivingTemplate> => {
    try {
      const { data, error } = await supabase
        .from("receiving_templates")
        .update(templateData)
        .eq("id", templateId)
        .select()
        .single()

      if (error) {
        console.error("Error updating receiving template:", error)
        throw error
      }

      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId ? data : template
        )
      )
      return data
    } catch (err: any) {
      console.error("Error updating receiving template:", err)
      throw err
    }
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("receiving_templates")
        .delete()
        .eq("id", templateId)

      if (error) {
        console.error("Error deleting receiving template:", error)
        throw error
      }

      setTemplates(prev => prev.filter(template => template.id !== templateId))
    } catch (err: any) {
      console.error("Error deleting receiving template:", err)
      throw err
    }
  }

  const getPublicTemplates = (): ReceivingTemplate[] => {
    return templates.filter(template => template.is_public)
  }

  const getUserTemplates = (userId: string): ReceivingTemplate[] => {
    return templates.filter(template => 
      template.created_by === userId || template.is_public
    )
  }

  // Apply template to client or branch
  const applyTemplate = async (
    templateId: string,
    clientId?: string,
    branchId?: string,
    overwriteExisting: boolean = false
  ) => {
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) {
        throw new Error("Plantilla no encontrada")
      }

      const payload = template.payload as TemplatePayload

      // If overwrite, delete existing schedules first
      if (overwriteExisting) {
        let deleteQuery = supabase.from("receiving_schedules").delete()

        if (clientId) {
          deleteQuery = deleteQuery.eq("client_id", clientId)
        } else if (branchId) {
          deleteQuery = deleteQuery.eq("branch_id", branchId)
        }

        const { error: deleteError } = await deleteQuery
        if (deleteError) {
          console.error("Error deleting existing schedules:", deleteError)
          throw deleteError
        }
      }

      // Create new schedules from template
      const schedulesToCreate = []

      for (const daySchedule of payload) {
        for (const slot of daySchedule.slots) {
          schedulesToCreate.push({
            client_id: clientId || null,
            branch_id: branchId || null,
            day_of_week: daySchedule.day,
            start_time: slot.start,
            end_time: slot.end,
            status: slot.status,
            applied_template_id: templateId,
            metadata: slot.metadata || {},
          })
        }
      }

      if (schedulesToCreate.length > 0) {
        const { data, error } = await supabase
          .from("receiving_schedules")
          .insert(schedulesToCreate)
          .select()

        if (error) {
          console.error("Error applying template:", error)
          throw error
        }

        return data
      }

      return []
    } catch (err: any) {
      console.error("Error applying template:", err)
      throw err
    }
  }

  // Create template from existing schedules
  const createTemplateFromSchedules = async (
    name: string,
    description: string | null,
    clientId?: string,
    branchId?: string,
    isPublic: boolean = false,
    createdBy?: string
  ) => {
    try {
      // Fetch existing schedules
      let query = supabase
        .from("receiving_schedules")
        .select("*")

      if (clientId) {
        query = query.eq("client_id", clientId)
      } else if (branchId) {
        query = query.eq("branch_id", branchId)
      }

      const { data: schedules, error } = await query

      if (error) {
        console.error("Error fetching schedules for template:", error)
        throw error
      }

      if (!schedules || schedules.length === 0) {
        throw new Error("No se encontraron horarios para crear la plantilla")
      }

      // Group schedules by day
      const schedulesByDay: Record<number, TemplateSlot[]> = {}

      for (const schedule of schedules) {
        if (!schedulesByDay[schedule.day_of_week]) {
          schedulesByDay[schedule.day_of_week] = []
        }

        schedulesByDay[schedule.day_of_week].push({
          start: schedule.start_time,
          end: schedule.end_time,
          status: schedule.status,
          metadata: schedule.metadata || undefined,
        })
      }

      // Convert to template payload
      const payload: TemplatePayload = Object.keys(schedulesByDay)
        .map(dayStr => {
          const day = parseInt(dayStr)
          return {
            day,
            slots: schedulesByDay[day].sort((a, b) => a.start.localeCompare(b.start))
          }
        })
        .sort((a, b) => a.day - b.day)

      // Create the template
      const templateData: ReceivingTemplateInsert = {
        name,
        description,
        payload: payload as Record<string, any>,
        created_by: createdBy || null,
        is_public: isPublic,
      }

      return await createTemplate(templateData)
    } catch (err: any) {
      console.error("Error creating template from schedules:", err)
      throw err
    }
  }

  // Preview template - get formatted preview text
  const getTemplatePreview = (templateId: string): string => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return "Plantilla no encontrada"

    const payload = template.payload as TemplatePayload
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    
    let preview = ""
    for (const daySchedule of payload) {
      const dayName = dayNames[daySchedule.day]
      const slots = daySchedule.slots
        .filter(slot => slot.status === "available")
        .map(slot => `${slot.start}-${slot.end}`)
        .join(", ")
      
      if (slots) {
        preview += `${dayName}: ${slots}\n`
      }
    }

    return preview.trim() || "Sin horarios disponibles"
  }

  // Validate template payload
  const validateTemplatePayload = (payload: any): string[] => {
    const errors: string[] = []

    if (!Array.isArray(payload)) {
      errors.push("El payload debe ser un array de días")
      return errors
    }

    for (const daySchedule of payload) {
      if (typeof daySchedule.day !== "number" || daySchedule.day < 0 || daySchedule.day > 6) {
        errors.push(`Día inválido: ${daySchedule.day}`)
      }

      if (!Array.isArray(daySchedule.slots)) {
        errors.push(`Los slots del día ${daySchedule.day} deben ser un array`)
        continue
      }

      for (const slot of daySchedule.slots) {
        if (!slot.start || !slot.end) {
          errors.push(`Slot inválido en día ${daySchedule.day}: falta start o end`)
        }

        if (slot.start >= slot.end) {
          errors.push(`Horario inválido en día ${daySchedule.day}: ${slot.start} >= ${slot.end}`)
        }

        if (!["available", "unavailable"].includes(slot.status)) {
          errors.push(`Estado inválido en día ${daySchedule.day}: ${slot.status}`)
        }
      }
    }

    return errors
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getPublicTemplates,
    getUserTemplates,
    applyTemplate,
    createTemplateFromSchedules,
    getTemplatePreview,
    validateTemplatePayload,
    refetch: fetchTemplates,
  }
}