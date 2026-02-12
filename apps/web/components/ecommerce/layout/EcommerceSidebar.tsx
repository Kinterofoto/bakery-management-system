'use client'

import Link from 'next/link'
import { ShoppingBag, Package, User, LogOut, Search, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { useEcommerceSearch } from '@/contexts/EcommerceSearchContext'
import { useRef, useEffect } from 'react'

interface EcommerceSidebarProps {
  cartItemCount?: number
}

export function EcommerceSidebar({ cartItemCount = 0 }: EcommerceSidebarProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = !!user
  const { isSearchOpen, setIsSearchOpen, searchTerm, setSearchTerm } = useEcommerceSearch()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  const handleCloseSearch = () => {
    setIsSearchOpen(false)
    setSearchTerm('')
  }

  return (
    <>
      {/* Desktop Sidebar - Always Collapsed with Browser Tooltips */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 bg-[#27282E] flex-col items-center py-8 gap-8 z-50">
        {/* Logo */}
        <Link href="/ecommerce" className="flex items-center justify-center" title="Inicio">
          <div className="w-12 h-12 rounded-sm flex items-center justify-center hover:scale-110 transition cursor-pointer overflow-hidden">
            <img
              src="/Logo_Pastry-06 2.jpg"
              alt="Pastry Industrial"
              className="w-full h-full object-cover"
            />
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-6 flex-1">
          {/* Tienda */}
          <Link
            href="/ecommerce"
            title="Tienda"
            className={`p-3 rounded-lg transition cursor-pointer ${
              isActive('/ecommerce')
                ? 'bg-[#DFD860] text-[#27282E]'
                : 'text-white hover:bg-gray-700'
            }`}
          >
            <ShoppingBag className="w-6 h-6" />
          </Link>

          {/* Órdenes */}
          {isAuthenticated && (
            <Link
              href="/ecommerce/pedidos"
              title="Órdenes"
              className={`p-3 rounded-lg transition cursor-pointer ${
                isActive('/ecommerce/pedidos')
                  ? 'bg-[#DFD860] text-[#27282E]'
                  : 'text-white hover:bg-gray-700'
              }`}
            >
              <Package className="w-6 h-6" />
            </Link>
          )}

          {/* Perfil */}
          {isAuthenticated && (
            <Link
              href="/ecommerce/perfil"
              title="Perfil"
              className={`p-3 rounded-lg transition cursor-pointer ${
                isActive('/ecommerce/perfil')
                  ? 'bg-[#DFD860] text-[#27282E]'
                  : 'text-white hover:bg-gray-700'
              }`}
            >
              <User className="w-6 h-6" />
            </Link>
          )}
        </nav>

        {/* Logout */}
        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            title="Cerrar sesión"
            className="p-3 rounded-lg text-white hover:bg-gray-700 transition cursor-pointer"
          >
            <LogOut className="w-6 h-6" />
          </button>
        )}

        {/* Login */}
        {!isAuthenticated && (
          <Link
            href="/ecommerce/login"
            title="Iniciar sesión"
            className="p-3 rounded-lg text-white hover:bg-gray-700 transition cursor-pointer"
          >
            <User className="w-6 h-6" />
          </Link>
        )}
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#27282E] border-t border-gray-700 z-50 transition-all duration-300">
        {isSearchOpen ? (
          /* Search mode: input + close circle */
          <div className="flex items-center h-12 px-3 gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-full pl-9 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#DFD860]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
            {/* Close circle button */}
            <button
              onClick={handleCloseSearch}
              className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 active:bg-gray-500 transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          /* Normal nav mode */
          <div className="flex justify-around items-center h-12">
            {/* Tienda */}
            <Link
              href="/ecommerce"
              className={`flex items-center justify-center flex-1 h-12 transition ${
                isActive('/ecommerce')
                  ? 'bg-[#DFD860] text-[#27282E]'
                  : 'text-white hover:bg-gray-700'
              }`}
              title="Tienda"
            >
              <ShoppingBag className="w-5 h-5" />
            </Link>

            {/* Buscar */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-center flex-1 h-12 text-white hover:bg-gray-700 transition"
              title="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Órdenes */}
            {isAuthenticated && (
              <Link
                href="/ecommerce/pedidos"
                className={`flex items-center justify-center flex-1 h-12 transition ${
                  isActive('/ecommerce/pedidos')
                    ? 'bg-[#DFD860] text-[#27282E]'
                    : 'text-white hover:bg-gray-700'
                }`}
                title="Órdenes"
              >
                <Package className="w-5 h-5" />
              </Link>
            )}

            {/* Perfil */}
            {isAuthenticated && (
              <Link
                href="/ecommerce/perfil"
                className={`flex items-center justify-center flex-1 h-12 transition ${
                  isActive('/ecommerce/perfil')
                    ? 'bg-[#DFD860] text-[#27282E]'
                    : 'text-white hover:bg-gray-700'
                }`}
                title="Perfil"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            {/* Login/Logout */}
            {isAuthenticated ? (
              <button
                onClick={() => signOut()}
                className="flex items-center justify-center flex-1 h-12 text-white hover:bg-gray-700 transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <Link
                href="/ecommerce/login"
                className="flex items-center justify-center flex-1 h-12 text-white hover:bg-gray-700 transition"
                title="Iniciar sesión"
              >
                <User className="w-5 h-5" />
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
