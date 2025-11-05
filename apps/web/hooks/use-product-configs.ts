"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export interface ProductConfig {
  id: number
  product_id: string
  units_per_package: number
  created_at: string
  updated_at: string
  product?: {
    id: string
    name: string
    description: string | null
    weight: string | null
    price: number | null
  }
}

export interface ProductAlias {
  id: number
  product_id: string
  real_product_name: string | null
  client_alias: string | null
  client_id: string | null
  client_name: string | null
  created_at: string
  product?: {
    id: string
    name: string
    description: string | null
  }
  client?: {
    id: string
    name: string
  }
}

export function useProductConfigs() {
  const [productConfigs, setProductConfigs] = useState<ProductConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchProductConfigs = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("product_config")
        .select(`
          *,
          product:products!product_config_product_id_fkey (
            id,
            name,
            description,
            weight,
            price
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching product configs:", error)
        setError(error.message)
        return
      }

      setProductConfigs(data || [])
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const updateProductConfig = async (id: number, units_per_package: number) => {
    try {
      const { error } = await supabase
        .from("product_config")
        .update({
          units_per_package,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)

      if (error) {
        throw error
      }

      // Update local state
      setProductConfigs(prev => 
        prev.map(config => 
          config.id === id 
            ? { ...config, units_per_package, updated_at: new Date().toISOString() }
            : config
        )
      )

      return true
    } catch (error: any) {
      console.error("Error updating product config:", error)
      throw error
    }
  }

  const createProductConfig = async (product_id: string, units_per_package: number = 1) => {
    try {
      const { data, error } = await supabase
        .from("product_config")
        .insert({
          product_id,
          units_per_package
        })
        .select(`
          *,
          product:products!product_config_product_id_fkey (
            id,
            name,
            description,
            weight,
            price
          )
        `)
        .single()

      if (error) {
        throw error
      }

      setProductConfigs(prev => [data, ...prev])
      return data
    } catch (error: any) {
      console.error("Error creating product config:", error)
      throw error
    }
  }

  useEffect(() => {
    fetchProductConfigs()
  }, [])

  return {
    productConfigs,
    loading,
    error,
    updateProductConfig,
    createProductConfig,
    refetch: fetchProductConfigs
  }
}

export function useProductAliases() {
  const [productAliases, setProductAliases] = useState<ProductAlias[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProductAliases = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("product_aliases")
        .select(`
          *,
          product:products!product_aliases_product_id_fkey (
            id,
            name,
            description
          ),
          client:clients!product_aliases_client_id_fkey (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching product aliases:", error)
        setError(error.message)
        return
      }

      setProductAliases(data || [])
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createProductAlias = async (
    product_id: string,
    client_id: string,
    client_alias: string
  ) => {
    try {
      const { data, error } = await supabase
        .from("product_aliases")
        .insert({
          product_id,
          client_id,
          client_alias
        })
        .select(`
          *,
          product:products!product_aliases_product_id_fkey (
            id,
            name,
            description
          ),
          client:clients!product_aliases_client_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (error) {
        throw error
      }

      setProductAliases(prev => [data, ...prev])
      return data
    } catch (error: any) {
      console.error("Error creating product alias:", error)
      throw error
    }
  }

  const updateProductAlias = async (
    id: number,
    updates: {
      client_alias?: string
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from("product_aliases")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          product:products!product_aliases_product_id_fkey (
            id,
            name,
            description
          ),
          client:clients!product_aliases_client_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (error) {
        throw error
      }

      setProductAliases(prev => 
        prev.map(alias => alias.id === id ? data : alias)
      )
      return data
    } catch (error: any) {
      console.error("Error updating product alias:", error)
      throw error
    }
  }

  const deleteProductAlias = async (id: number) => {
    try {
      const { error } = await supabase
        .from("product_aliases")
        .delete()
        .eq("id", id)

      if (error) {
        throw error
      }

      setProductAliases(prev => prev.filter(alias => alias.id !== id))
      return true
    } catch (error: any) {
      console.error("Error deleting product alias:", error)
      throw error
    }
  }

  useEffect(() => {
    fetchProductAliases()
  }, [])

  return {
    productAliases,
    loading,
    error,
    createProductAlias,
    updateProductAlias,
    deleteProductAlias,
    refetch: fetchProductAliases
  }
}