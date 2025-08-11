"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { useAuth } from "@/contexts/AuthContext"

type Client = Database["public"]["Tables"]["clients"]["Row"]
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"]

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchClients = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("clients").select("*").order("name")

      if (error) throw error
      setClients(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching clients")
    } finally {
      setLoading(false)
    }
  }

  const createClient = async (clientData: ClientInsert) => {
    try {
      const { data, error } = await supabase.from("clients").insert(clientData).select().single()

      if (error) throw error
      await fetchClients()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating client")
      throw err
    }
  }

  const updateClient = async (id: string, clientData: Partial<ClientInsert>) => {
    try {
      const { error } = await supabase.from("clients").update(clientData).eq("id", id)

      if (error) throw error
      await fetchClients()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating client")
      throw err
    }
  }

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id)

      if (error) throw error
      await fetchClients()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting client")
      throw err
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  return {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    refetch: fetchClients,
  }
}
