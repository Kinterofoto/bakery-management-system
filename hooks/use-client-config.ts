"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ClientConfig = Database["public"]["Tables"]["client_config"]["Row"]
type ClientConfigInsert = Database["public"]["Tables"]["client_config"]["Insert"]
type ClientConfigUpdate = Database["public"]["Tables"]["client_config"]["Update"]

export function useClientConfig() {
  const [clientConfigs, setClientConfigs] = useState<ClientConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchClientConfig = async (clientId: string): Promise<ClientConfig | null> => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("client_config")
        .select("*")
        .eq("client_id", clientId)
        .single()

      if (error) {
        // If no config exists, return null (not an error)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching client config")
      return null
    } finally {
      setLoading(false)
    }
  }

  const createClientConfig = async (configData: ClientConfigInsert): Promise<ClientConfig | null> => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("client_config")
        .insert(configData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating client config")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateClientConfig = async (clientId: string, configData: ClientConfigUpdate): Promise<ClientConfig | null> => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("client_config")
        .update(configData)
        .eq("client_id", clientId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating client config")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const upsertClientConfig = async (
    clientId: string,
    ordersByUnits: boolean,
    deliversToMainBranch?: boolean
  ): Promise<ClientConfig | null> => {
    try {
      setLoading(true)

      // First try to find existing config
      const { data: existingConfig } = await supabase
        .from("client_config")
        .select("*")
        .eq("client_id", clientId)
        .single()

      const updateData: ClientConfigUpdate = { orders_by_units: ordersByUnits }
      if (deliversToMainBranch !== undefined) {
        updateData.delivers_to_main_branch = deliversToMainBranch
      }

      if (existingConfig) {
        // Update existing config
        const { data, error } = await supabase
          .from("client_config")
          .update(updateData)
          .eq("client_id", clientId)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new config
        const insertData: ClientConfigInsert = {
          client_id: clientId,
          orders_by_units: ordersByUnits
        }
        if (deliversToMainBranch !== undefined) {
          insertData.delivers_to_main_branch = deliversToMainBranch
        }

        const { data, error } = await supabase
          .from("client_config")
          .insert(insertData)
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving client config")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteClientConfig = async (clientId: string): Promise<void> => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from("client_config")
        .delete()
        .eq("client_id", clientId)

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting client config")
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    clientConfigs,
    loading,
    error,
    fetchClientConfig,
    createClientConfig,
    updateClientConfig,
    upsertClientConfig,
    deleteClientConfig,
  }
}