"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard,
  Settings,
  Calculator,
  Package,
  ChevronRight,
  LogOut,
  Home,
  Inbox,
  BarChart3,
  TrendingUp,
  ArrowLeftRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  color: string
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/compras",
    icon: <LayoutDashboard className="w-5 h-5" />,
    color: "text-blue-500"
  },
  {
    label: "Parametrización",
    href: "/compras/parametrizacion",
    icon: <Settings className="w-5 h-5" />,
    color: "text-purple-500"
  },
  {
    label: "Explosión",
    href: "/compras/explosion",
    icon: <Calculator className="w-5 h-5" />,
    color: "text-green-500"
  },
  {
    label: "Órdenes",
    href: "/compras/ordenes",
    icon: <Package className="w-5 h-5" />,
    color: "text-orange-500"
  },
  {
    label: "Recepción",
    href: "/compras/recepcion",
    icon: <Inbox className="w-5 h-5" />,
    color: "text-cyan-500"
  },
  {
    label: "Traslados",
    href: "/compras/traslados",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-blue-500"
  },
  {
    label: "Inventarios",
    href: "/compras/inventarios",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "text-indigo-500"
  },
  {
    label: "Movimientos",
    href: "/compras/movimientos",
    icon: <ArrowLeftRight className="w-5 h-5" />,
    color: "text-pink-500"
  }
]

export function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  const { signOut } = useAuth()

  const isActive = (href: string) => {
    if (href === "/compras") {
      return pathname === "/compras"
    }
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white/70 dark:bg-black/50 backdrop-blur-xl",
        "border-r border-white/20 dark:border-white/10 shadow-lg shadow-black/5",
        "transition-all duration-300 z-40",
        isExpanded ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header - Home Button */}
      <div className="h-16 flex items-center border-b border-white/10 px-4">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 w-full",
            "hover:bg-white/50 dark:hover:bg-white/10",
            "text-cyan-500"
          )}
          title="Volver a módulos"
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Módulos
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
              "hover:bg-white/50 dark:hover:bg-white/10",
              isActive(item.href)
                ? "bg-white/50 dark:bg-white/10 shadow-md"
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            <div className={cn("flex-shrink-0", item.color)}>
              {item.icon}
            </div>
            {isExpanded && (
              <>
                <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                  {item.label}
                </span>
                {isActive(item.href) && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer - Logout Button */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={signOut}
          className={cn(
            "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
            "hover:bg-red-500/10 dark:hover:bg-red-500/20",
            "text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          )}
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-sm font-medium">
              Salir
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
