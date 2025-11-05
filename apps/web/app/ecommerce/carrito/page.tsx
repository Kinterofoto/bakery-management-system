'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { CartSummary } from '@/components/ecommerce/cart/CartSummary'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type Product = Database["public"]["Tables"]["products"]["Row"]

export default function CarritoPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { cart, updateQuantity, removeFromCart, calculateTotal } = useEcommerceCart()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

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
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Cargando...</div>
  }

  if (!user) {
    return null
  }

  // Attach product data to cart items
  const cartItems = cart.items || []
  const itemsWithProducts = cartItems.map(item => {
    const product = products.find(p => p.id === item.productId)
    if (product && !item.product) {
      return { ...item, product }
    }
    return item
  })

  // Create cart object with enriched items
  const enrichedCart = {
    items: itemsWithProducts,
    total: cart.total,
    itemCount: cart.itemCount
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/ecommerce">
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300">
            ← Volver
          </Button>
        </Link>
      </div>
      <CartSummary
        cart={enrichedCart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
      />
    </div>
  )
}
