'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface EmployeeRecord {
  id: string
  company: string
  document_type: string | null
  document_number: string | null
  full_name: string
  salary: string | null
  position: string | null
  hire_date: string | null
  probation_end_date: string | null
  birth_date: string | null
  birth_place: string | null
  gender: string | null
  blood_type: string | null
  phone: string | null
  email: string | null
  smokes: string | null
  marital_status: string | null
  address: string | null
  housing_type: string | null
  neighborhood: string | null
  locality: string | null
  estrato: string | null
  education_level: string | null
  bank: string | null
  bank_account: string | null
  eps: string | null
  pension_fund: string | null
  severance_fund: string | null
  is_allergic: string | null
  allergy_details: string | null
  has_disease: string | null
  disease_details: string | null
  has_disability: string | null
  disability_details: string | null
  has_dependents_company: string | null
  is_head_household: string | null
  has_dependents_home: string | null
  num_dependents: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_phone: string | null
  has_children: string | null
  num_children: string | null
  child1_name: string | null
  child1_birthdate: string | null
  child2_name: string | null
  child2_birthdate: string | null
  child3_name: string | null
  child3_birthdate: string | null
  child4_name: string | null
  child4_birthdate: string | null
  child5_name: string | null
  child5_birthdate: string | null
  pants_size: string | null
  shirt_size: string | null
  boots_size: string | null
  status: string | null
  retirement_date: string | null
  resignation_reason: string | null
  received_onboarding: string | null
  photo_url: string | null
  created_at: string | null
  updated_at: string | null
}

export function useEmployeeDirectory() {
  const [data, setData] = useState<EmployeeRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('employee_directory')
      .select('*')
      .order('full_name', { ascending: true })
    if (error) {
      toast.error('Error cargando directorio: ' + error.message)
    } else {
      setData(rows || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateField = useCallback(async (id: string, field: string, value: string) => {
    // Optimistic update
    setData(prev => prev.map(r => r.id === id ? { ...r, [field]: value, updated_at: new Date().toISOString() } : r))

    const { error } = await supabase
      .from('employee_directory')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Error guardando: ' + error.message)
      fetchData() // Revert
    }
  }, [fetchData])

  const createEmployee = useCallback(async (employee: Partial<EmployeeRecord>) => {
    const { data: newRow, error } = await supabase
      .from('employee_directory')
      .insert(employee)
      .select()
      .single()

    if (error) {
      toast.error('Error creando empleado: ' + error.message)
      return null
    }
    setData(prev => [...prev, newRow])
    return newRow
  }, [])

  const deleteEmployee = useCallback(async (id: string) => {
    setData(prev => prev.filter(r => r.id !== id))
    const { error } = await supabase
      .from('employee_directory')
      .delete()
      .eq('id', id)
    if (error) {
      toast.error('Error eliminando: ' + error.message)
      fetchData()
    }
  }, [fetchData])

  const bulkInsert = useCallback(async (employees: Partial<EmployeeRecord>[]) => {
    const { data: rows, error } = await supabase
      .from('employee_directory')
      .insert(employees)
      .select()
    if (error) {
      toast.error('Error insertando datos: ' + error.message)
      return false
    }
    setData(prev => [...prev, ...(rows || [])])
    return true
  }, [])

  const uploadPhoto = useCallback(async (id: string, file: File) => {
    const ext = file.name.split('.').pop()
    const path = `employee-photos/${id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('employee-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Error subiendo foto: ' + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage
      .from('employee-photos')
      .getPublicUrl(path)

    await updateField(id, 'photo_url', urlData.publicUrl)
    toast.success('Foto actualizada')
  }, [updateField])

  return { data, loading, fetchData, updateField, createEmployee, deleteEmployee, bulkInsert, uploadPhoto }
}
