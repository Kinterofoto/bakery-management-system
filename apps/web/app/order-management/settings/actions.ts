"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Create authenticated Supabase client using user's session from cookies
// This ensures RLS policies work correctly (client_frequencies requires authenticated role)
async function createAuthenticatedClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("sb-access-token")?.value
  const refreshToken = cookieStore.get("sb-refresh-token")?.value

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  )

  // Set the user's session if tokens are available
  if (accessToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || "",
    })
  }

  return supabase
}

// === Types ===

export interface Client {
  id: string
  name: string
  razon_social?: string | null
  nit?: string | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  facturador?: string | null
  category?: string | null
  billing_type?: "facturable" | "remision" | null
  is_active: boolean
  created_at?: string | null
}

export interface Branch {
  id: string
  client_id: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  is_main: boolean
  observations?: string | null
  created_at?: string | null
}

export interface ClientFrequency {
  id: string
  branch_id: string
  day_of_week: number
  is_active: boolean
  notes?: string | null
  created_at?: string | null
}

export interface ClientCreditTerm {
  id: string
  client_id: string
  credit_days: number
  created_at?: string | null
}

// === Server Actions ===

export async function getClients(): Promise<{ data: Client[] | null; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error("Error fetching clients:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error fetching clients" }
  }
}

export async function getBranches(): Promise<{ data: Branch[] | null; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error("Error fetching branches:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error fetching branches" }
  }
}

export async function getClientFrequencies(): Promise<{ data: ClientFrequency[] | null; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { data, error } = await supabase
      .from("client_frequencies")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error("Error fetching frequencies:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error fetching frequencies" }
  }
}

export async function getClientCreditTerms(): Promise<{ data: ClientCreditTerm[] | null; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { data, error } = await supabase
      .from("client_credit_terms")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error("Error fetching credit terms:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error fetching credit terms" }
  }
}

// === Combined fetch for initial page load (single round-trip) ===

export interface SettingsInitialData {
  clients: Client[]
  branches: Branch[]
  frequencies: ClientFrequency[]
  creditTerms: ClientCreditTerm[]
}

export async function getSettingsInitialData(): Promise<{ data: SettingsInitialData | null; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()

    // Execute all queries in parallel on the server
    const [clientsRes, branchesRes, frequenciesRes, creditTermsRes] = await Promise.all([
      supabase.from("clients").select("*").order("name", { ascending: true }),
      supabase.from("branches").select("*").order("created_at", { ascending: false }),
      supabase.from("client_frequencies").select("*").order("created_at", { ascending: false }),
      supabase.from("client_credit_terms").select("*").order("created_at", { ascending: false }),
    ])

    if (clientsRes.error) throw clientsRes.error
    if (branchesRes.error) throw branchesRes.error
    if (frequenciesRes.error) throw frequenciesRes.error
    if (creditTermsRes.error) throw creditTermsRes.error

    return {
      data: {
        clients: clientsRes.data || [],
        branches: branchesRes.data || [],
        frequencies: frequenciesRes.data || [],
        creditTerms: creditTermsRes.data || [],
      },
      error: null,
    }
  } catch (err) {
    console.error("Error fetching settings data:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error fetching settings data" }
  }
}

// === Mutations ===

export async function createClient(clientData: Omit<Client, "id" | "created_at" | "is_active">): Promise<{ data: Client | null; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { data, error } = await supabase
      .from("clients")
      .insert({ ...clientData, is_active: true })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error("Error creating client:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error creating client" }
  }
}

export async function updateClient(id: string, clientData: Partial<Client>): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { error } = await supabase
      .from("clients")
      .update(clientData)
      .eq("id", id)

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error("Error updating client:", err)
    return { success: false, error: err instanceof Error ? err.message : "Error updating client" }
  }
}

export async function toggleClientActive(id: string, isActive: boolean): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { error } = await supabase
      .from("clients")
      .update({ is_active: isActive })
      .eq("id", id)

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error("Error toggling client active:", err)
    return { success: false, error: err instanceof Error ? err.message : "Error toggling client status" }
  }
}

export async function createBranch(branchData: Omit<Branch, "id" | "created_at">): Promise<{ data: Branch | null; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { data, error } = await supabase
      .from("branches")
      .insert(branchData)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error("Error creating branch:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error creating branch" }
  }
}

export async function updateBranch(id: string, branchData: Partial<Branch>): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { error } = await supabase
      .from("branches")
      .update(branchData)
      .eq("id", id)

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error("Error updating branch:", err)
    return { success: false, error: err instanceof Error ? err.message : "Error updating branch" }
  }
}

export async function deleteBranch(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { error } = await supabase
      .from("branches")
      .delete()
      .eq("id", id)

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error("Error deleting branch:", err)
    return { success: false, error: err instanceof Error ? err.message : "Error deleting branch" }
  }
}

export async function toggleFrequency(branchId: string, dayOfWeek: number): Promise<{ data: ClientFrequency | null; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    // Check if frequency exists
    const { data: existing } = await supabase
      .from("client_frequencies")
      .select("*")
      .eq("branch_id", branchId)
      .eq("day_of_week", dayOfWeek)
      .single()

    if (existing) {
      // Toggle existing
      const { data, error } = await supabase
        .from("client_frequencies")
        .update({ is_active: !existing.is_active })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } else {
      // Create new
      const { data, error } = await supabase
        .from("client_frequencies")
        .insert({ branch_id: branchId, day_of_week: dayOfWeek, is_active: true })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    }
  } catch (err) {
    console.error("Error toggling frequency:", err)
    return { data: null, error: err instanceof Error ? err.message : "Error toggling frequency" }
  }
}

export async function updateCreditTerm(clientId: string, creditDays: number): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    // Upsert credit term
    const { error } = await supabase
      .from("client_credit_terms")
      .upsert(
        { client_id: clientId, credit_days: creditDays },
        { onConflict: "client_id" }
      )

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error("Error updating credit term:", err)
    return { success: false, error: err instanceof Error ? err.message : "Error updating credit term" }
  }
}

export async function updateClientBillingType(clientId: string, billingType: "facturable" | "remision"): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createAuthenticatedClient()
    const { error } = await supabase
      .from("clients")
      .update({ billing_type: billingType })
      .eq("id", clientId)

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error("Error updating billing type:", err)
    return { success: false, error: err instanceof Error ? err.message : "Error updating billing type" }
  }
}
