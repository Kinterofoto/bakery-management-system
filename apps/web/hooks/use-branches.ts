import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

export interface Branch {
  id: string
  client_id: string
  name: string
  address?: string
  latitude?: number
  longitude?: number
  contact_person?: string
  phone?: string
  email?: string
  is_main: boolean
  created_at: string
  updated_at: string
  client: {
    id: string
    name: string
  }
}

export interface CreateBranchData {
  client_id: string
  name: string
  address?: string
  latitude?: number
  longitude?: number
  contact_person?: string
  phone?: string
  email?: string
  is_main: boolean
}

export interface UpdateBranchData {
  name?: string
  address?: string
  latitude?: number
  longitude?: number
  contact_person?: string
  phone?: string
  email?: string
  is_main?: boolean
}

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBranches = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("branches")
        .select(`
          *,
          client:clients(id, name)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching branches:", error)
        setError(error.message)
        return
      }

      setBranches(data || [])
    } catch (err: any) {
      console.error("Error fetching branches:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createBranch = async (branchData: CreateBranchData) => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .insert([branchData])
        .select(`
          *,
          client:clients(id, name)
        `)
        .single()

      if (error) {
        console.error("Error creating branch:", error)
        throw error
      }

      setBranches(prev => [data, ...prev])
      return data
    } catch (err: any) {
      console.error("Error creating branch:", err)
      throw err
    }
  }

  const updateBranch = async (branchId: string, branchData: UpdateBranchData) => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .update(branchData)
        .eq("id", branchId)
        .select(`
          *,
          client:clients(id, name)
        `)
        .single()

      if (error) {
        console.error("Error updating branch:", error)
        throw error
      }

      setBranches(prev => 
        prev.map(branch => 
          branch.id === branchId ? data : branch
        )
      )
      return data
    } catch (err: any) {
      console.error("Error updating branch:", err)
      throw err
    }
  }

  const deleteBranch = async (branchId: string) => {
    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", branchId)

      if (error) {
        console.error("Error deleting branch:", error)
        throw error
      }

      setBranches(prev => prev.filter(branch => branch.id !== branchId))
    } catch (err: any) {
      console.error("Error deleting branch:", err)
      throw err
    }
  }

  const getBranchesByClient = (clientId: string) => {
    return branches.filter(branch => branch.client_id === clientId)
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  return {
    branches,
    loading,
    error,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranchesByClient,
    refetch: fetchBranches,
  }
}