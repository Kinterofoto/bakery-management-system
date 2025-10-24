"use client"

import { useState } from 'react'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Database } from '@/lib/database.types'

type Product = Database["public"]["Tables"]["products"]["Row"]

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product, quantity: number) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = async () => {
    if (quantity > 0 && onAddToCart) {
      setIsAdding(true)
      try {
        onAddToCart(product, quantity)
        setQuantity(1)
      } finally {
        setIsAdding(false)
      }
    }
  }

  const price = product.price || 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
      {/* Product Image Placeholder */}
      <div className="w-full h-40 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">📦</div>
          <p className="text-sm text-amber-800 font-medium">{product.id}</p>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 line-clamp-2 h-14">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Unit */}
        <p className="text-sm text-gray-600">
          Unidad: <span className="font-medium text-gray-900">{product.unit}</span>
        </p>

        {/* Price */}
        <div className="border-t border-gray-200 pt-3">
          <p className="text-2xl font-bold text-amber-600">
            ${price.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500">por {product.unit}</p>
        </div>

        {/* Quantity Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1 || isAdding}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={isAdding}
            className="w-12 text-center text-sm"
            min="1"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            disabled={isAdding}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={isAdding}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          {isAdding ? 'Agregando...' : 'Agregar al Carrito'}
        </Button>
      </div>
    </div>
  )
}
