'use client'

import { useState } from 'react'
import { Plus, Minus, X } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductVariantProps {
  name: string
  subcategory: string
  variants: (Product & { product_config?: any[] })[]
  onAddToCart: (product: Product, quantity: number) => void
}

export function ProductVariant({
  name,
  subcategory,
  variants,
  onAddToCart,
}: ProductVariantProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)

  const getUnitPrice = (product: Product) => {
    const config = (product.product_config as any)?.[0]
    const unitsPerPackage = config?.units_per_package || 1
    return ((product.price || 0) / 1000) / unitsPerPackage
  }

  const getPackagePrice = (product: Product) => {
    return ((product.price || 0) / 1000)
  }

  const getWeight = (product: Product) => {
    return product.weight || 'Sin especificar'
  }

  const handleAddClick = () => {
    if (variants.length === 1) {
      // Si solo hay una variante, agregar directo
      setSelectedVariant(variants[0])
      setQuantity(1)
    } else {
      // Si hay múltiples, mostrar modal
      setShowModal(true)
    }
  }

  const handleConfirmAdd = () => {
    if (selectedVariant) {
      onAddToCart(selectedVariant, quantity)
      setQuantity(1)
      setSelectedVariant(null)
      setShowModal(false)
    }
  }

  const handleVariantSelect = (variant: Product) => {
    setSelectedVariant(variant)
  }

  if (selectedVariant && variants.length === 1) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg hover:shadow-md transition relative">
        {/* Product Image */}
        <div className="bg-gray-50 aspect-square rounded-t-lg flex items-center justify-center overflow-hidden group-hover:bg-gray-100 transition">
          <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
            {variants[0].emoji}
          </div>
        </div>

        {/* Product Info */}
        <div className="p-3">
          <h3 className="font-medium text-gray-900 text-sm mb-1 truncate">
            {name}
          </h3>
          <p className="text-xs text-gray-500 mb-3">{subcategory || 'Producto'}</p>

          {/* Price */}
          <p className="text-lg font-bold text-[#27282E] mb-1">
            ${getPackagePrice(selectedVariant).toFixed(3)}
          </p>

          {/* Unit Price */}
          <p className="text-xs text-gray-500 mb-3">
            Unitario: <span className="font-semibold text-[#DFD860]">${getUnitPrice(selectedVariant).toFixed(3)}</span>
          </p>

          {/* Weight */}
          {variants.length > 1 && (
            <p className="text-xs text-gray-500 mb-3">
              Peso: <span className="font-semibold">{getWeight(selectedVariant)}</span>
            </p>
          )}

          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-10 text-center border border-gray-300 rounded py-1 text-sm"
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={handleConfirmAdd}
              className="ml-auto px-4 py-1 bg-[#27282E] text-white text-xs font-semibold rounded hover:bg-gray-800 transition"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-lg hover:shadow-md transition relative">
        {/* Product Image */}
        <div className="bg-gray-50 aspect-square rounded-t-lg flex items-center justify-center overflow-hidden group-hover:bg-gray-100 transition">
          <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
            {variants[0].emoji}
          </div>
        </div>

        {/* Plus Button Corner */}
        <button
          onClick={handleAddClick}
          className="absolute top-2 right-2 bg-[#27282E] text-white rounded-full p-2 hover:bg-gray-800 transition shadow-md"
          title="Agregar al carrito"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Product Info */}
        <div className="p-3">
          <h3 className="font-medium text-gray-900 text-sm mb-1 truncate">
            {name}
          </h3>
          <p className="text-xs text-gray-500 mb-2">{subcategory || 'Producto'}</p>

          {/* Row 1: Prices */}
          <div className="flex gap-2 mb-2 flex-wrap">
            {variants.map((variant) => (
              <div key={variant.id} className="text-xs">
                <span className="font-bold text-[#27282E]">${getPackagePrice(variant).toFixed(3)}</span>
              </div>
            ))}
          </div>

          {/* Row 2: Weight + Unit Price */}
          <div className="flex gap-2 flex-wrap">
            {variants.map((variant) => (
              <div key={variant.id} className="text-xs text-gray-600">
                <span>{getWeight(variant)}</span>
                <span className="text-gray-500 ml-1">${getUnitPrice(variant).toFixed(3)}/u</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for variant selection */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#27282E]">Selecciona el peso</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Variant options */}
            <div className="space-y-3 mb-6">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant)}
                  className={`w-full p-3 border-2 rounded-lg text-left transition ${
                    selectedVariant?.id === variant.id
                      ? 'border-[#DFD860] bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-[#27282E]">{getWeight(variant)}</div>
                  <div className="text-sm text-gray-600">
                    ${getPackagePrice(variant).toFixed(3)} (${getUnitPrice(variant).toFixed(3)}/u)
                  </div>
                </button>
              ))}
            </div>

            {/* Quantity controls */}
            {selectedVariant && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border border-gray-300 rounded py-2 text-lg"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmAdd}
                    className="flex-1 px-4 py-3 bg-[#27282E] text-white font-bold rounded hover:bg-gray-800 transition"
                  >
                    Agregar al carrito
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
