"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export interface NamedPriceListEntry {
  id: string
  product_id: string
  price_list_name: string
  price: number
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  product?: {
    id: string
    name: string
    description: string | null
    price: number | null
    weight: string | null
  }
}

export interface PriceListSummary {
  name: string
  productCount: number
}

export function useNamedPriceLists() {
  const [entries, setEntries] = useState<NamedPriceListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("product_price_lists")
        .select(`
          id,
          product_id,
          price_list_name,
          price,
          is_active,
          created_at,
          updated_at,
          product:products!product_price_lists_product_id_fkey (
            id,
            name,
            description,
            price,
            weight
          )
        `)
        .eq("is_active", true)
        .order("price_list_name")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching named price lists:", error)
        return
      }

      setEntries(data || [])
    } catch (err) {
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const getPriceListNames = useCallback((): PriceListSummary[] => {
    const map = new Map<string, number>()
    entries.forEach(e => {
      map.set(e.price_list_name, (map.get(e.price_list_name) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, productCount]) => ({ name, productCount }))
  }, [entries])

  const getEntriesForList = useCallback((listName: string): NamedPriceListEntry[] => {
    return entries.filter(e => e.price_list_name === listName)
  }, [entries])

  const getPrice = useCallback((listName: string, productId: string): number | null => {
    const entry = entries.find(
      e => e.price_list_name === listName && e.product_id === productId && e.is_active
    )
    return entry?.price ?? null
  }, [entries])

  const createEntry = async (data: {
    product_id: string
    price_list_name: string
    price: number
  }) => {
    const { data: result, error } = await supabase
      .from("product_price_lists")
      .insert({
        product_id: data.product_id,
        price_list_name: data.price_list_name,
        price: data.price,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    await fetchEntries()
    return result
  }

  const updateEntry = async (id: string, updates: { price?: number }) => {
    const { error } = await supabase
      .from("product_price_lists")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error
    await fetchEntries()
  }

  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from("product_price_lists")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const createBulkEntries = async (
    listName: string,
    items: { product_id: string; price: number }[]
  ) => {
    const rows = items.map(item => ({
      product_id: item.product_id,
      price_list_name: listName,
      price: item.price,
      is_active: true,
    }))

    const { error } = await supabase
      .from("product_price_lists")
      .insert(rows)

    if (error) throw error
    await fetchEntries()
  }

  const deleteList = async (listName: string) => {
    const { error } = await supabase
      .from("product_price_lists")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("price_list_name", listName)

    if (error) throw error
    setEntries(prev => prev.filter(e => e.price_list_name !== listName))
  }

  return {
    entries,
    loading,
    getPriceListNames,
    getEntriesForList,
    getPrice,
    createEntry,
    updateEntry,
    deleteEntry,
    createBulkEntries,
    deleteList,
    refetch: fetchEntries,
  }
}
