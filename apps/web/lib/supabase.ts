/**
 * IMPORTANT: This file now re-exports from supabase-with-context.ts
 * to ensure there is only ONE Supabase client instance in the entire app.
 *
 * This maintains session context for audit logging across all operations.
 * DO NOT create a new client here - use the singleton from supabase-with-context.ts
 */

export { supabase, supabaseWithContext } from './supabase-with-context'
