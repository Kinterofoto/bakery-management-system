"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type PipelineStageInsert = Database['public']['Tables']['pipeline_stages']['Insert']
type PipelineStageUpdate = Database['public']['Tables']['pipeline_stages']['Update']

type SalesOpportunity = Database['public']['Tables']['sales_opportunities']['Row']
type SalesOpportunityInsert = Database['public']['Tables']['sales_opportunities']['Insert']
type SalesOpportunityUpdate = Database['public']['Tables']['sales_opportunities']['Update']

type Client = Database['public']['Tables']['clients']['Row']
type User = Database['public']['Tables']['users']['Row']

type OpportunityWithDetails = SalesOpportunity & {
  client?: Client
  assigned_user?: User
  pipeline_stage?: PipelineStage
}

type StageWithOpportunities = PipelineStage & {
  opportunities: OpportunityWithDetails[]
  totalValue: number
  count: number
}

type PipelineMetrics = {
  totalValue: number
  totalOpportunities: number
  averageDealSize: number
  conversionRate: number
  forecastedRevenue: number
  stageMetrics: {
    [key: string]: {
      count: number
      value: number
      probability: number
      avgDaysInStage: number
    }
  }
}

export function usePipeline() {
  const [stages, setStages] = useState<StageWithOpportunities[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityWithDetails[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPipelineData = async () => {
    try {
      setLoading(true)

      // Fetch all required data in parallel
      const [stagesResponse, opportunitiesResponse, clientsResponse, usersResponse] = await Promise.all([
        supabase.from('pipeline_stages').select('*').eq('is_active', true).order('stage_order'),
        supabase.from('sales_opportunities').select('*').eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('users').select('*').eq('role', 'commercial')
      ])

      if (stagesResponse.error) throw stagesResponse.error
      if (opportunitiesResponse.error) throw opportunitiesResponse.error
      if (clientsResponse.error) throw clientsResponse.error
      if (usersResponse.error) throw usersResponse.error

      const stagesData = stagesResponse.data || []
      const opportunitiesData = opportunitiesResponse.data || []
      const clientsData = clientsResponse.data || []
      const usersData = usersResponse.data || []

      setClients(clientsData)
      setUsers(usersData)

      // Combine opportunities with related data
      const opportunitiesWithDetails: OpportunityWithDetails[] = opportunitiesData.map(opp => ({
        ...opp,
        client: clientsData.find(client => client.id === opp.client_id),
        assigned_user: usersData.find(user => user.id === opp.assigned_user_id),
        pipeline_stage: stagesData.find(stage => stage.id === opp.pipeline_stage_id)
      }))

      setOpportunities(opportunitiesWithDetails)

      // Combine stages with their opportunities
      const stagesWithOpportunities: StageWithOpportunities[] = stagesData.map(stage => {
        const stageOpportunities = opportunitiesWithDetails.filter(opp => opp.pipeline_stage_id === stage.id)
        const totalValue = stageOpportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0)
        
        return {
          ...stage,
          opportunities: stageOpportunities,
          totalValue,
          count: stageOpportunities.length
        }
      })

      setStages(stagesWithOpportunities)
    } catch (err) {
      console.error('Error fetching pipeline data:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const createOpportunity = async (opportunityData: SalesOpportunityInsert): Promise<SalesOpportunity | null> => {
    try {
      const { data, error } = await supabase
        .from('sales_opportunities')
        .insert([opportunityData])
        .select()
        .single()

      if (error) throw error

      await fetchPipelineData() // Refresh the pipeline
      return data
    } catch (err) {
      console.error('Error creating opportunity:', err)
      setError(err instanceof Error ? err.message : 'Error al crear oportunidad')
      return null
    }
  }

  const updateOpportunity = async (id: string, updates: SalesOpportunityUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sales_opportunities')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchPipelineData() // Refresh the pipeline
      return true
    } catch (err) {
      console.error('Error updating opportunity:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar oportunidad')
      return false
    }
  }

  const moveOpportunity = async (opportunityId: string, newStageId: string): Promise<boolean> => {
    return updateOpportunity(opportunityId, { pipeline_stage_id: newStageId })
  }

  const closeOpportunity = async (opportunityId: string, status: 'won' | 'lost', actualValue?: number): Promise<boolean> => {
    const updates: SalesOpportunityUpdate = {
      status: status === 'won' ? 'won' : 'lost',
      actual_close_date: new Date().toISOString().split('T')[0]
    }

    if (actualValue !== undefined) {
      updates.estimated_value = actualValue
    }

    return updateOpportunity(opportunityId, updates)
  }

  const deleteOpportunity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sales_opportunities')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchPipelineData() // Refresh the pipeline
      return true
    } catch (err) {
      console.error('Error deleting opportunity:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar oportunidad')
      return false
    }
  }

  const createStage = async (stageData: PipelineStageInsert): Promise<PipelineStage | null> => {
    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert([stageData])
        .select()
        .single()

      if (error) throw error

      await fetchPipelineData() // Refresh the pipeline
      return data
    } catch (err) {
      console.error('Error creating stage:', err)
      setError(err instanceof Error ? err.message : 'Error al crear etapa')
      return null
    }
  }

  const updateStage = async (id: string, updates: PipelineStageUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchPipelineData() // Refresh the pipeline
      return true
    } catch (err) {
      console.error('Error updating stage:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar etapa')
      return false
    }
  }

  const getPipelineMetrics = (): PipelineMetrics => {
    const totalOpportunities = opportunities.length
    const totalValue = opportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0)
    const averageDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0

    // Calculate forecasted revenue based on stage probabilities
    const forecastedRevenue = opportunities.reduce((sum, opp) => {
      const probability = opp.pipeline_stage?.probability || 0
      const value = opp.estimated_value || 0
      return sum + (value * probability / 100)
    }, 0)

    // Calculate conversion rates (simplified - would need historical data for accurate calculation)
    const wonOpportunities = opportunities.filter(opp => opp.status === 'won').length
    const conversionRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0

    // Calculate stage metrics
    const stageMetrics: PipelineMetrics['stageMetrics'] = {}
    stages.forEach(stage => {
      const stageOpps = stage.opportunities
      const avgDaysInStage = stageOpps.length > 0 
        ? stageOpps.reduce((sum, opp) => {
            const daysInStage = Math.floor((Date.now() - new Date(opp.created_at).getTime()) / (1000 * 60 * 60 * 24))
            return sum + daysInStage
          }, 0) / stageOpps.length
        : 0

      stageMetrics[stage.id] = {
        count: stage.count,
        value: stage.totalValue,
        probability: stage.probability,
        avgDaysInStage: Math.round(avgDaysInStage)
      }
    })

    return {
      totalValue,
      totalOpportunities,
      averageDealSize: Math.round(averageDealSize),
      conversionRate: Math.round(conversionRate * 100) / 100,
      forecastedRevenue: Math.round(forecastedRevenue),
      stageMetrics
    }
  }

  const getOpportunitiesByUser = (userId: string) => {
    return opportunities.filter(opp => opp.assigned_user_id === userId)
  }

  const getOpportunitiesByClient = (clientId: string) => {
    return opportunities.filter(opp => opp.client_id === clientId)
  }

  const getOpportunitiesByStage = (stageId: string) => {
    return opportunities.filter(opp => opp.pipeline_stage_id === stageId)
  }

  const searchOpportunities = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return opportunities.filter(opp => 
      opp.title.toLowerCase().includes(lowerQuery) ||
      opp.description?.toLowerCase().includes(lowerQuery) ||
      opp.client?.name.toLowerCase().includes(lowerQuery)
    )
  }

  useEffect(() => {
    fetchPipelineData()
  }, [])

  return {
    stages,
    opportunities,
    clients,
    users,
    loading,
    error,
    createOpportunity,
    updateOpportunity,
    moveOpportunity,
    closeOpportunity,
    deleteOpportunity,
    createStage,
    updateStage,
    getPipelineMetrics,
    getOpportunitiesByUser,
    getOpportunitiesByClient,
    getOpportunitiesByStage,
    searchOpportunities,
    refetch: fetchPipelineData
  }
}