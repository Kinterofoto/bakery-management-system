'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Search, X, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { CartPanel } from '@/components/ecommerce/layout/CartPanel'
import { ProductVariant } from '@/components/ecommerce/ProductVariant'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Product = Database['public']['Tables']['products']['Row']

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

// Add timestamp to force cache refresh when images change
const getCacheParam = () => `?v=${Date.now()}`

const PROMOTIONS = [
  {
    id: 1,
    title: 'Promoción 1',
    imageUrl: `${SUPABASE_URL}/storage/v1/object/public/carrusel/foto_1/banner.jpg`
  },
  {
    id: 2,
    title: 'Promoción 2',
    imageUrl: `${SUPABASE_URL}/storage/v1/object/public/carrusel/foto_2/banner.jpg`
  },
  {
    id: 3,
    title: 'Promoción 3',
    imageUrl: `${SUPABASE_URL}/storage/v1/object/public/carrusel/foto_3/banner.jpg`
  },
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
  const [imageCacheKey, setImageCacheKey] = useState(Date.now())
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const filterRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const filterContainerRef = useRef<HTMLDivElement | null>(null)

  // Format cart items for display
  const cartItems = (cart.items || []).map(item => {
    const product = item.product
    const primaryPhoto = product?.product_media?.find((media: any) => media.is_primary)?.file_url ||
                        product?.product_media?.[0]?.file_url || null

    return {
      id: item.productId,
      name: product?.name || 'Producto',
      price: product?.price || 0,
      quantity: item.quantity,
      tax_rate: product?.tax_rate || 0,
      photo: primaryPhoto,
      productConfig: (product?.product_config as any)?.[0],
    }
  })

  // Fetch products from DB (category = 'PT' and has subcategory) with config data and photos
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_config (
              units_per_package
            ),
            product_media!product_media_product_id_fkey (
              file_url,
              is_primary
            )
          `)
          .eq('category', 'PT')
          .eq('visible_in_ecommerce', true)
          .eq('is_active', true)
          .not('subcategory', 'is', null)
          .order('name')

        if (error) throw error

        setAllProducts(data || [])

        // Extract unique subcategories
        const uniqueCategories = ['Todos', ...Array.from(new Set(
          (data || []).map(p => p.subcategory).filter(Boolean) as string[]
        )).sort()]
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

  // Helper to get unit price
  const getUnitPrice = (product: Product) => {
    const config = (product.product_config as any)?.[0]
    const unitsPerPackage = config?.units_per_package || 1
    return ((product.price || 0) / 1000) / unitsPerPackage
  }

  // Filter products
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
  }, [allProducts, searchTerm])

  // Group products by subcategory and then by name
  const productsByCategory = useMemo(() => {
    const categoryGroups: Record<string, Record<string, Product[]>> = {}
    
    filteredProducts.forEach(product => {
      const category = product.subcategory || 'Otros'
      if (!categoryGroups[category]) {
        categoryGroups[category] = {}
      }
      if (!categoryGroups[category][product.name]) {
        categoryGroups[category][product.name] = []
      }
      categoryGroups[category][product.name].push(product)
    })

    // Convert to array and sort
    return Object.entries(categoryGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, products]) => ({
        category,
        products: Object.entries(products).map(([name, variants]) => ({
          name,
          variants: variants.sort((a, b) => (parseFloat(a.weight || '0') || 0) - (parseFloat(b.weight || '0') || 0)),
        }))
      }))
  }, [filteredProducts])

  // Intersection Observer for scroll spy
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    const observerOptions = {
      root: null,
      rootMargin: isMobile ? '-80px 0px -40% 0px' : '-100px 0px -50% 0px',
      threshold: [0.1, 0.3, 0.5, 0.7]
    }

    const observer = new IntersectionObserver((entries) => {
      // Find the entry with highest intersection ratio
      const visibleEntries = entries.filter(entry => entry.isIntersecting)
      if (visibleEntries.length > 0) {
        const mostVisible = visibleEntries.reduce((prev, current) => 
          current.intersectionRatio > prev.intersectionRatio ? current : prev
        )
        const category = mostVisible.target.getAttribute('data-category')
        if (category && category !== selectedCategory) {
          setSelectedCategory(category)
        }
      }
    }, observerOptions)

    // Observe all category sections
    Object.values(categoryRefs.current).forEach(ref => {
      if (ref) observer.observe(ref)
    })

    // Handle scroll to detect when near bottom (for last category)
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY
      const documentHeight = document.documentElement.scrollHeight
      
      // If we're within 300px of the bottom, select the last category
      if (documentHeight - scrollPosition < 300 && productsByCategory.length > 0) {
        const lastCategory = productsByCategory[productsByCategory.length - 1].category
        if (lastCategory !== selectedCategory) {
          setSelectedCategory(lastCategory)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [productsByCategory, selectedCategory])

  // Auto-scroll filters to show active category
  useEffect(() => {
    const activeButton = filterRefs.current[selectedCategory]
    const container = filterContainerRef.current
    
    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      
      // Calculate the relative position of the button within the scrollable container
      const buttonRelativeLeft = buttonRect.left - containerRect.left + container.scrollLeft
      const buttonWidth = buttonRect.width
      const containerWidth = containerRect.width
      
      // Calculate the position to center the button
      const targetScroll = buttonRelativeLeft - (containerWidth / 2) + (buttonWidth / 2)
      
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      })
    }
  }, [selectedCategory])

  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    if (!isAuthenticated) {
      window.location.href = '/ecommerce/login'
      return
    }

    setAddingToCart(product.id)
    try {
      addToCart(product, quantity)
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

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    if (category === 'Todos') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const element = categoryRefs.current[category]
      if (element) {
        const headerOffset = 120 // Height of sticky header
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      {/* Promotions Carousel */}
      <div className="relative bg-white pt-4 pb-4">
        <div className="px-4">
          <div className="relative h-40 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100">
            {PROMOTIONS.map((promo, index) => (
              <div
                key={promo.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentPromotion ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={`${promo.imageUrl}?v=${imageCacheKey}`}
                  alt={promo.title}
                  className="w-full h-full object-cover"
                />
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
      <div className="w-full flex flex-col px-4">
        {/* Fixed Header - Search Bar and Category Filters */}
        <div className="sticky top-0 z-30 bg-white -mx-4 px-4">
          <div className="py-2">
            <div ref={filterContainerRef} className="flex gap-2 items-center overflow-x-auto pb-2">
              {/* Search Bar */}
              <div className="relative flex-shrink-0 w-40 sm:w-64">
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
                    ref={(el) => filterRefs.current[category] = el}
                    onClick={() => handleCategoryClick(category)}
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
          </div>
        </div>

        {/* Products Container */}
        <div className="py-3">
          {/* Products by Category */}
          {productsByCategory.length > 0 ? (
            <div className="space-y-8">
              {productsByCategory.map((categoryGroup) => (
                <div
                  key={categoryGroup.category}
                  ref={(el) => categoryRefs.current[categoryGroup.category] = el}
                  data-category={categoryGroup.category}
                  className="scroll-mt-32"
                >
                  {/* Category Title */}
                  <h2 className="text-2xl font-bold text-[#27282E] mb-4 px-1">
                    {categoryGroup.category}
                  </h2>

                  {/* Products Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 px-0">
                    {categoryGroup.products.map((group) => (
                      <ProductVariant
                        key={group.name}
                        name={group.name}
                        subcategory={categoryGroup.category}
                        variants={group.variants}
                        onAddToCart={handleAddToCart}
                        isAuthenticated={isAuthenticated}
                      />
                    ))}
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


        {/* Cart Button (Sticky) */}
        <div className="fixed top-4 right-4 sm:top-8 sm:right-8 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-[#DFD860] text-[#27282E] rounded-lg p-2 sm:p-4 shadow-lg hover:bg-yellow-300 transition relative"
            title="Ver carrito"
          >
            <ShoppingCart className="w-5 sm:w-6 h-5 sm:h-6" />
          </button>
          {cart.itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-[#27282E] text-[#DFD860] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
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
