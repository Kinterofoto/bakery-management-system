'use client'

import Link from 'next/link'
import { ShoppingBag, Package, User, LogOut, Menu, X } from 'lucide-react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface EcommerceSidebarProps {
  cartItemCount?: number
}

export function EcommerceSidebar({ cartItemCount = 0 }: EcommerceSidebarProps) {
  const { isAuthenticated, signOut } = useCustomerAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen bg-[#27282E] flex-col items-center py-8 gap-8 transition-all duration-300 ${
        isOpen ? 'w-20' : 'w-0'
      } overflow-hidden`}>
        {/* Logo */}
        <Link href="/ecommerce" className="flex items-center justify-center">
          <div className="w-10 h-10 bg-[#DFD860] rounded-sm flex items-center justify-center hover:scale-110 transition">
            <span className="text-[#27282E] font-bold text-lg">P</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-6 flex-1">
          {/* Tienda */}
          <Link
            href="/ecommerce"
            className={`p-3 rounded-lg transition ${
              isActive('/ecommerce')
                ? 'bg-[#DFD860] text-[#27282E]'
                : 'text-white hover:bg-gray-700'
            }`}
            title="Tienda"
          >
            <ShoppingBag className="w-6 h-6" />
          </Link>

          {/* Órdenes */}
          {isAuthenticated && (
            <Link
              href="/ecommerce/pedidos"
              className={`p-3 rounded-lg transition ${
                isActive('/ecommerce/pedidos')
                  ? 'bg-[#DFD860] text-[#27282E]'
                  : 'text-white hover:bg-gray-700'
              }`}
              title="Órdenes"
            >
              <Package className="w-6 h-6" />
            </Link>
          )}

          {/* Perfil */}
          {isAuthenticated && (
            <Link
              href="/ecommerce/perfil"
              className={`p-3 rounded-lg transition ${
                isActive('/ecommerce/perfil')
                  ? 'bg-[#DFD860] text-[#27282E]'
                  : 'text-white hover:bg-gray-700'
              }`}
              title="Perfil"
            >
              <User className="w-6 h-6" />
            </Link>
          )}
        </nav>

        {/* Logout */}
        {isAuthenticated && (
          <button
            onClick={() => signOut()}
            className="p-3 rounded-lg text-white hover:bg-gray-700 transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-6 h-6" />
          </button>
        )}

        {/* Login */}
        {!isAuthenticated && (
          <Link
            href="/ecommerce/login"
            className="p-3 rounded-lg text-white hover:bg-gray-700 transition"
            title="Iniciar sesión"
          >
            <User className="w-6 h-6" />
          </Link>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 rounded-lg text-white hover:bg-gray-700 transition mt-auto"
          title={isOpen ? 'Contraer' : 'Expandir'}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </aside>

      {/* Toggle Button when collapsed - Desktop */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="hidden md:flex fixed left-0 top-0 z-40 mt-8 ml-2 p-2 rounded-lg bg-[#27282E] text-white hover:bg-gray-700 transition"
          title="Expandir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#27282E] border-t border-gray-700 flex justify-around items-center h-16">
        {/* Tienda */}
        <Link
          href="/ecommerce"
          className={`flex items-center justify-center w-16 h-16 transition ${
            isActive('/ecommerce')
              ? 'bg-[#DFD860] text-[#27282E]'
              : 'text-white hover:bg-gray-700'
          }`}
          title="Tienda"
        >
          <ShoppingBag className="w-6 h-6" />
        </Link>

        {/* Órdenes */}
        {isAuthenticated && (
          <Link
            href="/ecommerce/pedidos"
            className={`flex items-center justify-center w-16 h-16 transition ${
              isActive('/ecommerce/pedidos')
                ? 'bg-[#DFD860] text-[#27282E]'
                : 'text-white hover:bg-gray-700'
            }`}
            title="Órdenes"
          >
            <Package className="w-6 h-6" />
          </Link>
        )}

        {/* Perfil */}
        {isAuthenticated && (
          <Link
            href="/ecommerce/perfil"
            className={`flex items-center justify-center w-16 h-16 transition ${
              isActive('/ecommerce/perfil')
                ? 'bg-[#DFD860] text-[#27282E]'
                : 'text-white hover:bg-gray-700'
            }`}
            title="Perfil"
          >
            <User className="w-6 h-6" />
          </Link>
        )}

        {/* Login/Logout */}
        {isAuthenticated ? (
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center w-16 h-16 text-white hover:bg-gray-700 transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-6 h-6" />
          </button>
        ) : (
          <Link
            href="/ecommerce/login"
            className="flex items-center justify-center w-16 h-16 text-white hover:bg-gray-700 transition"
            title="Iniciar sesión"
          >
            <User className="w-6 h-6" />
          </Link>
        )}
      </nav>
    </>
  )
}
