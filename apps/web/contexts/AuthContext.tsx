"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, supabaseWithContext } from '@/lib/supabase-with-context'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Extended user type that includes our custom fields from public.users
export interface ExtendedUser extends User {
  name?: string
  role?: 'super_admin' | 'administrator' | 'coordinador_logistico' | 'commercial' | 'reviewer' | 'driver' | 'dispatcher' | 'client'
  permissions?: {
    crm: boolean
    users: boolean
    orders: boolean
    inventory: boolean
    routes: boolean
    clients: boolean
    returns: boolean
    production: boolean
    store_visits: boolean
    ecommerce: boolean
    inventory_adjustment: boolean
    compras: boolean
    kardex: boolean
    nucleo: boolean
    plan_master: boolean
    spec_center: boolean
    // Order Management granular permissions
    order_management_dashboard: boolean
    order_management_orders: boolean
    order_management_review_area1: boolean
    order_management_review_area2: boolean
    order_management_dispatch: boolean
    order_management_routes: boolean
    order_management_returns: boolean
    order_management_settings: boolean
  }
  status?: string
  last_login?: string
  company_id?: string | null
}

interface AuthContextType {
  user: ExtendedUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData: { name: string; role: string }) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<ExtendedUser>) => Promise<{ error: Error | null }>
  refreshUser: () => Promise<void>
  hasPermission: (permission: keyof ExtendedUser['permissions']) => boolean
  hasRole: (roles: string | string[]) => boolean
}

// Helper function to get default permissions based on role
function getDefaultPermissions(role: ExtendedUser['role']): NonNullable<ExtendedUser['permissions']> {
  const basePermissions = {
    crm: false,
    users: false,
    orders: false,
    inventory: false,
    routes: false,
    clients: false,
    returns: false,
    production: false,
    store_visits: false,
    ecommerce: false,
    inventory_adjustment: false,
    compras: false,
    kardex: false,
    nucleo: false,
    plan_master: false,
    spec_center: false,
    order_management_dashboard: false,
    order_management_orders: false,
    order_management_review_area1: false,
    order_management_review_area2: false,
    order_management_dispatch: false,
    order_management_routes: false,
    order_management_returns: false,
    order_management_settings: false,
  }

  switch (role) {
    case 'super_admin':
      // Super admin has access to everything
      return {
        crm: true, users: true, orders: true, inventory: true, routes: true, clients: true, returns: true, production: true,
        store_visits: true, ecommerce: true, inventory_adjustment: true, compras: true, kardex: true, nucleo: true,
        plan_master: true, spec_center: true,
        order_management_dashboard: true, order_management_orders: true, order_management_review_area1: true,
        order_management_review_area2: true, order_management_dispatch: true, order_management_routes: true,
        order_management_returns: true, order_management_settings: true
      }

    case 'administrator':
      return { ...basePermissions,
        users: true, orders: true, inventory: true, routes: true, clients: true, returns: true, production: true, crm: true, store_visits: true, ecommerce: true,
        compras: true, kardex: true, nucleo: true,
        order_management_dashboard: true, order_management_orders: true, order_management_review_area1: true,
        order_management_review_area2: true, order_management_dispatch: true, order_management_routes: true,
        order_management_returns: true, order_management_settings: true
      }

    case 'coordinador_logistico':
      return { ...basePermissions,
        orders: true, routes: true, returns: true, clients: true,
        order_management_dashboard: true, order_management_orders: true, order_management_review_area1: true,
        order_management_review_area2: true, order_management_dispatch: true, order_management_routes: true,
        order_management_returns: true
      }

    case 'commercial':
      return { ...basePermissions,
        orders: true, clients: true, store_visits: true, crm: true,
        order_management_dashboard: true, order_management_orders: true, order_management_settings: true
      }

    case 'reviewer':
      return { ...basePermissions,
        orders: true,
        order_management_dashboard: true, order_management_review_area1: true, order_management_review_area2: true
      }

    case 'client':
      return { ...basePermissions,
        ecommerce: true
      }
    
    case 'driver':
      return { ...basePermissions,
        routes: true,
        order_management_routes: true
      }
    
    case 'dispatcher':
      return { ...basePermissions,
        routes: true, returns: true,
        order_management_dispatch: true, order_management_routes: true, order_management_returns: true
      }
    
    default:
      return basePermissions
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache keys for localStorage
const USER_CACHE_KEY = 'auth_user_cache'
const CACHE_TIMESTAMP_KEY = 'auth_cache_timestamp'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Helper functions for cache management
const getUserFromCache = (): ExtendedUser | null => {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(USER_CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)

    if (!cached || !timestamp) return null

    const age = Date.now() - parseInt(timestamp)
    if (age > CACHE_TTL) {
      // Cache expired
      localStorage.removeItem(USER_CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      return null
    }

    return JSON.parse(cached) as ExtendedUser
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

const saveUserToCache = (user: ExtendedUser) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error saving to cache:', error)
  }
}

const clearUserCache = () => {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(USER_CACHE_KEY)
    localStorage.removeItem(CACHE_TIMESTAMP_KEY)
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Fast fetch with single attempt and short timeout
  const fetchExtendedUserData = async (authUser: User, useCache = true): Promise<ExtendedUser | null> => {
    const startTime = Date.now()

    // Try to load from cache first for instant load
    if (useCache) {
      const cachedUser = getUserFromCache()
      if (cachedUser && cachedUser.id === authUser.id) {
        console.log('⚡ Loaded user from cache (instant)')
        return cachedUser
      }
    }

    try {
      console.log('🔍 Fetching user data for:', authUser.id)

      // Single fast attempt with 3s timeout
      const timeoutMs = 3000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      })

      const queryPromise = supabase
        .from('users')
        .select('name, role, permissions, status, last_login, company_id')
        .eq('id', authUser.id)
        .single()

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      const duration = Date.now() - startTime

      if (error) {
        console.error('❌ Database error:', error)

        // If fetch fails, try to use cache as fallback
        const cachedUser = getUserFromCache()
        if (cachedUser && cachedUser.id === authUser.id) {
          console.warn('⚠️ Using cached user data due to fetch error')
          return cachedUser
        }

        // No cache available, return null for clean logout
        return null
      }

      if (!data) {
        console.error('❌ No user data found for:', authUser.id)
        return null
      }

      console.log(`✅ User data loaded in ${duration}ms:`, { id: authUser.id, role: data.role, name: data.name })

      const userRole = data.role
      if (!userRole) {
        console.error('❌ User has no role assigned:', authUser.id)
        return null
      }

      const extendedUser: ExtendedUser = {
        ...authUser,
        name: data.name || authUser.email?.split('@')[0] || 'Usuario',
        role: userRole,
        permissions: data.permissions || getDefaultPermissions(userRole),
        status: data.status || 'active',
        last_login: data.last_login,
        company_id: data.company_id
      }

      // Save to cache for future fast loads
      saveUserToCache(extendedUser)

      return extendedUser
    } catch (error: any) {
      console.error('❌ Error fetching user data:', error)

      // Try cache as last resort
      const cachedUser = getUserFromCache()
      if (cachedUser && cachedUser.id === authUser.id) {
        console.warn('⚠️ Using cached user data due to network error')
        return cachedUser
      }

      // No cache, clean logout
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    console.log('🚀 AuthContext: Initializing')

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log(`🔐 Auth event: ${event}`)
        setSession(session)

        if (event === 'INITIAL_SESSION' && session?.user) {
          // Load user data on initial session (uses cache for instant load)
          const extendedUser = await fetchExtendedUserData(session.user, true)

          if (extendedUser) {
            setUser(extendedUser)

            // Set audit context
            if (supabaseWithContext && extendedUser.id) {
              await supabaseWithContext.setUserId(extendedUser.id)
            }

            // Update last_login in background (non-blocking)
            supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', session.user.id)
              .then(() => console.log('✅ Last login updated'))
              .catch(() => {}) // Silently fail

            if (mounted) setLoading(false)
          } else {
            // No user data and no cache - clean logout
            console.log('🚪 No user data available - logging out')
            await supabase.auth.signOut()
            clearUserCache()
            if (mounted) setLoading(false)
          }

        } else if (event === 'SIGNED_IN' && session?.user) {
          // SIGNED_IN is followed by INITIAL_SESSION, so we skip it to avoid duplicate fetches
          console.log('⏭️ Skipping SIGNED_IN (INITIAL_SESSION will handle it)')

        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Signed out')
          setUser(null)
          clearUserCache()

          // Clear audit context
          if (supabaseWithContext) {
            await supabaseWithContext.setUserId(null)
          }

          if (mounted) setLoading(false)
          router.push('/login')

        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token refresh should NOT fetch user data - just keep the session alive
          console.log('🔄 Token refreshed - keeping session alive')
          // User data stays the same, only the token is refreshed
          // If we need fresh data, it will be loaded from cache or refetched when needed

        } else {
          // For other events or no session
          if (mounted) setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Bienvenido al sistema')
        // The onAuthStateChange listener will handle user state updates
      }

      return { error }
    } catch (error) {
      const authError = error as AuthError
      toast.error('Error al iniciar sesión')
      return { error: authError }
    }
  }

  const signUp = async (email: string, password: string, userData: { name: string; role: string }) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.name,
            role: userData.role,
          },
        },
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Usuario creado exitosamente')
      }

      return { error }
    } catch (error) {
      const authError = error as AuthError
      toast.error('Error al crear usuario')
      return { error: authError }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      // Ignorar errores 403 - la sesión ya expiró de todos modos
      if (error && !error.message?.includes('403') && error.status !== 403) {
        console.error('Error signing out:', error)
        toast.error(error.message)
      } else {
        toast.success('Sesión cerrada')
      }

      // Limpiar estado local y caché independientemente del resultado
      setUser(null)
      setSession(null)
      clearUserCache()
      router.push('/login')
    } catch (error: any) {
      console.error('Error signing out:', error)

      // Si es un error 403, la sesión ya expiró - limpiar de todos modos
      if (error?.status === 403 || error?.message?.includes('403')) {
        toast.success('Sesión cerrada')
        setUser(null)
        setSession(null)
        clearUserCache()
        router.push('/login')
      } else {
        toast.error('Error al cerrar sesión')
      }
    }
  }

  const updateProfile = async (updates: Partial<ExtendedUser>) => {
    if (!user) {
      return { error: new Error('No authenticated user') }
    }

    try {
      // Update auth.users if email or metadata changes
      if (updates.email || updates.name) {
        const { error: authError } = await supabase.auth.updateUser({
          email: updates.email,
          data: {
            full_name: updates.name
          }
        })
        if (authError) throw authError
      }

      // Update public.users for other fields
      const publicUpdates: any = {}
      if (updates.name) publicUpdates.name = updates.name
      if (updates.role) publicUpdates.role = updates.role
      if (updates.permissions) publicUpdates.permissions = updates.permissions
      if (updates.status) publicUpdates.status = updates.status

      if (Object.keys(publicUpdates).length > 0) {
        publicUpdates.updated_at = new Date().toISOString()

        const { error: publicError } = await supabase
          .from('users')
          .update(publicUpdates)
          .eq('id', user.id)

        if (publicError) throw publicError
      }

      // Refresh user data (force fresh fetch, no cache)
      await refreshUser()
      toast.success('Perfil actualizado exitosamente')

      return { error: null }
    } catch (error) {
      const err = error as Error
      toast.error('Error al actualizar perfil')
      return { error: err }
    }
  }

  const refreshUser = async () => {
    if (!session?.user) return

    try {
      // Force fresh fetch (no cache)
      const extendedUser = await fetchExtendedUserData(session.user, false)
      if (extendedUser) {
        setUser(extendedUser)
        saveUserToCache(extendedUser) // Update cache with fresh data
      } else {
        // Force logout if user data can't be loaded
        console.log('🚪 Forcing logout due to missing user data in refresh')
        clearUserCache()
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const hasPermission = (permission: keyof ExtendedUser['permissions']) => {
    if (!user?.permissions) return false
    return user.permissions[permission] || false
  }

  const hasRole = (roles: string | string[]) => {
    if (!user?.role) return false
    if (typeof roles === 'string') {
      return user.role === roles
    }
    return roles.includes(user.role)
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
    hasPermission,
    hasRole,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}