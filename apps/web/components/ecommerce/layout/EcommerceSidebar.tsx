'use client'

import Link from 'next/link'
import { ShoppingBag, Package, User, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname, useRouter } from 'next/navigation'

interface EcommerceSidebarProps {
  cartItemCount?: number
}

export function EcommerceSidebar({ cartItemCount = 0 }: EcommerceSidebarProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = !!user

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href

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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#27282E] border-t border-gray-700 flex justify-around items-center h-12 z-50">
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
      </nav>
    </>
  )
}
