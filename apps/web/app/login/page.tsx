"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowLeft, CheckCircle, MessageCircle } from "lucide-react"
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetEmailSent, setResetEmailSent] = useState(false)

  const { signIn, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const errorParam = searchParams.get('error')

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      window.location.href = redirectTo
    }
  }, [user, redirectTo])

  // Show error from URL params
  useEffect(() => {
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        user_not_found: 'Usuario no encontrado en el sistema',
        account_inactive: 'Tu cuenta está inactiva. Contacta al administrador.',
        auth_error: 'Error de autenticación. Por favor intenta nuevamente.',
      }
      setError(errorMessages[errorParam] || 'Error desconocido')
    }
  }, [errorParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)

      if (error) {
        let errorMessage = 'Error al iniciar sesión'

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Credenciales incorrectas'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email no confirmado'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Intenta más tarde.'
        }

        setError(errorMessage)
      } else {
        // Success - wait a moment for auth context to update, then redirect
        setTimeout(() => {
          window.location.href = redirectTo
        }, 1000)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Error inesperado. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Por favor ingresa tu correo electrónico')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get the production URL or fallback to window.location.origin
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/reset-password`,
      })

      if (error) {
        setError('Error al enviar el correo de recuperación')
        console.error('Reset password error:', error)
      } else {
        setResetEmailSent(true)
        toast.success('Correo de recuperación enviado')
      }
    } catch (err) {
      console.error('Password reset error:', err)
      setError('Error inesperado. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/logo_recortado.png"
              alt="Pastry Logo"
              className="h-28 w-auto"
            />
          </div>
          {mode === 'forgot' && (
            <p className="text-gray-600">Recupera tu contraseña</p>
          )}
        </div>

        {/* Login/Forgot Password Card */}
        <Card className="w-full shadow-xl border border-gray-100">
          <CardHeader className="space-y-1 bg-gradient-to-r from-[#27282E] to-gray-800 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              {mode === 'forgot' && (
                <button
                  onClick={() => {
                    setMode('login')
                    setResetEmailSent(false)
                    setError('')
                  }}
                  className="text-[#DFD860] hover:text-yellow-300 transition"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <CardTitle className="text-2xl font-bold flex-1 text-center">
                {mode === 'login' ? 'Iniciar Sesión' : 'Recuperar Contraseña'}
              </CardTitle>
              {mode === 'forgot' && <div className="w-5"></div>}
            </div>
            <CardDescription className="text-gray-300 text-center">
              {mode === 'login'
                ? 'Introduce tus credenciales para continuar'
                : 'Te enviaremos un enlace para restablecer tu contraseña'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Success Message for Password Reset */}
            {resetEmailSent && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
                  Revisa tu bandeja de entrada y spam.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#27282E] font-medium">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-[#27282E] focus:ring-[#27282E]"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#27282E] font-medium">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 border-gray-300 focus:border-[#27282E] focus:ring-[#27282E]"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-[#27282E]"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm text-[#27282E] hover:text-gray-700 font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-[#DFD860] hover:bg-yellow-400 text-[#27282E] font-semibold"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#27282E] mr-2" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-[#27282E] font-medium">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-[#27282E] focus:ring-[#27282E]"
                      required
                      disabled={loading || resetEmailSent}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Ingresa el correo asociado a tu cuenta
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-[#DFD860] hover:bg-yellow-400 text-[#27282E] font-semibold"
                  disabled={loading || resetEmailSent}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#27282E] mr-2" />
                      Enviando...
                    </>
                  ) : resetEmailSent ? (
                    'Correo enviado'
                  ) : (
                    'Enviar enlace de recuperación'
                  )}
                </Button>

                {resetEmailSent && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-[#27282E] text-[#27282E] hover:bg-gray-50"
                    onClick={() => setResetEmailSent(false)}
                  >
                    Reenviar correo
                  </Button>
                )}
              </form>
            )}

            {/* Footer */}
            {mode === 'login' && (
              <div className="mt-6 text-center text-sm text-gray-600">
                <p>
                  ¿Problemas para acceder?{' '}
                  <span className="text-[#27282E] font-medium">Contacta al administrador</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Sistema seguro • Autenticación protegida</p>
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/573115259295?text=Hola!%20necesito%20un%20usuario"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105 z-50 group"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">¿Necesitas un usuario?</span>
        <span className="text-sm font-medium sm:hidden">Solicitar usuario</span>
      </a>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#27282E]"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}