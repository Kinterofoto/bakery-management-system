"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type Supplier = Database['compras']['Tables']['suppliers']['Row']
type SupplierInsert = Database['compras']['Tables']['suppliers']['Insert']
type SupplierUpdate = Database['compras']['Tables']['suppliers']['Update']

type SupplierStats = {
  totalSuppliers: number
  activeSuppliers: number
  inactiveSuppliers: number
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSuppliers = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('*')
        .order('company_name', { ascending: true })

      if (error) throw error

      setSuppliers(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getSupplierById = async (id: string): Promise<Supplier | null> => {
    try {
      const { data, error } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('Error fetching supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener proveedor')
      return null
    }
  }

  const getSupplierByNit = async (nit: string): Promise<Supplier | null> => {
    try {
      const { data, error } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('*')
        .eq('nit', nit)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('Error fetching supplier by NIT:', err)
      return null
    }
  }

  const createSupplier = async (supplierData: SupplierInsert): Promise<Supplier | null> => {
    try {
      // Check if NIT already exists
      const existing = await getSupplierByNit(supplierData.nit)
      if (existing) {
        setError('Ya existe un proveedor con este NIT')
        return null
      }

      const { data, error } = await supabase
        .schema('compras')
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single()

      if (error) throw error

      await fetchSuppliers() // Refresh the list
      return data
    } catch (err) {
      console.error('Error creating supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al crear proveedor')
      return null
    }
  }

  const updateSupplier = async (id: string, updates: SupplierUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('suppliers')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchSuppliers() // Refresh the list
      return true
    } catch (err) {
      console.error('Error updating supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar proveedor')
      return false
    }
  }

  const toggleSupplierStatus = async (id: string, currentStatus: string): Promise<boolean> => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    return updateSupplier(id, { status: newStatus })
  }

  const deleteSupplier = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('suppliers')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchSuppliers() // Refresh the list
      return true
    } catch (err) {
      console.error('Error deleting supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar proveedor')
      return false
    }
  }

  const getSupplierStats = (): SupplierStats => {
    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.status === 'active').length,
      inactiveSuppliers: suppliers.filter(s => s.status === 'inactive').length,
    }
  }

  const getActiveSuppliers = (): Supplier[] => {
    return suppliers.filter(s => s.status === 'active')
  }

  const searchSuppliers = (query: string): Supplier[] => {
    const lowerQuery = query.toLowerCase()
    return suppliers.filter(supplier =>
      supplier.company_name.toLowerCase().includes(lowerQuery) ||
      supplier.nit.toLowerCase().includes(lowerQuery) ||
      supplier.contact_person_name?.toLowerCase().includes(lowerQuery) ||
      supplier.contact_email?.toLowerCase().includes(lowerQuery)
    )
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    getSupplierById,
    getSupplierByNit,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
    deleteSupplier,
    getSupplierStats,
    getActiveSuppliers,
    searchSuppliers,
  }
}
