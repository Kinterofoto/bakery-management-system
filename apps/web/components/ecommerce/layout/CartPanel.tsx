'use client'

import { X, Trash2, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  tax_rate?: number
  photo?: string | null
  productConfig?: {
    units_per_package?: number
  }
}

interface CartPanelProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (id: number, quantity: number) => void
  onRemoveItem: (id: number) => void
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(price))
}

export function CartPanel({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
}: CartPanelProps) {
  // Calculate subtotal, VAT and total
  const calculations = items.reduce((acc, item) => {
    const basePrice = item.price * item.quantity
    const taxRate = (item.tax_rate || 0) / 100
    const itemVAT = basePrice * taxRate

    return {
      subtotal: acc.subtotal + basePrice,
      vat: acc.vat + itemVAT,
    }
  }, { subtotal: 0, vat: 0 })

  const total = calculations.subtotal + calculations.vat
  const MIN_ORDER = 120000 // 120.000 pesos

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
        className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
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
        <div className="flex-1 overflow-y-auto bg-gray-50">
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
            <div className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white p-3 hover:bg-gray-50 transition"
                >
                  {/* Item Content */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex gap-2 flex-1">
                      {/* Product Image */}
                      {item.photo ? (
                        <img
                          src={item.photo}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Sin foto</span>
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                          {item.name}
                        </h3>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <p>Paquete: <span className="font-semibold text-[#27282E]">${formatPrice(item.price)}</span></p>
                          <p className="text-gray-400">
                            Unitario: <span className="text-gray-600">${formatPrice(
                              item.price / (item.productConfig?.units_per_package || 1)
                            )}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-gray-300 hover:text-red-400 transition flex-shrink-0 p-0.5"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Row - Total and Quantity */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#27282E]">
                      ${formatPrice(item.price * item.quantity)}
                    </span>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-full px-2.5 py-1.5 border border-gray-200">
                      <button
                        onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="text-gray-600 hover:text-gray-900 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-semibold text-[#27282E] w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="text-gray-600 hover:text-gray-900 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-3 space-y-2.5">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold text-gray-900">
                ${formatPrice(calculations.subtotal)}
              </span>
            </div>

            {/* VAT */}
            {calculations.vat > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">IVA (19%):</span>
                <span className="font-semibold text-gray-900">
                  ${formatPrice(calculations.vat)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-base font-bold text-gray-700">Total:</span>
              <span className="text-xl font-bold text-[#27282E]">
                ${formatPrice(total)}
              </span>
            </div>

            {/* Checkout Button */}
            <Link href="/ecommerce/checkout" className="block">
              <Button
                disabled={total < MIN_ORDER}
                className="w-full bg-[#DFD860] text-[#27282E] hover:bg-yellow-300 font-bold py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {total < MIN_ORDER ? 'Pedido mínimo $120.000' : 'Finalizar Pedido'}
              </Button>
            </Link>

            {/* Continue Shopping */}
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-50 py-2 text-sm"
            >
              Continuar Comprando
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
