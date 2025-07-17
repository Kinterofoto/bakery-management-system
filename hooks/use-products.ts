"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("products").select("*").order("name")

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching products")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  }
}
