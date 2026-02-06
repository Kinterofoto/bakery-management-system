import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from './database.types'

function getSupabaseConfig(): { supabaseUrl: string; supabaseAnonKey: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[Supabase] Missing environment variables NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. Supabase client will not be available.'
    )
    return null
  }

  return { supabaseUrl, supabaseAnonKey }
}

/**
 * Returns true if Supabase environment variables are configured.
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Enhanced Supabase client that sets user context for audit logging.
 *
 * Instead of intercepting each query, this sets the session variable ONCE
 * when the user logs in, and it persists for the entire session.
 */
class SupabaseWithContext {
  private _client: SupabaseClient<Database> | null = null
  private currentUserId: string | null = null

  private get client(): SupabaseClient<Database> | null {
    if (!this._client) {
      const config = getSupabaseConfig()
      if (!config) return null
      const { supabaseUrl, supabaseAnonKey } = config
      this._client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
        global: {
          headers: {
            'X-Client-Info': 'panaderia-industrial@1.0.0',
          },
        },
      })
    }
    return this._client
  }

  /**
   * Set the current user ID for audit tracking
   * This establishes the session variable that triggers will use
   */
  async setUserId(userId: string | null) {
    this.currentUserId = userId

    if (userId) {
      console.log('🔧 User ID stored for audit context:', userId)
    } else {
      console.log('🔄 Clearing user ID')
    }
  }

  /**
   * Set audit context for the CURRENT transaction
   * Must be called before each mutation that needs audit tracking
   */
  async setAuditContext() {
    if (this.currentUserId && this.client) {
      const { error } = await this.client.rpc('set_audit_context', {
        setting_name: 'app.current_user_id',
        new_value: this.currentUserId,
        is_local: true  // Only for this transaction
      })

      if (error) {
        console.error('❌ Failed to set audit context:', error)
        return false
      }
      return true
    }
    return false
  }

  /**
   * Get the current user ID
   */
  getUserId(): string | null {
    return this.currentUserId
  }

  /**
   * Get the underlying Supabase client
   * Returns null if Supabase is not configured.
   */
  get raw(): SupabaseClient<Database> | null {
    return this.client
  }

  /**
   * Access to auth methods (returns null if not configured)
   */
  get auth() {
    return this.client?.auth ?? null
  }

  /**
   * Access to storage methods (returns null if not configured)
   */
  get storage() {
    return this.client?.storage ?? null
  }

  /**
   * Direct access to query builder (use for SELECT queries)
   * For mutations, use fromWithAudit() instead
   */
  from<T extends keyof Database['public']['Tables']>(table: T) {
    if (!this.client) {
      throw new Error('[Supabase] Client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }
    return this.client.from(table)
  }


  /**
   * RPC call wrapper
   */
  async rpc<T = any>(
    fn: string,
    args?: Record<string, any>,
    options?: any
  ): Promise<{ data: T | null; error: any }> {
    if (!this.client) {
      return { data: null, error: { message: 'Supabase client not configured' } }
    }
    return this.client.rpc(fn, args, options)
  }

  /**
   * Channel subscription wrapper
   */
  channel(name: string, opts?: any) {
    if (!this.client) return null
    return this.client.channel(name, opts)
  }
}

// Create and export the singleton instance
export const supabaseWithContext = new SupabaseWithContext()

// Export a lazy proxy for the raw client for backwards compatibility.
// This avoids accessing the Supabase client at module load time (which would
// crash if env vars are not yet available during SSR module evaluation).
// All property accesses are forwarded to the real client on first use.
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const realClient = supabaseWithContext.raw
    if (!realClient) {
      // Return safe no-ops for common properties when Supabase is not configured
      if (prop === 'auth') {
        return {
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          getSession: async () => ({ data: { session: null }, error: null }),
          signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
          signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
          signOut: async () => ({ error: null }),
          updateUser: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        }
      }
      if (prop === 'from') {
        return () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not configured' } }) }) }),
          update: () => ({ eq: async () => ({ error: { message: 'Supabase not configured' } }) }),
          insert: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        })
      }
      if (prop === 'storage') return null
      if (prop === 'rpc') return async () => ({ data: null, error: { message: 'Supabase not configured' } })
      if (prop === 'channel') return () => null
      return undefined
    }
    const value = Reflect.get(realClient, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(realClient)
    }
    return value
  },
})

/**
 * Hook to use Supabase with automatic user context
 * Call this in your AuthContext or wherever you manage user state
 */
export function useSupabaseContext() {
  const setUser = (userId: string | null) => {
    supabaseWithContext.setUserId(userId)
  }

  return {
    supabase: supabaseWithContext,
    setUser,
  }
}
