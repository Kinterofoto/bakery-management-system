"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useCustomerAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await signIn(email, password)
      
      if (!error) {
        router.push('/ecommerce/catalogo')
      }
    } catch (err) {
      toast.error('Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Inicia Sesión</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-700">
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={isLoading}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-700">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="mt-2"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2"
          >
            {isLoading ? 'Iniciando sesión...' : 'Ingresar'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-gray-600 text-center mb-4">
            ¿No tienes cuenta?
          </p>
          <Link href="/ecommerce/registro">
            <Button
              variant="outline"
              className="w-full text-amber-600 border-amber-600 hover:bg-amber-50"
            >
              Crear Cuenta
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Información</h3>
        <p className="text-sm text-blue-700">
          Inicia sesión con tu cuenta para navegar el catálogo completo, ver precios especiales y realizar pedidos.
        </p>
      </div>
    </div>
  )
}
