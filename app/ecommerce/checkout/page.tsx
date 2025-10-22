'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useEffect } from 'react'

export default function CheckoutPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { cart, clearCart } = useEcommerceCart()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return null
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold text-[#27282E] mb-4">Carrito Vacío</h1>
        <p className="text-gray-600 mb-8">No hay productos en tu carrito</p>
        <Link href="/ecommerce">
          <Button className="bg-[#27282E] text-white hover:bg-gray-800">
            Continuar Comprando
          </Button>
        </Link>
      </div>
    )
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const handleCheckout = () => {
    clearCart()
    router.push('/ecommerce/pedidos')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#27282E] mb-8">Checkout</h1>
      
      <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-[#27282E] mb-4">Resumen de Pedido</h2>
        
        <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.name} x{item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-8">
          <span className="text-lg font-bold text-[#27282E]">Total:</span>
          <span className="text-3xl font-bold text-[#27282E]">${total.toFixed(2)}</span>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleCheckout}
            className="w-full bg-[#27282E] text-white hover:bg-gray-800 font-semibold py-3"
          >
            Confirmar Pedido
          </Button>
          <Link href="/ecommerce" className="block">
            <Button className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold py-3">
              Cancelar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
