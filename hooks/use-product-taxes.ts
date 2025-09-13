"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface Product {
  id: string
  name: string
  description?: string
  category: string
  tax_rate: number
  weight?: string
  price?: number
}

export function useProductTaxes() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingProducts, setSavingProducts] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category, tax_rate, weight, price')
        .eq('category', 'PT')
        .order('name', { ascending: true })

      if (error) throw error

      setProducts(data || [])
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar productos'
      setError(errorMessage)
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateProductTaxInstantly = async (
    productId: string,
    taxRate: number
  ): Promise<void> => {
    try {
      // Actualizar estado inmediatamente para renderizado en tiempo real
      setProducts(prev =>
        prev.map(product =>
          product.id === productId
            ? { ...product, tax_rate: taxRate }
            : product
        )
      )

      // Marcar como guardando
      setSavingProducts(prev => new Set(prev).add(productId))

      // Guardar en base de datos
      const { error } = await supabase
        .from('products')
        .update({ tax_rate: taxRate })
        .eq('id', productId)

      if (error) throw error

    } catch (err: any) {
      // Revertir cambio si hay error
      fetchProducts()
      const errorMessage = err.message || 'Error al actualizar impuesto del producto'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      // Quitar de estado de guardando
      setSavingProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  const getProductTaxRate = (productId: string): number => {
    const product = products.find(p => p.id === productId)
    return product?.tax_rate ?? 19.00 // Default 19%
  }

  const isSaving = (productId: string): boolean => {
    return savingProducts.has(productId)
  }

  const getAvailableTaxRates = (): number[] => {
    return [0.00, 19.00]
  }

  const getProductsByTaxRate = (taxRate: number): Product[] => {
    return products.filter(product => product.tax_rate === taxRate)
  }

  const getProductsWithoutTaxConfiguration = (): Product[] => {
    return products.filter(product =>
      product.tax_rate === null || product.tax_rate === undefined
    )
  }

  const getTaxStatistics = () => {
    const total = products.length
    const withTax = products.filter(p => p.tax_rate === 19.00).length
    const withoutTax = products.filter(p => p.tax_rate === 0.00).length
    const unconfigured = products.filter(p => p.tax_rate === null || p.tax_rate === undefined).length

    return {
      total,
      withTax,
      withoutTax,
      unconfigured,
      percentageWithTax: total > 0 ? Math.round((withTax / total) * 100) : 0,
      percentageWithoutTax: total > 0 ? Math.round((withoutTax / total) * 100) : 0
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return {
    products,
    loading,
    error,
    fetchProducts,
    updateProductTaxInstantly,
    getProductTaxRate,
    isSaving,
    getAvailableTaxRates,
    getProductsByTaxRate,
    getProductsWithoutTaxConfiguration,
    getTaxStatistics
  }
}