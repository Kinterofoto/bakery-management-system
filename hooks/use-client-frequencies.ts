"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

interface ClientFrequency {
  id: string
  branch_id: string
  day_of_week: number
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

interface FrequencyWithDetails {
  branch_id: string
  client_id: string
  branch_name: string
  client_name: string
  frequency_id: string
  notes: string | null
}

interface CreateFrequencyData {
  branch_id: string
  day_of_week: number
  is_active?: boolean
  notes?: string
}

export function useClientFrequencies() {
  const [frequencies, setFrequencies] = useState<ClientFrequency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  // Fetch all frequencies
  const fetchFrequencies = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("client_frequencies")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setFrequencies(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error fetching frequencies"
      setError(errorMessage)
      console.error("Error fetching frequencies:", err)
    } finally {
      setLoading(false)
    }
  }

  // Get frequencies for a specific branch
  const getFrequenciesForBranch = (branchId: string) => {
    return frequencies.filter(freq => freq.branch_id === branchId && freq.is_active)
  }

  // Get frequencies for a specific day of week
  const getFrequenciesForDay = useCallback(async (dayOfWeek: number): Promise<FrequencyWithDetails[]> => {
    // First try the manual query approach which is more reliable
    try {
      const { data: frequencyData, error: queryError } = await supabase
        .from('client_frequencies')
        .select(`
          id,
          branch_id,
          day_of_week,
          notes,
          branches!inner(
            id,
            name,
            client_id,
            clients!inner(
              id,
              name
            )
          )
        `)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)

      if (queryError) {
        console.error("Table query error:", queryError)
        
        // If table doesn't exist, show helpful message
        if (queryError.code === '42P01') { // relation does not exist
          toast({
            title: "Tabla no encontrada",
            description: "La tabla client_frequencies no existe. Ejecuta el script SQL primero.",
            variant: "destructive"
          })
          return []
        }
        
        throw queryError
      }

      // Transform data to match expected interface
      const result = (frequencyData || []).map(freq => ({
        branch_id: freq.branch_id,
        client_id: freq.branches.client_id,
        branch_name: freq.branches.name,
        client_name: freq.branches.clients.name,
        frequency_id: freq.id,
        notes: freq.notes
      }))

      console.log(`Found ${result.length} frequencies for day ${dayOfWeek}`)
      return result
      
    } catch (err) {
      console.error("Error getting frequencies for day:", err)
      
      // Only show toast for unexpected errors
      if (err.code !== '42P01') {
        toast({
          title: "Error",
          description: "No se pudieron obtener las frecuencias del día",
          variant: "destructive"
        })
      }
      
      return []
    }
  }, [toast])

  // Check if branch has frequency for specific day
  const hasFrequencyForDay = (branchId: string, dayOfWeek: number): boolean => {
    return frequencies.some(freq => 
      freq.branch_id === branchId && 
      freq.day_of_week === dayOfWeek && 
      freq.is_active
    )
  }

  // Create new frequency
  const createFrequency = async (frequencyData: CreateFrequencyData) => {
    try {
      const { data, error } = await supabase
        .from("client_frequencies")
        .insert([{
          ...frequencyData,
          is_active: frequencyData.is_active ?? true
        }])
        .select()
        .single()

      if (error) throw error

      // Update local state
      setFrequencies(prev => [data, ...prev])

      toast({
        title: "Frecuencia creada",
        description: "La frecuencia ha sido creada exitosamente"
      })

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error creating frequency"
      console.error("Error creating frequency:", err)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }

  // Toggle frequency for branch and day
  const toggleFrequency = async (branchId: string, dayOfWeek: number) => {
    try {
      // Check if frequency already exists
      const existingFreq = frequencies.find(freq => 
        freq.branch_id === branchId && freq.day_of_week === dayOfWeek
      )

      if (existingFreq) {
        // Update existing frequency (toggle active state)
        const { data, error } = await supabase
          .from("client_frequencies")
          .update({ is_active: !existingFreq.is_active })
          .eq("id", existingFreq.id)
          .select()
          .single()

        if (error) throw error

        // Update local state
        setFrequencies(prev => 
          prev.map(freq => 
            freq.id === existingFreq.id 
              ? { ...freq, is_active: !existingFreq.is_active, updated_at: data.updated_at }
              : freq
          )
        )

        toast({
          title: existingFreq.is_active ? "Frecuencia desactivada" : "Frecuencia activada",
          description: `La frecuencia ha sido ${existingFreq.is_active ? 'desactivada' : 'activada'} exitosamente`
        })

        return data
      } else {
        // Create new frequency
        return await createFrequency({
          branch_id: branchId,
          day_of_week: dayOfWeek,
          is_active: true
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error toggling frequency"
      console.error("Error toggling frequency:", err)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }

  // Update frequency
  const updateFrequency = async (id: string, updates: Partial<CreateFrequencyData>) => {
    try {
      const { data, error } = await supabase
        .from("client_frequencies")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // Update local state
      setFrequencies(prev => 
        prev.map(freq => freq.id === id ? { ...freq, ...data } : freq)
      )

      toast({
        title: "Frecuencia actualizada",
        description: "La frecuencia ha sido actualizada exitosamente"
      })

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error updating frequency"
      console.error("Error updating frequency:", err)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }

  // Delete frequency
  const deleteFrequency = async (id: string) => {
    try {
      const { error } = await supabase
        .from("client_frequencies")
        .delete()
        .eq("id", id)

      if (error) throw error

      // Update local state
      setFrequencies(prev => prev.filter(freq => freq.id !== id))

      toast({
        title: "Frecuencia eliminada",
        description: "La frecuencia ha sido eliminada exitosamente"
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error deleting frequency"
      console.error("Error deleting frequency:", err)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }

  // Get frequency statistics
  const getFrequencyStats = () => {
    const activeFrequencies = frequencies.filter(freq => freq.is_active)
    const dayStats = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      day,
      count: activeFrequencies.filter(freq => freq.day_of_week === day).length
    }))

    return {
      total: frequencies.length,
      active: activeFrequencies.length,
      inactive: frequencies.length - activeFrequencies.length,
      byDay: dayStats
    }
  }

  // Initialize data on mount
  useEffect(() => {
    if (user) {
      fetchFrequencies()
    }
  }, [user])

  return {
    frequencies,
    loading,
    error,
    fetchFrequencies,
    refetch: fetchFrequencies,
    getFrequenciesForBranch,
    getFrequenciesForDay,
    hasFrequencyForDay,
    createFrequency,
    toggleFrequency,
    updateFrequency,
    deleteFrequency,
    getFrequencyStats
  }
}