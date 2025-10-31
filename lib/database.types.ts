export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: "admin" | "reviewer_area1" | "reviewer_area2" | "dispatcher" | "driver" | "commercial" | "client"
          cedula: string | null
          created_at: string | null
          updated_at: string | null
          permissions: {
            crm: boolean
            users: boolean
            orders: boolean
            inventory: boolean
            production: boolean
            plan_master: boolean
            nucleo: boolean
            ecommerce: boolean
          } | null
          status: string | null
          last_login: string | null
          auth_user_id: string | null
          company_id: string | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: "admin" | "reviewer_area1" | "reviewer_area2" | "dispatcher" | "driver" | "commercial" | "client"
          cedula?: string | null
          created_at?: string | null
          updated_at?: string | null
          permissions?: {
            crm: boolean
            users: boolean
            orders: boolean
            inventory: boolean
            production: boolean
            plan_master: boolean
            nucleo: boolean
            ecommerce: boolean
          } | null
          status?: string | null
          last_login?: string | null
          auth_user_id?: string | null
          company_id?: string | null
        }
        Update: {
          email?: string
          name?: string
          role?: "admin" | "reviewer_area1" | "reviewer_area2" | "dispatcher" | "driver" | "commercial" | "client"
          cedula?: string | null
          updated_at?: string | null
          permissions?: {
            crm: boolean
            users: boolean
            orders: boolean
            inventory: boolean
            production: boolean
            plan_master: boolean
            nucleo: boolean
            ecommerce: boolean
          } | null
          status?: string | null
          last_login?: string | null
          auth_user_id?: string | null
          company_id?: string | null
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
          razon_social: string | null
          nit: string | null
          lead_status: string
          lead_source_id: string | null
          assigned_user_id: string | null
          created_at: string
          facturador: "LA FABRIKA CO" | "PASTRY CHEF" | null
          category: "CAFE" | "UNIVERSIDAD" | "CONVENIENCIA" | "HOTEL" | "COLEGIO" | "CATERING" | "SUPERMERCADO" | "CLUB" | "RESTAURANTE" | "OTRO" | null
          billing_type: "facturable" | "remision"
        }
        Insert: {
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          razon_social?: string | null
          nit?: string | null
          lead_status?: string
          lead_source_id?: string | null
          assigned_user_id?: string | null
          facturador?: "LA FABRIKA CO" | "PASTRY CHEF" | null
          category?: "CAFE" | "UNIVERSIDAD" | "CONVENIENCIA" | "HOTEL" | "COLEGIO" | "CATERING" | "SUPERMERCADO" | "CLUB" | "RESTAURANTE" | "OTRO" | null
          billing_type?: "facturable" | "remision"
        }
        Update: {
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          razon_social?: string | null
          nit?: string | null
          lead_status?: string
          lead_source_id?: string | null
          assigned_user_id?: string | null
          facturador?: "LA FABRIKA CO" | "PASTRY CHEF" | null
          category?: "CAFE" | "UNIVERSIDAD" | "CONVENIENCIA" | "HOTEL" | "COLEGIO" | "CATERING" | "SUPERMERCADO" | "CLUB" | "RESTAURANTE" | "OTRO" | null
          billing_type?: "facturable" | "remision"
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
          observations: string | null
        }
        Insert: {
          client_id: string
          name: string
          address?: string | null
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          is_main?: boolean
          observations?: string | null
        }
        Update: {
          name?: string
          address?: string | null
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          is_main?: boolean
          observations?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          client_id: string
          branch_id: string | null
          expected_delivery_date: string
          requested_delivery_date: string | null
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
            | "remisionado"
          total_value: number
          subtotal: number | null
          vat_amount: number | null
          assigned_route_id: string | null
          purchase_order_number: string | null
          is_invoiced: boolean
          invoiced_at: string | null
          invoice_export_id: string | null
          requires_remision: boolean
          is_invoiced_from_remision: boolean
          remision_invoiced_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          order_number: string
          client_id: string
          branch_id?: string | null
          expected_delivery_date: string
          requested_delivery_date?: string | null
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
            | "remisionado"
          total_value?: number
          subtotal?: number | null
          vat_amount?: number | null
          assigned_route_id?: string | null
          purchase_order_number?: string | null
          is_invoiced?: boolean
          invoiced_at?: string | null
          invoice_export_id?: string | null
          requires_remision?: boolean
          is_invoiced_from_remision?: boolean
          remision_invoiced_at?: string | null
          created_by: string
        }
        Update: {
          order_number?: string
          client_id?: string
          branch_id?: string | null
          expected_delivery_date?: string
          requested_delivery_date?: string | null
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
            | "remisionado"
          subtotal?: number | null
          vat_amount?: number | null
          total_value?: number
          assigned_route_id?: string | null
          purchase_order_number?: string | null
          is_invoiced?: boolean
          invoiced_at?: string | null
          invoice_export_id?: string | null
          requires_remision?: boolean
          is_invoiced_from_remision?: boolean
          remision_invoiced_at?: string | null
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
          quantity_completed: number
          quantity_dispatched: number
          quantity_delivered: number
          quantity_returned: number
          unit_price: number
          availability_status: "pending" | "available" | "partial" | "unavailable"
          lote: string | null
          created_at: string
        }
        Insert: {
          order_id: string
          product_id: string
          quantity_requested: number
          quantity_available?: number
          quantity_missing?: number
          quantity_completed?: number
          quantity_dispatched?: number
          quantity_delivered?: number
          quantity_returned?: number
          unit_price: number
          availability_status?: "pending" | "available" | "partial" | "unavailable"
          lote?: string | null
        }
        Update: {
          quantity_requested?: number
          quantity_available?: number
          quantity_missing?: number
          quantity_completed?: number
          quantity_dispatched?: number
          quantity_delivered?: number
          quantity_returned?: number
          unit_price?: number
          availability_status?: "pending" | "available" | "partial" | "unavailable"
          lote?: string | null
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
          nombre_wo: string | null
          codigo_wo: string | null
          created_at: string
          visible_in_ecommerce: boolean
          tax_rate: number | null
          subcategory: string | null
        }
        Insert: {
          name: string
          description?: string | null
          unit?: string
          price?: number | null
          weight?: string | null
          category?: "PT" | "MP"
          nombre_wo?: string | null
          codigo_wo?: string | null
          visible_in_ecommerce?: boolean
          tax_rate?: number | null
          subcategory?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          unit?: string
          price?: number | null
          weight?: string | null
          category?: "PT" | "MP"
          nombre_wo?: string | null
          codigo_wo?: string | null
          visible_in_ecommerce?: boolean
          tax_rate?: number | null
          subcategory?: string | null
        }
      }
      vehicles: {
        Row: {
          id: string
          vehicle_code: string
          driver_id: string | null
          capacity_kg: number | null
          status: "available" | "in_use" | "maintenance"
          created_at: string
        }
        Insert: {
          vehicle_code: string
          driver_id?: string | null
          capacity_kg?: number | null
          status?: "available" | "in_use" | "maintenance"
        }
        Update: {
          vehicle_code?: string
          driver_id?: string | null
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
          status: "pending" | "accepted" | "rejected"
          status_updated_at: string | null
        }
        Insert: {
          order_id: string
          product_id: string
          route_id?: string | null
          quantity_returned: number
          return_reason?: string | null
          rejection_reason?: string | null
          processed_by: string
          status?: "pending" | "accepted" | "rejected"
          status_updated_at?: string | null
        }
        Update: {
          quantity_returned?: number
          return_reason?: string | null
          rejection_reason?: string | null
          status?: "pending" | "accepted" | "rejected"
          status_updated_at?: string | null
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
      system_config: {
        Row: {
          id: number
          config_key: string
          config_value: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: string | null
          description?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string | null
          description?: string | null
        }
      }
      client_credit_terms: {
        Row: {
          id: number
          client_id: string
          branch_id: string
          credit_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          branch_id: string
          credit_days?: number
        }
        Update: {
          client_id?: string
          branch_id?: string
          credit_days?: number
        }
      }
      client_price_lists: {
        Row: {
          id: number
          product_id: string
          client_id: string
          unit_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          product_id: string
          client_id: string
          unit_price: number
          is_active?: boolean
        }
        Update: {
          product_id?: string
          client_id?: string
          unit_price?: number
          is_active?: boolean
        }
      }
      export_history: {
        Row: {
          id: string
          export_date: string
          invoice_number_start: number
          invoice_number_end: number
          total_orders: number
          total_amount: number
          routes_exported: string[]
          route_names: string[]
          file_name: string
          file_data: Uint8Array | null
          export_summary: any | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          export_date?: string
          invoice_number_start: number
          invoice_number_end: number
          total_orders?: number
          total_amount?: number
          routes_exported?: string[]
          route_names?: string[]
          file_name: string
          file_data?: Uint8Array | null
          export_summary?: any | null
          created_by: string
        }
        Update: {
          export_date?: string
          invoice_number_start?: number
          invoice_number_end?: number
          total_orders?: number
          total_amount?: number
          routes_exported?: string[]
          route_names?: string[]
          file_name?: string
          file_data?: Uint8Array | null
          export_summary?: any | null
          created_by?: string
        }
      }
      order_invoices: {
        Row: {
          id: string
          order_id: string
          export_history_id: string
          invoice_number: number
          invoice_date: string
          order_amount: number
          client_name: string | null
          route_name: string | null
          created_at: string
        }
        Insert: {
          order_id: string
          export_history_id: string
          invoice_number: number
          invoice_date: string
          order_amount?: number
          client_name?: string | null
          route_name?: string | null
        }
        Update: {
          order_id?: string
          export_history_id?: string
          invoice_number?: number
          invoice_date?: string
          order_amount?: number
          client_name?: string | null
          route_name?: string | null
        }
      }
      remisions: {
        Row: {
          id: string
          order_id: string
          remision_number: string
          client_data: Record<string, any>
          total_amount: number
          pdf_path: string | null
          pdf_data: Uint8Array | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          order_id: string
          remision_number: string
          client_data: Record<string, any>
          total_amount: number
          pdf_path?: string | null
          pdf_data?: Uint8Array | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          remision_number?: string
          client_data?: Record<string, any>
          total_amount?: number
          pdf_path?: string | null
          pdf_data?: Uint8Array | null
          notes?: string | null
        }
      }
      remision_items: {
        Row: {
          id: string
          remision_id: string
          product_id: string | null
          product_name: string
          quantity_delivered: number
          unit_price: number
          total_price: number
          product_unit: string | null
          created_at: string
        }
        Insert: {
          remision_id: string
          product_id?: string | null
          product_name: string
          quantity_delivered: number
          unit_price: number
          total_price: number
          product_unit?: string | null
        }
        Update: {
          product_id?: string | null
          product_name?: string
          quantity_delivered?: number
          unit_price?: number
          total_price?: number
          product_unit?: string | null
        }
      }
      client_config: {
        Row: {
          id: number
          client_id: string
          orders_by_units: boolean | null
          delivers_to_main_branch: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          orders_by_units?: boolean | null
          delivers_to_main_branch?: boolean | null
        }
        Update: {
          orders_by_units?: boolean | null
          delivers_to_main_branch?: boolean | null
        }
      }
    }
  }
  produccion: {
    Tables: {
      work_centers: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          description?: string | null
          is_active?: boolean
        }
        Update: {
          code?: string
          name?: string
          description?: string | null
          is_active?: boolean
        }
      }
      production_shifts: {
        Row: {
          id: string
          work_center_id: string
          shift_name: string
          started_at: string
          ended_at: string | null
          status: "active" | "paused" | "completed"
          created_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          work_center_id: string
          shift_name: string
          started_at?: string
          ended_at?: string | null
          status?: "active" | "paused" | "completed"
          created_by?: string | null
          notes?: string | null
        }
        Update: {
          shift_name?: string
          ended_at?: string | null
          status?: "active" | "paused" | "completed"
          notes?: string | null
        }
      }
      production_routes: {
        Row: {
          id: string
          product_id: string
          work_center_id: string
          sequence_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          product_id: string
          work_center_id: string
          sequence_order: number
          is_active?: boolean
        }
        Update: {
          sequence_order?: number
          is_active?: boolean
        }
      }
      production_productivity: {
        Row: {
          id: string
          product_id: string
          work_center_id: string
          units_per_hour: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          product_id: string
          work_center_id: string
          units_per_hour: number
          is_active?: boolean
        }
        Update: {
          units_per_hour?: number
          is_active?: boolean
        }
      }
      materials: {
        Row: {
          id: string
          name: string
          description: string | null
          base_unit: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          base_unit?: string
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          base_unit?: string
          is_active?: boolean
        }
      }
      bill_of_materials: {
        Row: {
          id: string
          product_id: string
          material_id: string
          quantity_needed: number
          unit_name: string
          unit_equivalence_grams: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          product_id: string
          material_id: string
          quantity_needed: number
          unit_name: string
          unit_equivalence_grams: number
          is_active?: boolean
        }
        Update: {
          quantity_needed?: number
          unit_name?: string
          unit_equivalence_grams?: number
          is_active?: boolean
        }
      }
      shift_productions: {
        Row: {
          id: string
          shift_id: string
          product_id: string
          started_at: string
          ended_at: string | null
          status: "active" | "paused" | "completed"
          total_good_units: number
          total_bad_units: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          shift_id: string
          product_id: string
          started_at?: string
          ended_at?: string | null
          status?: "active" | "paused" | "completed"
          total_good_units?: number
          total_bad_units?: number
          notes?: string | null
        }
        Update: {
          ended_at?: string | null
          status?: "active" | "paused" | "completed"
          notes?: string | null
        }
      }
      production_records: {
        Row: {
          id: string
          shift_production_id: string
          good_units: number
          bad_units: number
          recorded_at: string
          recorded_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          shift_production_id: string
          good_units?: number
          bad_units?: number
          recorded_at?: string
          recorded_by?: string | null
          notes?: string | null
        }
        Update: {
          good_units?: number
          bad_units?: number
          notes?: string | null
        }
      }
      material_consumptions: {
        Row: {
          id: string
          shift_production_id: string
          material_id: string
          quantity_consumed: number
          consumption_type: "consumed" | "wasted"
          recorded_at: string
          recorded_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          shift_production_id: string
          material_id: string
          quantity_consumed: number
          consumption_type?: "consumed" | "wasted"
          recorded_at?: string
          recorded_by?: string | null
          notes?: string | null
        }
        Update: {
          quantity_consumed?: number
          consumption_type?: "consumed" | "wasted"
          notes?: string | null
        }
      }
      production_route_tracking: {
        Row: {
          id: string
          product_id: string
          work_center_id: string
          shift_date: string
          units_processed: number
          units_pending: number
          created_at: string
          updated_at: string
        }
        Insert: {
          product_id: string
          work_center_id: string
          shift_date?: string
          units_processed?: number
          units_pending?: number
        }
        Update: {
          units_processed?: number
          units_pending?: number
        }
      }
      receiving_schedules: {
        Row: {
          id: string
          client_id: string | null
          branch_id: string | null
          day_of_week: number
          start_time: string
          end_time: string
          status: "available" | "unavailable"
          timezone: string | null
          applied_template_id: string | null
          metadata: Record<string, any> | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          branch_id?: string | null
          day_of_week: number
          start_time: string
          end_time: string
          status?: "available" | "unavailable"
          timezone?: string | null
          applied_template_id?: string | null
          metadata?: Record<string, any> | null
        }
        Update: {
          client_id?: string | null
          branch_id?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          status?: "available" | "unavailable"
          timezone?: string | null
          applied_template_id?: string | null
          metadata?: Record<string, any> | null
        }
      }
      receiving_exceptions: {
        Row: {
          id: string
          client_id: string | null
          branch_id: string | null
          exception_date: string
          type: "blocked" | "open_extra" | "special_hours"
          start_time: string | null
          end_time: string | null
          note: string | null
          source: "user" | "imported" | "holiday_api"
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          branch_id?: string | null
          exception_date: string
          type: "blocked" | "open_extra" | "special_hours"
          start_time?: string | null
          end_time?: string | null
          note?: string | null
          source?: "user" | "imported" | "holiday_api"
        }
        Update: {
          client_id?: string | null
          branch_id?: string | null
          exception_date?: string
          type?: "blocked" | "open_extra" | "special_hours"
          start_time?: string | null
          end_time?: string | null
          note?: string | null
          source?: "user" | "imported" | "holiday_api"
        }
      }
      receiving_patterns: {
        Row: {
          id: string
          client_id: string | null
          branch_id: string | null
          name: string
          rrule: string
          effect_type: "block" | "open_extra"
          start_time: string | null
          end_time: string | null
          note: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          branch_id?: string | null
          name: string
          rrule: string
          effect_type: "block" | "open_extra"
          start_time?: string | null
          end_time?: string | null
          note?: string | null
          is_active?: boolean | null
        }
        Update: {
          client_id?: string | null
          branch_id?: string | null
          name?: string
          rrule?: string
          effect_type?: "block" | "open_extra"
          start_time?: string | null
          end_time?: string | null
          note?: string | null
          is_active?: boolean | null
        }
      }
      receiving_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          payload: Record<string, any>
          created_by: string | null
          is_public: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          name: string
          description?: string | null
          payload: Record<string, any>
          created_by?: string | null
          is_public?: boolean | null
        }
        Update: {
          name?: string
          description?: string | null
          payload?: Record<string, any>
          created_by?: string | null
          is_public?: boolean | null
        }
      }
      receiving_audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          target_table: string
          target_id: string
          before_data: Record<string, any> | null
          after_data: Record<string, any> | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          user_id?: string | null
          action: string
          target_table: string
          target_id: string
          before_data?: Record<string, any> | null
          after_data?: Record<string, any> | null
          notes?: string | null
        }
        Update: {
          user_id?: string | null
          action?: string
          target_table?: string
          target_id?: string
          before_data?: Record<string, any> | null
          after_data?: Record<string, any> | null
          notes?: string | null
        }
      }
      client_frequencies: {
        Row: {
          id: string
          branch_id: string
          day_of_week: number
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          day_of_week: number
          is_active?: boolean
          notes?: string | null
        }
        Update: {
          day_of_week?: number
          is_active?: boolean
          notes?: string | null
        }
      }
    }
  }
}
