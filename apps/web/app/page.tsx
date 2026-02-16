"use client"

import { Button } from "@/components/ui/button"
import { LogOut, User, Bell } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { getMainModules } from "@/lib/modules"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

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
          className="rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-800"
        />
      </div>
    )
  }

  const availableModules = getMainModules(user)

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
    <div className="min-h-screen bg-gray-50 selection:bg-gray-200 selection:text-gray-900 font-sans">
      {/* Navigation Bar */}
      <nav className="fixed top-4 left-4 right-4 z-50">
        <div className="max-w-7xl mx-auto glass px-6 py-3 rounded-3xl shadow-2xl border-white/40 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
            <img src="/logo_recortado.png" alt="PastryApp" className="h-10 w-auto" />
          </h1>

          <div className="flex items-center gap-3">
            <button className="p-2.5 rounded-full hover:bg-black/5 transition-colors relative">
              <Bell className="w-5 h-5 text-black/70" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-gray-800 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-[1px] bg-black/10 mx-1" />
            <div className="flex items-center gap-3 pl-1">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-black leading-none">{userName}</p>
                <p className="text-[11px] text-black/50 font-medium uppercase tracking-wider mt-1">
                  {user.role?.replace('_', ' ')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden border-2 border-white">
                <User className="w-5 h-5" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="rounded-full hover:bg-gray-100 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        {/* Welcome Section */}
        <header className="mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
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
        {availableModules.length > 0 && (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10 justify-items-center"
            >
              {availableModules.map((module) => {
                const IconComponent = module.icon
                return (
                  <motion.div key={module.id} variants={item}>
                    <Link href={module.href} className="group block">
                      <div className="flex flex-col items-center w-24 sm:w-28">
                        <div className={cn(
                          "relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center",
                          "squircle shadow-[0_8px_24px_-4px_rgba(0,0,0,0.15)] group-hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.25)]",
                          "transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05] group-active:scale-95",
                          "overflow-hidden",
                          module.bgColor || "bg-gradient-to-br from-blue-500 to-blue-700"
                        )}>
                          {/* Icon */}
                          <IconComponent className="relative w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md" />
                        </div>

                        <div className="mt-4 text-center">
                          <h3 className="text-sm sm:text-base font-bold text-gray-800 group-hover:text-black transition-colors duration-200 line-clamp-1">
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
            </motion.div>
        )}
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
