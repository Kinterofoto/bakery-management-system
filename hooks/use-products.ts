"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchProducts = useCallback(async (categoryFilter?: "PT" | "MP") => {
    try {
      setLoading(true)
      let query = supabase
        .from("products")
        .select("id, name, description, unit, price, weight, category, nombre_wo, codigo_wo, created_at")
      
      if (categoryFilter) {
        query = query.eq("category", categoryFilter)
      }
      
      const { data, error } = await query.order("name")

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching products")
    } finally {
      setLoading(false)
    }
  }, [])

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      return products
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, unit, price, weight, category, nombre_wo, codigo_wo, created_at")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,id.ilike.%${query}%`)
        .order("name")
        .limit(50)

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error searching products:", err)
      return []
    }
  }, [products])

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      return products.slice(0, 100) // Limitar a 100 productos para mejor performance
    }

    const query = searchTerm.toLowerCase()
    return products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.id.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query))
    ).slice(0, 50) // Limitar resultados de búsqueda a 50
  }, [products, searchTerm])

  const getProductById = useCallback((id: string) => {
    return products.find(product => product.id === id)
  }, [products])

  const getProductsByIds = useCallback((ids: string[]) => {
    return products.filter(product => ids.includes(product.id))
  }, [products])

  // Métodos específicos para producción
  const getFinishedProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category", "PT")
        .order("name")

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching finished products:", err)
      return []
    }
  }, [])

  const getRawMaterials = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category", "MP")
        .order("name")

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching raw materials:", err)
      return []
    }
  }, [])

  const getAllProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name")

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching all products:", err)
      return []
    }
  }, [])

  const createProduct = useCallback(async (productData: Partial<Product>) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single()

      if (error) throw error

      // Update local state
      setProducts(prev => [...prev, data])

      return data
    } catch (err) {
      console.error("Error creating product:", err)
      throw err
    }
  }, [])

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // Update local state
      setProducts(prev =>
        prev.map(product =>
          product.id === id ? { ...product, ...updates } : product
        )
      )

      return data
    } catch (err) {
      console.error("Error updating product:", err)
      throw err
    }
  }, [])

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)

      if (error) throw error

      // Update local state
      setProducts(prev => prev.filter(product => product.id !== id))
    } catch (err) {
      console.error("Error deleting product:", err)
      throw err
    }
  }, [])

  const updateWorldOfficeFields = useCallback(async (id: string, nombre_wo: string, codigo_wo: string) => {
    return updateProduct(id, { nombre_wo, codigo_wo })
  }, [updateProduct])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    products,
    filteredProducts,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    searchProducts,
    getProductById,
    getProductsByIds,
    getFinishedProducts,
    getRawMaterials,
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateWorldOfficeFields,
    refetch: fetchProducts,
  }
}
