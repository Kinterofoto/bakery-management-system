"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type User = Database["public"]["Tables"]["users"]["Row"]
type Salesperson = User & { role: "commercial" }

export function useSalespeople() {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSalespeople = async () => {
    try {
      setLoading(true)

      // Obtener solo usuarios con rol commercial (vendedores)
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "commercial")
        .order("name", { ascending: true })

      if (fetchError) throw fetchError

      setSalespeople(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching salespeople")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalespeople()
  }, [])

  return {
    salespeople,
    loading,
    error,
    refetch: fetchSalespeople,
  }
}
