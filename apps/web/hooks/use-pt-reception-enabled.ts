"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const SETTING_KEY = "pt_reception_enabled"

export function usePtReceptionEnabled() {
  const [enabled, setEnabled] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(true)
  const [updating, setUpdating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSetting = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: queryError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle()

      if (queryError) throw queryError
      const raw = data?.value
      const next = typeof raw === "boolean" ? raw : raw === null || raw === undefined ? true : Boolean(raw)
      setEnabled(next)
      return next
    } catch (err) {
      console.error("Error reading pt_reception_enabled:", err)
      setError(err instanceof Error ? err.message : "Error leyendo configuración")
      return true
    } finally {
      setLoading(false)
    }
  }, [])

  const setEnabledRemote = useCallback(async (next: boolean) => {
    try {
      setUpdating(true)
      setError(null)
      const { error: upsertError } = await supabase
        .from("system_settings")
        .upsert(
          {
            key: SETTING_KEY,
            value: next as unknown as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        )

      if (upsertError) throw upsertError
      setEnabled(next)
    } catch (err) {
      console.error("Error updating pt_reception_enabled:", err)
      setError(err instanceof Error ? err.message : "Error actualizando configuración")
      throw err
    } finally {
      setUpdating(false)
    }
  }, [])

  useEffect(() => {
    fetchSetting()
  }, [fetchSetting])

  return {
    enabled,
    loading,
    updating,
    error,
    setEnabled: setEnabledRemote,
    refetch: fetchSetting,
  }
}

export async function fetchPtReceptionEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .maybeSingle()

    if (error) throw error
    const raw = data?.value
    return typeof raw === "boolean" ? raw : raw === null || raw === undefined ? true : Boolean(raw)
  } catch (err) {
    console.error("fetchPtReceptionEnabled fallback to true:", err)
    return true
  }
}
