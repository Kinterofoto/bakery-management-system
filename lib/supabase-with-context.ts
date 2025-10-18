import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Enhanced Supabase client that sets user context for audit logging.
 *
 * Instead of intercepting each query, this sets the session variable ONCE
 * when the user logs in, and it persists for the entire session.
 */
class SupabaseWithContext {
  private client: SupabaseClient<Database>
  private currentUserId: string | null = null

  constructor() {
    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  /**
   * Set the current user ID for audit tracking
   * This establishes the session variable that triggers will use
   */
  async setUserId(userId: string | null) {
    this.currentUserId = userId

    if (userId) {
      console.log('🔧 Setting audit context for user:', userId)

      const { data, error } = await this.client.rpc('set_audit_context', {
        setting_name: 'app.current_user_id',
        new_value: userId,
        is_local: false  // Persist for entire session
      })

      if (error) {
        console.error('❌ Failed to set audit context:', error)
      } else {
        console.log('✅ Audit context set successfully:', data)
      }
    } else {
      console.log('🔄 Clearing audit context')
    }
  }

  /**
   * Get the current user ID
   */
  getUserId(): string | null {
    return this.currentUserId
  }

  /**
   * Get the underlying Supabase client
   * Since context is set at session level, all queries will have it
   */
  get raw(): SupabaseClient<Database> {
    return this.client
  }

  /**
   * Access to auth methods
   */
  get auth() {
    return this.client.auth
  }

  /**
   * Access to storage methods
   */
  get storage() {
    return this.client.storage
  }

  /**
   * Direct access to query builder
   * Context is already set at session level, so no interception needed
   */
  from<T extends keyof Database['public']['Tables']>(table: T) {
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
    return this.client.rpc(fn, args, options)
  }

  /**
   * Channel subscription wrapper
   */
  channel(name: string, opts?: any) {
    return this.client.channel(name, opts)
  }
}

// Create and export the singleton instance
export const supabaseWithContext = new SupabaseWithContext()

// Export the raw client for backwards compatibility
// IMPORTANT: Both supabase and supabaseWithContext share the SAME underlying client instance
export const supabase = supabaseWithContext.raw

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
