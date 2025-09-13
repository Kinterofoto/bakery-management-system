"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface ClientCreditTerm {
  id: number
  client_id: string
  credit_days: number
  created_at: string
  updated_at: string
  client?: {
    id: string
    name: string
  }
}

export function useClientCreditTerms() {
  const [creditTerms, setCreditTerms] = useState<ClientCreditTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingTerms, setSavingTerms] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const fetchCreditTerms = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('client_credit_terms')
        .select(`
          *,
          client:clients(id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCreditTerms(data || [])
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar términos de crédito'
      setError(errorMessage)
      console.error('Error fetching credit terms:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateCreditTermInstantly = async (
    clientId: string,
    creditDays: number
  ): Promise<void> => {
    const termKey = clientId

    try {
      // Actualizar estado inmediatamente para renderizado en tiempo real
      setCreditTerms(prev => {
        const existing = prev.find(ct => ct.client_id === clientId)

        if (existing) {
          return prev.map(ct =>
            ct.client_id === clientId
              ? { ...ct, credit_days: creditDays, updated_at: new Date().toISOString() }
              : ct
          )
        } else {
          // Crear término temporal mientras se guarda
          const newTerm: ClientCreditTerm = {
            id: Date.now(), // ID temporal
            client_id: clientId,
            credit_days: creditDays,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          return [...prev, newTerm]
        }
      })

      // Marcar como guardando
      setSavingTerms(prev => new Set(prev).add(termKey))

      // Guardar en base de datos
      const { data, error } = await supabase
        .from('client_credit_terms')
        .upsert(
          {
            client_id: clientId,
            credit_days: creditDays,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'client_id'
          }
        )
        .select(`
          *,
          client:clients(id, name)
        `)
        .single()

      if (error) throw error

      // Actualizar con datos reales de la base de datos
      setCreditTerms(prev => {
        const existing = prev.find(ct => ct.client_id === clientId)

        if (existing) {
          return prev.map(ct =>
            ct.client_id === clientId ? data : ct
          )
        } else {
          return prev.filter(ct => ct.client_id !== clientId).concat([data])
        }
      })

    } catch (err: any) {
      // Revertir cambio si hay error
      fetchCreditTerms()
      const errorMessage = err.message || 'Error al actualizar término de crédito'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      // Quitar de estado de guardando
      setSavingTerms(prev => {
        const newSet = new Set(prev)
        newSet.delete(termKey)
        return newSet
      })
    }
  }

  const getCreditDaysByClient = (clientId: string): number => {
    const term = creditTerms.find(ct => ct.client_id === clientId)
    return term?.credit_days ?? 30 // Default 30 días
  }

  const isSaving = (clientId: string): boolean => {
    return savingTerms.has(clientId)
  }

  const getAvailableCreditDays = (): number[] => {
    return [0, 8, 15, 20, 30, 35, 45]
  }

  useEffect(() => {
    fetchCreditTerms()
  }, [])

  return {
    creditTerms,
    loading,
    error,
    fetchCreditTerms,
    updateCreditTermInstantly,
    getCreditDaysByClient,
    isSaving,
    getAvailableCreditDays
  }
}