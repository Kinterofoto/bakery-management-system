import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { RouteGuard } from "@/components/auth/RouteGuard"

export const metadata: Metadata = {
  title: "Panadería Industrial - Sistema de Gestión",
  description: "Sistema integral de gestión para Panadería Industrial",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <RouteGuard>
            {children}
          </RouteGuard>
          <Toaster />
          <SonnerToaster 
            position="top-right" 
            richColors 
            closeButton
            duration={4000}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
