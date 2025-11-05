"use client"

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProductCard } from './ProductCard'
import type { Database } from '@/lib/database.types'

type Product = Database["public"]["Tables"]["products"]["Row"]

interface ProductCatalogProps {
  products: Product[]
  isLoading?: boolean
  onAddToCart?: (product: Product, quantity: number) => void
}

export function ProductCatalog({ products, isLoading = false, onAddToCart }: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState<'all' | 'PT' | 'MP'>('all')

  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter(p => p.category === category)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        p.id.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [products, searchTerm, category])

  const categories = [
    { value: 'all', label: 'Todos los Productos' },
    { value: 'PT', label: 'Productos Terminados' },
    { value: 'MP', label: 'Materias Primas' },
  ]

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-2 border-gray-300"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value as any)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              category === cat.value
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-600 text-center">
        Mostrando {filteredProducts.length} de {products.length} productos
      </div>
    </div>
  )
}
