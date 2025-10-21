'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { CartSummary } from '@/components/ecommerce/cart/CartSummary'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type Product = Database["public"]["Tables"]["products"]["Row"]

export default function CarritoPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useCustomerAuth()
  const { cart, updateQuantity, removeFromCart, attachProductData } = useEcommerceCart()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/ecommerce/login')
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch products to attach data to cart items
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('*')

        if (data) {
          setProducts(data)
        }
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (authLoading || isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Cargando...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Attach product data to cart items
  const cartWithProducts = {
    ...cart,
    items: attachProductData(cart.items, products),
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Tu Carrito</h1>
        <p className="text-gray-600 mt-2">
          {cart.items.length} {cart.items.length === 1 ? 'producto' : 'productos'} en tu carrito
        </p>
      </div>

      <CartSummary
        cart={cartWithProducts}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
      />
    </div>
  )
}
