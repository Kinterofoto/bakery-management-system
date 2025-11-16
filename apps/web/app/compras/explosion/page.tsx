"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { ArrowLeft, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

export default function MaterialExplosionPage() {
  const router = useRouter()

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/compras')}
              className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/30 dark:hover:bg-black/30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Explosión de Materiales
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Calcula las necesidades de materia prima basado en el BOM
              </p>
            </div>
          </div>

          {/* Placeholder Card */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-lg p-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-amber-500/15 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6">
                  <Zap className="w-12 h-12 text-amber-500 mx-auto" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  En Construcción
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Este módulo está en desarrollo. Estamos definiendo cómo será la explosión de materiales.
                </p>
              </div>

              <div className="pt-4">
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Vuelve pronto para usar esta funcionalidad
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
