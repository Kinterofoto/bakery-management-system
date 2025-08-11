"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ModuleCard } from "@/components/modules/ModuleCard"
import { getAvailableModules } from "@/lib/modules"

export default function HomePage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Get available modules based on user permissions
  const availableModules = getAvailableModules(user)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header with User Info and Logout */}
        <div className="flex justify-between items-start mb-16">
          <div className="text-center flex-1">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Panadería Industrial
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Sistema integral de gestión empresarial. Selecciona el módulo que necesitas utilizar.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-sm text-gray-600">Bienvenido,</p>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
              <div className="text-xs text-blue-600 mt-1">
                {Object.entries(user.permissions || {})
                  .filter(([, hasPermission]) => hasPermission)
                  .map(([permission]) => permission)
                  .join(', ') || 'Sin permisos'}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Module Selection Cards - Dynamic based on permissions */}
        {availableModules.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {availableModules.map((module) => (
              <ModuleCard
                key={module.id}
                title={module.title}
                description={module.description}
                href={module.href}
                icon={module.icon}
                bgColor={module.bgColor}
                hoverColor={module.hoverColor}
                borderColor={module.borderColor}
                textColor={module.textColor}
                features={module.features}
                variant={module.variant}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-8">
              <LogOut className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sin acceso a módulos
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Tu usuario no tiene permisos para acceder a ningún módulo del sistema. 
              Contacta al administrador para solicitar los permisos necesarios.
            </p>
          </div>
        )}

        {/* Bottom Info */}
        <div className="text-center mt-16">
          <p className="text-gray-500">
            ¿Necesitas ayuda? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}