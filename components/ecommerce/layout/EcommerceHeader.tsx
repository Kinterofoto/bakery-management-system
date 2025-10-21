"use client"

import Link from 'next/link'
import { ShoppingCart, Menu, X, LogOut, Search, User } from 'lucide-react'
import { useState } from 'react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EcommerceHeaderProps {
  cartItemCount?: number
}

export function EcommerceHeader({ cartItemCount = 0 }: EcommerceHeaderProps) {
  const { customer, isAuthenticated, signOut } = useCustomerAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/ecommerce" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 bg-black rounded-sm flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">SAREN</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8 flex-1">
            <Link href="/ecommerce" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition">
              Home
            </Link>
            <Link href="/ecommerce/catalogo" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition">
              Shop
            </Link>
            {isAuthenticated && (
              <Link href="/ecommerce/pedidos" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition">
                Orders
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center justify-end gap-4">
            {/* Search - Desktop */}
            <div className="hidden lg:flex items-center relative w-48">
              <Input
                type="text"
                placeholder="Search..."
                className="w-full py-2 px-3 text-sm bg-gray-50 border border-gray-300 rounded focus:bg-white focus:border-gray-400 focus:outline-none"
              />
              <Search className="absolute right-3 w-4 h-4 text-gray-400" />
            </div>

            {/* User Account */}
            {isAuthenticated ? (
              <Link href="/ecommerce/perfil" className="hidden sm:flex items-center gap-1 text-gray-700 hover:text-gray-900">
                <User className="w-5 h-5" />
              </Link>
            ) : (
              <Link href="/ecommerce/login" className="hidden sm:block text-sm font-medium text-gray-700 hover:text-gray-900">
                Sign In
              </Link>
            )}

            {/* Cart */}
            <Link href="/ecommerce/carrito" className="relative">
              <ShoppingCart className="w-5 h-5 text-gray-700 hover:text-gray-900 transition" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>

            {/* Logout */}
            {isAuthenticated && (
              <button
                onClick={() => signOut()}
                className="hidden sm:block text-gray-700 hover:text-gray-900 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 -mr-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-3">
            <Link href="/ecommerce" className="block text-sm font-medium text-gray-700 hover:text-gray-900 py-2">
              Home
            </Link>
            <Link href="/ecommerce/catalogo" className="block text-sm font-medium text-gray-700 hover:text-gray-900 py-2">
              Shop
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/ecommerce/pedidos" className="block text-sm font-medium text-gray-700 hover:text-gray-900 py-2">
                  Orders
                </Link>
                <Link href="/ecommerce/perfil" className="block text-sm font-medium text-gray-700 hover:text-gray-900 py-2">
                  Profile
                </Link>
                <button
                  onClick={() => {
                    signOut()
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 py-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/ecommerce/login" className="block text-sm font-medium text-gray-700 hover:text-gray-900 py-2">
                  Sign In
                </Link>
                <Link href="/ecommerce/registro" className="block text-sm font-medium bg-black text-white rounded py-2 px-3 text-center">
                  Create Account
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
