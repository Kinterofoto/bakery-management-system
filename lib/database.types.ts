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
          lead_status: string
          lead_source_id: string | null
          assigned_user_id: string | null
          created_at: string
        }
        Insert: {
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          lead_status?: string
          lead_source_id?: string | null
          assigned_user_id?: string | null
        }
        Update: {
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          lead_status?: string
          lead_source_id?: string | null
          assigned_user_id?: string | null
        }
      }
      branches: {
        Row: {
          id: string
          client_id: string
          name: string
          address: string | null
          contact_person: string | null
          phone: string | null
          email: string | null
          is_main: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          name: string
          address?: string | null
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          is_main?: boolean
        }
        Update: {
          name?: string
          address?: string | null
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          is_main?: boolean
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          client_id: string
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
          weight: string | null
          category: "PT" | "MP"
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          unit?: string
          price?: number | null
          weight?: string | null
          category?: "PT" | "MP"
        }
        Update: {
          name?: string
          description?: string | null
          unit?: string
          price?: number | null
          weight?: string | null
          category?: "PT" | "MP"
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
      lead_activities: {
        Row: {
          id: string
          client_id: string
          user_id: string | null
          activity_type: string
          title: string
          description: string | null
          status: string
          scheduled_date: string | null
          completed_date: string | null
          estimated_value: number | null
          actual_value: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          user_id?: string | null
          activity_type: string
          title: string
          description?: string | null
          status?: string
          scheduled_date?: string | null
          completed_date?: string | null
          estimated_value?: number | null
          actual_value?: number | null
        }
        Update: {
          activity_type?: string
          title?: string
          description?: string | null
          status?: string
          scheduled_date?: string | null
          completed_date?: string | null
          estimated_value?: number | null
          actual_value?: number | null
        }
      }
      pipeline_stages: {
        Row: {
          id: string
          name: string
          description: string | null
          stage_order: number
          probability: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          stage_order: number
          probability?: number
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          stage_order?: number
          probability?: number
          is_active?: boolean
        }
      }
      sales_opportunities: {
        Row: {
          id: string
          client_id: string
          assigned_user_id: string | null
          pipeline_stage_id: string | null
          title: string
          description: string | null
          estimated_value: number | null
          expected_close_date: string | null
          actual_close_date: string | null
          probability: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          assigned_user_id?: string | null
          pipeline_stage_id?: string | null
          title: string
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          probability?: number
          status?: string
        }
        Update: {
          assigned_user_id?: string | null
          pipeline_stage_id?: string | null
          title?: string
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          probability?: number
          status?: string
        }
      }
      lead_sources: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          is_active?: boolean
        }
      }
      inventories: {
        Row: {
          id: string
          name: string
          description: string | null
          status: "draft" | "in_progress" | "completed" | "cancelled"
          created_by: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          name: string
          description?: string | null
          status?: "draft" | "in_progress" | "completed" | "cancelled"
          created_by?: string | null
          completed_at?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          status?: "draft" | "in_progress" | "completed" | "cancelled"
          completed_at?: string | null
        }
      }
      inventory_counts: {
        Row: {
          id: string
          inventory_id: string
          count_number: number
          status: "in_progress" | "completed"
          created_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          inventory_id: string
          count_number?: number
          status?: "in_progress" | "completed"
          created_by?: string | null
          completed_at?: string | null
        }
        Update: {
          status?: "in_progress" | "completed"
          completed_at?: string | null
        }
      }
      inventory_count_items: {
        Row: {
          id: string
          inventory_count_id: string
          product_id: string
          quantity_units: number
          grams_per_unit: number
          total_grams: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          inventory_count_id: string
          product_id: string
          quantity_units?: number
          grams_per_unit?: number
          notes?: string | null
        }
        Update: {
          quantity_units?: number
          grams_per_unit?: number
          notes?: string | null
        }
      }
      inventory_reconciliations: {
        Row: {
          id: string
          inventory_id: string
          product_id: string
          count1_quantity: number | null
          count1_grams_per_unit: number | null
          count1_total_grams: number | null
          count2_quantity: number | null
          count2_grams_per_unit: number | null
          count2_total_grams: number | null
          final_quantity: number
          final_grams_per_unit: number
          final_total_grams: number
          variance_percentage: number | null
          resolution_method: "accept_count1" | "accept_count2" | "manual" | "third_count"
          notes: string | null
          resolved_by: string | null
          created_at: string
        }
        Insert: {
          inventory_id: string
          product_id: string
          count1_quantity?: number | null
          count1_grams_per_unit?: number | null
          count1_total_grams?: number | null
          count2_quantity?: number | null
          count2_grams_per_unit?: number | null
          count2_total_grams?: number | null
          final_quantity: number
          final_grams_per_unit: number
          variance_percentage?: number | null
          resolution_method?: "accept_count1" | "accept_count2" | "manual" | "third_count"
          notes?: string | null
          resolved_by?: string | null
        }
        Update: {
          final_quantity?: number
          final_grams_per_unit?: number
          variance_percentage?: number | null
          resolution_method?: "accept_count1" | "accept_count2" | "manual" | "third_count"
          notes?: string | null
          resolved_by?: string | null
        }
      }
      inventory_final_results: {
        Row: {
          id: string
          inventory_id: string
          product_id: string
          final_quantity: number
          final_grams_per_unit: number
          final_total_grams: number
          final_value: number | null
          variance_from_count1_percentage: number | null
          variance_from_count2_percentage: number | null
          resolution_method: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          inventory_id: string
          product_id: string
          final_quantity: number
          final_grams_per_unit: number
          final_value?: number | null
          variance_from_count1_percentage?: number | null
          variance_from_count2_percentage?: number | null
          resolution_method?: string | null
          notes?: string | null
        }
        Update: {
          final_quantity?: number
          final_grams_per_unit?: number
          final_value?: number | null
          variance_from_count1_percentage?: number | null
          variance_from_count2_percentage?: number | null
          resolution_method?: string | null
          notes?: string | null
        }
      }
    }
  }
}
