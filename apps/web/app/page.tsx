"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Search, User, Settings as SettingsIcon, Bell } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getMainModules } from "@/lib/modules"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  // Redirect to login if not authenticated, or to ecommerce if client
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && user.role === 'client') {
      router.push('/ecommerce')
    }
  }, [user, loading, router])

  if (loading || !user || user.role === 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"
        />
      </div>
    )
  }

  const availableModules = getMainModules(user)
  const filteredModules = availableModules.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24
      }
    }
  }

  const rawName = (user?.name || 'Usuario').split('@')[0].split(' ')[0]
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()

  return (
    <div className="min-h-screen apple-gradient-bg selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b-0 shadow-none px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
              </div>
              PastryApp
            </h1>

            <div className="hidden md:flex items-center bg-black/5 rounded-full px-4 py-1.5 gap-2 border border-black/5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-300">
              <Search className="w-4 h-4 text-black/40" />
              <input
                type="text"
                placeholder="Buscar módulo..."
                className="bg-transparent border-none outline-none text-sm w-64 placeholder:text-black/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2.5 rounded-full hover:bg-black/5 transition-colors relative">
              <Bell className="w-5 h-5 text-black/70" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-[1px] bg-black/10 mx-1" />
            <div className="flex items-center gap-3 pl-1">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-black leading-none">{userName}</p>
                <p className="text-[11px] text-black/50 font-medium uppercase tracking-wider mt-1">
                  {user.role?.replace('_', ' ')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden border-2 border-white">
                <User className="w-5 h-5" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="rounded-full hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        {/* Welcome Section */}
        <header className="mb-14">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight mb-3">
              Hola, {userName}
            </h2>
            <p className="text-lg text-black/50 font-medium">
              ¿Qué vamos a gestionar hoy?
            </p>
          </motion.div>
        </header>

        {/* Modules Grid */}
        <AnimatePresence mode="wait">
          {filteredModules.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10"
            >
              {filteredModules.map((module) => {
                const IconComponent = module.icon
                return (
                  <motion.div key={module.id} variants={item}>
                    <Link href={module.href} className="group block">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center",
                          "squircle shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]",
                          "transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05] group-active:scale-95",
                          "overflow-hidden"
                        )}>
                          {/* Background Glow */}
                          <div className={cn(
                            "absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity duration-500",
                            module.bgColor || "bg-blue-500"
                          )} />

                          {/* Dynamic Pattern/Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

                          {/* Icon */}
                          <IconComponent className="relative w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-lg" />
                        </div>

                        <div className="mt-4 text-center">
                          <h3 className="text-sm sm:text-base font-bold text-black group-hover:text-blue-600 transition-colors duration-200 line-clamp-1">
                            {module.title}
                          </h3>
                          <p className="hidden md:block text-[10px] text-black/40 font-semibold uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                            Abrir Módulo
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}

              {/* Settings Module (Always visible but at the end) */}
              {user.role === 'super_admin' && (
                <motion.div variants={item}>
                  <Link href="/configuracion" className="group block">
                    <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center squircle bg-slate-100 border border-slate-200 group-hover:bg-slate-200 transition-all duration-500 group-hover:scale-[1.05] group-active:scale-95">
                        <SettingsIcon className="w-10 h-10 text-slate-400 group-hover:text-slate-600 transition-colors duration-500" />
                      </div>
                      <div className="mt-4 text-center">
                        <h3 className="text-sm sm:text-base font-bold text-slate-600 group-hover:text-black">
                          Ajustes
                        </h3>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/5 mb-6">
                <Search className="w-8 h-8 text-black/20" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">No se encontraron módulos</h3>
              <p className="text-black/40">Intenta buscar con otros términos.</p>
              <Button
                variant="outline"
                className="mt-6 rounded-full px-6"
                onClick={() => setSearchQuery("")}
              >
                Ver todos los módulos
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quick Launch / Dock Style Footer (Optional) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass px-6 py-3 rounded-3xl flex items-center gap-6 shadow-2xl border-white/40">
          {/* Add a few frequent actions here if needed */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-black/30 uppercase tracking-widest">
            PastryApp v2.0
          </div>
        </div>
      </div>
    </div>
  )
}
