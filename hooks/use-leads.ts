"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
type ClientUpdate = Database['public']['Tables']['clients']['Update']

type LeadActivity = Database['public']['Tables']['lead_activities']['Row']
type LeadActivityInsert = Database['public']['Tables']['lead_activities']['Insert']
type LeadActivityUpdate = Database['public']['Tables']['lead_activities']['Update']

type SalesOpportunity = Database['public']['Tables']['sales_opportunities']['Row']
type SalesOpportunityInsert = Database['public']['Tables']['sales_opportunities']['Insert']
type SalesOpportunityUpdate = Database['public']['Tables']['sales_opportunities']['Update']

type LeadSource = Database['public']['Tables']['lead_sources']['Row']
type User = Database['public']['Tables']['users']['Row']

type LeadWithDetails = Client & {
  lead_source?: LeadSource
  assigned_user?: User
  activities?: LeadActivity[]
  opportunities?: SalesOpportunity[]
}

type LeadStats = {
  totalLeads: number
  newThisWeek: number
  qualified: number
  totalValue: number
  conversionRate: number
}

export function useLeads() {
  const [leads, setLeads] = useState<LeadWithDetails[]>([])
  const [leadSources, setLeadSources] = useState<LeadSource[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = async () => {
    try {
      setLoading(true)
      
      // Fetch clients with lead_status (leads)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .not('lead_status', 'eq', 'client') // Exclude existing clients
        .order('created_at', { ascending: false })

      if (clientsError) throw clientsError

      // Fetch additional data in parallel
      const [sourcesResponse, usersResponse] = await Promise.all([
        supabase.from('lead_sources').select('*'),
        supabase.from('users').select('*').eq('role', 'commercial')
      ])

      if (sourcesResponse.error) throw sourcesResponse.error
      if (usersResponse.error) throw usersResponse.error

      setLeadSources(sourcesResponse.data || [])
      setUsers(usersResponse.data || [])

      // Manually combine data to avoid foreign key cache issues
      const leadsWithDetails: LeadWithDetails[] = (clientsData || []).map(client => ({
        ...client,
        lead_source: sourcesResponse.data?.find(source => source.id === client.lead_source_id),
        assigned_user: usersResponse.data?.find(user => user.id === client.assigned_user_id),
        activities: [], // Will be fetched separately if needed
        opportunities: [] // Will be fetched separately if needed
      }))

      setLeads(leadsWithDetails)
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const createLead = async (leadData: ClientInsert): Promise<Client | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...leadData, lead_status: leadData.lead_status || 'prospect' }])
        .select()
        .single()

      if (error) throw error

      await fetchLeads() // Refresh the list
      return data
    } catch (err) {
      console.error('Error creating lead:', err)
      setError(err instanceof Error ? err.message : 'Error al crear lead')
      return null
    }
  }

  const updateLead = async (id: string, updates: ClientUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchLeads() // Refresh the list
      return true
    } catch (err) {
      console.error('Error updating lead:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar lead')
      return false
    }
  }

  const moveLead = async (leadId: string, newStatus: string): Promise<boolean> => {
    return updateLead(leadId, { lead_status: newStatus })
  }

  const assignLead = async (leadId: string, userId: string): Promise<boolean> => {
    return updateLead(leadId, { assigned_user_id: userId })
  }

  const deleteLead = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchLeads() // Refresh the list
      return true
    } catch (err) {
      console.error('Error deleting lead:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar lead')
      return false
    }
  }

  const getLeadStats = (): LeadStats => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const totalLeads = leads.length
    const newThisWeek = leads.filter(lead => 
      new Date(lead.created_at) >= weekAgo
    ).length
    const qualified = leads.filter(lead => 
      ['qualified', 'proposal', 'negotiation'].includes(lead.lead_status)
    ).length

    // For now, we'll use a placeholder for total value
    // In a real implementation, this would come from opportunities
    const totalValue = leads.length * 50000 // Placeholder calculation

    const conversionRate = totalLeads > 0 ? (qualified / totalLeads) * 100 : 0

    return {
      totalLeads,
      newThisWeek,
      qualified,
      totalValue,
      conversionRate: Math.round(conversionRate * 100) / 100
    }
  }

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.lead_status === status)
  }

  const getLeadsByUser = (userId: string) => {
    return leads.filter(lead => lead.assigned_user_id === userId)
  }

  const searchLeads = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return leads.filter(lead => 
      lead.name.toLowerCase().includes(lowerQuery) ||
      lead.contact_person?.toLowerCase().includes(lowerQuery) ||
      lead.email?.toLowerCase().includes(lowerQuery) ||
      lead.phone?.toLowerCase().includes(lowerQuery)
    )
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  return {
    leads,
    leadSources,
    users,
    loading,
    error,
    createLead,
    updateLead,
    moveLead,
    assignLead,
    deleteLead,
    getLeadStats,
    getLeadsByStatus,
    getLeadsByUser,
    searchLeads,
    refetch: fetchLeads
  }
}