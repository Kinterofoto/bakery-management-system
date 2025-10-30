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

      // Fetch from product_completeness
      const { data: completenessData, error: completenessError } = await supabase
        .from('product_completeness')
        .select('*')
        .in('category', ['PT', 'PP']) // Productos terminados y en proceso
        .order('name')

      if (completenessError) throw completenessError

      // Get product IDs
      const productIds = (completenessData || []).map(p => p.product_id)

      if (productIds.length === 0) {
        setProducts([])
        return
      }

      // Fetch weights from products table
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, weight')
        .in('id', productIds)

      if (productsError) throw productsError

      // Create weight map
      const weightMap = new Map<string, string | null>()
      productsData?.forEach(p => {
        weightMap.set(p.id, p.weight)
      })

      // Merge weight into completeness data
      const enrichedData = (completenessData || []).map(item => ({
        ...item,
        weight: weightMap.get(item.product_id) || null
      }))

      setProducts(enrichedData || [])
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
