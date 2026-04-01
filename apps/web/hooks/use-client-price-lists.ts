"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/database.types"

type ClientPriceList = Database["public"]["Tables"]["client_price_lists"]["Row"] & {
  product?: {
    id: string
    name: string
    description: string | null
    price: number | null
    unit: string
  }
  client?: {
    id: string
    name: string
  }
}

type ClientPriceListInsert = Database["public"]["Tables"]["client_price_lists"]["Insert"]
type ClientPriceListUpdate = Database["public"]["Tables"]["client_price_lists"]["Update"]

interface NamedPriceEntry {
  product_id: string
  price: number
  price_list_name: string
}

export function useClientPriceLists() {
  const [priceLists, setPriceLists] = useState<ClientPriceList[]>([])
  const [namedPriceEntries, setNamedPriceEntries] = useState<NamedPriceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchPriceLists = async () => {
    try {
      setLoading(true)
      setError(null)

      const [clientPricesResult, namedPricesResult] = await Promise.all([
        supabase
          .from("client_price_lists")
          .select(`
            *,
            product:products!client_price_lists_product_id_fkey (
              id,
              name,
              description,
              price,
              unit
            ),
            client:clients!client_price_lists_client_id_fkey (
              id,
              name
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("product_price_lists")
          .select("product_id, price, price_list_name")
          .eq("is_active", true)
      ])

      if (clientPricesResult.error) {
        console.error("Error fetching price lists:", clientPricesResult.error)
        setError(clientPricesResult.error.message)
        return
      }

      setPriceLists(clientPricesResult.data || [])
      setNamedPriceEntries(namedPricesResult.data || [])
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createPriceList = async (priceData: ClientPriceListInsert) => {
    try {
      const { data, error } = await supabase
        .from("client_price_lists")
        .insert(priceData)
        .select(`
          *,
          product:products!client_price_lists_product_id_fkey (
            id,
            name,
            description,
            price,
            unit
          ),
          client:clients!client_price_lists_client_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (error) {
        throw error
      }

      setPriceLists(prev => [data, ...prev])
      return data
    } catch (error: any) {
      console.error("Error creating price list:", error)
      throw error
    }
  }

  const updatePriceList = async (id: number, updates: ClientPriceListUpdate) => {
    try {
      const { data, error } = await supabase
        .from("client_price_lists")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select(`
          *,
          product:products!client_price_lists_product_id_fkey (
            id,
            name,
            description,
            price,
            unit
          ),
          client:clients!client_price_lists_client_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (error) {
        throw error
      }

      setPriceLists(prev => 
        prev.map(price => price.id === id ? data : price)
      )
      return data
    } catch (error: any) {
      console.error("Error updating price list:", error)
      throw error
    }
  }

  const deletePriceList = async (id: number) => {
    try {
      const { error } = await supabase
        .from("client_price_lists")
        .update({ is_active: false })
        .eq("id", id)

      if (error) {
        throw error
      }

      setPriceLists(prev => prev.filter(price => price.id !== id))
      return true
    } catch (error: any) {
      console.error("Error deleting price list:", error)
      throw error
    }
  }

  const getClientPrice = (productId: string, clientId: string): number | null => {
    const clientPrice = priceLists.find(
      p => p.product_id === productId && p.client_id === clientId && p.is_active
    )
    return clientPrice?.unit_price || null
  }

  // Get price from a named price list
  const getNamedListPrice = (productId: string, listName: string): number | null => {
    const entry = namedPriceEntries.find(
      e => e.product_id === productId && e.price_list_name === listName
    )
    return entry?.price ?? null
  }

  // Calculate unit price from package price and units per package
  // Priority: 1) Client-specific price, 2) Named price list, 3) Regular price
  const calculateUnitPrice = (
    packagePrice: number,
    unitsPerPackage: number,
    productId: string,
    clientId: string,
    assignedPriceList?: string | null
  ): number => {
    // First check if there's a specific client price
    const clientPrice = getClientPrice(productId, clientId)
    if (clientPrice !== null) {
      return clientPrice
    }

    // Then check named price list
    if (assignedPriceList) {
      const namedPrice = getNamedListPrice(productId, assignedPriceList)
      if (namedPrice !== null) {
        return namedPrice
      }
    }

    // Fallback to calculated price from package
    return packagePrice / unitsPerPackage
  }

  // Get all unique clients that have specific pricing
  const getClientsWithPricing = () => {
    const clientMap = new Map<string, { id: string; name: string; productCount: number }>()
    
    priceLists.forEach(price => {
      if (price.client && price.is_active) {
        const existing = clientMap.get(price.client.id)
        if (existing) {
          existing.productCount++
        } else {
          clientMap.set(price.client.id, {
            id: price.client.id,
            name: price.client.name,
            productCount: 1
          })
        }
      }
    })

    return Array.from(clientMap.values())
  }

  useEffect(() => {
    fetchPriceLists()
  }, [])

  return {
    priceLists,
    namedPriceEntries,
    loading,
    error,
    createPriceList,
    updatePriceList,
    deletePriceList,
    getClientPrice,
    getNamedListPrice,
    calculateUnitPrice,
    getClientsWithPricing,
    refetch: fetchPriceLists
  }
}