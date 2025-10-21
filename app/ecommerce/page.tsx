'use client'

import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function EcommerceSarenPage() {
  const { isAuthenticated } = useCustomerAuth()
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: 'Productos Premium',
      subtitle: 'Panificadores de Excelencia',
      image: '🥖',
      description: 'Descubre nuestros ingredientes seleccionados'
    },
    {
      title: 'Materias Primas',
      subtitle: 'Calidad Garantizada',
      image: '🌾',
      description: 'Los mejores productos para tu panadería'
    },
    {
      title: 'Ofertas Especiales',
      subtitle: 'Envío Gratis',
      image: '🎁',
      description: 'Aproveita nuestras promociones'
    }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Slider */}
      <section className="relative bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-24 md:py-32">
          {/* Slider Container */}
          <div className="relative h-96 md:h-[500px] flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-50">
            {/* Slides */}
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 flex flex-col items-center justify-center ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="text-8xl md:text-9xl mb-6">{slide.image}</div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-2">{slide.title}</h1>
                <p className="text-xl md:text-2xl text-gray-600 text-center mb-4">{slide.subtitle}</p>
                <p className="text-gray-500 text-center max-w-md">{slide.description}</p>
              </div>
            ))}

            {/* Navigation Buttons */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-3 rounded-full transition"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-3 rounded-full transition"
            >
              <ChevronRight className="w-6 h-6 text-gray-900" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition ${
                    index === currentSlide ? 'bg-gray-900' : 'bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-12">
            <Link href="/ecommerce/catalogo">
              <Button className="bg-black text-white hover:bg-gray-900 px-8 py-3 font-medium transition">
                Explore All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* Best Sellers Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-gray-500 uppercase letter-spacing">Featured</p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-3">Best Sellers</h2>
          <div className="w-12 h-px bg-gray-900 mx-auto mt-6"></div>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="group">
              {/* Product Image */}
              <div className="bg-gray-100 aspect-square rounded-lg flex items-center justify-center mb-4 overflow-hidden group-hover:shadow-lg transition">
                <div className="text-7xl group-hover:scale-110 transition-transform duration-300">
                  {i % 3 === 0 ? '🥖' : i % 3 === 1 ? '🌾' : '⚗️'}
                </div>
              </div>

              {/* Product Info */}
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-600 transition">
                Product {i}
              </h3>
              <p className="text-sm text-gray-500 mb-4">Category Name</p>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="text-yellow-400">★</div>
                ))}
              </div>

              {/* Price and Action */}
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">$99.99</p>
                <Link href="/ecommerce/catalogo">
                  <Button size="sm" className="bg-black text-white hover:bg-gray-900 text-xs font-medium">
                    Add to Cart
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-gray-500 uppercase letter-spacing">Latest</p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-3">New Arrivals</h2>
          <div className="w-12 h-px bg-gray-900 mx-auto mt-6"></div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="group">
              <div className="bg-gray-100 aspect-square rounded-lg flex items-center justify-center mb-4 relative overflow-hidden group-hover:shadow-lg transition">
                <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
                  {i % 2 === 0 ? '🥖' : '🌾'}
                </div>
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded text-xs font-bold">
                  NEW
                </div>
              </div>

              <h3 className="font-medium text-gray-900 text-sm mb-2">New Product {i}</h3>
              <p className="text-sm text-gray-500 mb-3">$79.99</p>
              <Link href="/ecommerce/catalogo">
                <Button size="sm" variant="outline" className="w-full border-gray-300 text-gray-900 hover:bg-gray-50">
                  View
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gray-900 text-white mt-24">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Order?</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Browse our complete catalog of premium bakery products. Create an account to start ordering today.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/ecommerce/catalogo">
              <Button className="bg-white text-black hover:bg-gray-100 font-semibold px-8 py-3">
                Shop Now
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link href="/ecommerce/registro">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 font-semibold px-8 py-3">
                  Create Account
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
