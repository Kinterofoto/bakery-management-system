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
  visible_in_ecommerce: boolean
  is_active: boolean

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

      // Fetch weights, visibility and active status from products table
      // Only fetch active products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, weight, visible_in_ecommerce, is_active')
        .in('id', productIds)
        .eq('is_active', true)  // Only active products

      if (productsError) throw productsError

      // Create data map
      const productDataMap = new Map<string, { weight: string | null, visible_in_ecommerce: boolean, is_active: boolean }>()
      productsData?.forEach(p => {
        productDataMap.set(p.id, {
          weight: p.weight,
          visible_in_ecommerce: p.visible_in_ecommerce ?? true,
          is_active: p.is_active ?? true
        })
      })

      // Merge weight, visibility and is_active into completeness data
      // Filter out products that are not in the productDataMap (inactive products)
      const enrichedData = (completenessData || [])
        .filter(item => productDataMap.has(item.product_id))
        .map(item => ({
          ...item,
          weight: productDataMap.get(item.product_id)?.weight || null,
          visible_in_ecommerce: productDataMap.get(item.product_id)?.visible_in_ecommerce ?? true,
          is_active: productDataMap.get(item.product_id)?.is_active ?? true
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
