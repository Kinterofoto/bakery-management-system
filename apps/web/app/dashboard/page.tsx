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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                PastryApp
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                Sistema integral de gestión empresarial
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role?.replace('_', ' ')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {availableModules.length > 0 ? (
          <>
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                Selecciona un módulo
              </h2>
              <p className="text-gray-600 text-sm md:text-base">
                Elige el sistema que necesitas para comenzar a trabajar
              </p>
            </div>

            {/* Module Grid - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {availableModules.map((module) => {
                const IconComponent = module.icon
                return (
                  <Link key={module.id} href={module.href}>
                    <Card className="transition-all duration-200 cursor-pointer border-2 border-transparent hover:shadow-lg group">
                      <CardContent className="p-6 text-center">
                        <div className={`inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full ${module.bgColor} group-hover:scale-110 transition-transform duration-200 mb-4`}>
                          <IconComponent className="h-6 w-6 md:h-8 md:w-8 text-white" />
                        </div>
                        <h3 className={`text-base md:text-lg font-semibold text-gray-900 group-hover:${module.textColor} transition-colors duration-200 mb-2`}>
                          {module.title}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                          {module.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12 md:py-20">
            <div className="mx-auto w-16 h-16 md:w-24 md:h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 md:mb-8">
              <LogOut className="h-8 w-8 md:h-12 md:w-12 text-gray-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Sin acceso a módulos
            </h2>
            <p className="text-gray-600 max-w-md mx-auto text-sm md:text-base">
              Tu usuario no tiene permisos para acceder a ningún módulo del sistema. 
              Contacta al administrador para solicitar los permisos necesarios.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 md:mt-16">
          <p className="text-gray-500 text-sm">
            ¿Necesitas ayuda? Contacta al administrador del sistema.
          </p>
        </div>
      </main>
    </div>
  )
}