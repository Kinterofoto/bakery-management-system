"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Extended user type that includes our custom fields from public.users
export interface ExtendedUser extends User {
  name?: string
  role?: 'administrator' | 'coordinador_logistico' | 'comercial' | 'reviewer' | 'driver' | 'dispatcher'
  permissions?: {
    crm: boolean
    users: boolean
    orders: boolean
    inventory: boolean
    routes: boolean
    clients: boolean
    returns: boolean
    production: boolean
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
  isEmergencyMode?: boolean // Flag for emergency access
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
    case 'administrator':
      return { ...basePermissions, 
        users: true, orders: true, inventory: true, routes: true, clients: true, returns: true, production: true, crm: true,
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
    
    case 'comercial':
      return { ...basePermissions,
        orders: true, clients: true,
        order_management_dashboard: true, order_management_orders: true
      }
    
    case 'reviewer':
      return { ...basePermissions,
        orders: true,
        order_management_dashboard: true, order_management_review_area1: true, order_management_review_area2: true
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

// Global request deduplication system to prevent race conditions
const activeUserRequests = new Map<string, Promise<ExtendedUser | null>>()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Fetch extended user data from public.users with retry logic
  const fetchExtendedUserData = async (authUser: User, retryCount = 0): Promise<ExtendedUser | null> => {
    const maxRetries = 2
    
    // Request deduplication: check if we already have an active request for this user
    const userId = authUser.id
    if (activeUserRequests.has(userId)) {
      console.log(`🔄 Request deduplication: reusing active request for user ${userId}`)
      return activeUserRequests.get(userId)!
    }
    
    // Create the request promise and store it for deduplication
    const requestPromise = performUserDataFetch(authUser, retryCount)
    activeUserRequests.set(userId, requestPromise)
    
    // Clean up the active request when done (success or failure)
    requestPromise.finally(() => {
      activeUserRequests.delete(userId)
    })
    
    return requestPromise
  }

  // Internal function that performs the actual fetch
  const performUserDataFetch = async (authUser: User, retryCount = 0): Promise<ExtendedUser | null> => {
    const maxRetries = 2
    
    try {
      console.log(`🔍 Fetching user data for: ${authUser.id} (attempt ${retryCount + 1}/${maxRetries + 1})`)
      
      // Progressive timeout - shorter on retries for better UX
      const timeoutMs = retryCount === 0 ? 15000 : 10000 // 15s first try, 10s on retries
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs/1000}s (attempt ${retryCount + 1})`)), timeoutMs)
      })
      
      // Add timing for performance monitoring
      const startTime = Date.now()
      
      // Create query promise with more specific error handling
      const queryPromise = supabase
        .from('users')
        .select('name, role, permissions, status, last_login')
        .eq('id', authUser.id)
        .single()
        .then(result => {
          const duration = Date.now() - startTime
          console.log(`⏱️ Query completed in ${duration}ms`)
          return result
        })

      const result = await Promise.race([queryPromise, timeoutPromise])
      const { data, error } = result as any

      if (error) {
        console.error(`❌ Database query error (attempt ${retryCount + 1}):`, error)
        
        // Retry if we haven't exceeded max retries and it's a network/timeout error
        if (retryCount < maxRetries && (error.message?.includes('timeout') || error.message?.includes('network'))) {
          console.log(`🔄 Retrying user data fetch... (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          return performUserDataFetch(authUser, retryCount + 1)
        }
        
        // If all retries failed or it's a different error, return null to trigger logout
        return null
      }

      if (!data) {
        console.error('❌ No user data found for:', authUser.id)
        // User doesn't exist in database - return null to trigger logout
        return null
      }

      console.log('✅ User data loaded:', { id: authUser.id, role: data.role, name: data.name })

      // Return extended user with database data
      const userRole = data.role
      if (!userRole) {
        console.error('❌ User has no role assigned:', authUser.id)
        return null
      }

      return {
        ...authUser,
        name: data.name || authUser.email?.split('@')[0] || 'Usuario',
        role: userRole,
        permissions: data.permissions || getDefaultPermissions(userRole),
        status: data.status || 'active',
        last_login: data.last_login
      }
    } catch (error) {
      console.error(`❌ Critical error fetching user data (attempt ${retryCount + 1}):`, error)
      
      // Retry if we haven't exceeded max retries and it's a timeout error
      if (retryCount < maxRetries && error.message?.includes('timeout')) {
        console.log(`🔄 Retrying after critical error... (${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
        return performUserDataFetch(authUser, retryCount + 1)
      }
      
      // After all retries failed due to connectivity issues, provide emergency access
      if (error.message?.includes('timeout') || error.message?.includes('network')) {
        console.warn('🚨 All retries failed due to connectivity. Providing emergency access with limited permissions.')
        return {
          ...authUser,
          name: authUser.email?.split('@')[0] || 'Usuario (Modo Emergencia)',
          role: 'driver' as const, // Most restrictive role for safety
          permissions: {
            crm: false,
            users: false,
            orders: false,
            inventory: false,
            routes: true, // Only basic route access
            clients: false,
            returns: false,
            production: false,
            order_management_dashboard: false,
            order_management_orders: false,
            order_management_review_area1: false,
            order_management_review_area2: false,
            order_management_dispatch: false,
            order_management_routes: true, // Only routes access
            order_management_returns: false,
            order_management_settings: false,
          },
          status: 'active',
          isEmergencyMode: true // Mark as emergency mode
        }
      }
      
      // If all retries failed for other reasons, return null to trigger logout for security
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    
    console.log('🚀 AuthContext: useEffect initializing')
    
    // Removed manual initializeAuth() - let onAuthStateChange handle INITIAL_SESSION
    // This prevents race conditions between manual init and onAuthStateChange

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        setSession(session)

        if (event === 'SIGNED_IN' && session?.user) {
          console.log(`🔐 Auth event: ${event} for user ${session.user.id} - Skipping fetch, waiting for INITIAL_SESSION`)
          // Only update last_login for SIGNED_IN, don't fetch user data (INITIAL_SESSION will handle it)
          try {
            const updatePromise = supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', session.user.id)
            
            const timeoutPromise = new Promise((resolve) => {
              setTimeout(() => resolve('timeout'), 1000)
            })
            
            await Promise.race([updatePromise, timeoutPromise])
          } catch (error) {
            // Silently fail - last_login update is not critical
          }
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          console.log(`🔐 Auth event: ${event} for user ${session.user.id}`)
          const extendedUser = await fetchExtendedUserData(session.user)
          if (extendedUser) {
            setUser(extendedUser)
            
            // Set loading to false on successful auth
            if (mounted) {
              setLoading(false)
            }
          } else {
            // Force logout if user data can't be loaded
            console.log('🚪 Forcing logout due to missing user data in auth change')
            await supabase.auth.signOut()
            if (mounted) {
              setLoading(false)
            }
          }

        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Auth event: SIGNED_OUT')
          setUser(null)
          if (mounted) {
            setLoading(false)
          }
          router.push('/login')
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log(`🔄 Auth event: TOKEN_REFRESHED for user ${session.user.id}`)
          const extendedUser = await fetchExtendedUserData(session.user)
          if (extendedUser) {
            setUser(extendedUser)
          } else {
            // Force logout if user data can't be loaded on token refresh
            console.log('🚪 Forcing logout due to missing user data on token refresh')
            await supabase.auth.signOut()
          }
        } else {
          // For other events or no session, ensure loading is false
          if (mounted) {
            setLoading(false)
          }
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
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Sesión cerrada')
      }
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Error al cerrar sesión')
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

      // Refresh user data
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
      const extendedUser = await fetchExtendedUserData(session.user)
      if (extendedUser) {
        setUser(extendedUser)
      } else {
        // Force logout if user data can't be loaded
        console.log('🚪 Forcing logout due to missing user data in refresh')
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