'use client'

import Link from 'next/link'
import { ShoppingBag, Package, User, LogOut } from 'lucide-react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { usePathname } from 'next/navigation'

interface EcommerceSidebarProps {
  cartItemCount?: number
}

export function EcommerceSidebar({ cartItemCount = 0 }: EcommerceSidebarProps) {
  const { isAuthenticated, signOut } = useCustomerAuth()
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 bg-[#27282E] flex-col items-center py-8 gap-8">
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
      </aside>

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
