"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { getNavigationItems } from "@/lib/modules"
import { Menu, X, LogOut, ChevronLeft, ChevronRight } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  // Get dynamic navigation based on user permissions and role
  const navigation = user ? getNavigationItems(user) : []

  if (!user) {
    return null // Don't render sidebar if no user
  }

  return (
    <>
      {/* Mobile buttons - Hamburguesa */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-16" : "w-52"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Collapse Button */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            {!isCollapsed && (
              <Link href="/" onClick={() => setIsOpen(false)} className="text-2xl font-bold text-blue-600 hover:opacity-80 transition-opacity">
                PastryApp
              </Link>
            )}
            {/* Collapse button - only on desktop */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex ml-auto"
              title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <TooltipProvider>
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.length > 0 ? (
                navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.name} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center justify-center p-3 rounded-md transition-colors",
                              isActive
                                ? "bg-blue-100 text-blue-700"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                            )}
                            onClick={() => setIsOpen(false)}
                          >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })
              ) : (
                !isCollapsed && (
                  <div className="px-3 py-8 text-center">
                    <div className="text-sm text-gray-500">
                      No tienes acceso a ningún módulo del sistema Order Management.
                    </div>
                    <Link
                      href="/"
                      className="text-blue-600 hover:text-blue-800 text-sm underline mt-2 block"
                      onClick={() => setIsOpen(false)}
                    >
                      Volver al inicio
                    </Link>
                  </div>
                )
              )}
            </nav>
          </TooltipProvider>

          {/* User info and logout */}
          <div className="p-4 border-t border-gray-200">
            <TooltipProvider>
              {isCollapsed ? (
                <div className="flex flex-col items-center gap-2">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer">
                        <span className="text-white text-sm font-medium">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">{user.name || 'Usuario'}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ') || 'Sin rol'}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="p-2 hover:bg-red-100"
                    title="Cerrar sesión"
                  >
                    <LogOut className="h-4 w-4 text-gray-500 hover:text-red-600" />
                  </Button>
                </div>
              ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize truncate">
                        {user.role?.replace('_', ' ') || 'Sin rol'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="p-1 hover:bg-red-100"
                    title="Cerrar sesión"
                  >
                    <LogOut className="h-4 w-4 text-gray-500 hover:text-red-600" />
                  </Button>
                </div>

                {/* Role info */}
                <div className="mt-2 text-xs text-gray-400">
                  Permisos activos: {Object.entries(user.permissions || {})
                    .filter(([, hasPermission]) => hasPermission)
                    .map(([permission]) => permission)
                    .slice(0, 3)
                    .join(', ')}
                  {Object.entries(user.permissions || {}).filter(([, hasPermission]) => hasPermission).length > 3 && '...'}
                </div>
              </>
            )}
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}