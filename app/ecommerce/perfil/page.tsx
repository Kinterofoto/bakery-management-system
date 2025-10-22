'use client'

import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useEffect } from 'react'

export default function PerfilPage() {
  const { isAuthenticated, customer, signOut } = useCustomerAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/ecommerce/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !customer) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[#27282E] mb-2">Mi Perfil</h1>
          <p className="text-gray-600">Información de tu cuenta</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 mb-8">
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre
              </label>
              <p className="text-lg text-[#27282E] bg-white border border-gray-200 rounded p-3">
                {customer.name || 'No especificado'}
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <p className="text-lg text-[#27282E] bg-white border border-gray-200 rounded p-3">
                {customer.email || 'No especificado'}
              </p>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Empresa
              </label>
              <p className="text-lg text-[#27282E] bg-white border border-gray-200 rounded p-3">
                {customer.company || 'No especificado'}
              </p>
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estado
              </label>
              <p className="text-lg text-[#27282E] bg-white border border-gray-200 rounded p-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Activo
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 flex-wrap">
          <Link href="/ecommerce/pedidos">
            <Button className="bg-[#27282E] text-white hover:bg-gray-800 font-semibold px-6 py-3">
              Ver Órdenes
            </Button>
          </Link>
          <button
            onClick={() => signOut()}
            className="px-6 py-3 rounded-lg border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
