"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

export interface Customer extends User {
  name?: string
  client_id?: string
  company_name?: string
  tax_id?: string
  status?: string
  created_at?: string
}

interface CustomerAuthContextType {
  customer: Customer | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData: { name: string; company_name: string }) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshCustomer: () => Promise<void>
  isAuthenticated: boolean
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

const SESSION_TIMEOUT = 15 * 60 * 1000

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const fetchCustomerData = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company_name, tax_id, status')
        .eq('id', authUser.id)
        .single()

      if (error || !data) {
        return authUser
      }

      return {
        ...authUser,
        name: data.name || authUser.email?.split('@')[0] || 'Cliente',
        client_id: data.id,
        company_name: data.company_name,
        tax_id: data.tax_id,
        status: data.status,
      }
    } catch (err) {
      console.error('Error fetching customer data:', err)
      return authUser
    }
  }

  const resetSessionTimeout = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout)
    }

    const timeout = setTimeout(() => {
      console.log('Session timeout')
      signOut()
      toast.info('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
    }, SESSION_TIMEOUT)

    setSessionTimeout(timeout)
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error('Error al iniciar sesión: ' + error.message)
        return { error }
      }

      if (data.user) {
        const extendedCustomer = await fetchCustomerData(data.user)
        setCustomer(extendedCustomer as Customer)
        setSession(data.session)
        toast.success('¡Bienvenido!')
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      toast.error('Error al iniciar sesión')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData: { name: string; company_name: string }) => {
    try {
      setLoading(true)

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        toast.error('Error al registrarse: ' + signUpError.message)
        return { error: signUpError }
      }

      if (authData.user) {
        const { error: clientError } = await supabase.from('clients').insert({
          id: authData.user.id,
          name: userData.name,
          company_name: userData.company_name,
          email: email,
          status: 'active',
          created_at: new Date().toISOString(),
        })

        if (clientError) {
          console.error('Error creating client record:', clientError)
          toast.error('Error al crear el perfil del cliente')
          return { error: clientError }
        }

        toast.success('¡Registro exitoso! Por favor inicia sesión.')
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      toast.error('Error al registrarse')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setCustomer(null)
      setSession(null)
      if (sessionTimeout) {
        clearTimeout(sessionTimeout)
      }
      router.push('/ecommerce')
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshCustomer = async () => {
    if (session?.user) {
      const extendedCustomer = await fetchCustomerData(session.user)
      setCustomer(extendedCustomer as Customer)
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }

        if (currentSession?.user) {
          const extendedCustomer = await fetchCustomerData(currentSession.user)
          if (mounted) {
            setCustomer(extendedCustomer as Customer)
            setSession(currentSession)
            resetSessionTimeout()
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Error initializing auth:', err)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_IN' && session?.user) {
          const extendedCustomer = await fetchCustomerData(session.user)
          setCustomer(extendedCustomer as Customer)
          setSession(session)
          resetSessionTimeout()
        } else if (event === 'SIGNED_OUT') {
          setCustomer(null)
          setSession(null)
          if (sessionTimeout) {
            clearTimeout(sessionTimeout)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
      if (sessionTimeout) {
        clearTimeout(sessionTimeout)
      }
    }
  }, [])

  useEffect(() => {
    if (!session) return

    const handleActivity = () => {
      resetSessionTimeout()
    }

    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)

    return () => {
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [session, sessionTimeout])

  const value: CustomerAuthContextType = {
    customer,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshCustomer,
    isAuthenticated: !!customer && !!session,
  }

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  }
  return context
}
