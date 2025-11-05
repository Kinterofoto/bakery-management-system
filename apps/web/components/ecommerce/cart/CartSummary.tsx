"use client"

import { TrashIcon, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import type { CartState } from '@/hooks/use-ecommerce-cart'
import type { Database } from '@/lib/database.types'

type Product = Database["public"]["Tables"]["products"]["Row"]

interface CartSummaryProps {
  cart: CartState
  onUpdateQuantity?: (productId: string, quantity: number) => void
  onRemove?: (productId: string) => void
}

export function CartSummary({ cart, onUpdateQuantity, onRemove }: CartSummaryProps) {
  const isEmpty = cart.items.length === 0

  if (isEmpty) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Tu carrito está vacío</h3>
        <p className="text-gray-600 mb-6">Comienza a agregar productos desde nuestro catálogo</p>
        <Link href="/ecommerce/catalogo">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            Ir al Catálogo
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cart Items */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Precio</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Cantidad</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Subtotal</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cart.items.map(item => {
                const product = item.product
                const price = product?.price || 0
                const subtotal = price * item.quantity

                return (
                  <tr key={item.productId} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{product?.name || item.productId}</p>
                        <p className="text-sm text-gray-500">{product?.unit}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      ${price.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity?.(item.productId, Math.max(1, item.quantity - 1))}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => onUpdateQuantity?.(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 text-center text-sm"
                          min="1"
                        />
                        <button
                          onClick={() => onUpdateQuantity?.(item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      ${subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onRemove?.(item.productId)}
                        className="p-2 hover:bg-red-100 rounded text-red-600 transition"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="space-y-2 pb-4 border-b border-gray-200">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${cart.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Envío</span>
            <span>Será calculado en checkout</span>
          </div>
        </div>

        <div className="flex justify-between text-lg font-bold text-gray-900">
          <span>Total</span>
          <span>${cart.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
        </div>

        <Link href="/ecommerce/checkout">
          <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2">
            Proceder al Pago
          </Button>
        </Link>

        <Link href="/ecommerce/catalogo">
          <Button variant="outline" className="w-full border-amber-600 text-amber-600 hover:bg-amber-50">
            Continuar Comprando
          </Button>
        </Link>
      </div>
    </div>
  )
}
