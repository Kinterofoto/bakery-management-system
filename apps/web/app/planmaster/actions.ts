"use server"

import { createClient } from "@supabase/supabase-js"

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error("Supabase credentials not configured")
  }
  return createClient(url, key)
}

export interface CascadeV2Params {
  product_id: string
  start_datetime: string
  duration_hours: number
  staff_count: number
  week_plan_id?: string
}

export async function createCascadeV2(params: CascadeV2Params) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.schema("produccion").rpc("generate_cascade_v2", {
    p_product_id: params.product_id,
    p_start_datetime: params.start_datetime,
    p_duration_hours: params.duration_hours,
    p_staff_count: params.staff_count,
    p_week_plan_id: params.week_plan_id || null,
    p_create_in_db: true,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function previewCascadeV2(params: CascadeV2Params) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.schema("produccion").rpc("generate_cascade_v2", {
    p_product_id: params.product_id,
    p_start_datetime: params.start_datetime,
    p_duration_hours: params.duration_hours,
    p_staff_count: params.staff_count,
    p_week_plan_id: params.week_plan_id || null,
    p_create_in_db: false,
  })
  if (error) throw new Error(error.message)
  return data
}
