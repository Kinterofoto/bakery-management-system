"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WifiOff, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function OfflinePage() {
  const router = useRouter()

  const handleRetry = () => {
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
            <WifiOff className="h-10 w-10 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Sin Conexión
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p className="text-lg font-semibold mb-2">Estás offline</p>
            <p>
              No hay conexión a internet en este momento.
              Por favor verifica tu conexión y vuelve a intentar.
            </p>
          </div>

          <Button
            onClick={handleRetry}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>

          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>PastryApp - Sistema de Gestión</p>
            <p className="mt-1">Algunas funciones pueden estar limitadas sin conexión</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
