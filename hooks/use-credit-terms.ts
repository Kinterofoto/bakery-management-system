"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/database.types"

type CreditTerms = Database["public"]["Tables"]["client_credit_terms"]["Row"] & {
  client?: {
    id: string
    name: string
  }
}

type CreditTermsInsert = Database["public"]["Tables"]["client_credit_terms"]["Insert"]
type CreditTermsUpdate = Database["public"]["Tables"]["client_credit_terms"]["Update"]

export function useCreditTerms() {
  const [creditTerms, setCreditTerms] = useState<CreditTerms[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchCreditTerms = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("client_credit_terms")
        .select(`
          *,
          client:clients!client_credit_terms_client_id_fkey (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching credit terms:", error)
        setError(error.message)
        return
      }

      setCreditTerms(data || [])
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createCreditTerms = async (termsData: CreditTermsInsert) => {
    try {
      const { data, error } = await supabase
        .from("client_credit_terms")
        .insert(termsData)
        .select(`
          *,
          client:clients!client_credit_terms_client_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (error) {
        throw error
      }

      setCreditTerms(prev => [data, ...prev])
      return data
    } catch (error: any) {
      console.error("Error creating credit terms:", error)
      throw error
    }
  }

  const updateCreditTerms = async (id: number, updates: CreditTermsUpdate) => {
    try {
      const { data, error } = await supabase
        .from("client_credit_terms")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select(`
          *,
          client:clients!client_credit_terms_client_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (error) {
        throw error
      }

      setCreditTerms(prev => 
        prev.map(terms => terms.id === id ? data : terms)
      )
      return data
    } catch (error: any) {
      console.error("Error updating credit terms:", error)
      throw error
    }
  }

  const deleteCreditTerms = async (id: number) => {
    try {
      const { error } = await supabase
        .from("client_credit_terms")
        .delete()
        .eq("id", id)

      if (error) {
        throw error
      }

      setCreditTerms(prev => prev.filter(terms => terms.id !== id))
      return true
    } catch (error: any) {
      console.error("Error deleting credit terms:", error)
      throw error
    }
  }

  const getCreditDays = (clientId: string): number => {
    const terms = creditTerms.find(t => t.client_id === clientId)
    return terms?.credit_days || 30 // Default 30 days
  }

  const calculateDueDate = (deliveryDate: string, clientId: string): string => {
    const creditDays = getCreditDays(clientId)
    const delivery = new Date(deliveryDate)
    const dueDate = new Date(delivery)
    dueDate.setDate(delivery.getDate() + creditDays)
    return dueDate.toISOString().split('T')[0] // Return YYYY-MM-DD format
  }

  useEffect(() => {
    fetchCreditTerms()
  }, [])

  return {
    creditTerms,
    loading,
    error,
    createCreditTerms,
    updateCreditTerms,
    deleteCreditTerms,
    getCreditDays,
    calculateDueDate,
    refetch: fetchCreditTerms
  }
}