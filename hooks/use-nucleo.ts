import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface NucleoProduct {
  id: string
  name: string
  description: string | null
  unit: string
  price: number | null
  weight: string | null
  category: "PT" | "PP" | "MP"
  nombre_wo: string | null
  codigo_wo: string | null
  created_at: string

  // Completeness indicators
  basic_info_complete: boolean
  has_technical_specs: boolean
  has_quality_specs: boolean
  has_production_process: boolean
  has_bill_of_materials: boolean
  has_costs: boolean
  has_price_lists: boolean
  has_commercial_info: boolean
  has_media: boolean
  has_inventory_config: boolean
  completeness_percentage: number
}

export function useNucleo() {
  const [products, setProducts] = useState<NucleoProduct[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('product_completeness')
        .select('*')
        .in('category', ['PT', 'PP']) // Productos terminados y en proceso
        .order('name')

      if (error) throw error

      setProducts(data || [])
    } catch (error: any) {
      console.error('Error fetching products:', error)
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return {
    products,
    loading,
    refetch: fetchProducts
  }
}
