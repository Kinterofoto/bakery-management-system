"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type User = Database["public"]["Tables"]["users"]["Row"]
type Driver = User & { role: "driver" }

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      
      // Obtener solo conductores
      const { data: driversData, error: driversError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "driver")
        .order("created_at", { ascending: false })

      // También obtener todos los usuarios para el selector
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("name", { ascending: true })

      if (driversError) throw driversError
      if (usersError) throw usersError

      setDrivers(driversData || [])
      setAllUsers(usersData || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching drivers")
    } finally {
      setLoading(false)
    }
  }

  const createDriver = async (driverData: {
    name: string
    email: string
  }) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          ...driverData,
          role: "driver",
        })
        .select()
        .single()

      if (error) throw error
      await fetchDrivers()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating driver")
      throw err
    }
  }

  const updateDriver = async (id: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)

      if (error) throw error
      await fetchDrivers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating driver")
      throw err
    }
  }

  const deleteDriver = async (id: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id)

      if (error) throw error
      await fetchDrivers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting driver")
      throw err
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

  return {
    drivers,
    allUsers,
    loading,
    error,
    createDriver,
    updateDriver,
    deleteDriver,
    refetch: fetchDrivers,
  }
}