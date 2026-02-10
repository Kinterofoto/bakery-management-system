"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { getMainModules } from "@/lib/modules"
import Link from "next/link"

export default function HomePage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated, or to ecommerce if client
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirectTo=/dashboard')
    } else if (!loading && user && user.role === 'client') {
      // Auto-redirect clients to e-commerce
      router.push('/ecommerce')
    }
  }, [user, loading, router])

  // Show loading while redirecting or authenticating
  if (loading || !user || user.role === 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Get main modules for the dashboard based on user permissions
  const availableModules = getMainModules(user)

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              🧪 PastryApp - Worktree Test
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role?.replace('_', ' ')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        {availableModules.length > 0 ? (
          <>
            {/* Module Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {availableModules.map((module) => {
                const IconComponent = module.icon
                return (
                  <Link key={module.id} href={module.href}>
                    <Card className="transition-all duration-300 cursor-pointer border border-gray-200/60 bg-white hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 group rounded-2xl">
                      <CardContent className="p-5 md:p-6 flex flex-col items-center text-center">
                        <div className={`inline-flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-2xl ${module.bgColor} group-hover:scale-105 transition-transform duration-300 mb-3`}>
                          <IconComponent className="h-5 w-5 md:h-7 md:w-7 text-white" />
                        </div>
                        <h3 className="text-sm md:text-[15px] font-medium text-gray-900 leading-tight">
                          {module.title}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-16 md:py-24">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-2xl flex items-center justify-center mb-6">
              <LogOut className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
              Sin acceso a módulos
            </h2>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">
              Contacta al administrador para solicitar los permisos necesarios.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}