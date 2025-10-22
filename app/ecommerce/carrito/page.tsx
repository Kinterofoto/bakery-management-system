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
  const { cart, updateQuantity, removeFromCart, attachProductData } = useEcommerceCart()
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
  const cartWithProducts = cart.map(item => {
    const product = products.find(p => p.id === item.id)
    return product ? attachProductData(item, product) : item
  })

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
        items={cartWithProducts}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
      />
    </div>
  )
}
