'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [showQuantityControls, setShowQuantityControls] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const singleVariantRef = useRef<Product | null>(null)

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
      // Si solo hay una variante, mostrar controles
      setShowQuantityControls(true)
      singleVariantRef.current = variants[0]
      setQuantity(1)
      
      // Limpiar timeout anterior si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Establecer nuevo timeout para agregar después de 2 segundos sin actividad
      timeoutRef.current = setTimeout(() => {
        if (quantity > 0) {
          onAddToCart(variants[0], quantity)
          setShowQuantityControls(false)
          setQuantity(1)
        }
      }, 2000)
    } else {
      // Si hay múltiples, mostrar modal
      setShowModal(true)
    }
  }

  // Actualizar timeout cuando cambia cantidad
  useEffect(() => {
    if (showQuantityControls && singleVariantRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        onAddToCart(singleVariantRef.current!, quantity)
        setShowQuantityControls(false)
        setQuantity(1)
      }, 2000)
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [quantity, showQuantityControls])

  const handleConfirmQuantity = () => {
    if (singleVariantRef.current && quantity > 0) {
      onAddToCart(singleVariantRef.current, quantity)
      setShowQuantityControls(false)
      setQuantity(1)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
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

        {/* Plus Button Corner / Quantity Controls */}
        {showQuantityControls ? (
          <div className="absolute top-2 right-2 flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-3 shadow-md">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-gray-700 hover:text-gray-900 transition"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-[#27282E] w-6 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="text-gray-700 hover:text-gray-900 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddClick}
            className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-[#27282E] text-white rounded-full p-1.5 sm:p-2 hover:bg-gray-800 transition shadow-md"
            title="Agregar al carrito"
          >
            <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>
        )}

        {/* Product Info */}
        <div className="p-3">
          <h3 className="font-medium text-gray-900 text-sm mb-2 truncate">
            {name}
          </h3>

          {/* Price Section */}
          <div className="mb-2">
            {variants.length > 1 ? (
              <p className="text-xs text-gray-500">
                Desde <span className="font-semibold text-sm text-[#27282E]">${Math.min(...variants.map(v => getUnitPrice(v))).toFixed(3)}</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-[#27282E]">
                ${getUnitPrice(variants[0]).toFixed(3)}
              </p>
            )}
          </div>

          {/* Weight Selector Buttons - Chips Style */}
          <div className="flex flex-wrap gap-1 md:gap-1.5">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={handleAddClick}
                title={`${getWeight(variant)} - $${getUnitPrice(variant).toFixed(3)}`}
                className="px-1.5 py-0.5 md:px-2.5 md:py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-[#DFD860] hover:text-[#27282E] transition"
              >
                {getWeight(variant)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for variant selection */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 md:block"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 w-full max-w-md p-6 hidden md:block" />
          
          {/* Mobile Bottom Sheet */}
          <div className="fixed inset-0 md:hidden z-50 flex items-end pointer-events-none">
            <div
              className="fixed inset-0 bg-black/30 z-40 pointer-events-auto"
              onClick={() => setShowModal(false)}
            />
            <div className="bg-white w-full rounded-t-2xl shadow-2xl p-6 animate-in slide-in-from-bottom duration-300 pointer-events-auto z-50">
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
              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    onClick={() => handleVariantSelect(variant)}
                    className={`w-full p-4 border-2 rounded-lg transition cursor-pointer ${
                      selectedVariant?.id === variant.id
                        ? 'border-[#DFD860] bg-yellow-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {selectedVariant?.id === variant.id ? (
                      // Quantity controls on the side
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-[#27282E] mb-1">{getWeight(variant)}</div>
                          <div className="text-sm text-gray-600">
                            ${getPackagePrice(variant).toFixed(3)} (${getUnitPrice(variant).toFixed(3)})
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 border border-gray-200 shadow-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setQuantity(Math.max(1, quantity - 1))
                            }}
                            className="text-gray-700 hover:text-gray-900 transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                              e.stopPropagation()
                              setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                            }}
                            className="w-8 text-center border-0 bg-transparent text-sm font-semibold text-[#27282E]"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setQuantity(quantity + 1)
                            }}
                            className="text-gray-700 hover:text-gray-900 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal display
                      <>
                        <div className="font-semibold text-[#27282E]">{getWeight(variant)}</div>
                        <div className="text-sm text-gray-600">
                          ${getPackagePrice(variant).toFixed(3)} (${getUnitPrice(variant).toFixed(3)})
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {selectedVariant && (
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmAdd}
                    className="flex-1 px-4 py-3 bg-[#27282E] text-white font-bold rounded hover:bg-gray-800 transition"
                  >
                    Agregar al carrito
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedVariant(null)
                      setQuantity(1)
                    }}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Desktop Modal */}
          <div className="hidden md:block fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 w-full max-w-md p-6">
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
                <div
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant)}
                  className={`w-full p-4 border-2 rounded-lg transition cursor-pointer ${
                    selectedVariant?.id === variant.id
                      ? 'border-[#DFD860] bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {selectedVariant?.id === variant.id ? (
                    // Quantity controls on the side
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-[#27282E] mb-1">{getWeight(variant)}</div>
                        <div className="text-sm text-gray-600">
                          ${getPackagePrice(variant).toFixed(3)} (${getUnitPrice(variant).toFixed(3)})
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 border border-gray-200 shadow-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuantity(Math.max(1, quantity - 1))
                          }}
                          className="text-gray-700 hover:text-gray-900 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            e.stopPropagation()
                            setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                          }}
                          className="w-8 text-center border-0 bg-transparent text-sm font-semibold text-[#27282E]"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuantity(quantity + 1)
                          }}
                          className="text-gray-700 hover:text-gray-900 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal display
                    <>
                      <div className="font-semibold text-[#27282E]">{getWeight(variant)}</div>
                      <div className="text-sm text-gray-600">
                        ${getPackagePrice(variant).toFixed(3)} (${getUnitPrice(variant).toFixed(3)})
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            {selectedVariant && (
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 px-4 py-3 bg-[#27282E] text-white font-bold rounded hover:bg-gray-800 transition"
                >
                  Agregar al carrito
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedVariant(null)
                    setQuantity(1)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
