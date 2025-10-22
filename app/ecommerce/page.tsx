'use client'

import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'

// Mock products data - replace with real data from DB
const ALL_PRODUCTS = [
  { id: 1, name: 'Harina Premium', category: 'Harinas', price: 45.99, emoji: '🌾', stock: 50 },
  { id: 2, name: 'Levadura Fresca', category: 'Levaduras', price: 12.50, emoji: '⚗️', stock: 100 },
  { id: 3, name: 'Sal Marina', category: 'Ingredientes', price: 8.99, emoji: '🧂', stock: 75 },
  { id: 4, name: 'Azúcar Cristal', category: 'Azúcares', price: 15.75, emoji: '🍬', stock: 60 },
  { id: 5, name: 'Mantequilla Premium', category: 'Lácteos', price: 22.50, emoji: '🧈', stock: 40 },
  { id: 6, name: 'Huevos Orgánicos', category: 'Huevos', price: 18.99, emoji: '🥚', stock: 80 },
  { id: 7, name: 'Chocolate 70%', category: 'Chocolates', price: 35.00, emoji: '🍫', stock: 45 },
  { id: 8, name: 'Harina Integral', category: 'Harinas', price: 42.50, emoji: '🌾', stock: 30 },
  { id: 9, name: 'Levadura Seca', category: 'Levaduras', price: 11.00, emoji: '⚗️', stock: 90 },
  { id: 10, name: 'Café Molido', category: 'Café', price: 28.75, emoji: '☕', stock: 55 },
  { id: 11, name: 'Vainilla Pura', category: 'Extractos', price: 24.99, emoji: '🍯', stock: 35 },
  { id: 12, name: 'Almendras Molidas', category: 'Frutos Secos', price: 32.50, emoji: '🥜', stock: 25 },
]

const CATEGORIES = ['Todos', 'Harinas', 'Levaduras', 'Ingredientes', 'Azúcares', 'Lácteos', 'Huevos', 'Chocolates', 'Café', 'Extractos', 'Frutos Secos']

const PROMOTIONS = [
  { id: 1, title: 'Promoción 1', emoji: '🎉', color: 'from-blue-500 to-blue-600' },
  { id: 2, title: 'Promoción 2', emoji: '✨', color: 'from-purple-500 to-purple-600' },
  { id: 3, title: 'Promoción 3', emoji: '🚀', color: 'from-pink-500 to-pink-600' },
]

export default function EcommercePage() {
  const { isAuthenticated } = useCustomerAuth()
  const { addItem } = useEcommerceCart()
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [addingToCart, setAddingToCart] = useState<number | null>(null)
  const [currentPromotion, setCurrentPromotion] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromotion((prev) => (prev + 1) % PROMOTIONS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Filter products
  const filteredProducts = useMemo(() => {
    return ALL_PRODUCTS.filter(product => {
      const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchTerm])

  const handleAddToCart = async (product: typeof ALL_PRODUCTS[0]) => {
    if (!isAuthenticated) {
      window.location.href = '/ecommerce/login'
      return
    }

    setAddingToCart(product.id)
    try {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      })
      // Reset after 500ms
      setTimeout(() => setAddingToCart(null), 500)
    } catch (error) {
      console.error('Error adding to cart:', error)
      setAddingToCart(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Promotions Carousel */}
      <div className="relative bg-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative h-40 flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-gray-100 to-gray-50">
            {PROMOTIONS.map((promo, index) => (
              <div
                key={promo.id}
                className={`absolute inset-0 transition-opacity duration-1000 flex flex-col items-center justify-center bg-gradient-to-r ${promo.color} ${
                  index === currentPromotion ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="text-6xl mb-2">{promo.emoji}</div>
                <p className="text-white font-semibold text-lg">{promo.title}</p>
              </div>
            ))}

            {/* Navigation Buttons */}
            <button
              onClick={() => setCurrentPromotion((prev) => (prev - 1 + PROMOTIONS.length) % PROMOTIONS.length)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-2 rounded-full transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>
            <button
              onClick={() => setCurrentPromotion((prev) => (prev + 1) % PROMOTIONS.length)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-2 rounded-full transition"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
              {PROMOTIONS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPromotion(index)}
                  className={`w-2 h-2 rounded-full transition ${
                    index === currentPromotion ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar and Category Filters - Horizontal Layout */}
        <div className="mb-8 flex gap-2 items-center overflow-x-auto pb-2">
          {/* Search Bar */}
          <div className="relative flex-shrink-0 w-64">
            <Input
              type="text"
              placeholder="Busca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#27282E]"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  selectedCategory === category
                    ? 'bg-[#27282E] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-[#27282E]">{filteredProducts.length}</span> producto{filteredProducts.length !== 1 ? 's' : ''}
            {selectedCategory !== 'Todos' && ` en ${selectedCategory}`}
            {searchTerm && ` que coinciden con "${searchTerm}"`}
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group bg-white border border-gray-100 rounded-lg hover:shadow-md transition">
                {/* Product Image */}
                <div className="bg-gray-50 aspect-square rounded-t-lg flex items-center justify-center overflow-hidden group-hover:bg-gray-100 transition">
                  <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                    {product.emoji}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 text-sm mb-1 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">{product.category}</p>

                  {/* Price */}
                  <p className="text-lg font-bold text-[#27282E] mb-3">
                    ${product.price.toFixed(2)}
                  </p>

                  {/* Stock */}
                  <p className="text-xs text-gray-500 mb-3">
                    Stock: <span className="font-semibold">{product.stock}</span>
                  </p>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={addingToCart === product.id}
                    className={`w-full py-2 rounded text-xs font-semibold transition ${
                      addingToCart === product.id
                        ? 'bg-green-500 text-white'
                        : 'bg-[#27282E] text-white hover:bg-gray-800'
                    }`}
                  >
                    {addingToCart === product.id ? '✓ Agregado' : 'Agregar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-lg mb-4">No encontramos productos que coincidan</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('Todos')
              }}
              className="text-[#DFD860] font-medium hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}


      </div>
    </div>
  )
}
