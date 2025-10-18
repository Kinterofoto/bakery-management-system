import { supabase } from './supabase'

/**
 * Execute a mutation with audit context
 * This ensures the user ID is set in the same transaction as the query
 */
let currentUserId: string | null = null

export function setAuditUserId(userId: string | null) {
  currentUserId = userId
  console.log('📝 Audit user ID set:', userId)
}

export function getAuditUserId(): string | null {
  return currentUserId
}

/**
 * Wrapper for INSERT operations with audit context
 */
export async function insertWithAudit<T = any>(
  table: string,
  data: any | any[]
) {
  if (currentUserId) {
    // Set context before insert
    await supabase.rpc('set_audit_context', {
      setting_name: 'app.current_user_id',
      new_value: currentUserId,
      is_local: true  // Only for this transaction
    })
  }

  return supabase.from(table).insert(data)
}

/**
 * Wrapper for UPDATE operations with audit context
 */
export async function updateWithAudit<T = any>(
  table: string,
  data: any
) {
  if (currentUserId) {
    // Set context before update
    await supabase.rpc('set_audit_context', {
      setting_name: 'app.current_user_id',
      new_value: currentUserId,
      is_local: true
    })
  }

  return supabase.from(table).update(data)
}

/**
 * Wrapper for DELETE operations with audit context
 */
export async function deleteWithAudit<T = any>(
  table: string
) {
  if (currentUserId) {
    // Set context before delete
    await supabase.rpc('set_audit_context', {
      setting_name: 'app.current_user_id',
      new_value: currentUserId,
      is_local: true
    })
  }

  return supabase.from(table).delete()
}
