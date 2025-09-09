"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { Shield, ArrowLeft, Home, LogOut } from 'lucide-react'

export default function Forbidden() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signOut } = useAuth()
  const [customMessage, setCustomMessage] = useState<string>('')

  useEffect(() => {
    // Obtener mensaje personalizado de los parámetros de búsqueda
    const message = searchParams.get('message')
    if (message) {
      setCustomMessage(decodeURIComponent(message))
    }
  }, [searchParams])

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Acceso Denegado
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p className="text-lg font-semibold">Error 403</p>
            <p className="mt-2">
              No tienes permisos para acceder a esta página.
            </p>
          </div>

          {customMessage && (
            <Alert>
              <AlertDescription>
                {customMessage}
              </AlertDescription>
            </Alert>
          )}

          {user && (
            <div className="bg-gray-100 rounded-lg p-3 text-sm">
              <p><strong>Usuario:</strong> {user.name || user.email}</p>
              <p><strong>Rol:</strong> {user.role}</p>
              <p className="text-xs text-gray-500 mt-1">
                Si crees que esto es un error, contacta al administrador del sistema.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Button 
              onClick={handleGoBack} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
            
            <Button 
              onClick={handleGoHome} 
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Ir al Inicio
            </Button>
            
            <Button 
              onClick={handleSignOut} 
              variant="destructive" 
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>

          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            <p>Panadería Industrial - Sistema de Gestión</p>
            <p>Si necesitas acceso adicional, solicítalo al administrador</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}