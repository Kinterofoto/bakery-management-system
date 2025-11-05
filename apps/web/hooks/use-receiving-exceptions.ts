"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ReceivingException = Database["public"]["Tables"]["receiving_exceptions"]["Row"]
type ReceivingExceptionInsert = Database["public"]["Tables"]["receiving_exceptions"]["Insert"]
type ReceivingExceptionUpdate = Database["public"]["Tables"]["receiving_exceptions"]["Update"]

export function useReceivingExceptions() {
  const [exceptions, setExceptions] = useState<ReceivingException[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExceptions = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("receiving_exceptions")
        .select("*")
        .order("exception_date", { ascending: true })

      if (error) {
        console.error("Error fetching receiving exceptions:", error)
        setError(error.message)
        return
      }

      setExceptions(data || [])
    } catch (err: any) {
      console.error("Error fetching receiving exceptions:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createException = async (exceptionData: ReceivingExceptionInsert): Promise<ReceivingException> => {
    try {
      const { data, error } = await supabase
        .from("receiving_exceptions")
        .insert([exceptionData])
        .select()
        .single()

      if (error) {
        console.error("Error creating receiving exception:", error)
        throw error
      }

      setExceptions(prev => [...prev, data])
      return data
    } catch (err: any) {
      console.error("Error creating receiving exception:", err)
      throw err
    }
  }

  const updateException = async (
    exceptionId: string, 
    exceptionData: ReceivingExceptionUpdate
  ): Promise<ReceivingException> => {
    try {
      const { data, error } = await supabase
        .from("receiving_exceptions")
        .update(exceptionData)
        .eq("id", exceptionId)
        .select()
        .single()

      if (error) {
        console.error("Error updating receiving exception:", error)
        throw error
      }

      setExceptions(prev => 
        prev.map(exception => 
          exception.id === exceptionId ? data : exception
        )
      )
      return data
    } catch (err: any) {
      console.error("Error updating receiving exception:", err)
      throw err
    }
  }

  const deleteException = async (exceptionId: string) => {
    try {
      const { error } = await supabase
        .from("receiving_exceptions")
        .delete()
        .eq("id", exceptionId)

      if (error) {
        console.error("Error deleting receiving exception:", error)
        throw error
      }

      setExceptions(prev => prev.filter(exception => exception.id !== exceptionId))
    } catch (err: any) {
      console.error("Error deleting receiving exception:", err)
      throw err
    }
  }

  const getExceptionsByClient = (clientId: string): ReceivingException[] => {
    return exceptions.filter(exception => exception.client_id === clientId)
  }

  const getExceptionsByBranch = (branchId: string): ReceivingException[] => {
    return exceptions.filter(exception => exception.branch_id === branchId)
  }

  const getExceptionsByDateRange = (startDate: string, endDate: string): ReceivingException[] => {
    return exceptions.filter(exception => 
      exception.exception_date >= startDate && exception.exception_date <= endDate
    )
  }

  const getExceptionForDate = (
    date: string, 
    clientId?: string, 
    branchId?: string
  ): ReceivingException | null => {
    return exceptions.find(exception => 
      exception.exception_date === date &&
      (clientId ? exception.client_id === clientId : true) &&
      (branchId ? exception.branch_id === branchId : true)
    ) || null
  }

  // Bulk create exceptions (useful for holiday imports)
  const createBulkExceptions = async (exceptionsData: ReceivingExceptionInsert[]): Promise<ReceivingException[]> => {
    try {
      const { data, error } = await supabase
        .from("receiving_exceptions")
        .insert(exceptionsData)
        .select()

      if (error) {
        console.error("Error creating bulk exceptions:", error)
        throw error
      }

      setExceptions(prev => [...prev, ...data])
      return data
    } catch (err: any) {
      console.error("Error creating bulk exceptions:", err)
      throw err
    }
  }

  // Delete multiple exceptions
  const deleteBulkExceptions = async (exceptionIds: string[]) => {
    try {
      const { error } = await supabase
        .from("receiving_exceptions")
        .delete()
        .in("id", exceptionIds)

      if (error) {
        console.error("Error deleting bulk exceptions:", error)
        throw error
      }

      setExceptions(prev => prev.filter(exception => !exceptionIds.includes(exception.id)))
    } catch (err: any) {
      console.error("Error deleting bulk exceptions:", err)
      throw err
    }
  }

  // Import holidays for a specific year and country/region
  const importHolidays = async (
    year: number,
    clientIds?: string[],
    branchIds?: string[],
    countryCode: string = "CO" // Default to Colombia
  ) => {
    try {
      // This would integrate with a holiday API service
      // For now, we'll create a basic Colombian holiday list for demo
      const colombianHolidays = getColombianHolidays(year)
      
      const holidayExceptions: ReceivingExceptionInsert[] = []
      
      // Create exceptions for each client/branch
      for (const holiday of colombianHolidays) {
        if (clientIds) {
          for (const clientId of clientIds) {
            holidayExceptions.push({
              client_id: clientId,
              branch_id: null,
              exception_date: holiday.date,
              type: "blocked",
              note: `Festivo: ${holiday.name}`,
              source: "holiday_api"
            })
          }
        }
        
        if (branchIds) {
          for (const branchId of branchIds) {
            holidayExceptions.push({
              client_id: null,
              branch_id: branchId,
              exception_date: holiday.date,
              type: "blocked",
              note: `Festivo: ${holiday.name}`,
              source: "holiday_api"
            })
          }
        }
      }
      
      if (holidayExceptions.length > 0) {
        return await createBulkExceptions(holidayExceptions)
      }
      
      return []
    } catch (err: any) {
      console.error("Error importing holidays:", err)
      throw err
    }
  }

  // Helper function to get Colombian holidays (basic implementation)
  const getColombianHolidays = (year: number) => {
    // This is a simplified version - in production you'd use a proper holiday API
    return [
      { date: `${year}-01-01`, name: "Año Nuevo" },
      { date: `${year}-05-01`, name: "Día del Trabajo" },
      { date: `${year}-07-20`, name: "Día de la Independencia" },
      { date: `${year}-08-07`, name: "Batalla de Boyacá" },
      { date: `${year}-12-08`, name: "Inmaculada Concepción" },
      { date: `${year}-12-25`, name: "Navidad" },
    ]
  }

  useEffect(() => {
    fetchExceptions()
  }, [])

  return {
    exceptions,
    loading,
    error,
    createException,
    updateException,
    deleteException,
    getExceptionsByClient,
    getExceptionsByBranch,
    getExceptionsByDateRange,
    getExceptionForDate,
    createBulkExceptions,
    deleteBulkExceptions,
    importHolidays,
    refetch: fetchExceptions,
  }
}