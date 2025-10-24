import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { NucleoProduct } from './use-nucleo'

export function useNucleoProduct(productId: string) {
  const [product, setProduct] = useState<NucleoProduct | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProduct = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('product_completeness')
        .select('*')
        .eq('product_id', productId)
        .single()

      if (error) throw error

      setProduct(data)
    } catch (error: any) {
      console.error('Error fetching product:', error)
      if (error.code !== 'PGRST116') { // Not found error
        toast.error('Error al cargar producto')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  return {
    product,
    loading,
    refetch: fetchProduct
  }
}

// Technical Specs
export interface TechnicalSpec {
  id: string
  product_id: string
  dimensions: any
  shelf_life_days: number | null
  storage_conditions: string | null
  packaging_type: string | null
  packaging_units_per_box: number | null
  net_weight: number | null
  gross_weight: number | null
  allergens: string[] | null
  certifications: string[] | null
  custom_attributes: any
  created_at: string
  updated_at: string
}

export function useTechnicalSpecs(productId: string) {
  const [specs, setSpecs] = useState<TechnicalSpec | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSpecs = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('product_technical_specs')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle()

      if (error) throw error
      setSpecs(data)
    } catch (error: any) {
      console.error('Error fetching technical specs:', error)
      toast.error('Error al cargar especificaciones técnicas')
    } finally {
      setLoading(false)
    }
  }

  const upsertSpecs = async (data: Partial<TechnicalSpec>) => {
    try {
      const { error } = await supabase
        .from('product_technical_specs')
        .upsert({
          product_id: productId,
          ...data
        })

      if (error) throw error

      toast.success('Especificaciones técnicas guardadas')
      fetchSpecs()
    } catch (error: any) {
      console.error('Error upserting technical specs:', error)
      toast.error('Error al guardar especificaciones técnicas')
    }
  }

  useEffect(() => {
    if (productId) {
      fetchSpecs()
    }
  }, [productId])

  return {
    specs,
    loading,
    upsertSpecs,
    refetch: fetchSpecs
  }
}

// Quality Specs
export interface QualitySpec {
  id: string
  product_id: string
  quality_parameters: any
  sensory_attributes: any
  microbiological_specs: any
  physical_chemical_specs: any
  control_frequency: string | null
  inspection_points: string[] | null
  rejection_criteria: string | null
  created_at: string
  updated_at: string
}

export function useQualitySpecs(productId: string) {
  const [specs, setSpecs] = useState<QualitySpec | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSpecs = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('product_quality_specs')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle()

      if (error) throw error
      setSpecs(data)
    } catch (error: any) {
      console.error('Error fetching quality specs:', error)
      toast.error('Error al cargar especificaciones de calidad')
    } finally {
      setLoading(false)
    }
  }

  const upsertSpecs = async (data: Partial<QualitySpec>) => {
    try {
      const { error } = await supabase
        .from('product_quality_specs')
        .upsert({
          product_id: productId,
          ...data
        })

      if (error) throw error

      toast.success('Especificaciones de calidad guardadas')
      fetchSpecs()
    } catch (error: any) {
      console.error('Error upserting quality specs:', error)
      toast.error('Error al guardar especificaciones de calidad')
    }
  }

  useEffect(() => {
    if (productId) {
      fetchSpecs()
    }
  }, [productId])

  return {
    specs,
    loading,
    upsertSpecs,
    refetch: fetchSpecs
  }
}

// Costs
export interface ProductCosts {
  id: string
  product_id: string
  material_cost: number
  labor_cost: number
  overhead_cost: number
  packaging_cost: number
  total_production_cost: number
  base_selling_price: number | null
  profit_margin_percentage: number | null
  break_even_units: number | null
  cost_calculation_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export function useProductCosts(productId: string) {
  const [costs, setCosts] = useState<ProductCosts | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCosts = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('product_costs')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle()

      if (error) throw error
      setCosts(data)
    } catch (error: any) {
      console.error('Error fetching costs:', error)
      toast.error('Error al cargar costos')
    } finally {
      setLoading(false)
    }
  }

  const upsertCosts = async (data: Partial<ProductCosts>) => {
    try {
      const { error } = await supabase
        .from('product_costs')
        .upsert({
          product_id: productId,
          ...data
        })

      if (error) throw error

      toast.success('Costos guardados')
      fetchCosts()
    } catch (error: any) {
      console.error('Error upserting costs:', error)
      toast.error('Error al guardar costos')
    }
  }

  useEffect(() => {
    if (productId) {
      fetchCosts()
    }
  }, [productId])

  return {
    costs,
    loading,
    upsertCosts,
    refetch: fetchCosts
  }
}

// Price Lists
export interface PriceList {
  id: string
  product_id: string
  price_list_name: string
  price: number
  min_quantity: number
  max_quantity: number | null
  client_category: string | null
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  discount_percentage: number | null
  currency: string
  created_at: string
  updated_at: string
}

export function usePriceLists(productId: string) {
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPriceLists = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('product_price_lists')
        .select('*')
        .eq('product_id', productId)
        .order('price_list_name')

      if (error) throw error
      setPriceLists(data || [])
    } catch (error: any) {
      console.error('Error fetching price lists:', error)
      toast.error('Error al cargar listas de precios')
    } finally {
      setLoading(false)
    }
  }

  const createPriceList = async (data: Partial<PriceList>) => {
    try {
      const { error } = await supabase
        .from('product_price_lists')
        .insert({
          product_id: productId,
          ...data
        })

      if (error) throw error

      toast.success('Lista de precios creada')
      fetchPriceLists()
    } catch (error: any) {
      console.error('Error creating price list:', error)
      toast.error('Error al crear lista de precios')
    }
  }

  const updatePriceList = async (id: string, data: Partial<PriceList>) => {
    try {
      const { error } = await supabase
        .from('product_price_lists')
        .update(data)
        .eq('id', id)

      if (error) throw error

      toast.success('Lista de precios actualizada')
      fetchPriceLists()
    } catch (error: any) {
      console.error('Error updating price list:', error)
      toast.error('Error al actualizar lista de precios')
    }
  }

  const deletePriceList = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_price_lists')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Lista de precios eliminada')
      fetchPriceLists()
    } catch (error: any) {
      console.error('Error deleting price list:', error)
      toast.error('Error al eliminar lista de precios')
    }
  }

  useEffect(() => {
    if (productId) {
      fetchPriceLists()
    }
  }, [productId])

  return {
    priceLists,
    loading,
    createPriceList,
    updatePriceList,
    deletePriceList,
    refetch: fetchPriceLists
  }
}

// Commercial Info
export interface CommercialInfo {
  id: string
  product_id: string
  commercial_name: string | null
  brand: string | null
  marketing_description: string | null
  target_market: string[] | null
  sales_channel: string[] | null
  seasonality: string | null
  promotional_tags: string[] | null
  competitor_products: any
  usp: string | null
  sales_notes: string | null
  created_at: string
  updated_at: string
}

export function useCommercialInfo(productId: string) {
  const [info, setInfo] = useState<CommercialInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInfo = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('product_commercial_info')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle()

      if (error) throw error
      setInfo(data)
    } catch (error: any) {
      console.error('Error fetching commercial info:', error)
      toast.error('Error al cargar información comercial')
    } finally {
      setLoading(false)
    }
  }

  const upsertInfo = async (data: Partial<CommercialInfo>) => {
    try {
      const { error } = await supabase
        .from('product_commercial_info')
        .upsert({
          product_id: productId,
          ...data
        })

      if (error) throw error

      toast.success('Información comercial guardada')
      fetchInfo()
    } catch (error: any) {
      console.error('Error upserting commercial info:', error)
      toast.error('Error al guardar información comercial')
    }
  }

  useEffect(() => {
    if (productId) {
      fetchInfo()
    }
  }, [productId])

  return {
    info,
    loading,
    upsertInfo,
    refetch: fetchInfo
  }
}

// Inventory Config
export interface InventoryConfig {
  id: string
  product_id: string
  reorder_point: number
  safety_stock: number
  max_stock_level: number | null
  lead_time_days: number
  abc_classification: string | null
  rotation_classification: string | null
  storage_location: string | null
  requires_cold_chain: boolean
  is_perishable: boolean
  created_at: string
  updated_at: string
}

export function useInventoryConfig(productId: string) {
  const [config, setConfig] = useState<InventoryConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('product_inventory_config')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle()

      if (error) throw error
      setConfig(data)
    } catch (error: any) {
      console.error('Error fetching inventory config:', error)
      toast.error('Error al cargar configuración de inventario')
    } finally {
      setLoading(false)
    }
  }

  const upsertConfig = async (data: Partial<InventoryConfig>) => {
    try {
      const { error } = await supabase
        .from('product_inventory_config')
        .upsert({
          product_id: productId,
          ...data
        })

      if (error) throw error

      toast.success('Configuración de inventario guardada')
      fetchConfig()
    } catch (error: any) {
      console.error('Error upserting inventory config:', error)
      toast.error('Error al guardar configuración de inventario')
    }
  }

  useEffect(() => {
    if (productId) {
      fetchConfig()
    }
  }, [productId])

  return {
    config,
    loading,
    upsertConfig,
    refetch: fetchConfig
  }
}
