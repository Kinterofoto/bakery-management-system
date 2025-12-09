"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

export interface UserWithDetails extends User {
  company?: {
    id: string
    company_name: string
  } | null
}

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'administrator'
  | 'coordinador_logistico'
  | 'commercial'
  | 'reviewer'
  | 'reviewer_area1'
  | 'reviewer_area2'
  | 'dispatcher'
  | 'driver'
  | 'client'

export type UserStatus = 'active' | 'inactive'

// All available permissions in the system
export const AVAILABLE_PERMISSIONS = {
  // Core modules
  crm: 'CRM Ventas',
  users: 'Gestión de Usuarios',
  clients: 'Gestión de Clientes',
  inventory: 'Inventarios',
  production: 'Producción',
  ecommerce: 'E-Commerce',

  // Order Management (granular)
  order_management_dashboard: 'OM: Dashboard',
  order_management_orders: 'OM: Pedidos',
  order_management_review_area1: 'OM: Alistamiento',
  order_management_review_area2: 'OM: Proyección',
  order_management_dispatch: 'OM: Despacho',
  order_management_routes: 'OM: Rutas',
  order_management_returns: 'OM: Devoluciones',
  order_management_settings: 'OM: Configuración',

  // Additional modules
  inventory_adjustment: 'Ajustes de Inventario',
  store_visits: 'Visitas a Tiendas',
  plan_master: 'PlanMaster',
  spec_center: 'Centro de Especificaciones',
  compras: 'Compras',
  kardex: 'Kardex',
  nucleo: 'Núcleo de Productos'
} as const

export type PermissionKey = keyof typeof AVAILABLE_PERMISSIONS

export function useUsers() {
  const [users, setUsers] = useState<UserWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)

      console.log('🔍 Fetching users from database...')

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*, company:clients!users_company_id_fkey(id, company_name)')
        .order('created_at', { ascending: false })

      console.log('📊 Users query result:', { data, error: fetchError })

      if (fetchError) {
        console.error('❌ Error fetching users:', fetchError)
        throw fetchError
      }

      console.log(`✅ Successfully fetched ${data?.length || 0} users`)
      setUsers((data as any) || [])
      setError(null)
    } catch (err) {
      console.error('💥 Exception in fetchUsers:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener usuarios')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async (userData: {
    email: string
    name: string
    role: UserRole
    cedula?: string
    company_id?: string
    permissions?: Record<string, boolean>
  }): Promise<User | null> => {
    try {
      setError(null)

      // Default permissions based on role
      const defaultPermissions: Record<string, boolean> = {}
      Object.keys(AVAILABLE_PERMISSIONS).forEach(key => {
        defaultPermissions[key] = false
      })

      const { data, error: createError } = await supabase
        .from('users')
        .insert([{
          ...userData,
          permissions: userData.permissions || defaultPermissions,
          status: 'active'
        }])
        .select()
        .single()

      if (createError) throw createError

      await fetchUsers()
      return data
    } catch (err) {
      console.error('Error creating user:', err)
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
      throw err
    }
  }

  const updateUser = async (userId: string, updates: {
    name?: string
    role?: UserRole
    cedula?: string
    company_id?: string
    status?: UserStatus
    permissions?: Record<string, boolean>
  }): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (updateError) throw updateError

      await fetchUsers()
      return true
    } catch (err) {
      console.error('Error updating user:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario')
      return false
    }
  }

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteError) throw deleteError

      await fetchUsers()
      return true
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario')
      return false
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: UserStatus): Promise<boolean> => {
    const newStatus: UserStatus = currentStatus === 'active' ? 'inactive' : 'active'
    return updateUser(userId, { status: newStatus })
  }

  const updateUserPermissions = async (userId: string, permissions: Record<string, boolean>): Promise<boolean> => {
    return updateUser(userId, { permissions })
  }

  const getUsersByRole = (role: UserRole | string): UserWithDetails[] => {
    return users.filter(user => user.role === role)
  }

  const getActiveUsers = (): UserWithDetails[] => {
    return users.filter(user => user.status === 'active')
  }

  const getInactiveUsers = (): UserWithDetails[] => {
    return users.filter(user => user.status === 'inactive')
  }

  const searchUsers = (query: string): UserWithDetails[] => {
    const lowerQuery = query.toLowerCase()
    return users.filter(user =>
      user.name.toLowerCase().includes(lowerQuery) ||
      user.email.toLowerCase().includes(lowerQuery) ||
      user.cedula?.toLowerCase().includes(lowerQuery)
    )
  }

  const getCommercialUsers = () => {
    return getUsersByRole('commercial')
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    loading,
    error,
    fetchUsers,
    refetch: fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    updateUserPermissions,
    getUsersByRole,
    getActiveUsers,
    getInactiveUsers,
    searchUsers,
    getCommercialUsers
  }
}
