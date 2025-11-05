"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/database.types"

type SystemConfig = Database["public"]["Tables"]["system_config"]["Row"]
type SystemConfigInsert = Database["public"]["Tables"]["system_config"]["Insert"]
type SystemConfigUpdate = Database["public"]["Tables"]["system_config"]["Update"]

export function useSystemConfig() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .order("config_key", { ascending: true })

      if (error) {
        console.error("Error fetching system configs:", error)
        setError(error.message)
        return
      }

      setConfigs(data || [])
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const getConfigValue = (key: string): string | null => {
    const config = configs.find(c => c.config_key === key)
    return config?.config_value || null
  }

  const getConfigNumber = (key: string): number | null => {
    const value = getConfigValue(key)
    return value ? parseInt(value, 10) : null
  }

  const updateConfig = async (key: string, value: string) => {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .update({ 
          config_value: value,
          updated_at: new Date().toISOString()
        })
        .eq("config_key", key)
        .select()
        .single()

      if (error) {
        throw error
      }

      // Update local state
      setConfigs(prev => 
        prev.map(config => 
          config.config_key === key 
            ? { ...config, config_value: value, updated_at: new Date().toISOString() }
            : config
        )
      )

      return data
    } catch (error: any) {
      console.error("Error updating config:", error)
      throw error
    }
  }

  const createConfig = async (configData: SystemConfigInsert) => {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .insert(configData)
        .select()
        .single()

      if (error) {
        throw error
      }

      setConfigs(prev => [...prev, data])
      return data
    } catch (error: any) {
      console.error("Error creating config:", error)
      throw error
    }
  }

  // Specific methods for common operations
  const getInvoiceNumber = async (): Promise<number> => {
    const currentNumber = getConfigNumber("invoice_last_number") || 63629
    const newNumber = currentNumber + 1
    
    await updateConfig("invoice_last_number", newNumber.toString())
    
    return newNumber
  }

  const getWorldOfficeConfig = () => {
    return {
      companyName: getConfigValue("wo_company_name") || "PASTRY CHEF PASTELERIA Y COCINA GOURMET SAS",
      thirdPartyInternal: getConfigValue("wo_third_party_internal") || "52197741",
      thirdPartyExternal: getConfigValue("wo_third_party_external") || "900236520",
      documentType: getConfigValue("wo_document_type") || "FV",
      documentPrefix: getConfigValue("wo_document_prefix") || "FE",
      paymentMethod: getConfigValue("wo_payment_method") || "Credito",
      warehouse: getConfigValue("wo_warehouse") || "PRINCIPAL",
      unitMeasure: getConfigValue("wo_unit_measure") || "Und.",
      ivaRate: parseFloat(getConfigValue("wo_iva_rate") || "0.19")
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  return {
    configs,
    loading,
    error,
    getConfigValue,
    getConfigNumber,
    updateConfig,
    createConfig,
    getInvoiceNumber,
    getWorldOfficeConfig,
    refetch: fetchConfigs
  }
}