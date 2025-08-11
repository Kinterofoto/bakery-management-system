"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Extended user type that includes our custom fields from public.users
export interface ExtendedUser extends User {
  name?: string
  role?: 'admin' | 'reviewer_area1' | 'reviewer_area2' | 'dispatcher' | 'driver' | 'commercial'
  permissions?: {
    crm: boolean
    users: boolean
    orders: boolean
    inventory: boolean
  }
  status?: string
  last_login?: string
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Fetch extended user data from public.users
  const fetchExtendedUserData = async (authUser: User): Promise<ExtendedUser> => {
    try {
      // Create timeout promise - quick timeout for better UX
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 2 seconds')), 2000)
      })
      
      // Create query promise 
      const queryPromise = supabase
        .from('users')
        .select('name, role, permissions, status, last_login')
        .eq('id', authUser.id)
        .single()

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      if (error) {
        // Return auth user with default data if query fails
        return {
          ...authUser,
          name: authUser.email?.split('@')[0] || 'Usuario',
          role: 'commercial',
          permissions: { crm: true, users: false, orders: true, inventory: true },
          status: 'active'
        }
      }

      // Return extended user with database data
      return {
        ...authUser,
        name: data?.name || authUser.email?.split('@')[0] || 'Usuario',
        role: data?.role || 'commercial',
        permissions: data?.permissions || { crm: true, users: false, orders: true, inventory: true },
        status: data?.status || 'active',
        last_login: data?.last_login
      }
    } catch (error) {
      // Always return fallback user on any error
      return {
        ...authUser,
        name: authUser.email?.split('@')[0] || 'Usuario',
        role: 'commercial' as const,
        permissions: { crm: true, users: false, orders: true, inventory: true },
        status: 'active'
      }
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          if (mounted) {
            setLoading(false)
          }
          return
        }

        if (session?.user && mounted) {
          const extendedUser = await fetchExtendedUserData(session.user)
          setUser(extendedUser)
          setSession(session)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        setSession(session)

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const extendedUser = await fetchExtendedUserData(session.user)
          setUser(extendedUser)
          
          // Update last_login only for actual sign-ins, not initial sessions
          if (event === 'SIGNED_IN') {
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
          }

        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          router.push('/login')
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const extendedUser = await fetchExtendedUserData(session.user)
          setUser(extendedUser)
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
      setUser(extendedUser)
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