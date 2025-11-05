"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"] & {
  driver?: Database["public"]["Tables"]["users"]["Row"] | null
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      
      // Obtener vehículos básicos
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false })

      if (vehiclesError) throw vehiclesError

      // Obtener datos de conductores si existen vehículos con driver_id
      const driverIds = vehiclesData?.filter(v => v.driver_id).map(v => v.driver_id) || []
      let driversData = []
      
      if (driverIds.length > 0) {
        const { data, error: driversError } = await supabase
          .from("users")
          .select("*")
          .in("id", driverIds)
        
        if (driversError) {
          console.warn("Error fetching drivers:", driversError)
        } else {
          driversData = data || []
        }
      }

      // Combinar datos
      const enrichedVehicles = vehiclesData?.map(vehicle => ({
        ...vehicle,
        driver: driversData.find(driver => driver.id === vehicle.driver_id) || null
      })) || []

      setVehicles(enrichedVehicles)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching vehicles")
    } finally {
      setLoading(false)
    }
  }

  const createVehicle = async (vehicleData: {
    vehicle_code: string
    driver_id?: string
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

  const assignDriverToVehicle = async (vehicleId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ 
          driver_id: driverId,
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