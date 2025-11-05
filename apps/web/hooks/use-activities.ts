"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type LeadActivity = Database['public']['Tables']['lead_activities']['Row']
type LeadActivityInsert = Database['public']['Tables']['lead_activities']['Insert']
type LeadActivityUpdate = Database['public']['Tables']['lead_activities']['Update']

type Client = Database['public']['Tables']['clients']['Row']
type User = Database['public']['Tables']['users']['Row']

type ActivityWithDetails = LeadActivity & {
  client?: Client
  user?: User
}

type ActivityStats = {
  totalActivities: number
  completedToday: number
  pendingToday: number
  overdue: number
  thisWeekCompleted: number
  totalEstimatedValue: number
}

type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'proposal' | 'follow_up'

export function useActivities() {
  const [activities, setActivities] = useState<ActivityWithDetails[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async () => {
    try {
      setLoading(true)

      // Fetch all required data in parallel
      const [activitiesResponse, clientsResponse, usersResponse] = await Promise.all([
        supabase.from('lead_activities').select('*').order('scheduled_date', { ascending: true }),
        supabase.from('clients').select('*'),
        supabase.from('users').select('*')
      ])

      if (activitiesResponse.error) throw activitiesResponse.error
      if (clientsResponse.error) throw clientsResponse.error
      if (usersResponse.error) throw usersResponse.error

      const activitiesData = activitiesResponse.data || []
      const clientsData = clientsResponse.data || []
      const usersData = usersResponse.data || []

      setClients(clientsData)
      setUsers(usersData)

      // Combine activities with related data
      const activitiesWithDetails: ActivityWithDetails[] = activitiesData.map(activity => ({
        ...activity,
        client: clientsData.find(client => client.id === activity.client_id),
        user: usersData.find(user => user.id === activity.user_id)
      }))

      setActivities(activitiesWithDetails)
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const createActivity = async (activityData: LeadActivityInsert): Promise<LeadActivity | null> => {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .insert([activityData])
        .select()
        .single()

      if (error) throw error

      await fetchActivities() // Refresh the list
      return data
    } catch (err) {
      console.error('Error creating activity:', err)
      setError(err instanceof Error ? err.message : 'Error al crear actividad')
      return null
    }
  }

  const updateActivity = async (id: string, updates: LeadActivityUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lead_activities')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchActivities() // Refresh the list
      return true
    } catch (err) {
      console.error('Error updating activity:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar actividad')
      return false
    }
  }

  const completeActivity = async (id: string, actualValue?: number): Promise<boolean> => {
    const updates: LeadActivityUpdate = {
      status: 'completed',
      completed_date: new Date().toISOString()
    }

    if (actualValue !== undefined) {
      updates.actual_value = actualValue
    }

    return updateActivity(id, updates)
  }

  const rescheduleActivity = async (id: string, newDate: string): Promise<boolean> => {
    return updateActivity(id, { scheduled_date: newDate, status: 'pending' })
  }

  const cancelActivity = async (id: string): Promise<boolean> => {
    return updateActivity(id, { status: 'cancelled' })
  }

  const deleteActivity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lead_activities')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchActivities() // Refresh the list
      return true
    } catch (err) {
      console.error('Error deleting activity:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar actividad')
      return false
    }
  }

  const getActivityStats = (): ActivityStats => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const totalActivities = activities.length
    
    const completedToday = activities.filter(activity => {
      if (!activity.completed_date) return false
      const completedDate = new Date(activity.completed_date)
      return completedDate >= today && activity.status === 'completed'
    }).length

    const pendingToday = activities.filter(activity => {
      if (!activity.scheduled_date) return false
      const scheduledDate = new Date(activity.scheduled_date)
      return scheduledDate >= today && 
             scheduledDate < new Date(today.getTime() + 24 * 60 * 60 * 1000) &&
             activity.status === 'pending'
    }).length

    const overdue = activities.filter(activity => {
      if (!activity.scheduled_date || activity.status !== 'pending') return false
      const scheduledDate = new Date(activity.scheduled_date)
      return scheduledDate < today
    }).length

    const thisWeekCompleted = activities.filter(activity => {
      if (!activity.completed_date) return false
      const completedDate = new Date(activity.completed_date)
      return completedDate >= weekAgo && activity.status === 'completed'
    }).length

    const totalEstimatedValue = activities.reduce((sum, activity) => 
      sum + (activity.estimated_value || 0), 0
    )

    return {
      totalActivities,
      completedToday,
      pendingToday,
      overdue,
      thisWeekCompleted,
      totalEstimatedValue
    }
  }

  const getTodayActivities = () => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    return activities.filter(activity => {
      if (!activity.scheduled_date) return false
      const scheduledDate = new Date(activity.scheduled_date)
      return scheduledDate >= todayStart && scheduledDate < todayEnd
    }).sort((a, b) => {
      if (!a.scheduled_date || !b.scheduled_date) return 0
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    })
  }

  const getUpcomingActivities = (days: number = 7) => {
    const now = new Date()
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    return activities.filter(activity => {
      if (!activity.scheduled_date || activity.status !== 'pending') return false
      const scheduledDate = new Date(activity.scheduled_date)
      return scheduledDate >= now && scheduledDate <= futureDate
    }).sort((a, b) => {
      if (!a.scheduled_date || !b.scheduled_date) return 0
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    })
  }

  const getOverdueActivities = () => {
    const now = new Date()
    
    return activities.filter(activity => {
      if (!activity.scheduled_date || activity.status !== 'pending') return false
      const scheduledDate = new Date(activity.scheduled_date)
      return scheduledDate < now
    }).sort((a, b) => {
      if (!a.scheduled_date || !b.scheduled_date) return 0
      return new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
    })
  }

  const getActivitiesByClient = (clientId: string) => {
    return activities.filter(activity => activity.client_id === clientId)
      .sort((a, b) => {
        if (!a.scheduled_date || !b.scheduled_date) return 0
        return new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
      })
  }

  const getActivitiesByUser = (userId: string) => {
    return activities.filter(activity => activity.user_id === userId)
  }

  const getActivitiesByType = (type: ActivityType) => {
    return activities.filter(activity => activity.activity_type === type)
  }

  const getActivitiesByStatus = (status: string) => {
    return activities.filter(activity => activity.status === status)
  }

  const getActivitiesByDateRange = (startDate: Date, endDate: Date) => {
    return activities.filter(activity => {
      if (!activity.scheduled_date) return false
      const scheduledDate = new Date(activity.scheduled_date)
      return scheduledDate >= startDate && scheduledDate <= endDate
    }).sort((a, b) => {
      if (!a.scheduled_date || !b.scheduled_date) return 0
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    })
  }

  const searchActivities = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return activities.filter(activity => 
      activity.title.toLowerCase().includes(lowerQuery) ||
      activity.description?.toLowerCase().includes(lowerQuery) ||
      activity.client?.name.toLowerCase().includes(lowerQuery) ||
      activity.user?.name.toLowerCase().includes(lowerQuery)
    )
  }

  const getActivityTypeCounts = () => {
    const counts: Record<string, number> = {}
    activities.forEach(activity => {
      counts[activity.activity_type] = (counts[activity.activity_type] || 0) + 1
    })
    return counts
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  return {
    activities,
    clients,
    users,
    loading,
    error,
    createActivity,
    updateActivity,
    completeActivity,
    rescheduleActivity,
    cancelActivity,
    deleteActivity,
    getActivityStats,
    getTodayActivities,
    getUpcomingActivities,
    getOverdueActivities,
    getActivitiesByClient,
    getActivitiesByUser,
    getActivitiesByType,
    getActivitiesByStatus,
    getActivitiesByDateRange,
    searchActivities,
    getActivityTypeCounts,
    refetch: fetchActivities
  }
}