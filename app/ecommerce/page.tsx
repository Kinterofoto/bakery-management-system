'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Search, X, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { CartPanel } from '@/components/ecommerce/layout/CartPanel'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Product = Database['public']['Tables']['products']['Row']

const PROMOTIONS = [
  { id: 1, title: 'Promoción 1', emoji: '🎉', color: 'from-blue-500 to-blue-600' },
  { id: 2, title: 'Promoción 2', emoji: '✨', color: 'from-purple-500 to-purple-600' },
  { id: 3, title: 'Promoción 3', emoji: '🚀', color: 'from-pink-500 to-pink-600' },
]

export default function EcommercePage() {
  const { user } = useAuth()
  const { addToCart, cart, updateQuantity, removeFromCart } = useEcommerceCart()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(['Todos'])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [addingToCart, setAddingToCart] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const isAuthenticated = !!user
  const [currentPromotion, setCurrentPromotion] = useState(0)

  // Format cart items for display
  const cartItems = (cart.items || []).map(item => ({
    id: item.productId,
    name: item.product?.name || 'Producto',
    price: item.product?.unit_price || 0,
    quantity: item.quantity,
  }))

  // Fetch products from DB (category = 'PT')
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('category', 'PT')
          .order('name')

        if (error) throw error

        setAllProducts(data || [])

        // Extract unique subcategories
        const uniqueCategories = ['Todos', ...Array.from(new Set(
          (data || []).map(p => p.subcategory).filter(Boolean) as string[]
        ))]
        setCategories(uniqueCategories)
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromotion((prev) => (prev + 1) % PROMOTIONS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Filter products
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesCategory = selectedCategory === 'Todos' || product.subcategory === selectedCategory
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [allProducts, selectedCategory, searchTerm])

  const handleAddToCart = async (product: Product) => {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }

    setAddingToCart(product.id)
    try {
      addToCart({
        productId: product.id,
        quantity: 1,
        product,
      })
      // Reset after 500ms
      setTimeout(() => {
        setAddingToCart(null)
        setIsCartOpen(true)
      }, 500)
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
            {categories.map((category) => (
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
                  <p className="text-xs text-gray-500 mb-3">{product.subcategory || 'Producto'}</p>

                  {/* Price */}
                  <p className="text-lg font-bold text-[#27282E] mb-3">
                    ${(product.unit_price || 0).toFixed(2)}
                  </p>

                  {/* Unit */}
                  <p className="text-xs text-gray-500 mb-3">
                    Unidad: <span className="font-semibold">{product.unit || 'kg'}</span>
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


        {/* Cart Button (Sticky) */}
        <div className="fixed bottom-8 right-8 md:bottom-auto md:top-8 md:right-8 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-[#27282E] text-white rounded-lg p-4 shadow-lg hover:bg-gray-900 transition relative"
            title="Ver carrito"
          >
            <ShoppingCart className="w-6 h-6" />
          </button>
          {cart.itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-[#DFD860] text-[#27282E] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {cart.itemCount > 9 ? '9+' : cart.itemCount}
            </span>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
      />
    </div>
  )
}
