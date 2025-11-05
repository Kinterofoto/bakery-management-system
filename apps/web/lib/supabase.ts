/**
 * IMPORTANT: This file now re-exports from supabase-with-context.ts
 * to ensure there is only ONE Supabase client instance in the entire app.
 *
 * This maintains session context for audit logging across all operations.
 * DO NOT create a new client here - use the singleton from supabase-with-context.ts
 */

export { supabase, supabaseWithContext } from './supabase-with-context'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: "admin" | "reviewer_area1" | "reviewer_area2" | "dispatcher" | "driver" | "commercial"
          created_at: string
          updated_at: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          created_at: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          client_id: string
          expected_delivery_date: string
          observations: string | null
          status:
            | "received"
            | "review_area1"
            | "review_area2"
            | "ready_dispatch"
            | "dispatched"
            | "in_delivery"
            | "delivered"
            | "partially_delivered"
            | "returned"
          created_by: string
          created_at: string
          updated_at: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity_requested: number
          quantity_available: number
          quantity_missing: number
          quantity_dispatched: number
          quantity_delivered: number
          quantity_returned: number
          availability_status: "pending" | "available" | "partial" | "unavailable"
          created_at: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          unit: string
          price: number | null
          created_at: string
        }
      }
      routes: {
        Row: {
          id: string
          route_name: string
          driver_id: string
          route_date: string
          status: "planned" | "in_progress" | "completed"
          created_at: string
        }
      }
      route_orders: {
        Row: {
          id: string
          route_id: string
          order_id: string
          delivery_sequence: number
          delivery_status: "pending" | "delivered" | "partial" | "rejected"
          delivery_time: string | null
          evidence_url: string | null
          delivery_notes: string | null
          created_at: string
        }
      }
      returns: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity_returned: number
          return_reason: string | null
          return_date: string
          processed_by: string
        }
      }
    }
  }
}
