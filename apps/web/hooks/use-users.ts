"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  updated_at: string
  permissions?: any
  status?: string
  last_login?: string
  auth_user_id?: string
  cedula?: string
  company_id?: string
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .order("name", { ascending: true })

      if (fetchError) throw fetchError

      setUsers(data || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching users:", err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const getUsersByRole = (role: string) => {
    return users.filter(user => user.role === role)
  }

  const getCommercialUsers = () => {
    return getUsersByRole('commercial')
  }

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    getUsersByRole,
    getCommercialUsers
  }
}
