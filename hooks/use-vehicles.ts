"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setVehicles(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching vehicles")
    } finally {
      setLoading(false)
    }
  }

  const createVehicle = async (vehicleData: {
    vehicle_code: string
    driver_name?: string
    capacity_kg?: number
    status?: "available" | "in_use" | "maintenance"
  }) => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({
          ...vehicleData,
          status: vehicleData.status || "available",
        })
        .select()
        .single()

      if (error) throw error
      await fetchVehicles()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating vehicle")
      throw err
    }
  }

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update(updates)
        .eq("id", id)

      if (error) throw error
      await fetchVehicles()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating vehicle")
      throw err
    }
  }

  const deleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", id)

      if (error) throw error
      await fetchVehicles()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting vehicle")
      throw err
    }
  }

  const assignDriverToVehicle = async (vehicleId: string, driverName: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ 
          driver_name: driverName,
          status: "in_use"
        })
        .eq("id", vehicleId)

      if (error) throw error
      await fetchVehicles()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error assigning driver to vehicle")
      throw err
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

  return {
    vehicles,
    loading,
    error,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    assignDriverToVehicle,
    refetch: fetchVehicles,
  }
}