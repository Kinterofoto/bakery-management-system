'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

export default function CheckoutPage() {
  const router = useRouter()
  const { isAuthenticated, customer, loading: authLoading } = useCustomerAuth()
  const { cart, clearCart } = useEcommerceCart()
  const [isLoading, setIsLoading] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [observations, setObservations] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/ecommerce/login')
    }
  }, [isAuthenticated, authLoading, router])

  if (authLoading) {
    return <div className="text-center py-12"><p>Cargando...</p></div>
  }

  if (!isAuthenticated || cart.items.length === 0) {
    return null
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!deliveryDate) {
      toast.error('Por favor selecciona una fecha de entrega')
      return
    }

    if (!customer?.client_id) {
      toast.error('Error: No se encontró el cliente')
      return
    }

    setIsLoading(true)
    try {
      // Get the last order number
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextOrderNumber = '000001'
      if (lastOrder?.order_number) {
        const lastNum = parseInt(lastOrder.order_number, 10)
        if (!isNaN(lastNum)) {
          nextOrderNumber = (lastNum + 1).toString().padStart(6, '0')
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: nextOrderNumber,
          client_id: customer.client_id,
          expected_delivery_date: deliveryDate,
          observations,
          status: 'received',
          created_by: customer.id,
          total_value: cart.total,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity_requested: item.quantity,
        unit_price: item.product?.price || 0,
        availability_status: 'pending',
        quantity_available: 0,
        quantity_missing: item.quantity,
        quantity_completed: 0,
        quantity_dispatched: 0,
        quantity_delivered: 0,
        quantity_returned: 0,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

      if (itemsError) throw itemsError

      toast.success(`¡Pedido #${nextOrderNumber} creado exitosamente!`)
      clearCart()
      router.push(`/ecommerce/pedidos/${order.id}`)
    } catch (err) {
      console.error('Error creating order:', err)
      toast.error('Error al crear el pedido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Confirma tu Pedido</h1>
        <p className="text-gray-600 mt-2">Revisa los detalles antes de confirmar</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Order Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleCreateOrder} className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Información del Cliente</h3>
              <div className="space-y-2 text-gray-700">
                <p><span className="font-medium">Empresa:</span> {customer?.company_name}</p>
                <p><span className="font-medium">Contacto:</span> {customer?.name}</p>
                <p><span className="font-medium">Email:</span> {customer?.email}</p>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Detalles de Entrega</h3>

              <div>
                <Label htmlFor="deliveryDate" className="text-gray-700">
                  Fecha de Entrega Esperada *
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="observations" className="text-gray-700">
                  Observaciones (Opcional)
                </Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Instrucciones especiales de entrega..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>

            {/* Items Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resumen del Pedido</h3>
              <div className="space-y-3">
                {cart.items.map(item => (
                  <div key={item.productId} className="flex justify-between text-gray-700">
                    <div>
                      <p className="font-medium">{item.product?.name || item.productId}</p>
                      <p className="text-sm text-gray-500">Cantidad: {item.quantity} x ${item.product?.price || 0}</p>
                    </div>
                    <p className="font-semibold">
                      ${((item.product?.price || 0) * item.quantity).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 text-lg"
            >
              {isLoading ? 'Creando pedido...' : 'Confirmar Pedido'}
            </Button>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 h-fit sticky top-4">
          <h3 className="font-semibold text-gray-900 mb-4">Total a Pagar</h3>
          <div className="space-y-3 pb-4 border-b border-gray-200 mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${cart.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Impuestos</span>
              <span>Por confirmar</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío</span>
              <span>Por confirmar</span>
            </div>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 mb-6">
            <span>Total</span>
            <span>${cart.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
          </div>

          <Link href="/ecommerce/carrito">
            <Button variant="outline" className="w-full border-amber-600 text-amber-600 hover:bg-amber-50">
              Volver al Carrito
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
