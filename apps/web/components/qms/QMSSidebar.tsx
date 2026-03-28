"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  LayoutDashboard,
  Settings,
  Droplets,
  Recycle,
  SprayCan,
  Bug,
  ClipboardCheck,
  ChevronRight,
  LogOut,
  Home,
  ShieldCheck
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
    href: "/qms",
    icon: <LayoutDashboard className="w-5 h-5" />,
    color: "text-teal-500"
  },
  {
    label: "Agua Potable",
    href: "/qms/agua-potable",
    icon: <Droplets className="w-5 h-5" />,
    color: "text-cyan-500"
  },
  {
    label: "Residuos",
    href: "/qms/residuos",
    icon: <Recycle className="w-5 h-5" />,
    color: "text-green-500"
  },
  {
    label: "Limpieza y Des.",
    href: "/qms/limpieza",
    icon: <SprayCan className="w-5 h-5" />,
    color: "text-purple-500"
  },
  {
    label: "Control Plagas",
    href: "/qms/plagas",
    icon: <Bug className="w-5 h-5" />,
    color: "text-orange-500"
  },
  {
    label: "Auditorias",
    href: "/qms/auditorias",
    icon: <ClipboardCheck className="w-5 h-5" />,
    color: "text-rose-500"
  },
]

export function QMSSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  const { signOut } = useAuth()
  const isMobile = useIsMobile()

  const isActive = (href: string) => {
    if (href === "/qms") return pathname === "/qms"
    return pathname.startsWith(href)
  }

  if (isMobile) {
    return (
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40",
          "bg-white/80 dark:bg-black/70 backdrop-blur-2xl",
          "border-t border-gray-200/30 dark:border-white/10",
          "shadow-[0_-8px_32px_rgba(0,0,0,0.08)]"
        )}
      >
        <div className="flex overflow-x-auto scrollbar-hide px-1.5 py-2 gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[60px] px-2.5 py-2 rounded-2xl",
                "transition-all duration-300 ease-out",
                isActive(item.href)
                  ? "bg-white dark:bg-white/15 shadow-[0_2px_12px_rgba(0,0,0,0.08)] scale-[1.02]"
                  : "hover:bg-gray-100/60 dark:hover:bg-white/10 active:scale-95"
              )}
            >
              <div className={cn(
                "transition-transform duration-300",
                isActive(item.href) ? "scale-110" : "",
                item.color
              )}>
                {item.icon}
              </div>
              <span className={cn(
                "text-[9px] mt-1 font-semibold whitespace-nowrap tracking-tight",
                isActive(item.href)
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              )}>
                {item.label}
              </span>
            </Link>
          ))}

          <button
            onClick={signOut}
            className={cn(
              "flex flex-col items-center justify-center min-w-[60px] px-2.5 py-2 rounded-2xl",
              "transition-all duration-300 ease-out active:scale-95",
              "hover:bg-red-50/80 dark:hover:bg-red-500/20",
              "text-gray-400 hover:text-red-500"
            )}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[9px] mt-1 font-semibold whitespace-nowrap">Salir</span>
          </button>
        </div>

        {/* Safe area spacer for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    )
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen",
        "bg-white/60 dark:bg-black/40 backdrop-blur-2xl",
        "border-r border-white/20 dark:border-white/10",
        "shadow-[4px_0_24px_rgba(0,0,0,0.04)]",
        "transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-40",
        isExpanded ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header */}
      <div className="h-16 flex items-center border-b border-black/[0.04] dark:border-white/10 px-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-300 w-full",
            "hover:bg-black/[0.04] dark:hover:bg-white/10",
            "active:scale-[0.97]",
            "text-teal-500"
          )}
          title="Volver a módulos"
        >
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
              QMS Calidad
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-300",
              "hover:bg-black/[0.04] dark:hover:bg-white/10",
              "active:scale-[0.97]",
              isActive(item.href)
                ? "bg-black/[0.06] dark:bg-white/12 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <div className={cn(
              "flex-shrink-0 transition-transform duration-300",
              isActive(item.href) ? "scale-110" : "",
              item.color
            )}>
              {item.icon}
            </div>
            {isExpanded && (
              <>
                <span className={cn(
                  "text-[13px] font-medium flex-1 tracking-tight",
                  isActive(item.href)
                    ? "text-gray-900 dark:text-white font-semibold"
                    : "text-gray-600 dark:text-gray-300"
                )}>
                  {item.label}
                </span>
                {isActive(item.href) && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                )}
              </>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-black/[0.04] dark:border-white/10 p-3">
        <Link
          href="/"
          className={cn(
            "w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-300 mb-1",
            "hover:bg-black/[0.04] dark:hover:bg-white/10",
            "active:scale-[0.97]",
            "text-gray-400 dark:text-gray-500"
          )}
          title="Volver a módulos"
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-[13px] font-medium text-gray-500">
              Módulos
            </span>
          )}
        </Link>
        <button
          onClick={signOut}
          className={cn(
            "w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-300",
            "hover:bg-red-500/8 dark:hover:bg-red-500/15",
            "active:scale-[0.97]",
            "text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
          )}
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-[13px] font-medium">
              Salir
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
