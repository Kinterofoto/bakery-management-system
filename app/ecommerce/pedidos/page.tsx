'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { toast } from 'sonner'

type Order = Database['public']['Tables']['orders']['Row']

export default function PedidosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        if (!user?.id) return

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders(data || [])
      } catch (err) {
        console.error('Error fetching orders:', err)
        toast.error('Error al cargar las órdenes')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [user, router])

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      received: 'bg-blue-100 text-blue-800',
      review_area1: 'bg-yellow-100 text-yellow-800',
      review_area2: 'bg-yellow-100 text-yellow-800',
      ready_dispatch: 'bg-purple-100 text-purple-800',
      dispatched: 'bg-indigo-100 text-indigo-800',
      in_delivery: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      partially_delivered: 'bg-orange-100 text-orange-800',
      returned: 'bg-red-100 text-red-800',
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      received: 'Recibida',
      review_area1: 'En revisión',
      review_area2: 'En revisión',
      ready_dispatch: 'Lista para envío',
      dispatched: 'Enviada',
      in_delivery: 'En entrega',
      delivered: 'Entregada',
      partially_delivered: 'Parcialmente entregada',
      returned: 'Devuelta',
    }
    return labels[status] || status
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[#27282E] mb-2">Mis Órdenes</h1>
          <p className="text-gray-600">Historial de tus compras</p>
        </div>

        {/* Back Button */}
        <div className="mb-8">
          <Link href="/ecommerce">
            <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold">
              ← Volver al inicio
            </Button>
          </Link>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Cargando órdenes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">No tienes órdenes aún</p>
            <Link href="/ecommerce">
              <Button className="bg-[#27282E] text-white hover:bg-gray-800 font-semibold">
                Ir a comprar
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Order Info */}
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-bold text-[#27282E]">
                        Orden #{order.id.toString().slice(0, 8)}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          order.status || 'received'
                        )}`}
                      >
                        {getStatusLabel(order.status || 'received')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#27282E]">
                      ${(order.total || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>

                {/* Delivery Date */}
                {order.delivery_date && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      Fecha de entrega: <span className="font-semibold text-gray-800">
                        {new Date(order.delivery_date).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
