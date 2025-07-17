export interface Database {
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
        Insert: {
          email: string
          name: string
          role: "admin" | "reviewer_area1" | "reviewer_area2" | "dispatcher" | "driver" | "commercial"
        }
        Update: {
          email?: string
          name?: string
          role?: "admin" | "reviewer_area1" | "reviewer_area2" | "dispatcher" | "driver" | "commercial"
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
        Insert: {
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
        }
        Update: {
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
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
          total_value: number
          assigned_route_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          order_number: string
          client_id: string
          expected_delivery_date: string
          observations?: string | null
          status?:
            | "received"
            | "review_area1"
            | "review_area2"
            | "ready_dispatch"
            | "dispatched"
            | "in_delivery"
            | "delivered"
            | "partially_delivered"
            | "returned"
          total_value?: number
          assigned_route_id?: string | null
          created_by: string
        }
        Update: {
          order_number?: string
          client_id?: string
          expected_delivery_date?: string
          observations?: string | null
          status?:
            | "received"
            | "review_area1"
            | "review_area2"
            | "ready_dispatch"
            | "dispatched"
            | "in_delivery"
            | "delivered"
            | "partially_delivered"
            | "returned"
          total_value?: number
          assigned_route_id?: string | null
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
          unit_price: number
          availability_status: "pending" | "available" | "partial" | "unavailable"
          created_at: string
        }
        Insert: {
          order_id: string
          product_id: string
          quantity_requested: number
          quantity_available?: number
          quantity_missing?: number
          quantity_dispatched?: number
          quantity_delivered?: number
          quantity_returned?: number
          unit_price: number
          availability_status?: "pending" | "available" | "partial" | "unavailable"
        }
        Update: {
          quantity_requested?: number
          quantity_available?: number
          quantity_missing?: number
          quantity_dispatched?: number
          quantity_delivered?: number
          quantity_returned?: number
          unit_price?: number
          availability_status?: "pending" | "available" | "partial" | "unavailable"
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
        Insert: {
          name: string
          description?: string | null
          unit?: string
          price?: number | null
        }
        Update: {
          name?: string
          description?: string | null
          unit?: string
          price?: number | null
        }
      }
      vehicles: {
        Row: {
          id: string
          vehicle_code: string
          driver_name: string | null
          capacity_kg: number | null
          status: "available" | "in_use" | "maintenance"
          created_at: string
        }
        Insert: {
          vehicle_code: string
          driver_name?: string | null
          capacity_kg?: number | null
          status?: "available" | "in_use" | "maintenance"
        }
        Update: {
          vehicle_code?: string
          driver_name?: string | null
          capacity_kg?: number | null
          status?: "available" | "in_use" | "maintenance"
        }
      }
      routes: {
        Row: {
          id: string
          route_name: string
          driver_id: string
          vehicle_id: string | null
          route_date: string
          status: "planned" | "in_progress" | "completed"
          created_at: string
        }
        Insert: {
          route_name: string
          driver_id: string
          vehicle_id?: string | null
          route_date: string
          status?: "planned" | "in_progress" | "completed"
        }
        Update: {
          route_name?: string
          driver_id?: string
          vehicle_id?: string | null
          route_date?: string
          status?: "planned" | "in_progress" | "completed"
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
        Insert: {
          route_id: string
          order_id: string
          delivery_sequence: number
          delivery_status?: "pending" | "delivered" | "partial" | "rejected"
          delivery_time?: string | null
          evidence_url?: string | null
          delivery_notes?: string | null
        }
        Update: {
          delivery_sequence?: number
          delivery_status?: "pending" | "delivered" | "partial" | "rejected"
          delivery_time?: string | null
          evidence_url?: string | null
          delivery_notes?: string | null
        }
      }
      order_item_deliveries: {
        Row: {
          id: string
          route_order_id: string
          order_item_id: string
          delivery_status: "pending" | "delivered" | "partial" | "rejected"
          quantity_delivered: number
          quantity_rejected: number
          rejection_reason: string | null
          evidence_url: string | null
          delivery_notes: string | null
          delivered_at: string | null
          created_at: string
        }
        Insert: {
          route_order_id: string
          order_item_id: string
          delivery_status?: "pending" | "delivered" | "partial" | "rejected"
          quantity_delivered?: number
          quantity_rejected?: number
          rejection_reason?: string | null
          evidence_url?: string | null
          delivery_notes?: string | null
          delivered_at?: string | null
        }
        Update: {
          delivery_status?: "pending" | "delivered" | "partial" | "rejected"
          quantity_delivered?: number
          quantity_rejected?: number
          rejection_reason?: string | null
          evidence_url?: string | null
          delivery_notes?: string | null
          delivered_at?: string | null
        }
      }
      returns: {
        Row: {
          id: string
          order_id: string
          product_id: string
          route_id: string | null
          quantity_returned: number
          return_reason: string | null
          rejection_reason: string | null
          return_date: string
          processed_by: string
        }
        Insert: {
          order_id: string
          product_id: string
          route_id?: string | null
          quantity_returned: number
          return_reason?: string | null
          rejection_reason?: string | null
          processed_by: string
        }
        Update: {
          quantity_returned?: number
          return_reason?: string | null
          rejection_reason?: string | null
        }
      }
    }
  }
}
