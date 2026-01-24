"use server"

import { createClient } from "@supabase/supabase-js"

export interface BranchLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  clientName: string
  clientId: string
  isMain: boolean
}

export async function getBranchLocations(): Promise<BranchLocation[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials not configured")
    return []
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from("branches")
    .select(`
      id,
      name,
      address,
      latitude,
      longitude,
      is_main,
      client_id,
      clients!inner (
        id,
        name,
        is_active
      )
    `)
    .not("latitude", "is", null)
    .not("longitude", "is", null)

  if (error) {
    console.error("Error fetching branch locations:", error)
    return []
  }

  // Filter only active clients and transform data
  const locations: BranchLocation[] = (data || [])
    .filter((branch: any) => branch.clients?.is_active !== false)
    .map((branch: any) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address || "",
      latitude: branch.latitude,
      longitude: branch.longitude,
      clientName: branch.clients?.name || "Sin cliente",
      clientId: branch.client_id,
      isMain: branch.is_main,
    }))

  return locations
}
