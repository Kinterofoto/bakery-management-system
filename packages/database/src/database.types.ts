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
  compras: {
    Tables: {
      explosion_purchase_tracking: {
        Row: {
          created_at: string | null
          id: string
          material_id: string
          purchase_order_item_id: string | null
          quantity_needed: number
          quantity_ordered: number | null
          quantity_received: number | null
          requirement_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id: string
          purchase_order_item_id?: string | null
          quantity_needed: number
          quantity_ordered?: number | null
          quantity_received?: number | null
          requirement_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string
          purchase_order_item_id?: string | null
          quantity_needed?: number
          quantity_ordered?: number | null
          quantity_received?: number | null
          requirement_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explosion_purchase_tracking_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          balance_after: number
          created_at: string | null
          id: string
          location: string | null
          material_id: string
          movement_date: string
          movement_type: string
          notes: string | null
          quantity_change: number
          recorded_by: string | null
          reference_id: string | null
          reference_type: string | null
          unit_of_measure: string | null
          warehouse_type: string | null
        }
        Insert: {
          balance_after?: number
          created_at?: string | null
          id?: string
          location?: string | null
          material_id: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          quantity_change: number
          recorded_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_of_measure?: string | null
          warehouse_type?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          id?: string
          location?: string | null
          material_id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          quantity_change?: number
          recorded_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_of_measure?: string | null
          warehouse_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
        ]
      }
      material_explosion_history: {
        Row: {
          calculation_date: string | null
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity_requested: number
        }
        Insert: {
          calculation_date?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity_requested: number
        }
        Update: {
          calculation_date?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity_requested?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_explosion_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
        ]
      }
      material_explosion_items: {
        Row: {
          created_at: string | null
          explosion_id: string
          id: string
          material_id: string
          quantity_per_unit: number
          suggested_supplier_id: string | null
          total_quantity_needed: number
        }
        Insert: {
          created_at?: string | null
          explosion_id: string
          id?: string
          material_id: string
          quantity_per_unit: number
          suggested_supplier_id?: string | null
          total_quantity_needed: number
        }
        Update: {
          created_at?: string | null
          explosion_id?: string
          id?: string
          material_id?: string
          quantity_per_unit?: number
          suggested_supplier_id?: string | null
          total_quantity_needed?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_explosion_items_explosion_id_fkey"
            columns: ["explosion_id"]
            isOneToOne: false
            referencedRelation: "material_explosion_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_explosion_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_explosion_items_suggested_supplier_id_fkey"
            columns: ["suggested_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_inventory_balances: {
        Row: {
          id: string
          last_movement_date: string | null
          last_movement_id: string | null
          last_updated_at: string | null
          material_id: string
          maximum_stock: number | null
          minimum_stock: number | null
          production_stock: number
          reorder_point: number | null
          total_stock: number | null
          unit_of_measure: string
          warehouse_stock: number
        }
        Insert: {
          id?: string
          last_movement_date?: string | null
          last_movement_id?: string | null
          last_updated_at?: string | null
          material_id: string
          maximum_stock?: number | null
          minimum_stock?: number | null
          production_stock?: number
          reorder_point?: number | null
          total_stock?: number | null
          unit_of_measure?: string
          warehouse_stock?: number
        }
        Update: {
          id?: string
          last_movement_date?: string | null
          last_movement_id?: string | null
          last_updated_at?: string | null
          material_id?: string
          maximum_stock?: number | null
          minimum_stock?: number | null
          production_stock?: number
          reorder_point?: number | null
          total_stock?: number | null
          unit_of_measure?: string
          warehouse_stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_inventory_balances_last_movement_id_fkey"
            columns: ["last_movement_id"]
            isOneToOne: false
            referencedRelation: "all_inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_last_movement_id_fkey"
            columns: ["last_movement_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_last_movement_id_fkey"
            columns: ["last_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_last_movement_id_fkey"
            columns: ["last_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_inventory_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
        ]
      }
      material_receptions: {
        Row: {
          batch_number: string | null
          created_at: string | null
          id: string
          lot_number: string | null
          material_id: string | null
          notes: string | null
          operator_id: string | null
          purchase_order_id: string | null
          quantity_received: number
          reception_date: string
          reception_number: string
          reception_time: string | null
          supplier_id: string | null
          type: string
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          id?: string
          lot_number?: string | null
          material_id?: string | null
          notes?: string | null
          operator_id?: string | null
          purchase_order_id?: string | null
          quantity_received: number
          reception_date?: string
          reception_number: string
          reception_time?: string | null
          supplier_id?: string | null
          type: string
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          id?: string
          lot_number?: string | null
          material_id?: string | null
          notes?: string | null
          operator_id?: string | null
          purchase_order_id?: string | null
          quantity_received?: number
          reception_date?: string
          reception_number?: string
          reception_time?: string | null
          supplier_id?: string | null
          type?: string
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_receptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receptions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_returns: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          reason: string | null
          requested_at: string | null
          requested_by: string
          return_number: string
          status: string
          updated_at: string | null
          work_center_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          requested_at?: string | null
          requested_by: string
          return_number: string
          status?: string
          updated_at?: string | null
          work_center_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          requested_at?: string | null
          requested_by?: string
          return_number?: string
          status?: string
          updated_at?: string | null
          work_center_id?: string
        }
        Relationships: []
      }
      material_suppliers: {
        Row: {
          created_at: string | null
          id: string
          is_preferred: boolean | null
          lead_time_days: number | null
          material_id: string
          notes: string | null
          packaging_unit: number | null
          packaging_weight_grams: number | null
          presentation: string | null
          status: string | null
          supplier_commercial_name: string | null
          supplier_id: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          lead_time_days?: number | null
          material_id: string
          notes?: string | null
          packaging_unit?: number | null
          packaging_weight_grams?: number | null
          presentation?: string | null
          status?: string | null
          supplier_commercial_name?: string | null
          supplier_id: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          lead_time_days?: number | null
          material_id?: string
          notes?: string | null
          packaging_unit?: number | null
          packaging_weight_grams?: number | null
          presentation?: string | null
          status?: string | null
          supplier_commercial_name?: string | null
          supplier_id?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_transfers: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          requested_at: string | null
          requested_by: string
          status: string
          transfer_number: string
          updated_at: string | null
          work_center_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          requested_at?: string | null
          requested_by: string
          status?: string
          transfer_number: string
          updated_at?: string | null
          work_center_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          requested_at?: string | null
          requested_by?: string
          status?: string
          transfer_number?: string
          updated_at?: string | null
          work_center_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          material_id: string
          material_supplier_id: string | null
          notes: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          subtotal: number | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id: string
          material_supplier_id?: string | null
          notes?: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          subtotal?: number | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string
          material_supplier_id?: string | null
          notes?: string | null
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          subtotal?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_supplier_id_fkey"
            columns: ["material_supplier_id"]
            isOneToOne: false
            referencedRelation: "material_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          status: string | null
          supplier_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string | null
          supplier_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string | null
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reception_items: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          lot_number: string | null
          material_id: string
          notes: string | null
          purchase_order_item_id: string | null
          quantity_received: number
          reception_id: string
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          material_id: string
          notes?: string | null
          purchase_order_item_id?: string | null
          quantity_received: number
          reception_id: string
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          material_id?: string
          notes?: string | null
          purchase_order_item_id?: string | null
          quantity_received?: number
          reception_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "reception_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "material_receptions"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          material_id: string
          notes: string | null
          quantity_returned: number
          return_id: string
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          material_id: string
          notes?: string | null
          quantity_returned: number
          return_id: string
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          material_id?: string
          notes?: string | null
          quantity_returned?: number
          return_id?: string
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "material_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "pending_returns_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          access_token: string | null
          address: string | null
          company_name: string
          contact_email: string | null
          contact_person_name: string | null
          contact_phone: string | null
          created_at: string | null
          delivery_days: Json | null
          id: string
          nit: string
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          address?: string | null
          company_name: string
          contact_email?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          delivery_days?: Json | null
          id?: string
          nit: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          address?: string | null
          company_name?: string
          contact_email?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          delivery_days?: Json | null
          id?: string
          nit?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transfer_items: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          material_id: string
          notes: string | null
          quantity_received: number | null
          quantity_requested: number
          transfer_id: string
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          material_id: string
          notes?: string | null
          quantity_received?: number | null
          quantity_requested: number
          transfer_id: string
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          material_id?: string
          notes?: string | null
          quantity_received?: number | null
          quantity_requested?: number
          transfer_id?: string
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "material_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "pending_transfers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      all_inventory_movements: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          location: string | null
          material_id: string | null
          material_name: string | null
          movement_date: string | null
          movement_type: string | null
          notes: string | null
          quantity_change: number | null
          reference_id: string | null
          reference_type: string | null
          unit_of_measure: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
        ]
      }
      all_material_inventory_status: {
        Row: {
          category: string | null
          current_stock: number | null
          id: string | null
          last_movement_date: string | null
          name: string | null
          total_consumed: number | null
          total_movements: number | null
          total_receptions: number | null
          total_waste: number | null
        }
        Relationships: []
      }
      diagnostic_movements: {
        Row: {
          id: string | null
          location: string | null
          material_name: string | null
          movement_date: string | null
          movement_type: string | null
          quantity_change: number | null
        }
        Relationships: []
      }
      diagnostic_products: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          name: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      diagnostic_warehouse_all_products: {
        Row: {
          category: string | null
          id: string | null
          movement_count: number | null
          name: string | null
          total_movement: number | null
        }
        Relationships: []
      }
      diagnostic_work_center_inventory: {
        Row: {
          id: string | null
          material_name: string | null
          quantity_available: number | null
          quantity_consumed: number | null
          transferred_at: string | null
          work_center_code: string | null
        }
        Relationships: []
      }
      inventory_calculation_debug: {
        Row: {
          id: string | null
          name: string | null
          production_calculated: number | null
          total_movements: number | null
          warehouse_calculated: number | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          production_calculated?: never
          total_movements?: never
          warehouse_calculated?: never
        }
        Update: {
          id?: string | null
          name?: string | null
          production_calculated?: never
          total_movements?: never
          warehouse_calculated?: never
        }
        Relationships: []
      }
      inventory_movements_debug: {
        Row: {
          created_at: string | null
          id: string | null
          location: string | null
          material_name: string | null
          movement_date: string | null
          movement_type: string | null
          notes: string | null
          quantity_change: number | null
          recorded_by_email: string | null
          reference_type: string | null
          unit_of_measure: string | null
        }
        Relationships: []
      }
      material_inventory_status: {
        Row: {
          category: string | null
          current_stock: number | null
          id: string | null
          last_movement_date: string | null
          name: string | null
          total_consumed: number | null
          total_receptions: number | null
          total_waste: number | null
        }
        Relationships: []
      }
      mp_material_inventory_status: {
        Row: {
          category: string | null
          current_stock: number | null
          id: string | null
          last_movement_date: string | null
          name: string | null
          total_consumed: number | null
          total_receptions: number | null
          total_waste: number | null
        }
        Relationships: []
      }
      pending_returns_summary: {
        Row: {
          accepted_at: string | null
          id: string | null
          item_count: number | null
          materials_list: string | null
          notes: string | null
          reason: string | null
          requested_at: string | null
          requested_by: string | null
          return_number: string | null
          status: string | null
          total_quantity_returned: number | null
          work_center_code: string | null
          work_center_id: string | null
          work_center_name: string | null
        }
        Relationships: []
      }
      pending_transfers_summary: {
        Row: {
          id: string | null
          item_count: number | null
          items_received: number | null
          materials_list: string | null
          notes: string | null
          received_at: string | null
          requested_at: string | null
          requested_by: string | null
          status: string | null
          total_quantity_requested: number | null
          transfer_number: string | null
          work_center_code: string | null
          work_center_id: string | null
          work_center_name: string | null
        }
        Relationships: []
      }
      production_inventory_debug: {
        Row: {
          batch_number: string | null
          expiry_date: string | null
          id: string | null
          name: string | null
          quantity_available: number | null
          quantity_consumed: number | null
          transferred_at: string | null
          work_center_code: string | null
          work_center_name: string | null
        }
        Relationships: []
      }
      production_inventory_status: {
        Row: {
          category: string | null
          current_stock: number | null
          material_id: string | null
          minimum_stock: number | null
          name: string | null
        }
        Relationships: []
      }
      return_item_details: {
        Row: {
          accepted_at: string | null
          batch_number: string | null
          expiry_date: string | null
          id: string | null
          material_id: string | null
          material_name: string | null
          notes: string | null
          quantity_returned: number | null
          reason: string | null
          requested_at: string | null
          return_id: string | null
          return_number: string | null
          status: string | null
          unit_of_measure: string | null
          work_center_id: string | null
          work_center_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "material_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "pending_returns_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_item_details: {
        Row: {
          batch_number: string | null
          expiry_date: string | null
          id: string | null
          material_id: string | null
          material_name: string | null
          notes: string | null
          quantity_final: number | null
          quantity_received: number | null
          quantity_requested: number | null
          received_at: string | null
          requested_at: string | null
          status: string | null
          transfer_id: string | null
          transfer_number: string | null
          unit_of_measure: string | null
          work_center_id: string | null
          work_center_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "all_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_warehouse_all_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_calculation_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "mp_material_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_debug"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_inventory_status"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "material_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "pending_transfers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_inventory_debug: {
        Row: {
          id: string | null
          name: string | null
          quantity: number | null
          type: string | null
        }
        Relationships: []
      }
      warehouse_inventory_status: {
        Row: {
          category: string | null
          current_stock: number | null
          id: string | null
          last_movement_date: string | null
          name: string | null
          total_consumed: number | null
          total_receptions: number | null
          total_waste: number | null
          unit: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_movement_balance: {
        Args: {
          p_material_id: string
          p_movement_date?: string
          p_warehouse_type: string
        }
        Returns: number
      }
      generate_reception_number: { Args: never; Returns: string }
      generate_return_number: { Args: never; Returns: string }
      generate_supplier_token: { Args: never; Returns: string }
      generate_transfer_number: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  inventario: {
    Tables: {
      inventory_balances: {
        Row: {
          id: string
          last_movement_id: string | null
          last_updated_at: string | null
          location_id: string
          product_id: string
          quantity_on_hand: number
        }
        Insert: {
          id?: string
          last_movement_id?: string | null
          last_updated_at?: string | null
          location_id: string
          product_id: string
          quantity_on_hand?: number
        }
        Update: {
          id?: string
          last_movement_id?: string | null
          last_updated_at?: string | null
          location_id?: string
          product_id?: string
          quantity_on_hand?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_last_movement_id_fkey"
            columns: ["last_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          balance_after: number | null
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          linked_movement_id: string | null
          location_id_from: string | null
          location_id_to: string | null
          movement_date: string
          movement_number: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reason_type: string
          received_at: string | null
          received_by: string | null
          recorded_by: string
          reference_id: string | null
          reference_type: string | null
          status: string | null
          unit_of_measure: string
        }
        Insert: {
          balance_after?: number | null
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          linked_movement_id?: string | null
          location_id_from?: string | null
          location_id_to?: string | null
          movement_date?: string
          movement_number: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reason_type: string
          received_at?: string | null
          received_by?: string | null
          recorded_by: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          unit_of_measure: string
        }
        Update: {
          balance_after?: number | null
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          linked_movement_id?: string | null
          location_id_from?: string | null
          location_id_to?: string | null
          movement_date?: string
          movement_number?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason_type?: string
          received_at?: string | null
          received_by?: string | null
          recorded_by?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_linked_movement_id_fkey"
            columns: ["linked_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_location_id_from_fkey"
            columns: ["location_id_from"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_location_id_to_fkey"
            columns: ["location_id_to"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          bin_type: string | null
          capacity: number | null
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_virtual: boolean | null
          level: number
          location_type: string
          metadata: Json | null
          name: string
          parent_id: string | null
          path: string | null
          temperature_control: boolean | null
          updated_at: string | null
        }
        Insert: {
          bin_type?: string | null
          capacity?: number | null
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_virtual?: boolean | null
          level: number
          location_type: string
          metadata?: Json | null
          name: string
          parent_id?: string | null
          path?: string | null
          temperature_control?: boolean | null
          updated_at?: string | null
        }
        Update: {
          bin_type?: string | null
          capacity?: number | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_virtual?: boolean | null
          level?: number
          location_type?: string
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          path?: string | null
          temperature_control?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_parameters: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_id: string
          reception_quality_id: string | null
          temperature: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_id: string
          reception_quality_id?: string | null
          temperature: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_id?: string
          reception_quality_id?: string | null
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "quality_parameters_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: true
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_parameters_reception_quality_id_fkey"
            columns: ["reception_quality_id"]
            isOneToOne: false
            referencedRelation: "reception_quality_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      reception_quality_certificates: {
        Row: {
          certificate_url: string
          id: string
          reception_quality_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          certificate_url: string
          id?: string
          reception_quality_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          certificate_url?: string
          id?: string
          reception_quality_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reception_quality_certificates_reception_quality_id_fkey"
            columns: ["reception_quality_id"]
            isOneToOne: false
            referencedRelation: "reception_quality_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      reception_quality_parameters: {
        Row: {
          check_arl: boolean
          check_baskets_clean: boolean
          check_dotacion: boolean
          check_food_handling: boolean
          check_packaging_good: boolean
          check_pallets_good: boolean
          check_pest_free: boolean
          check_toxic_free: boolean
          check_vehicle_clean: boolean
          check_vehicle_health: boolean
          created_at: string
          created_by: string | null
          id: string
          quality_certificate_url: string | null
          vehicle_temperature: number | null
        }
        Insert: {
          check_arl?: boolean
          check_baskets_clean?: boolean
          check_dotacion?: boolean
          check_food_handling?: boolean
          check_packaging_good?: boolean
          check_pallets_good?: boolean
          check_pest_free?: boolean
          check_toxic_free?: boolean
          check_vehicle_clean?: boolean
          check_vehicle_health?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          quality_certificate_url?: string | null
          vehicle_temperature?: number | null
        }
        Update: {
          check_arl?: boolean
          check_baskets_clean?: boolean
          check_dotacion?: boolean
          check_food_handling?: boolean
          check_packaging_good?: boolean
          check_pallets_good?: boolean
          check_pest_free?: boolean
          check_toxic_free?: boolean
          check_vehicle_clean?: boolean
          check_vehicle_health?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          quality_certificate_url?: string | null
          vehicle_temperature?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_pending_return: {
        Args: { p_accepted_by?: string; p_movement_in_id: string }
        Returns: Json
      }
      calculate_balance_after: {
        Args: {
          p_location_id: string
          p_movement_type: string
          p_product_id: string
          p_quantity: number
        }
        Returns: number
      }
      calculate_balance_after_dispatch: {
        Args: {
          p_allow_negative?: boolean
          p_location_id: string
          p_movement_type: string
          p_product_id: string
          p_quantity: number
        }
        Returns: number
      }
      confirm_pending_transfer: {
        Args: { p_confirmed_by?: string; p_movement_in_id: string }
        Returns: Json
      }
      create_pending_return: {
        Args: {
          p_location_id_from: string
          p_location_id_to: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_recorded_by?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: Json
      }
      create_pending_transfer: {
        Args: {
          p_location_id_from: string
          p_location_id_to: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_recorded_by?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: Json
      }
      generate_movement_number: { Args: never; Returns: string }
      get_current_balance: {
        Args: { p_location_id: string; p_product_id: string }
        Returns: number
      }
      get_default_location: { Args: { p_reason_type: string }; Returns: string }
      get_pending_returns: {
        Args: never
        Returns: {
          location_from_id: string
          location_from_name: string
          movement_id: string
          movement_number: string
          notes: string
          product_id: string
          product_name: string
          quantity: number
          requested_at: string
          requested_by: string
          unit_of_measure: string
        }[]
      }
      get_pending_transfers_for_location: {
        Args: { p_location_id: string }
        Returns: {
          location_from_id: string
          location_from_name: string
          movement_id: string
          movement_number: string
          notes: string
          product_id: string
          product_name: string
          quantity: number
          requested_at: string
          requested_by: string
          unit_of_measure: string
        }[]
      }
      get_product_balance_by_location: {
        Args: { p_product_id: string }
        Returns: {
          last_updated_at: string
          location_code: string
          location_id: string
          location_name: string
          quantity_on_hand: number
        }[]
      }
      get_product_balance_total: {
        Args: { p_product_id: string }
        Returns: number
      }
      perform_batch_dispatch_movements: {
        Args: {
          p_items: Json
          p_location_id_from: string
          p_notes?: string
          p_order_id: string
          p_order_number: string
          p_recorded_by?: string
        }
        Returns: Json
      }
      perform_dispatch_movement: {
        Args: {
          p_location_id_from: string
          p_notes?: string
          p_order_id: string
          p_order_number: string
          p_product_id: string
          p_quantity: number
          p_recorded_by?: string
        }
        Returns: Json
      }
      perform_inventory_movement: {
        Args: {
          p_batch_number?: string
          p_expiry_date?: string
          p_location_id_from?: string
          p_location_id_to?: string
          p_movement_type: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reason_type: string
          p_recorded_by?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: Json
      }
      perform_transfer: {
        Args: {
          p_location_id_from: string
          p_location_id_to: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_recorded_by?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: Json
      }
      update_inventory_balance: {
        Args: {
          p_location_id: string
          p_movement_id: string
          p_movement_type: string
          p_product_id: string
          p_quantity: number
        }
        Returns: undefined
      }
      update_inventory_balance_dispatch: {
        Args: {
          p_location_id: string
          p_movement_id: string
          p_movement_type: string
          p_product_id: string
          p_quantity: number
        }
        Returns: undefined
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
          original_quantity: number | null
          product_id: string | null
          quantity_needed: number
          tiempo_reposo_horas: number | null
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
          original_quantity?: number | null
          product_id?: string | null
          quantity_needed: number
          tiempo_reposo_horas?: number | null
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
          original_quantity?: number | null
          product_id?: string | null
          quantity_needed?: number
          tiempo_reposo_horas?: number | null
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
          batch_number: string | null
          consumption_type: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          material_id: string | null
          notes: string | null
          quantity_consumed: number
          recorded_at: string | null
          recorded_by: string | null
          shift_production_id: string | null
        }
        Insert: {
          batch_number?: string | null
          consumption_type?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity_consumed: number
          recorded_at?: string | null
          recorded_by?: string | null
          shift_production_id?: string | null
        }
        Update: {
          batch_number?: string | null
          consumption_type?: string | null
          created_at?: string | null
          expiry_date?: string | null
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
          display_order: number | null
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
          display_order?: number | null
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
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_work_center_mapping: {
        Row: {
          created_at: string | null
          id: string
          operation_id: string
          product_id: string
          updated_at: string | null
          work_center_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          operation_id: string
          product_id: string
          updated_at?: string | null
          work_center_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          operation_id?: string
          product_id?: string
          updated_at?: string | null
          work_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_work_center_mapping_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_work_center_mapping_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_work_center_mapping_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      production_productivity: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          operation_id: string | null
          product_id: string | null
          tiempo_labor_por_carro: number | null
          tiempo_minimo_fijo: number | null
          units_per_hour: number
          updated_at: string | null
          usa_tiempo_fijo: boolean | null
          work_center_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          operation_id?: string | null
          product_id?: string | null
          tiempo_labor_por_carro?: number | null
          tiempo_minimo_fijo?: number | null
          units_per_hour: number
          updated_at?: string | null
          usa_tiempo_fijo?: boolean | null
          work_center_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          operation_id?: string | null
          product_id?: string | null
          tiempo_labor_por_carro?: number | null
          tiempo_minimo_fijo?: number | null
          units_per_hour?: number
          updated_at?: string | null
          usa_tiempo_fijo?: boolean | null
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
          {
            foreignKeyName: "production_productivity_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
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
          {
            foreignKeyName: "production_route_tracking_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
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
          tiempo_reposo_horas: number | null
          work_center_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          sequence_order: number
          tiempo_reposo_horas?: number | null
          work_center_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          sequence_order?: number
          tiempo_reposo_horas?: number | null
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
          {
            foreignKeyName: "production_routes_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      production_schedules: {
        Row: {
          batch_number: number | null
          batch_size: number | null
          cascade_level: number | null
          cascade_source_id: string | null
          cascade_type: string | null
          created_at: string | null
          day_of_week: number | null
          duration_hours: number | null
          end_date: string
          id: string
          produced_for_order_number: number | null
          product_id: string
          production_order_number: number | null
          quantity: number
          resource_id: string
          shift_number: number | null
          start_date: string
          status: string | null
          total_batches: number | null
          updated_at: string | null
          week_plan_id: string | null
        }
        Insert: {
          batch_number?: number | null
          batch_size?: number | null
          cascade_level?: number | null
          cascade_source_id?: string | null
          cascade_type?: string | null
          created_at?: string | null
          day_of_week?: number | null
          duration_hours?: number | null
          end_date: string
          id?: string
          produced_for_order_number?: number | null
          product_id: string
          production_order_number?: number | null
          quantity?: number
          resource_id: string
          shift_number?: number | null
          start_date: string
          status?: string | null
          total_batches?: number | null
          updated_at?: string | null
          week_plan_id?: string | null
        }
        Update: {
          batch_number?: number | null
          batch_size?: number | null
          cascade_level?: number | null
          cascade_source_id?: string | null
          cascade_type?: string | null
          created_at?: string | null
          day_of_week?: number | null
          duration_hours?: number | null
          end_date?: string
          id?: string
          produced_for_order_number?: number | null
          product_id?: string
          production_order_number?: number | null
          quantity?: number
          resource_id?: string
          shift_number?: number | null
          start_date?: string
          status?: string | null
          total_batches?: number | null
          updated_at?: string | null
          week_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_schedules_cascade_source_id_fkey"
            columns: ["cascade_source_id"]
            isOneToOne: false
            referencedRelation: "production_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_schedules_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
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
          {
            foreignKeyName: "production_shifts_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      shift_blocking: {
        Row: {
          created_at: string | null
          date: string
          id: string
          reason: string | null
          shift_number: number
          work_center_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          reason?: string | null
          shift_number: number
          work_center_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          reason?: string | null
          shift_number?: number
          work_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_blocking_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_blocking_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      shift_definitions: {
        Row: {
          created_at: string | null
          duration_hours: number
          id: string
          is_active: boolean | null
          name: string
          start_hour: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean | null
          name: string
          start_hour: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean | null
          name?: string
          start_hour?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      shift_productions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          received_to_inventory: boolean
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
          received_to_inventory?: boolean
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
          received_to_inventory?: boolean
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
      weekly_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          week_number: number | null
          week_start_date: string
          year: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          week_number?: number | null
          week_start_date: string
          year?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          week_number?: number | null
          week_start_date?: string
          year?: number | null
        }
        Relationships: []
      }
      work_center_inventory: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          material_id: string
          quantity_available: number
          quantity_consumed: number
          transferred_at: string
          unit_of_measure: string
          updated_at: string | null
          work_center_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          material_id: string
          quantity_available?: number
          quantity_consumed?: number
          transferred_at: string
          unit_of_measure: string
          updated_at?: string | null
          work_center_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          material_id?: string
          quantity_available?: number
          quantity_consumed?: number
          transferred_at?: string
          unit_of_measure?: string
          updated_at?: string | null
          work_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_center_inventory_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_center_inventory_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      work_center_operations: {
        Row: {
          created_at: string | null
          id: string
          operation_id: string
          updated_at: string | null
          work_center_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          operation_id: string
          updated_at?: string | null
          work_center_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          operation_id?: string
          updated_at?: string | null
          work_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_center_operations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_center_operations_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_center_operations_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      work_center_staffing: {
        Row: {
          created_at: string | null
          date: string
          id: string
          shift_number: number
          staff_count: number
          updated_at: string | null
          work_center_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          shift_number: number
          staff_count?: number
          updated_at?: string | null
          work_center_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          shift_number?: number
          staff_count?: number
          updated_at?: string | null
          work_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_center_staffing_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_center_staffing_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      work_centers: {
        Row: {
          capacidad_maxima_carros: number | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_last_operation: boolean
          location_id: string | null
          name: string
          operation_id: string | null
          permite_paralelo_por_referencia: boolean | null
          tipo_capacidad: string | null
          updated_at: string | null
        }
        Insert: {
          capacidad_maxima_carros?: number | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_last_operation?: boolean
          location_id?: string | null
          name: string
          operation_id?: string | null
          permite_paralelo_por_referencia?: boolean | null
          tipo_capacidad?: string | null
          updated_at?: string | null
        }
        Update: {
          capacidad_maxima_carros?: number | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_last_operation?: boolean
          location_id?: string | null
          name?: string
          operation_id?: string | null
          permite_paralelo_por_referencia?: boolean | null
          tipo_capacidad?: string | null
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
      daily_demand_history: {
        Row: {
          day_of_week: number | null
          delivery_date: string | null
          demand_units: number | null
          product_id: string | null
        }
        Relationships: []
      }
      pending_returns_by_center: {
        Row: {
          pending_count: number | null
          received_count: number | null
          total_quantity_returned: number | null
          total_returns: number | null
          work_center_code: string | null
          work_center_id: string | null
          work_center_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_returns_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_returns_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      pending_transfers_by_center: {
        Row: {
          id: string | null
          last_transfer_date: string | null
          partially_received_count: number | null
          pending_count: number | null
          received_count: number | null
          transfer_number: string | null
          work_center_code: string | null
          work_center_id: string | null
          work_center_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_transfers_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_transfers_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      work_center_inventory_status: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string | null
          material_id: string | null
          material_name: string | null
          net_available: number | null
          quantity_available: number | null
          quantity_consumed: number | null
          transferred_at: string | null
          unit_of_measure: string | null
          updated_at: string | null
          work_center_code: string | null
          work_center_id: string | null
          work_center_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_center_inventory_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_center_inventory_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers_with_locations"
            referencedColumns: ["work_center_id"]
          },
        ]
      }
      work_centers_with_locations: {
        Row: {
          location_code: string | null
          location_id: string | null
          location_name: string | null
          location_path: string | null
          status: string | null
          work_center_code: string | null
          work_center_id: string | null
          work_center_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _cascade_v2_backward_cascade: {
        Args: {
          p_bom_rest_time_hours: number
          p_context_end?: string
          p_context_start?: string
          p_create_in_db?: boolean
          p_depth?: number
          p_max_depth?: number
          p_parent_duration_hours: number
          p_parent_last_batch_start?: string
          p_parent_lote_minimo: number
          p_parent_staff_count: number
          p_parent_start_datetime: string
          p_parent_total_units: number
          p_pp_material_id: string
          p_produced_for_order_number?: number
          p_required_quantity: number
          p_week_end?: string
          p_week_plan_id?: string
          p_week_start?: string
        }
        Returns: Json
      }
      _cascade_v2_batch_duration: {
        Args: {
          p_batch_size: number
          p_default_minutes?: number
          p_operation_id: string
          p_product_id: string
          p_staff_count?: number
          p_wc_id: string
        }
        Returns: number
      }
      _cascade_v2_blocked_periods: {
        Args: { p_end_date: string; p_start_date: string; p_wc_id: string }
        Returns: Record<string, unknown>
      }
      _cascade_v2_distribute_batches: {
        Args: { p_lote_minimo: number; p_total: number }
        Returns: number[]
      }
      _cascade_v2_distribute_to_wcs: {
        Args: {
          p_deadline: string
          p_is_hybrid: boolean
          p_new_batches: Json
          p_wc_contexts: Json
        }
        Returns: Json
      }
      _cascade_v2_forward_pp: {
        Args: {
          p_context_end: string
          p_context_start: string
          p_create_in_db: boolean
          p_deadline?: string
          p_duration_hours: number
          p_fixed_total_units: number
          p_lote_minimo: number
          p_produced_for_order_number: number
          p_product_id: string
          p_product_name: string
          p_route: Json
          p_staff_count: number
          p_start_datetime: string
          p_week_plan_id: string
        }
        Returns: Json
      }
      _cascade_v2_get_existing_with_arrival: {
        Args: {
          p_context_end: string
          p_context_start: string
          p_wc_id: string
        }
        Returns: Json
      }
      _cascade_v2_get_wc_staff: {
        Args: { p_datetime: string; p_wc_id: string }
        Returns: number
      }
      _cascade_v2_recalculate_queue: {
        Args: {
          p_block_ends: string[]
          p_block_starts: string[]
          p_is_hybrid?: boolean
          p_schedules: Json
        }
        Returns: Json
      }
      _cascade_v2_simulate_finish: {
        Args: {
          p_block_ends: string[]
          p_block_starts: string[]
          p_existing: Json
          p_is_hybrid: boolean
          p_new_batches: Json
        }
        Returns: string
      }
      _cascade_v2_skip_blocked: {
        Args: {
          p_block_ends: string[]
          p_block_starts: string[]
          p_duration_min: number
          p_start_ts: string
        }
        Returns: string
      }
      calculate_daily_balance: {
        Args: {
          p_date: string
          p_initial_balance: number
          p_product_id: string
        }
        Returns: {
          balance_date: string
          closing_balance: number
          forecast_demand: number
          is_deficit: boolean
          opening_balance: number
          planned_production: number
        }[]
      }
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
      cascade_bulk_upsert: {
        Args: {
          p_parking_zone_end?: string
          p_parking_zone_start?: string
          p_parking_zone_wc_id?: string
          p_schedules_to_insert?: Json
          p_schedules_to_move?: Json
          p_schedules_to_park?: Json
        }
        Returns: Json
      }
      delete_production_order: {
        Args: { order_number: number }
        Returns: number
      }
      generate_cascade_v2: {
        Args: {
          p_create_in_db?: boolean
          p_duration_hours: number
          p_product_id: string
          p_staff_count?: number
          p_start_datetime: string
          p_week_plan_id?: string
        }
        Returns: Json
      }
      get_daily_forecast: {
        Args: {
          p_day_of_week: number
          p_product_id: string
          p_target_date: string
        }
        Returns: number
      }
      get_demand_breakdown_by_client: {
        Args: { p_product_id: string; p_target_date: string }
        Returns: {
          client_id: string
          client_name: string
          order_id: string
          order_number: string
          quantity_units: number
        }[]
      }
      get_next_production_order_number: { Args: never; Returns: number }
      get_production_order_schedules: {
        Args: { p_order_number: number }
        Returns: {
          batch_number: number
          batch_size: number
          cascade_level: number
          cascade_source_id: string
          end_date: string
          id: string
          product_id: string
          product_name: string
          quantity: number
          resource_id: string
          start_date: string
          status: string
          total_batches: number
          work_center_id: string
          work_center_name: string
        }[]
      }
      get_weekly_balance_projection: {
        Args: { p_product_id: string; p_week_start_date: string }
        Returns: {
          balance_date: string
          closing_balance: number
          day_index: number
          day_name: string
          forecast_demand: number
          is_deficit: boolean
          opening_balance: number
          planned_production: number
        }[]
      }
      get_weekly_forecast: {
        Args: { p_week_start_date: string }
        Returns: {
          day_0_forecast: number
          day_1_forecast: number
          day_2_forecast: number
          day_3_forecast: number
          day_4_forecast: number
          day_5_forecast: number
          day_6_forecast: number
          product_id: string
          product_name: string
          weekly_total: number
        }[]
      }
      refresh_daily_demand_history: { Args: never; Returns: undefined }
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
      adjustment_reasons: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          reason: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance_logs: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          employee_id: number
          id: string
          photo_url: string | null
          timestamp: string | null
          type: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          employee_id: number
          id?: string
          photo_url?: string | null
          timestamp?: string | null
          type: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          employee_id?: number
          id?: string
          photo_url?: string | null
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
          latitude: number | null
          longitude: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude?: number | null
          longitude?: number | null
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
      challenges: {
        Row: {
          budget_max: number
          budget_min: number
          category: string
          created_at: string | null
          deadline: string | null
          description: string
          id: string
          status: string
          tech_stack: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget_max: number
          budget_min: number
          category: string
          created_at?: string | null
          deadline?: string | null
          description: string
          id?: string
          status?: string
          tech_stack?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget_max?: number
          budget_min?: number
          category?: string
          created_at?: string | null
          deadline?: string | null
          description?: string
          id?: string
          status?: string
          tech_stack?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          is_active: boolean
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
          is_active?: boolean
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
          is_active?: boolean
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
      dispatch_inventory_config: {
        Row: {
          allow_dispatch_without_inventory: boolean
          created_at: string | null
          default_dispatch_location_id: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allow_dispatch_without_inventory?: boolean
          created_at?: string | null
          default_dispatch_location_id?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allow_dispatch_without_inventory?: boolean
          created_at?: string | null
          default_dispatch_location_id?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
      employee_breaks: {
        Row: {
          created_at: string | null
          created_by: string | null
          employee_id: number
          end_time: string | null
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          employee_id: number
          end_time?: string | null
          id?: string
          start_time?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          employee_id?: number
          end_time?: string | null
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_breaks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          email: string | null
          face_descriptor: Json | null
          first_name: string | null
          id: number
          is_active: boolean | null
          last_name: string | null
          name: string
          photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          face_descriptor?: Json | null
          first_name?: string | null
          id?: never
          is_active?: boolean | null
          last_name?: string | null
          name: string
          photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          face_descriptor?: Json | null
          first_name?: string | null
          id?: never
          is_active?: boolean | null
          last_name?: string | null
          name?: string
          photo_url?: string | null
          updated_at?: string | null
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
          inventory_type: string | null
          location_id: string | null
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
          inventory_type?: string | null
          location_id?: string | null
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
          inventory_type?: string | null
          location_id?: string | null
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
      inventory_adjustments: {
        Row: {
          actual_quantity: number
          adjustment_quantity: number
          adjustment_type: string
          approved_at: string | null
          approved_by: string | null
          counted_quantity: number
          created_at: string | null
          created_by: string | null
          custom_reason: string | null
          difference: number
          id: string
          inventory_id: string
          movement_id: string | null
          product_id: string
          production_quantity: number | null
          reason_id: string | null
          status: string | null
          updated_at: string | null
          warehouse_quantity: number | null
        }
        Insert: {
          actual_quantity: number
          adjustment_quantity: number
          adjustment_type: string
          approved_at?: string | null
          approved_by?: string | null
          counted_quantity: number
          created_at?: string | null
          created_by?: string | null
          custom_reason?: string | null
          difference: number
          id?: string
          inventory_id: string
          movement_id?: string | null
          product_id: string
          production_quantity?: number | null
          reason_id?: string | null
          status?: string | null
          updated_at?: string | null
          warehouse_quantity?: number | null
        }
        Update: {
          actual_quantity?: number
          adjustment_quantity?: number
          adjustment_type?: string
          approved_at?: string | null
          approved_by?: string | null
          counted_quantity?: number
          created_at?: string | null
          created_by?: string | null
          custom_reason?: string | null
          difference?: number
          id?: string
          inventory_id?: string
          movement_id?: string | null
          product_id?: string
          production_quantity?: number | null
          reason_id?: string | null
          status?: string | null
          updated_at?: string | null
          warehouse_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_completeness"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "adjustment_reasons"
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
          snapshot_quantity: number | null
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
          snapshot_quantity?: number | null
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
          snapshot_quantity?: number | null
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
      order_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_type: string
          id: string
          order_id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_type: string
          id?: string
          order_id: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          is_recipe_by_grams: boolean | null
          lote_minimo: number | null
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
          is_recipe_by_grams?: boolean | null
          lote_minimo?: number | null
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
          is_recipe_by_grams?: boolean | null
          lote_minimo?: number | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          role: string
          skills: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          github_url?: string | null
          id: string
          linkedin_url?: string | null
          role?: string
          skills?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          role?: string
          skills?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          budget: number
          challenge_id: string
          cover_letter: string
          created_at: string | null
          estimated_days: number
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget: number
          challenge_id: string
          cover_letter: string
          created_at?: string | null
          estimated_days: number
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget?: number
          challenge_id?: string
          cover_letter?: string
          created_at?: string | null
          estimated_days?: number
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
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
      video_tutorials: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          module_path: string
          title: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          module_path: string
          title?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          module_path?: string
          title?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: []
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
      apply_inventory_adjustment: {
        Args: { p_adjustment_id: string; p_user_id: string }
        Returns: string
      }
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
      calculate_order_total: { Args: { order_uuid: string }; Returns: number }
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
      get_dispatch_config: {
        Args: never
        Returns: {
          allow_dispatch_without_inventory: boolean
          default_dispatch_location_id: string
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
      get_finished_goods_inventory: {
        Args: never
        Returns: {
          available_quantity: number
          dispatched_quantity: number
          produced_quantity: number
          product_id: string
          product_name: string
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
      get_product_demand_ema: {
        Args: { p_alpha?: number; p_product_id: string; p_weeks?: number }
        Returns: number
      }
      get_product_demanded_quantity: {
        Args: { p_product_id: string }
        Returns: number
      }
      get_product_dispatch_history: {
        Args: { p_product_id: string }
        Returns: {
          client_name: string
          delivery_date: string
          delivery_id: string
          delivery_status: string
          order_id: string
          order_number: string
          quantity_delivered: number
          quantity_rejected: number
          rejection_reason: string
        }[]
      }
      get_product_pending_orders: {
        Args: { p_product_id: string }
        Returns: number
      }
      get_product_production_history: {
        Args: { p_product_id: string }
        Returns: {
          bad_units: number
          good_units: number
          notes: string
          record_id: string
          recorded_by: string
          shift_date: string
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
      match_productos: {
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
  visitas: {
    Tables: {
      product_evaluations: {
        Row: {
          comments: string | null
          created_at: string | null
          has_stock: boolean
          id: string
          is_displayed: boolean | null
          product_id: string
          score_baking: number | null
          score_baking_params: number | null
          score_display: number | null
          score_presentation: number | null
          score_staff_training: number | null
          score_taste: number | null
          storage_temperature: number | null
          updated_at: string | null
          visit_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          has_stock?: boolean
          id?: string
          is_displayed?: boolean | null
          product_id: string
          score_baking?: number | null
          score_baking_params?: number | null
          score_display?: number | null
          score_presentation?: number | null
          score_staff_training?: number | null
          score_taste?: number | null
          storage_temperature?: number | null
          updated_at?: string | null
          visit_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          has_stock?: boolean
          id?: string
          is_displayed?: boolean | null
          product_id?: string
          score_baking?: number | null
          score_baking_params?: number | null
          score_display?: number | null
          score_presentation?: number | null
          score_staff_training?: number | null
          score_taste?: number | null
          storage_temperature?: number | null
          updated_at?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_evaluations_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "store_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      store_visits: {
        Row: {
          average_score: number | null
          branch_id: string | null
          branch_name_custom: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          general_comments: string | null
          id: string
          operator_name: string | null
          operator_phone: string | null
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          average_score?: number | null
          branch_id?: string | null
          branch_name_custom?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          general_comments?: string | null
          id?: string
          operator_name?: string | null
          operator_phone?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Update: {
          average_score?: number | null
          branch_id?: string | null
          branch_name_custom?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          general_comments?: string | null
          id?: string
          operator_name?: string | null
          operator_phone?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Relationships: []
      }
      visit_photos: {
        Row: {
          created_at: string | null
          id: string
          photo_type: string
          photo_url: string
          product_evaluation_id: string | null
          visit_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_type: string
          photo_url: string
          product_evaluation_id?: string | null
          visit_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_type?: string
          photo_url?: string
          product_evaluation_id?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_photos_product_evaluation_id_fkey"
            columns: ["product_evaluation_id"]
            isOneToOne: false
            referencedRelation: "product_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "store_visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_visit_average_score: {
        Args: { p_visit_id: string }
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
  workflows: {
    Tables: {
      ordenes_compra: {
        Row: {
          braintrust_classification_log_id: string | null
          braintrust_extraction_log_id: string | null
          braintrust_log_ids: string[] | null
          cliente: string
          cliente_id: string | null
          created_at: string | null
          direccion: string | null
          email_body_preview: string | null
          email_from: string
          email_id: string
          email_subject: string
          error_message: string | null
          fecha_orden: string | null
          id: string
          observaciones: string | null
          oc_number: string
          openai_file_id: string | null
          order_number: string | null
          pdf_filename: string
          pdf_url: string
          processing_logs: Json | null
          received_at: string
          status: string | null
          sucursal: string | null
          sucursal_id: string | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          braintrust_classification_log_id?: string | null
          braintrust_extraction_log_id?: string | null
          braintrust_log_ids?: string[] | null
          cliente: string
          cliente_id?: string | null
          created_at?: string | null
          direccion?: string | null
          email_body_preview?: string | null
          email_from: string
          email_id: string
          email_subject: string
          error_message?: string | null
          fecha_orden?: string | null
          id?: string
          observaciones?: string | null
          oc_number: string
          openai_file_id?: string | null
          order_number?: string | null
          pdf_filename: string
          pdf_url: string
          processing_logs?: Json | null
          received_at: string
          status?: string | null
          sucursal?: string | null
          sucursal_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          braintrust_classification_log_id?: string | null
          braintrust_extraction_log_id?: string | null
          braintrust_log_ids?: string[] | null
          cliente?: string
          cliente_id?: string | null
          created_at?: string | null
          direccion?: string | null
          email_body_preview?: string | null
          email_from?: string
          email_id?: string
          email_subject?: string
          error_message?: string | null
          fecha_orden?: string | null
          id?: string
          observaciones?: string | null
          oc_number?: string
          openai_file_id?: string | null
          order_number?: string | null
          pdf_filename?: string
          pdf_url?: string
          processing_logs?: Json | null
          received_at?: string
          status?: string | null
          sucursal?: string | null
          sucursal_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      ordenes_compra_productos: {
        Row: {
          cantidad: number
          confidence_score: number | null
          created_at: string | null
          fecha_entrega: string | null
          id: string
          orden_compra_id: string
          precio: number | null
          precio_unitario: number | null
          producto: string
          producto_id: string | null
          producto_nombre: string | null
          unidad: string | null
        }
        Insert: {
          cantidad: number
          confidence_score?: number | null
          created_at?: string | null
          fecha_entrega?: string | null
          id?: string
          orden_compra_id: string
          precio?: number | null
          precio_unitario?: number | null
          producto: string
          producto_id?: string | null
          producto_nombre?: string | null
          unidad?: string | null
        }
        Update: {
          cantidad?: number
          confidence_score?: number | null
          created_at?: string | null
          fecha_entrega?: string | null
          id?: string
          orden_compra_id?: string
          precio?: number | null
          precio_unitario?: number | null
          producto?: string
          producto_id?: string | null
          producto_nombre?: string | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_productos_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  compras: {
    Enums: {},
  },
  inventario: {
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
  visitas: {
    Enums: {},
  },
  workflows: {
    Enums: {},
  },
} as const
