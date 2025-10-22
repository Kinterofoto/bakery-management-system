'use client'

import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

interface CartPanelProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (id: number, quantity: number) => void
  onRemoveItem: (id: number) => void
}

export function CartPanel({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
}: CartPanelProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Cart Panel */}
      <div
        className={`fixed left-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#27282E]">Mi Carrito</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Tu carrito está vacío</p>
              <Button
                onClick={onClose}
                className="bg-[#27282E] text-white hover:bg-gray-800"
              >
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  {/* Item Header */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 flex-1">
                      {item.name}
                    </h3>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Price */}
                  <p className="text-sm text-gray-600 mb-3">
                    ${item.price.toFixed(2)} cada uno
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 text-center border border-gray-300 rounded py-1"
                    />
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      +
                    </button>
                    <span className="ml-auto text-lg font-bold text-[#27282E]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 space-y-4">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total:</span>
              <span className="text-3xl font-bold text-[#27282E]">
                ${total.toFixed(2)}
              </span>
            </div>

            {/* Checkout Button */}
            <Link href="/ecommerce/checkout" className="block">
              <Button className="w-full bg-[#DFD860] text-[#27282E] hover:bg-yellow-300 font-bold py-3 text-lg">
                Ir al Checkout
              </Button>
            </Link>

            {/* Continue Shopping */}
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-50 py-3"
            >
              Continuar Comprando
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
