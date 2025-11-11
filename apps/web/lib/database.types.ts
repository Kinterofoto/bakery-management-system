export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  produccion: {
    Tables: {
      bill_of_materials: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          material_id: string | null
          operation_id: string | null
          product_id: string | null
          quantity_needed: number
          unit_equivalence_grams: number
          unit_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          material_id?: string | null
          operation_id?: string | null
          product_id?: string | null
          quantity_needed: number
          unit_equivalence_grams: number
          unit_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          material_id?: string | null
          operation_id?: string | null
          product_id?: string | null
          quantity_needed?: number
          unit_equivalence_grams?: number
          unit_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_of_materials_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_consumptions: {
        Row: {
          consumption_type: string | null
          created_at: string | null
          id: string
          material_id: string | null
          notes: string | null
          quantity_consumed: number
          recorded_at: string | null
          recorded_by: string | null
          shift_production_id: string | null
        }
        Insert: {
          consumption_type?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity_consumed: number
          recorded_at?: string | null
          recorded_by?: string | null
          shift_production_id?: string | null
        }
        Update: {
          consumption_type?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity_consumed?: number
          recorded_at?: string | null
          recorded_by?: string | null
          shift_production_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_consumptions_shift_production_id_fkey"
            columns: ["shift_production_id"]
            isOneToOne: false
            referencedRelation: "shift_productions"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      production_productivity: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          operation_id: string | null
          product_id: string | null
          units_per_hour: number
          updated_at: string | null
          work_center_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          operation_id?: string | null
          product_id?: string | null
          units_per_hour: number
          updated_at?: string | null
          work_center_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          operation_id?: string | null
          product_id?: string | null
          units_per_hour?: number
          updated_at?: string | null
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_productivity_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_productivity_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      production_records: {
        Row: {
          bad_units: number | null
          created_at: string | null
          good_units: number | null
          id: string
          notes: string | null
          recorded_at: string | null
          recorded_by: string | null
          shift_production_id: string | null
        }
        Insert: {
          bad_units?: number | null
          created_at?: string | null
          good_units?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          shift_production_id?: string | null
        }
        Update: {
          bad_units?: number | null
          created_at?: string | null
          good_units?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          shift_production_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_records_shift_production_id_fkey"
            columns: ["shift_production_id"]
            isOneToOne: false
            referencedRelation: "shift_productions"
            referencedColumns: ["id"]
          },
        ]
      }
      production_route_tracking: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          shift_date: string
          units_pending: number | null
          units_processed: number | null
          updated_at: string | null
          work_center_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          shift_date?: string
          units_pending?: number | null
          units_processed?: number | null
          updated_at?: string | null
          work_center_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          shift_date?: string
          units_pending?: number | null
          units_processed?: number | null
          updated_at?: string | null
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_route_tracking_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      production_routes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          product_id: string | null
          sequence_order: number
          work_center_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          sequence_order: number
          work_center_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          sequence_order?: number
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_routes_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      production_shifts: {
        Row: {
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          id: string
          notes: string | null
          shift_name: string
          started_at: string
          status: string | null
          updated_at: string | null
          work_center_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          shift_name: string
          started_at?: string
          status?: string | null
          updated_at?: string | null
          work_center_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          shift_name?: string
          started_at?: string
          status?: string | null
          updated_at?: string | null
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_shifts_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_productions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          shift_id: string | null
          started_at: string
          status: string | null
          total_bad_units: number | null
          total_good_units: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          shift_id?: string | null
          started_at?: string
          status?: string | null
          total_bad_units?: number | null
          total_good_units?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          shift_id?: string | null
          started_at?: string
          status?: string | null
          total_bad_units?: number | null
          total_good_units?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_productions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "production_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      work_centers: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          operation_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          operation_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          operation_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_centers_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_theoretical_consumption: {
        Args: { p_product_id: string; p_units_produced: number }
        Returns: {
          material_id: string
          material_name: string
          theoretical_quantity: number
          unit_name: string
        }[]
      }
      calculate_theoretical_production: {
        Args: {
          p_end_time?: string
          p_product_id: string
          p_start_time: string
          p_work_center_id: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          access_denied_reason: string | null
          attempted_at: string | null
          attempted_path: string
          created_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          access_denied_reason?: string | null
          attempted_at?: string | null
          attempted_path: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          access_denied_reason?: string | null
          attempted_at?: string | null
          attempted_path?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          client_id: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_main: boolean | null
          name: string
          observations: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_main?: boolean | null
          name: string
          observations?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_main?: boolean | null
          name?: string
          observations?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_config: {
        Row: {
          client_id: string
          created_at: string | null
          delivers_to_main_branch: boolean | null
          id: number
          orders_by_units: boolean | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          delivers_to_main_branch?: boolean | null
          id?: number
          orders_by_units?: boolean | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          delivers_to_main_branch?: boolean | null
          id?: number
          orders_by_units?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_client_config_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credit_terms: {
        Row: {
          client_id: string
          created_at: string | null
          credit_days: number
          id: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          credit_days?: number
          id?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          credit_days?: number
          id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credit_terms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_frequencies: {
        Row: {
          branch_id: string
          created_at: string | null
          day_of_week: number
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          day_of_week: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_frequencies_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      client_price_lists: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          product_id: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          product_id?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          product_id?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_price_lists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "client_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_rag: {
        Row: {
          content: string | null
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          assigned_user_id: string | null
          billing_type: Database["public"]["Enums"]["billing_type_enum"] | null
          category: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          facturador: string | null
          id: string
          lead_source_id: string | null
          lead_status: string | null
          name: string
          nit: string | null
          phone: string | null
          razon_social: string | null
        }
        Insert: {
          address?: string | null
          assigned_user_id?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type_enum"] | null
          category?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          facturador?: string | null
          id?: string
          lead_source_id?: string | null
          lead_status?: string | null
          name: string
          nit?: string | null
          phone?: string | null
          razon_social?: string | null
        }
        Update: {
          address?: string | null
          assigned_user_id?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type_enum"] | null
          category?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          facturador?: string | null
          id?: string
          lead_source_id?: string | null
          lead_status?: string | null
          name?: string
          nit?: string | null
          phone?: string | null
          razon_social?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body: string | null
          client_id: string | null
          conversation_id: string | null
          created_at: string
          from_email: string | null
          id: string
          message_id: string | null
          subject: string | null
          to_email: string | null
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string
          from_email?: string | null
          id?: string
          message_id?: string | null
          subject?: string | null
          to_email?: string | null
        }
        Update: {
          body?: string | null
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string
          from_email?: string | null
          id?: string
          message_id?: string | null
          subject?: string | null
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: never
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      export_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          export_date: string | null
          export_summary: Json | null
          file_data: string | null
          file_name: string
          id: string
          invoice_number_end: number
          invoice_number_start: number
          route_names: string[]
          routes_exported: string[]
          total_amount: number | null
          total_orders: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          export_date?: string | null
          export_summary?: Json | null
          file_data?: string | null
          file_name: string
          id?: string
          invoice_number_end: number
          invoice_number_start: number
          route_names?: string[]
          routes_exported?: string[]
          total_amount?: number | null
          total_orders?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          export_date?: string | null
          export_summary?: Json | null
          file_data?: string | null
          file_name?: string
          id?: string
          invoice_number_end?: number
          invoice_number_start?: number
          route_names?: string[]
          routes_exported?: string[]
          total_amount?: number | null
          total_orders?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventories: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_items: {
        Row: {
          created_at: string | null
          grams_per_unit: number
          id: string
          inventory_count_id: string | null
          notes: string | null
          product_id: string | null
          quantity_units: number
          total_grams: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grams_per_unit?: number
          id?: string
          inventory_count_id?: string | null
          notes?: string | null
          product_id?: string | null
          quantity_units?: number
          total_grams?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grams_per_unit?: number
          id?: string
          inventory_count_id?: string | null
          notes?: string | null
          product_id?: string | null
          quantity_units?: number
          total_grams?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_items_inventory_count_id_fkey"
            columns: ["inventory_count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          completed_at: string | null
          count_number: number
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          count_number?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          count_number?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_final_results: {
        Row: {
          created_at: string | null
          final_grams_per_unit: number
          final_quantity: number
          final_total_grams: number | null
          final_value: number | null
          id: string
          inventory_id: string | null
          notes: string | null
          product_id: string | null
          resolution_method: string | null
          variance_from_count1_percentage: number | null
          variance_from_count2_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          final_grams_per_unit: number
          final_quantity: number
          final_total_grams?: number | null
          final_value?: number | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          product_id?: string | null
          resolution_method?: string | null
          variance_from_count1_percentage?: number | null
          variance_from_count2_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          final_grams_per_unit?: number
          final_quantity?: number
          final_total_grams?: number | null
          final_value?: number | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          product_id?: string | null
          resolution_method?: string | null
          variance_from_count1_percentage?: number | null
          variance_from_count2_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_final_results_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_final_results_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_final_results_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reconciliations: {
        Row: {
          count1_grams_per_unit: number | null
          count1_quantity: number | null
          count1_total_grams: number | null
          count2_grams_per_unit: number | null
          count2_quantity: number | null
          count2_total_grams: number | null
          created_at: string | null
          final_grams_per_unit: number
          final_quantity: number
          final_total_grams: number | null
          id: string
          inventory_id: string | null
          notes: string | null
          product_id: string | null
          resolution_method: string | null
          resolved_by: string | null
          variance_percentage: number | null
        }
        Insert: {
          count1_grams_per_unit?: number | null
          count1_quantity?: number | null
          count1_total_grams?: number | null
          count2_grams_per_unit?: number | null
          count2_quantity?: number | null
          count2_total_grams?: number | null
          created_at?: string | null
          final_grams_per_unit: number
          final_quantity: number
          final_total_grams?: number | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          product_id?: string | null
          resolution_method?: string | null
          resolved_by?: string | null
          variance_percentage?: number | null
        }
        Update: {
          count1_grams_per_unit?: number | null
          count1_quantity?: number | null
          count1_total_grams?: number | null
          count2_grams_per_unit?: number | null
          count2_quantity?: number | null
          count2_total_grams?: number | null
          created_at?: string | null
          final_grams_per_unit?: number
          final_quantity?: number
          final_total_grams?: number | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          product_id?: string | null
          resolution_method?: string | null
          resolved_by?: string | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reconciliations_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reconciliations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_reconciliations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reconciliations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          actual_value: number | null
          client_id: string | null
          completed_date: string | null
          created_at: string | null
          description: string | null
          estimated_value: number | null
          id: string
          scheduled_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          actual_value?: number | null
          client_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          scheduled_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          actual_value?: number | null
          client_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          scheduled_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      order_invoices: {
        Row: {
          client_name: string | null
          created_at: string | null
          export_history_id: string | null
          id: string
          invoice_date: string
          invoice_number: number
          order_amount: number | null
          order_id: string | null
          route_name: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          export_history_id?: string | null
          id?: string
          invoice_date: string
          invoice_number: number
          order_amount?: number | null
          order_id?: string | null
          route_name?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          export_history_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: number
          order_amount?: number | null
          order_id?: string | null
          route_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_invoices_export_history_id_fkey"
            columns: ["export_history_id"]
            isOneToOne: false
            referencedRelation: "export_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_deliveries: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          delivery_notes: string | null
          delivery_status: string | null
          evidence_url: string | null
          id: string
          order_item_id: string | null
          quantity_delivered: number | null
          quantity_rejected: number | null
          rejection_reason: string | null
          route_order_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_status?: string | null
          evidence_url?: string | null
          id?: string
          order_item_id?: string | null
          quantity_delivered?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          route_order_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_status?: string | null
          evidence_url?: string | null
          id?: string
          order_item_id?: string | null
          quantity_delivered?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          route_order_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_deliveries_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_deliveries_route_order_id_fkey"
            columns: ["route_order_id"]
            isOneToOne: false
            referencedRelation: "route_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_deliveries_audit: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          delivery_id: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          order_id: string | null
          order_item_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          delivery_id?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          order_id?: string | null
          order_item_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          delivery_id?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          order_id?: string | null
          order_item_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_deliveries_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_deliveries_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          availability_status: string | null
          created_at: string | null
          id: string
          lote: string | null
          order_id: string | null
          product_id: string | null
          quantity_available: number | null
          quantity_completed: number | null
          quantity_delivered: number | null
          quantity_dispatched: number | null
          quantity_missing: number | null
          quantity_requested: number
          quantity_returned: number | null
          unit_price: number | null
        }
        Insert: {
          availability_status?: string | null
          created_at?: string | null
          id?: string
          lote?: string | null
          order_id?: string | null
          product_id?: string | null
          quantity_available?: number | null
          quantity_completed?: number | null
          quantity_delivered?: number | null
          quantity_dispatched?: number | null
          quantity_missing?: number | null
          quantity_requested: number
          quantity_returned?: number | null
          unit_price?: number | null
        }
        Update: {
          availability_status?: string | null
          created_at?: string | null
          id?: string
          lote?: string | null
          order_id?: string | null
          product_id?: string | null
          quantity_available?: number | null
          quantity_completed?: number | null
          quantity_delivered?: number | null
          quantity_dispatched?: number | null
          quantity_missing?: number | null
          quantity_requested?: number
          quantity_returned?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items_audit: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          order_id: string | null
          order_item_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          order_id?: string | null
          order_item_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          order_id?: string | null
          order_item_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_audit_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: string | null
          order_id: string | null
          previous_status: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_route_id: string | null
          branch_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string
          has_pending_missing: boolean | null
          id: string
          invoice_export_id: string | null
          invoiced_at: string | null
          is_invoiced: boolean | null
          is_invoiced_from_remision: boolean | null
          observations: string | null
          order_number: string
          pdf_filename: string | null
          purchase_order_number: string | null
          remision_invoiced_at: string | null
          requested_delivery_date: string | null
          requires_remision: boolean | null
          status: string
          subtotal: number | null
          total_value: number | null
          updated_at: string | null
          vat_amount: number | null
        }
        Insert: {
          assigned_route_id?: string | null
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date: string
          has_pending_missing?: boolean | null
          id?: string
          invoice_export_id?: string | null
          invoiced_at?: string | null
          is_invoiced?: boolean | null
          is_invoiced_from_remision?: boolean | null
          observations?: string | null
          order_number: string
          pdf_filename?: string | null
          purchase_order_number?: string | null
          remision_invoiced_at?: string | null
          requested_delivery_date?: string | null
          requires_remision?: boolean | null
          status?: string
          subtotal?: number | null
          total_value?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Update: {
          assigned_route_id?: string | null
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string
          has_pending_missing?: boolean | null
          id?: string
          invoice_export_id?: string | null
          invoiced_at?: string | null
          is_invoiced?: boolean | null
          is_invoiced_from_remision?: boolean | null
          observations?: string | null
          order_number?: string
          pdf_filename?: string | null
          purchase_order_number?: string | null
          remision_invoiced_at?: string | null
          requested_delivery_date?: string | null
          requires_remision?: boolean | null
          status?: string
          subtotal?: number | null
          total_value?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_invoice_export"
            columns: ["invoice_export_id"]
            isOneToOne: false
            referencedRelation: "export_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_route_id_fkey"
            columns: ["assigned_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_audit: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          order_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          order_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          order_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          probability: number | null
          stage_order: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          probability?: number | null
          stage_order: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          probability?: number | null
          stage_order?: number
        }
        Relationships: []
      }
      product_aliases: {
        Row: {
          client_alias: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          id: number
          product_id: string | null
          real_product_name: string | null
        }
        Insert: {
          client_alias?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: number
          product_id?: string | null
          real_product_name?: string | null
        }
        Update: {
          client_alias?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: number
          product_id?: string | null
          real_product_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_aliases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_aliases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_aliases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_commercial_info: {
        Row: {
          brand: string | null
          commercial_name: string | null
          competitor_products: Json | null
          created_at: string | null
          id: string
          marketing_description: string | null
          product_id: string
          promotional_tags: string[] | null
          sales_channel: string[] | null
          sales_notes: string | null
          seasonality: string | null
          target_market: string[] | null
          updated_at: string | null
          usp: string | null
        }
        Insert: {
          brand?: string | null
          commercial_name?: string | null
          competitor_products?: Json | null
          created_at?: string | null
          id?: string
          marketing_description?: string | null
          product_id: string
          promotional_tags?: string[] | null
          sales_channel?: string[] | null
          sales_notes?: string | null
          seasonality?: string | null
          target_market?: string[] | null
          updated_at?: string | null
          usp?: string | null
        }
        Update: {
          brand?: string | null
          commercial_name?: string | null
          competitor_products?: Json | null
          created_at?: string | null
          id?: string
          marketing_description?: string | null
          product_id?: string
          promotional_tags?: string[] | null
          sales_channel?: string[] | null
          sales_notes?: string | null
          seasonality?: string | null
          target_market?: string[] | null
          updated_at?: string | null
          usp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_commercial_info_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_commercial_info_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_config: {
        Row: {
          created_at: string | null
          id: number
          product_id: string | null
          units_per_package: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          product_id?: string | null
          units_per_package?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          product_id?: string | null
          units_per_package?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_config_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_config_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_configurations: {
        Row: {
          cans_per_car: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          product_id: string | null
          units_per_can: number
          updated_at: string | null
        }
        Insert: {
          cans_per_car?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          units_per_can?: number
          updated_at?: string | null
        }
        Update: {
          cans_per_car?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          units_per_can?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_configurations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_configurations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          base_selling_price: number | null
          break_even_units: number | null
          cost_calculation_date: string | null
          created_at: string | null
          id: string
          labor_cost: number | null
          material_cost: number | null
          notes: string | null
          overhead_cost: number | null
          packaging_cost: number | null
          product_id: string
          profit_margin_percentage: number | null
          total_production_cost: number | null
          updated_at: string | null
        }
        Insert: {
          base_selling_price?: number | null
          break_even_units?: number | null
          cost_calculation_date?: string | null
          created_at?: string | null
          id?: string
          labor_cost?: number | null
          material_cost?: number | null
          notes?: string | null
          overhead_cost?: number | null
          packaging_cost?: number | null
          product_id: string
          profit_margin_percentage?: number | null
          total_production_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          base_selling_price?: number | null
          break_even_units?: number | null
          cost_calculation_date?: string | null
          created_at?: string | null
          id?: string
          labor_cost?: number | null
          material_cost?: number | null
          notes?: string | null
          overhead_cost?: number | null
          packaging_cost?: number | null
          product_id?: string
          profit_margin_percentage?: number | null
          total_production_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inventory_config: {
        Row: {
          abc_classification: string | null
          created_at: string | null
          id: string
          is_perishable: boolean | null
          lead_time_days: number | null
          max_stock_level: number | null
          product_id: string
          reorder_point: number | null
          requires_cold_chain: boolean | null
          rotation_classification: string | null
          safety_stock: number | null
          storage_location: string | null
          updated_at: string | null
        }
        Insert: {
          abc_classification?: string | null
          created_at?: string | null
          id?: string
          is_perishable?: boolean | null
          lead_time_days?: number | null
          max_stock_level?: number | null
          product_id: string
          reorder_point?: number | null
          requires_cold_chain?: boolean | null
          rotation_classification?: string | null
          safety_stock?: number | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Update: {
          abc_classification?: string | null
          created_at?: string | null
          id?: string
          is_perishable?: boolean | null
          lead_time_days?: number | null
          max_stock_level?: number | null
          product_id?: string
          reorder_point?: number | null
          requires_cold_chain?: boolean | null
          rotation_classification?: string | null
          safety_stock?: number | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_inventory_config_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_inventory_config_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          file_name: string | null
          file_size_kb: number | null
          file_url: string
          id: string
          is_primary: boolean | null
          media_category: string | null
          media_type: string
          product_id: string
          thumbnail_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_size_kb?: number | null
          file_url: string
          id?: string
          is_primary?: boolean | null
          media_category?: string | null
          media_type: string
          product_id: string
          thumbnail_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string
          id?: string
          is_primary?: boolean | null
          media_category?: string | null
          media_type?: string
          product_id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_lists: {
        Row: {
          client_category: string | null
          created_at: string | null
          currency: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          max_quantity: number | null
          min_quantity: number | null
          price: number
          price_list_name: string
          product_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          client_category?: string | null
          created_at?: string | null
          currency?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number | null
          price: number
          price_list_name: string
          product_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          client_category?: string | null
          created_at?: string | null
          currency?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number | null
          price?: number
          price_list_name?: string
          product_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_production_process: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          labor_hours_per_batch: number | null
          notes: string | null
          process_diagrams: string[] | null
          process_steps: Json | null
          product_id: string
          quality_checkpoints: Json | null
          theoretical_yield_percentage: number | null
          total_cycle_time_minutes: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          labor_hours_per_batch?: number | null
          notes?: string | null
          process_diagrams?: string[] | null
          process_steps?: Json | null
          product_id: string
          quality_checkpoints?: Json | null
          theoretical_yield_percentage?: number | null
          total_cycle_time_minutes?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          labor_hours_per_batch?: number | null
          notes?: string | null
          process_diagrams?: string[] | null
          process_steps?: Json | null
          product_id?: string
          quality_checkpoints?: Json | null
          theoretical_yield_percentage?: number | null
          total_cycle_time_minutes?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_production_process_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_production_process_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_quality_specs: {
        Row: {
          control_frequency: string | null
          created_at: string | null
          id: string
          inspection_points: string[] | null
          microbiological_specs: Json | null
          physical_chemical_specs: Json | null
          product_id: string
          quality_parameters: Json | null
          rejection_criteria: string | null
          sensory_attributes: Json | null
          updated_at: string | null
        }
        Insert: {
          control_frequency?: string | null
          created_at?: string | null
          id?: string
          inspection_points?: string[] | null
          microbiological_specs?: Json | null
          physical_chemical_specs?: Json | null
          product_id: string
          quality_parameters?: Json | null
          rejection_criteria?: string | null
          sensory_attributes?: Json | null
          updated_at?: string | null
        }
        Update: {
          control_frequency?: string | null
          created_at?: string | null
          id?: string
          inspection_points?: string[] | null
          microbiological_specs?: Json | null
          physical_chemical_specs?: Json | null
          product_id?: string
          quality_parameters?: Json | null
          rejection_criteria?: string | null
          sensory_attributes?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_quality_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_quality_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_technical_specs: {
        Row: {
          allergens: string[] | null
          certifications: string[] | null
          created_at: string | null
          custom_attributes: Json | null
          dimensions: Json | null
          gross_weight: number | null
          id: string
          net_weight: number | null
          packaging_type: string | null
          packaging_units_per_box: number | null
          product_id: string
          shelf_life_days: number | null
          storage_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          allergens?: string[] | null
          certifications?: string[] | null
          created_at?: string | null
          custom_attributes?: Json | null
          dimensions?: Json | null
          gross_weight?: number | null
          id?: string
          net_weight?: number | null
          packaging_type?: string | null
          packaging_units_per_box?: number | null
          product_id: string
          shelf_life_days?: number | null
          storage_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          allergens?: string[] | null
          certifications?: string[] | null
          created_at?: string | null
          custom_attributes?: Json | null
          dimensions?: Json | null
          gross_weight?: number | null
          id?: string
          net_weight?: number | null
          packaging_type?: string | null
          packaging_units_per_box?: number | null
          product_id?: string
          shelf_life_days?: number | null
          storage_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_technical_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_technical_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_rag: {
        Row: {
          content: string | null
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          codigo_wo: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          nombre_wo: string | null
          price: number | null
          subcategory: string | null
          tax_rate: number | null
          unit: string
          visible_in_ecommerce: boolean
          weight: string | null
        }
        Insert: {
          category?: string | null
          codigo_wo?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          nombre_wo?: string | null
          price?: number | null
          subcategory?: string | null
          tax_rate?: number | null
          unit?: string
          visible_in_ecommerce?: boolean
          weight?: string | null
        }
        Update: {
          category?: string | null
          codigo_wo?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          nombre_wo?: string | null
          price?: number | null
          subcategory?: string | null
          tax_rate?: number | null
          unit?: string
          visible_in_ecommerce?: boolean
          weight?: string | null
        }
        Relationships: []
      }
      receiving_audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string | null
          id: string
          notes: string | null
          target_id: string
          target_table: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          target_id: string
          target_table: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          target_id?: string
          target_table?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_exceptions: {
        Row: {
          branch_id: string | null
          client_id: string | null
          created_at: string | null
          end_time: string | null
          exception_date: string
          id: string
          note: string | null
          source: string | null
          start_time: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          end_time?: string | null
          exception_date: string
          id?: string
          note?: string | null
          source?: string | null
          start_time?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          end_time?: string | null
          exception_date?: string
          id?: string
          note?: string | null
          source?: string | null
          start_time?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_exceptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_exceptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_patterns: {
        Row: {
          branch_id: string | null
          client_id: string | null
          created_at: string | null
          effect_type: string
          end_time: string | null
          id: string
          is_active: boolean | null
          name: string
          note: string | null
          rrule: string
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          effect_type: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          note?: string | null
          rrule: string
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          effect_type?: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          note?: string | null
          rrule?: string
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_patterns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_patterns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_schedules: {
        Row: {
          applied_template_id: string | null
          branch_id: string | null
          client_id: string | null
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          metadata: Json | null
          start_time: string
          status: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          applied_template_id?: string | null
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          metadata?: Json | null
          start_time: string
          status?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_template_id?: string | null
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          metadata?: Json | null
          start_time?: string
          status?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          payload: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          payload: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          payload?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      remision_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          product_unit: string | null
          quantity_delivered: number
          remision_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          product_unit?: string | null
          quantity_delivered?: number
          remision_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          product_unit?: string | null
          quantity_delivered?: number
          remision_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "remision_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "remision_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remision_items_remision_id_fkey"
            columns: ["remision_id"]
            isOneToOne: false
            referencedRelation: "remisions"
            referencedColumns: ["id"]
          },
        ]
      }
      remisions: {
        Row: {
          client_data: Json
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          order_id: string | null
          pdf_data: string | null
          pdf_path: string | null
          remision_number: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_data: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          pdf_data?: string | null
          pdf_path?: string | null
          remision_number: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          client_data?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          pdf_data?: string | null
          pdf_path?: string | null
          remision_number?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remisions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          id: string
          order_id: string | null
          processed_by: string | null
          product_id: string | null
          quantity_returned: number
          rejection_reason: string | null
          return_date: string | null
          return_reason: string | null
          route_id: string | null
          status: string | null
          status_updated_at: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          processed_by?: string | null
          product_id?: string | null
          quantity_returned: number
          rejection_reason?: string | null
          return_date?: string | null
          return_reason?: string | null
          route_id?: string | null
          status?: string | null
          status_updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          processed_by?: string | null
          product_id?: string | null
          quantity_returned?: number
          rejection_reason?: string | null
          return_date?: string | null
          return_reason?: string | null
          route_id?: string | null
          status?: string | null
          status_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_orders: {
        Row: {
          created_at: string | null
          delivery_notes: string | null
          delivery_sequence: number
          delivery_status: string | null
          delivery_time: string | null
          evidence_url: string | null
          id: string
          order_id: string | null
          route_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_notes?: string | null
          delivery_sequence: number
          delivery_status?: string | null
          delivery_time?: string | null
          evidence_url?: string | null
          id?: string
          order_id?: string | null
          route_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_notes?: string | null
          delivery_sequence?: number
          delivery_status?: string | null
          delivery_time?: string | null
          evidence_url?: string | null
          id?: string
          order_id?: string | null
          route_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_orders_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string | null
          created_by: string | null
          driver_id: string | null
          id: string
          route_date: string
          route_name: string
          route_number: number
          status: string | null
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          driver_id?: string | null
          id?: string
          route_date: string
          route_name: string
          route_number: number
          status?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          driver_id?: string | null
          id?: string
          route_date?: string
          route_name?: string
          route_number?: number
          status?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunities: {
        Row: {
          actual_close_date: string | null
          assigned_user_id: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          pipeline_stage_id: string | null
          probability: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_close_date?: string | null
          assigned_user_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          pipeline_stage_id?: string | null
          probability?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_close_date?: string | null
          assigned_user_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          pipeline_stage_id?: string | null
          probability?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_key: string
          config_value: string | null
          created_at: string | null
          description: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_migration_instructions: {
        Row: {
          auth_user_created_id: string | null
          created_at: string | null
          email: string | null
          id: number
          migration_status: string | null
          name: string | null
          role: string | null
          temp_password: string | null
          user_id: string | null
        }
        Insert: {
          auth_user_created_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          migration_status?: string | null
          name?: string | null
          role?: string | null
          temp_password?: string | null
          user_id?: string | null
        }
        Update: {
          auth_user_created_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          migration_status?: string | null
          name?: string | null
          role?: string | null
          temp_password?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          cedula: string | null
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          name: string
          permissions: Json | null
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          cedula?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          name: string
          permissions?: Json | null
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          cedula?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          permissions?: Json | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity_kg: number | null
          created_at: string | null
          driver_id: string | null
          driver_name: string | null
          id: string
          status: string | null
          vehicle_code: string
        }
        Insert: {
          capacity_kg?: number | null
          created_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          id?: string
          status?: string | null
          vehicle_code: string
        }
        Update: {
          capacity_kg?: number | null
          created_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          id?: string
          status?: string | null
          vehicle_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      order_item_deliveries_audit_with_user: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          changed_by_role: string | null
          delivery_id: string | null
          id: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          order_id: string | null
          order_item_id: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_deliveries_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_deliveries_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items_audit_with_user: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          changed_by_role: string | null
          id: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          order_id: string | null
          order_item_id: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_audit_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_audit_with_user: {
        Row: {
          action: string | null
          change_summary: string | null
          changed_at: string | null
          changed_by: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          changed_by_role: string | null
          id: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          order_id: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_completeness: {
        Row: {
          basic_info_complete: boolean | null
          category: string | null
          completeness_percentage: number | null
          has_bill_of_materials: boolean | null
          has_commercial_info: boolean | null
          has_costs: boolean | null
          has_inventory_config: boolean | null
          has_media: boolean | null
          has_price_lists: boolean | null
          has_production_process: boolean | null
          has_quality_specs: boolean | null
          has_technical_specs: boolean | null
          name: string | null
          product_id: string | null
          visible_in_ecommerce: boolean | null
        }
        Insert: {
          basic_info_complete?: never
          category?: string | null
          completeness_percentage?: never
          has_bill_of_materials?: never
          has_commercial_info?: never
          has_costs?: never
          has_inventory_config?: never
          has_media?: never
          has_price_lists?: never
          has_production_process?: never
          has_quality_specs?: never
          has_technical_specs?: never
          name?: string | null
          product_id?: string | null
          visible_in_ecommerce?: boolean | null
        }
        Update: {
          basic_info_complete?: never
          category?: string | null
          completeness_percentage?: never
          has_bill_of_materials?: never
          has_commercial_info?: never
          has_costs?: never
          has_inventory_config?: never
          has_media?: never
          has_price_lists?: never
          has_production_process?: never
          has_quality_specs?: never
          has_technical_specs?: never
          name?: string | null
          product_id?: string | null
          visible_in_ecommerce?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_consumption_efficiency: {
        Args: { p_actual_index: number; p_standard_index: number }
        Returns: number
      }
      calculate_consumption_index: {
        Args: { p_material_consumed: number; p_units_produced: number }
        Returns: number
      }
      calculate_expected_consumption: {
        Args: {
          p_product_id: string
          p_total_units: number
          p_work_center_code: string
        }
        Returns: {
          expected_quantity: number
          material_name: string
          material_unit: string
          tolerance_max: number
          tolerance_min: number
        }[]
      }
      calculate_inventory_variance: {
        Args: { count1_total: number; count2_total: number }
        Returns: number
      }
      calculate_next_frequency_date: {
        Args: { base_date: string; frequency_days: number[] }
        Returns: string
      }
      calculate_production_total: {
        Args: {
          p_product_id: string
          p_quantity_cans: number
          p_quantity_cans_per_car: number
          p_quantity_cars: number
          p_quantity_units: number
        }
        Returns: number
      }
      calculate_theoretical_consumption: {
        Args: {
          p_material_name: string
          p_product_id: string
          p_total_units: number
          p_work_center_code: string
        }
        Returns: number
      }
      calculate_time_efficiency: {
        Args: { p_shift_id: string }
        Returns: {
          actual_hours: number
          efficiency_percentage: number
          expected_units: number
          target_units_per_hour: number
          units_produced: number
        }[]
      }
      can_create_new_shift: {
        Args: {
          center_code: string
          target_date?: string
          target_shift_number?: number
        }
        Returns: boolean
      }
      check_migration_progress: {
        Args: never
        Returns: {
          auth_linked: boolean
          email: string
          name: string
          role: string
          status: string
        }[]
      }
      check_schedule_overlap: {
        Args: {
          p_branch_id?: string
          p_client_id?: string
          p_day_of_week: number
          p_end_time: string
          p_exclude_id?: string
          p_start_time: string
        }
        Returns: boolean
      }
      cleanup_old_access_logs: { Args: never; Returns: undefined }
      create_new_shift: {
        Args: { center_code: string; user_id?: string }
        Returns: string
      }
      get_active_frequencies_for_day: {
        Args: { target_day: number }
        Returns: {
          branch_id: string
          branch_name: string
          client_id: string
          client_name: string
          frequency_id: string
          notes: string
        }[]
      }
      get_active_shift_for_center: {
        Args: { center_code: string }
        Returns: {
          actual_start_time: string
          created_at: string
          is_active: boolean
          shift_date: string
          shift_id: string
          shift_number: number
          start_time: string
          status: string
          work_center_code: string
          work_center_id: string
        }[]
      }
      get_effective_receiving_schedule: {
        Args: { p_branch_id?: string; p_client_id?: string; p_date: string }
        Returns: {
          end_time: string
          note: string
          schedule_type: string
          start_time: string
          status: string
        }[]
      }
      get_export_statistics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_orders_per_export: number
          latest_invoice_number: number
          total_amount: number
          total_exports: number
          total_orders: number
        }[]
      }
      get_inventory_summary: {
        Args: { inventory_uuid: string }
        Returns: {
          inventory_id: string
          inventory_name: string
          status: string
          total_grams_count1: number
          total_grams_count2: number
          total_items_count1: number
          total_items_count2: number
          total_products: number
          variance_percentage: number
        }[]
      }
      get_next_remision_number: { Args: never; Returns: string }
      get_non_invoiced_remision_orders: {
        Args: {
          client_id_filter?: string
          end_date?: string
          start_date?: string
        }
        Returns: {
          client_name: string
          delivered_quantity_items: number
          expected_delivery_date: string
          order_id: string
          order_number: string
          remision_date: string
          remision_number: string
          route_name: string
          total_value: number
        }[]
      }
      get_order_change_summary: {
        Args: { audit_log: Database["public"]["Tables"]["orders_audit"]["Row"] }
        Returns: string
      }
      get_orders_for_direct_billing: {
        Args: { route_ids: string[] }
        Returns: {
          client_name: string
          expected_delivery_date: string
          order_id: string
          order_number: string
          route_name: string
          total_value: number
        }[]
      }
      get_orders_for_remision: {
        Args: { route_ids: string[] }
        Returns: {
          client_billing_type: Database["public"]["Enums"]["billing_type_enum"]
          client_name: string
          expected_delivery_date: string
          order_id: string
          order_number: string
          requires_remision_override: boolean
          route_name: string
          total_value: number
        }[]
      }
      get_pending_orders_for_routes: {
        Args: { route_ids: string[] }
        Returns: {
          client_name: string
          expected_delivery_date: string
          order_id: string
          order_number: string
          route_name: string
          total_value: number
        }[]
      }
      get_remision_statistics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_remision_amount: number
          invoiced_remisions: number
          pending_remisions: number
          total_remision_amount: number
          total_remisions: number
        }[]
      }
      get_required_materials_for_product: {
        Args: { p_product_id: string; p_work_center_code: string }
        Returns: {
          material_id: string
          material_name: string
          material_unit: string
          theoretical_consumption_per_unit: number
          tolerance_percentage: number
        }[]
      }
      get_shift_consumption_summary: {
        Args: { p_shift_id: string }
        Returns: {
          actual_consumption: number
          alert_level: string
          deviation_percentage: number
          expected_consumption: number
          material_name: string
          material_unit: string
          product_name: string
          total_units_produced: number
        }[]
      }
      has_active_shift: { Args: { center_code: string }; Returns: boolean }
      has_frequency_for_day: {
        Args: { target_branch_id: string; target_day: number }
        Returns: boolean
      }
      link_auth_user: {
        Args: { p_auth_user_id: string; p_email: string }
        Returns: string
      }
      mark_orders_as_invoiced: {
        Args: {
          export_history_id: string
          invoice_start: number
          order_ids: string[]
        }
        Returns: number
      }
      mark_remision_orders_as_invoiced: {
        Args: {
          export_history_id: string
          invoice_start: number
          order_ids: string[]
        }
        Returns: number
      }
      match_clientes: {
        Args: { filter?: Json; match_count: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_documents: {
        Args: { filter?: Json; match_count: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      properly_close_shift: { Args: { shift_id: string }; Returns: boolean }
      set_audit_context: {
        Args: { is_local?: boolean; new_value: string; setting_name: string }
        Returns: string
      }
      test_delivery_date_adjustment: { Args: never; Returns: string }
      update_last_login: { Args: { user_id: string }; Returns: undefined }
      validate_material_consumption: {
        Args: {
          p_actual_consumption: number
          p_material_name: string
          p_product_id: string
          p_total_units: number
          p_work_center_code: string
        }
        Returns: {
          actual_quantity: number
          alert_level: string
          alert_message: string
          deviation_percentage: number
          expected_quantity: number
          is_within_tolerance: boolean
          tolerance_percentage: number
        }[]
      }
    }
    Enums: {
      billing_type_enum: "facturable" | "remision"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  produccion: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_type_enum: ["facturable", "remision"],
    },
  },
} as const
