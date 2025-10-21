'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ProductCatalog } from '@/components/ecommerce/catalog/ProductCatalog'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type Product = Database["public"]["Tables"]["products"]["Row"]

export default function CatalogoPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated } = useCustomerAuth()
  const { addToCart, attachProductData } = useEcommerceCart()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name')

        if (error) throw error
        setProducts(data || [])
      } catch (err) {
        console.error('Error fetching products:', err)
        toast.error('Error al cargar los productos')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleAddToCart = (product: Product, quantity: number) => {
    if (!isAuthenticated) {
      toast.info('Debes iniciar sesión para agregar productos al carrito')
      return
    }

    addToCart(product, quantity)
    toast.success(`${product.name} agregado al carrito`)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Catálogo de Productos</h1>
          <p className="text-gray-600 mt-2">
            {isAuthenticated 
              ? 'Agrega productos a tu carrito para hacer tu pedido'
              : 'Navega nuestros productos. Crea una cuenta para hacer pedidos'}
          </p>
        </div>
        {isAuthenticated && (
          <Link href="/ecommerce/carrito">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              Ver Carrito
            </Button>
          </Link>
        )}
      </div>

      {!isAuthenticated && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-amber-900">
            ¿Quieres realizar un pedido? Inicia sesión o crea una cuenta para empezar.
          </p>
          <Link href="/ecommerce/login">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              Ingresar
            </Button>
          </Link>
        </div>
      )}

      <ProductCatalog
        products={products}
        isLoading={isLoading}
        onAddToCart={handleAddToCart}
      />
    </div>
  )
}
