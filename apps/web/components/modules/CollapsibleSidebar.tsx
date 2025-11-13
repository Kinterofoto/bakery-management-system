"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  ChevronRight
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
    label: "Órdenes",
    href: "/compras/ordenes",
    icon: <ShoppingCart className="w-5 h-5" />,
    color: "text-purple-500"
  }
]

export function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
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
      {/* Logo / Header */}
      <div className="h-16 flex items-center justify-center border-b border-white/10">
        {isExpanded ? (
          <span className="text-lg font-bold text-gray-900 dark:text-white">Compras</span>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
        )}
      </div>

      {/* Navigation Items */}
      <nav className="space-y-2 p-4">
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
    </aside>
  )
}
