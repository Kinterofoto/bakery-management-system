"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  getSettingsInitialData,
  createClient as createClientAction,
  updateClient as updateClientAction,
  toggleClientActive as toggleClientActiveAction,
  createBranch as createBranchAction,
  updateBranch as updateBranchAction,
  deleteBranch as deleteBranchAction,
  toggleFrequency as toggleFrequencyAction,
  updateCreditTerm as updateCreditTermAction,
  updateClientBillingType as updateClientBillingTypeAction,
  type Client,
  type Branch,
  type ClientFrequency,
  type ClientCreditTerm,
} from "@/app/order-management/settings/actions"

export function useSettingsData() {
  const [clients, setClients] = useState<Client[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [frequencies, setFrequencies] = useState<ClientFrequency[]>([])
  const [creditTerms, setCreditTerms] = useState<ClientCreditTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch all data in one server action call
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await getSettingsInitialData()

      if (error) throw new Error(error)
      if (data) {
        setClients(data.clients)
        setBranches(data.branches)
        setFrequencies(data.frequencies)
        setCreditTerms(data.creditTerms)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error fetching data"
      setError(errorMessage)
      console.error("Error fetching settings data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Memoized branches lookup by client_id for O(1) access
  const branchesByClientMap = useMemo(() => {
    const map: Record<string, Branch[]> = {}
    branches.forEach(branch => {
      if (!map[branch.client_id]) {
        map[branch.client_id] = []
      }
      map[branch.client_id].push(branch)
    })
    return map
  }, [branches])

  const getBranchesByClient = useCallback((clientId: string) => {
    return branchesByClientMap[clientId] || []
  }, [branchesByClientMap])

  // Memoized credit terms lookup by client_id
  const creditTermsByClientMap = useMemo(() => {
    const map: Record<string, number> = {}
    creditTerms.forEach(term => {
      map[term.client_id] = term.credit_days
    })
    return map
  }, [creditTerms])

  const getCreditDaysByClient = useCallback((clientId: string) => {
    return creditTermsByClientMap[clientId] ?? 0
  }, [creditTermsByClientMap])

  // === Client Actions ===

  const createClient = useCallback(async (clientData: Omit<Client, "id" | "created_at" | "is_active">) => {
    const { data, error } = await createClientAction(clientData)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      throw new Error(error)
    }
    if (data) {
      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    return data!
  }, [toast])

  const updateClient = useCallback(async (id: string, clientData: Partial<Client>) => {
    const { success, error } = await updateClientAction(id, clientData)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      throw new Error(error)
    }
    if (success) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...clientData } : c))
    }
  }, [toast])

  const toggleClientActive = useCallback(async (id: string, isActive: boolean) => {
    const { success, error } = await toggleClientActiveAction(id, isActive)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      throw new Error(error)
    }
    if (success) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, is_active: isActive } : c))
    }
  }, [toast])

  const updateClientBillingType = useCallback(async (clientId: string, billingType: "facturable" | "remision") => {
    const { success, error } = await updateClientBillingTypeAction(clientId, billingType)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      throw new Error(error)
    }
    if (success) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, billing_type: billingType } : c))
      toast({ title: "Exito", description: `Tipo de facturacion actualizado a ${billingType === 'facturable' ? 'Factura' : 'Remision'}` })
    }
  }, [toast])

  // === Branch Actions ===

  const createBranch = useCallback(async (branchData: Omit<Branch, "id" | "created_at">) => {
    const { data, error } = await createBranchAction(branchData)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      throw new Error(error)
    }
    if (data) {
      setBranches(prev => [data, ...prev])
    }
    return data!
  }, [toast])

  const updateBranch = useCallback(async (id: string, branchData: Partial<Branch>) => {
    const { success, error } = await updateBranchAction(id, branchData)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      throw new Error(error)
    }
    if (success) {
      setBranches(prev => prev.map(b => b.id === id ? { ...b, ...branchData } : b))
    }
  }, [toast])

  const deleteBranch = useCallback(async (id: string) => {
    const { success, error } = await deleteBranchAction(id)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      throw new Error(error)
    }
    if (success) {
      setBranches(prev => prev.filter(b => b.id !== id))
    }
  }, [toast])

  // === Frequency Actions ===

  const toggleFrequency = useCallback(async (branchId: string, dayOfWeek: number) => {
    const { data, error } = await toggleFrequencyAction(branchId, dayOfWeek)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      throw new Error(error)
    }
    if (data) {
      setFrequencies(prev => {
        const existingIndex = prev.findIndex(f => f.branch_id === branchId && f.day_of_week === dayOfWeek)
        if (existingIndex >= 0) {
          return prev.map((f, i) => i === existingIndex ? data : f)
        }
        return [data, ...prev]
      })
      toast({
        title: data.is_active ? "Frecuencia activada" : "Frecuencia desactivada",
        description: `La frecuencia ha sido ${data.is_active ? 'activada' : 'desactivada'} exitosamente`
      })
    }
  }, [toast])

  // === Credit Term Actions ===

  const [savingCreditTerms, setSavingCreditTerms] = useState<Set<string>>(new Set())

  const updateCreditTerm = useCallback(async (clientId: string, creditDays: number) => {
    setSavingCreditTerms(prev => new Set(prev).add(clientId))
    try {
      const { success, error } = await updateCreditTermAction(clientId, creditDays)
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" })
        throw new Error(error)
      }
      if (success) {
        setCreditTerms(prev => {
          const existingIndex = prev.findIndex(t => t.client_id === clientId)
          if (existingIndex >= 0) {
            return prev.map((t, i) => i === existingIndex ? { ...t, credit_days: creditDays } : t)
          }
          return [...prev, { id: crypto.randomUUID(), client_id: clientId, credit_days: creditDays }]
        })
      }
    } finally {
      setSavingCreditTerms(prev => {
        const next = new Set(prev)
        next.delete(clientId)
        return next
      })
    }
  }, [toast])

  const isSavingCreditTerm = useCallback((clientId: string) => {
    return savingCreditTerms.has(clientId)
  }, [savingCreditTerms])

  return {
    // Data
    clients,
    branches,
    frequencies,
    creditTerms,
    loading,
    error,

    // Lookups
    getBranchesByClient,
    getCreditDaysByClient,

    // Client actions
    createClient,
    updateClient,
    toggleClientActive,
    updateClientBillingType,

    // Branch actions
    createBranch,
    updateBranch,
    deleteBranch,

    // Frequency actions
    toggleFrequency,

    // Credit term actions
    updateCreditTerm,
    isSavingCreditTerm,

    // Refetch
    refetch: fetchData,
  }
}
