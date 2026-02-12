"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Search, User, Settings as SettingsIcon, Bell, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { getMainModules, type MainModuleConfig } from "@/lib/modules"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// Module category mapping for grouped layout
const MODULE_CATEGORIES: Record<string, { label: string; order: number }> = {
  'crm': { label: 'Ventas & Clientes', order: 1 },
  'clients': { label: 'Ventas & Clientes', order: 1 },
  'ecommerce': { label: 'Ventas & Clientes', order: 1 },
  'order-management': { label: 'Pedidos', order: 2 },
  'production': { label: 'Produccion', order: 3 },
  'planmaster': { label: 'Produccion', order: 3 },
  'inventory': { label: 'Inventario & Almacen', order: 4 },
  'kardex': { label: 'Inventario & Almacen', order: 4 },
  'recepcion-pt': { label: 'Inventario & Almacen', order: 4 },
  'nucleo': { label: 'Inventario & Almacen', order: 4 },
  'compras': { label: 'Logistica', order: 5 },
  'store-visits': { label: 'Logistica', order: 5 },
  'hr': { label: 'Administracion', order: 6 },
  'global-settings': { label: 'Administracion', order: 6 },
}

// Warm accent colors for module icons on dark bg
const MODULE_ICON_STYLES: Record<string, string> = {
  'crm': 'from-amber-500 to-orange-600',
  'clients': 'from-amber-400 to-yellow-600',
  'ecommerce': 'from-orange-400 to-red-500',
  'order-management': 'from-emerald-400 to-teal-600',
  'production': 'from-sky-400 to-blue-600',
  'planmaster': 'from-indigo-400 to-violet-600',
  'inventory': 'from-lime-400 to-emerald-600',
  'kardex': 'from-stone-400 to-stone-600',
  'recepcion-pt': 'from-cyan-400 to-teal-600',
  'nucleo': 'from-rose-400 to-pink-600',
  'compras': 'from-yellow-400 to-amber-600',
  'store-visits': 'from-teal-400 to-cyan-600',
  'hr': 'from-violet-400 to-purple-600',
  'global-settings': 'from-stone-400 to-zinc-600',
}

function groupModules(modules: MainModuleConfig[]) {
  const groups: Record<string, MainModuleConfig[]> = {}
  const groupOrder: Record<string, number> = {}

  for (const mod of modules) {
    const cat = MODULE_CATEGORIES[mod.id]
    const label = cat?.label || 'Otros'
    const order = cat?.order || 99

    if (!groups[label]) {
      groups[label] = []
      groupOrder[label] = order
    }
    groups[label].push(mod)
  }

  return Object.entries(groups)
    .sort(([a], [b]) => (groupOrder[a] || 99) - (groupOrder[b] || 99))
    .map(([label, mods]) => ({ label, modules: mods }))
}

export default function HomePage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && user.role === 'client') {
      router.push('/ecommerce')
    }
  }, [user, loading, router])

  const availableModules = useMemo(() => {
    if (!user) return []
    return getMainModules(user)
  }, [user])

  const filteredModules = useMemo(() => {
    if (!searchQuery) return availableModules
    const q = searchQuery.toLowerCase()
    return availableModules.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    )
  }, [availableModules, searchQuery])

  const groupedModules = useMemo(() => groupModules(filteredModules), [filteredModules])

  if (loading || !user || user.role === 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center workshop-bg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-amber-800/30 border-t-amber-500"
        />
      </div>
    )
  }

  const userName = user?.name || 'Usuario'
  const greeting = getGreeting()

  return (
    <div className="min-h-screen workshop-bg workshop-grain selection:bg-amber-500/20 selection:text-amber-200">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 workshop-nav">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow duration-300">
                <div className="w-4 h-4 bg-white/90 rounded-[3px] rotate-45" />
              </div>
              <span className="text-lg font-semibold text-white/90 tracking-tight hidden sm:block">
                PastryApp
              </span>
            </Link>

            {/* Search */}
            <div className="hidden md:flex items-center workshop-search rounded-xl px-4 py-2.5 gap-2.5">
              <Search className="w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Buscar modulo..."
                className="bg-transparent border-none outline-none text-sm w-56 text-white/80 placeholder:text-white/25 font-light"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* User */}
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-xl hover:bg-white/5 transition-colors relative">
              <Bell className="w-[18px] h-[18px] text-white/40" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
            </button>
            <div className="h-6 w-px bg-white/8 mx-2" />
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white/80 leading-none">{userName}</p>
                <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mt-1">
                  {user.role?.replace('_', ' ')}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-white/60 overflow-hidden">
                <User className="w-4 h-4" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="rounded-xl hover:bg-red-500/10 text-white/30 hover:text-red-400 h-9 w-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-24">
        {/* Hero Section */}
        <header className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          >
            <p className="text-amber-500/70 text-sm font-medium tracking-widest uppercase mb-4">
              {greeting}
            </p>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white/95 tracking-tight leading-[1.05]">
              {userName.split(' ')[0]}
            </h2>
            <div className="workshop-divider mt-8 max-w-xs" />
          </motion.div>
        </header>

        {/* Module Groups */}
        <AnimatePresence mode="wait">
          {filteredModules.length > 0 ? (
            <motion.div
              key="modules"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-14"
            >
              {groupedModules.map((group, groupIdx) => (
                <motion.section
                  key={group.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: groupIdx * 0.1,
                    ease: [0.23, 1, 0.32, 1]
                  }}
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-[11px] font-semibold text-white/25 uppercase tracking-[0.2em]">
                      {group.label}
                    </h3>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {/* Module Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.modules.map((module, modIdx) => {
                      const IconComponent = module.icon
                      const gradient = MODULE_ICON_STYLES[module.id] || 'from-stone-400 to-stone-600'

                      return (
                        <motion.div
                          key={module.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: groupIdx * 0.1 + modIdx * 0.05,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                        >
                          <Link href={module.href} className="group block">
                            <div className="workshop-card rounded-2xl p-5 relative overflow-hidden">
                              <div className="workshop-glow" />
                              <div className="relative flex items-start gap-4">
                                {/* Icon */}
                                <div className={cn(
                                  "w-12 h-12 rounded-xl bg-gradient-to-br flex-shrink-0",
                                  "flex items-center justify-center shadow-lg",
                                  gradient
                                )}>
                                  <IconComponent className="w-5 h-5 text-white" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-[15px] font-semibold text-white/85 group-hover:text-amber-400/90 transition-colors duration-300 truncate">
                                      {module.title}
                                    </h4>
                                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-amber-500/50 group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" />
                                  </div>
                                  <p className="text-[13px] text-white/30 mt-1 line-clamp-1 font-light">
                                    {module.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.section>
              ))}

              {/* Settings Module (Super Admin) */}
              {user.role === 'super_admin' && !searchQuery && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: groupedModules.length * 0.1 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-[11px] font-semibold text-white/25 uppercase tracking-[0.2em]">
                      Sistema
                    </h3>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link href="/configuracion" className="group block">
                      <div className="workshop-card rounded-2xl p-5 relative overflow-hidden">
                        <div className="workshop-glow" />
                        <div className="relative flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex-shrink-0 flex items-center justify-center group-hover:border-amber-500/20 transition-colors duration-300">
                            <SettingsIcon className="w-5 h-5 text-white/40 group-hover:text-amber-500/60 transition-colors duration-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-[15px] font-semibold text-white/60 group-hover:text-amber-400/90 transition-colors duration-300">
                                Ajustes del Sistema
                              </h4>
                              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-amber-500/50 group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" />
                            </div>
                            <p className="text-[13px] text-white/20 mt-1 font-light">
                              Configuracion global y parametros
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </motion.section>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/8 mb-6">
                <Search className="w-8 h-8 text-white/15" />
              </div>
              <h3 className="text-xl font-semibold text-white/70 mb-2">No se encontraron modulos</h3>
              <p className="text-white/30 text-sm font-light">Intenta buscar con otros terminos.</p>
              <Button
                variant="outline"
                className="mt-8 rounded-xl px-6 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5 hover:border-white/20"
                onClick={() => setSearchQuery("")}
              >
                Ver todos los modulos
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-6 flex justify-center">
          <div className="pointer-events-auto px-5 py-2 rounded-full bg-white/[0.03] border border-white/[0.04] backdrop-blur-sm">
            <span className="text-[10px] font-medium text-white/15 uppercase tracking-[0.25em]">
              PastryApp v2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos dias'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}
