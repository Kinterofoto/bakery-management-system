export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
        Insert: {
          id?: string
          email: string
          name: string
          role?: "admin" | "reviewer_area1" | "reviewer_area2" | "dispatcher" | "driver" | "commercial"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: "admin" | "reviewer_area1" | "reviewer_area2" | "dispatcher" | "driver" | "commercial"
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          unit: string
          price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          unit: string
          price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          unit?: string
          price?: number | null
          created_at?: string
        }
      }
    }
  }
  compras: {
    Tables: {
      suppliers: {
        Row: {
          id: string
          company_name: string
          nit: string
          address: string | null
          contact_person_name: string | null
          contact_phone: string | null
          contact_email: string | null
          status: string
          notes: string | null
          delivery_days: {
            monday: boolean
            tuesday: boolean
            wednesday: boolean
            thursday: boolean
            friday: boolean
            saturday: boolean
            sunday: boolean
          } | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          nit: string
          address?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          status?: string
          notes?: string | null
          delivery_days?: {
            monday: boolean
            tuesday: boolean
            wednesday: boolean
            thursday: boolean
            friday: boolean
            saturday: boolean
            sunday: boolean
          } | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          nit?: string
          address?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          status?: string
          notes?: string | null
          delivery_days?: {
            monday: boolean
            tuesday: boolean
            wednesday: boolean
            thursday: boolean
            friday: boolean
            saturday: boolean
            sunday: boolean
          } | null
          created_at?: string
          updated_at?: string
        }
      }
      material_suppliers: {
        Row: {
          id: string
          material_id: string
          supplier_id: string
          presentation: string | null
          unit_price: number
          packaging_unit: number | null
          lead_time_days: number | null
          is_preferred: boolean
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          material_id: string
          supplier_id: string
          presentation?: string | null
          unit_price: number
          packaging_unit?: number | null
          lead_time_days?: number | null
          is_preferred?: boolean
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          supplier_id?: string
          presentation?: string | null
          unit_price?: number
          packaging_unit?: number | null
          lead_time_days?: number | null
          is_preferred?: boolean
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          order_number: string
          supplier_id: string
          status: string
          order_date: string
          expected_delivery_date: string | null
          actual_delivery_date: string | null
          total_amount: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          supplier_id: string
          status?: string
          order_date?: string
          expected_delivery_date?: string | null
          actual_delivery_date?: string | null
          total_amount?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          supplier_id?: string
          status?: string
          order_date?: string
          expected_delivery_date?: string | null
          actual_delivery_date?: string | null
          total_amount?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          material_id: string
          material_supplier_id: string | null
          quantity_ordered: number
          quantity_received: number
          unit_price: number
          subtotal: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          material_id: string
          material_supplier_id?: string | null
          quantity_ordered: number
          quantity_received?: number
          unit_price: number
          subtotal?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          material_id?: string
          material_supplier_id?: string | null
          quantity_ordered?: number
          quantity_received?: number
          unit_price?: number
          subtotal?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      material_receptions: {
        Row: {
          id: string
          reception_number: string
          type: string
          purchase_order_id: string | null
          material_id: string | null
          quantity_received: number
          unit_of_measure: string | null
          reception_date: string
          reception_time: string | null
          batch_number: string | null
          lot_number: string | null
          supplier_id: string | null
          operator_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reception_number?: string
          type: string
          purchase_order_id?: string | null
          material_id?: string | null
          quantity_received: number
          unit_of_measure?: string | null
          reception_date?: string
          reception_time?: string | null
          batch_number?: string | null
          lot_number?: string | null
          supplier_id?: string | null
          operator_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reception_number?: string
          type?: string
          purchase_order_id?: string | null
          material_id?: string | null
          quantity_received?: number
          unit_of_measure?: string | null
          reception_date?: string
          reception_time?: string | null
          batch_number?: string | null
          lot_number?: string | null
          supplier_id?: string | null
          operator_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reception_items: {
        Row: {
          id: string
          reception_id: string
          purchase_order_item_id: string | null
          material_id: string
          quantity_received: number
          batch_number: string | null
          lot_number: string | null
          expiry_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reception_id: string
          purchase_order_item_id?: string | null
          material_id: string
          quantity_received: number
          batch_number?: string | null
          lot_number?: string | null
          expiry_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reception_id?: string
          purchase_order_item_id?: string | null
          material_id?: string
          quantity_received?: number
          batch_number?: string | null
          lot_number?: string | null
          expiry_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      material_explosion_history: {
        Row: {
          id: string
          product_id: string
          quantity_requested: number
          calculation_date: string
          created_by: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          product_id: string
          quantity_requested: number
          calculation_date?: string
          created_by?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          quantity_requested?: number
          calculation_date?: string
          created_by?: string | null
          notes?: string | null
        }
      }
      material_explosion_items: {
        Row: {
          id: string
          explosion_id: string
          material_id: string
          quantity_per_unit: number
          total_quantity_needed: number
          suggested_supplier_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          explosion_id: string
          material_id: string
          quantity_per_unit: number
          total_quantity_needed: number
          suggested_supplier_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          explosion_id?: string
          material_id?: string
          quantity_per_unit?: number
          total_quantity_needed?: number
          suggested_supplier_id?: string | null
          created_at?: string
        }
      }
      inventory_movements: {
        Row: {
          id: string
          material_id: string
          movement_type: string
          quantity_change: number
          unit_of_measure: string | null
          reference_id: string | null
          reference_type: string | null
          location: string | null
          notes: string | null
          recorded_by: string | null
          movement_date: string
          created_at: string
        }
        Insert: {
          id?: string
          material_id: string
          movement_type: string
          quantity_change: number
          unit_of_measure?: string | null
          reference_id?: string | null
          reference_type?: string | null
          location?: string | null
          notes?: string | null
          recorded_by?: string | null
          movement_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          movement_type?: string
          quantity_change?: number
          unit_of_measure?: string | null
          reference_id?: string | null
          reference_type?: string | null
          location?: string | null
          notes?: string | null
          recorded_by?: string | null
          movement_date?: string
          created_at?: string
        }
      }
      explosion_purchase_tracking: {
        Row: {
          id: string
          material_id: string
          requirement_date: string
          quantity_needed: number
          quantity_ordered: number
          quantity_received: number
          status: 'not_ordered' | 'ordered' | 'partially_received' | 'received'
          purchase_order_item_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          material_id: string
          requirement_date: string
          quantity_needed: number
          quantity_ordered?: number
          quantity_received?: number
          status?: 'not_ordered' | 'ordered' | 'partially_received' | 'received'
          purchase_order_item_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          requirement_date?: string
          quantity_needed?: number
          quantity_ordered?: number
          quantity_received?: number
          status?: 'not_ordered' | 'ordered' | 'partially_received' | 'received'
          purchase_order_item_id?: string | null
          created_at?: string
          updated_at?: string
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
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      production_shifts: {
        Row: {
          id: string
          work_center_id: string
          shift_date: string
          shift_type: string
          status: string
          start_time: string | null
          end_time: string | null
          operator_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_center_id: string
          shift_date: string
          shift_type: string
          status?: string
          start_time?: string | null
          end_time?: string | null
          operator_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_center_id?: string
          shift_date?: string
          shift_type?: string
          status?: string
          start_time?: string | null
          end_time?: string | null
          operator_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
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
          operation_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          material_id: string
          quantity_needed: number
          unit_name: string
          unit_equivalence_grams: number
          is_active?: boolean
          operation_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          material_id?: string
          quantity_needed?: number
          unit_name?: string
          unit_equivalence_grams?: number
          is_active?: boolean
          operation_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
